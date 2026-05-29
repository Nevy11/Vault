import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");

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
      "title": a short catchy title
      "content": the detailed insight
      "severity": "low", "medium", "high"
      
      Focus on spending patterns, potential balance depletion, or savings opportunities. Be specific to the data provided.
      If there is very little data, provide a welcoming tip on how to get started with Vault OS.
    `;

    console.log(
      `Generating insight for user ${userId} with ${history.length} history points and ${transactions?.length || 0} transactions.`,
    );

    // 4. Call Gemini
    const GEMINI_API_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    const aiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" },
      }),
    });

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      throw new Error(`Gemini API Error: ${aiResponse.status} ${JSON.stringify(aiData)}`);
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
    const { error: insertError } = await supabase.from("financial_insights").insert({
      user_id: userId,
      type: insightJson.type,
      title: insightJson.title,
      content: insightJson.content,
      metadata: { severity: insightJson.severity, generated_at: new Date().toISOString() },
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, insight: insightJson }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Health Check Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
