import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 2000,
): Promise<Response> {
  const response = await fetch(url, options);

  // Retry on 429 (Too Many Requests), 503 (Service Unavailable), or 500 (Internal Server Error)
  if (
    (response.status === 429 || response.status === 503 || response.status === 500) &&
    retries > 0
  ) {
    let delay = backoff;

    // Try to extract retry delay from 429 error
    if (response.status === 429) {
      try {
        const data = await response.clone().json();
        const retryInfo = data.error?.details?.find((d: any) => d["@type"]?.includes("RetryInfo"));
        if (retryInfo?.retryDelay) {
          // Convert "37s" or similar to milliseconds
          const match = retryInfo.retryDelay.match(/(\d+)s/);
          if (match) {
            delay = parseInt(match[1]) * 1000;
          }
        }
      } catch (e) {
        // Fallback to exponential backoff
      }
    }

    console.warn(
      `Gemini API returned ${response.status}, retrying in ${delay}ms... (${retries} retries left)`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }

  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY_HEALTH") ?? Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY_HEALTH is not set");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    // Get the user ID from the request token or body
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Fallback to body param if needed for testing, but prefer auth token
    const body = await req.json().catch(() => ({}));
    const userId = user?.id || body.userId;
    const language = body.language || "en";

    if (!userId) {
      return new Response(JSON.stringify({ error: "No authenticated user found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch user's wallets to get wallet IDs and currencies
    const { data: wallets, error: walletError } = await supabase
      .from("wallets")
      .select("id, currency")
      .eq("user_id", userId);

    if (walletError) {
      console.error("Wallet Fetch Error:", walletError);
      throw walletError;
    }

    const walletIds = wallets?.map((w) => w.id) || [];
    const walletMap = Object.fromEntries(wallets?.map((w) => [w.id, w.currency]) || []);

    let history = [];
    if (walletIds.length > 0) {
      // 2. Fetch balance history (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: historyData, error: historyError } = await supabase
        .from("balance_history")
        .select("recorded_balance, recorded_at, wallet_id")
        .in("wallet_id", walletIds)
        .gte("recorded_at", thirtyDaysAgo.toISOString())
        .order("recorded_at", { ascending: true });

      if (historyError) {
        console.error("History Fetch Error:", historyError);
        throw historyError;
      }
      history = historyData || [];
    }

    // 3. Fetch recent transactions (both sent and received)
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("amount, type, description, created_at, sender_id, receiver_id")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (txError) {
      console.error("Transactions Fetch Error:", txError);
      throw txError;
    }

    // 4. Construct prompt with accurate data
    const historyText =
      history.length > 0
        ? history
            .map(
              (h) => `${h.recorded_at}: ${walletMap[h.wallet_id] || "USD"} ${h.recorded_balance}`,
            )
            .join("\n")
        : "No recent balance history (stable balance).";

    const txText =
      transactions && transactions.length > 0
        ? transactions
            .map((t) => {
              const isOutflow = t.sender_id === userId;
              const prefix = isOutflow ? "-" : "+";
              return `${t.created_at}: ${prefix}${t.amount} (${t.description || t.type})`;
            })
            .join("\n")
        : "No recent transactions found.";

    const prompt = `
      Analyze this user's financial data for Vault OS and provide ONE actionable insight or prediction.
      
      User ID: ${userId}
      Balance History (Last 30 Days):
      ${historyText}
      
      Recent Activity (last 20 items):
      ${txText}
      
      Return the response in strictly valid JSON format with the following keys:
      "type": one of "prediction", "alert", "tip", "milestone"
      "title": a short catchy title (in the following language: ${language})
      "content": the detailed insight (in the following language: ${language})
      "severity": "low", "medium", "high"
      
      Focus on spending patterns, potential balance depletion, or savings opportunities. Be specific to the data provided.
      If there is very little data, provide a welcoming tip on how to get started with Vault OS.
      
      IMPORTANT: Do not use any markdown formatting, asterisks (*), or bullet points in the "content" field. Use plain text only.
    `;

    console.log(
      `Generating insight for user ${userId} with ${history.length} history points and ${transactions?.length || 0} transactions.`,
    );

    // 4. Call Gemini (with Multi-Tier Failover Logic)
    const models = [
      "https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent",
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent",
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent",
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
    ];

    const promptText =
      prompt + "\n\nIMPORTANT: Return ONLY valid raw JSON without markdown code blocks.";
    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.7,
      },
    });

    let aiData;
    let aiResponse;
    let success = false;

    for (let i = 0; i < models.length; i++) {
      const currentModelUrl = models[i];
      const modelName = currentModelUrl.split("/models/")[1].split(":")[0];

      console.log(`Attempting model ${i + 1}/${models.length}: ${modelName}`);

      aiResponse = await fetchWithRetry(`${currentModelUrl}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      aiData = await aiResponse.json();

      if (aiResponse.ok) {
        success = true;
        console.log(`Success with model: ${modelName}`);
        break;
      }

      console.warn(`Model ${modelName} returned ${aiResponse.status}. Trying next in chain...`);
    }

    if (!success) {
      console.error("All models in failover chain failed.", aiData);
      const lastStatus = aiResponse?.status;
      let extra = "";
      try {
        const errMsg = aiData?.error?.message;
        if (errMsg) extra += ` ${errMsg}`;

        const retryInfo = aiData?.error?.details?.find((d: any) =>
          d["@type"]?.includes("RetryInfo"),
        );
        if (retryInfo?.retryDelay) {
          const match = retryInfo.retryDelay.match(/(\d+)s/);
          if (match) extra += ` Retry after ${match[1]}s.`;
        }
      } catch (e) {
        // ignore parsing errors
      }

      throw new Error(
        `Gemini API Error: All models unavailable. Last status: ${lastStatus}.${extra}`,
      );
    }

    if (!aiData.candidates || !aiData.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response format from Gemini API");
    }

    let rawText = aiData.candidates[0].content.parts[0].text;

    // Strip markdown formatting if Gemini returns it wrapped in ```json ... ```
    rawText = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let insightJson;
    try {
      insightJson = JSON.parse(rawText);
    } catch (parseError: any) {
      console.error("Failed to parse Gemini output:", rawText);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // 5. Store insight
    const validTypes = ["prediction", "alert", "tip", "milestone"];
    const insightType = validTypes.includes(insightJson.type) ? insightJson.type : "tip";

    const { error: insertError } = await supabase.from("financial_insights").insert({
      user_id: userId,
      type: insightType,
      title: insightJson.title || "Financial Insight",
      content: insightJson.content || "No detailed content provided.",
      metadata: {
        severity: insightJson.severity || "low",
        generated_at: new Date().toISOString(),
        original_type: insightJson.type,
      },
    });

    if (insertError) {
      console.error("Database Insert Error:", insertError);
      throw new Error(`Failed to store insight: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, insight: { ...insightJson, type: insightType } }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Health Check Error:", error.message);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
