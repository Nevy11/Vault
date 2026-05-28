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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If a userId is provided in the body, run for that user. 
    // Otherwise, this could be extended to run for all active users.
    const { userId } = await req.json().catch(() => ({}));
    
    if (!userId) {
       return new Response(JSON.stringify({ error: "No userId provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Fetch balance history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: history, error: historyError } = await supabase
      .from("balance_history")
      .select("balance, currency, created_at")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (historyError) throw historyError;

    // 2. Fetch recent transactions
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("amount, type, description, created_at")
      .eq("sender_id", userId) // Simplification: just looking at outflows
      .order("created_at", { ascending: false })
      .limit(10);

    if (txError) throw txError;

    // 3. Construct prompt
    const historyText = history?.map(h => `${h.created_at}: ${h.currency} ${h.balance}`).join("\n") || "No history available";
    const txText = transactions?.map(t => `${t.created_at}: -${t.amount} (${t.description})`).join("\n") || "No transactions available";

    const prompt = `
      Analyze this user's financial data for Vault OS and provide ONE actionable insight or prediction.
      
      User ID: ${userId}
      Balance History (Last 30 Days):
      ${historyText}
      
      Recent Outflows:
      ${txText}
      
      Return the response in strictly valid JSON format with the following keys:
      "type": one of "prediction", "alert", "tip", "milestone"
      "title": a short catchy title
      "content": the detailed insight
      "severity": "low", "medium", "high"
      
      Focus on spending patterns, potential balance depletion, or savings opportunities.
    `;

    // 4. Call Gemini
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    
    const aiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      }),
    });

    const aiData = await aiResponse.json();
    const insightJson = JSON.parse(aiData.candidates[0].content.parts[0].text);

    // 5. Store insight
    const { error: insertError } = await supabase
      .from("financial_insights")
      .insert({
        user_id: userId,
        type: insightJson.type,
        title: insightJson.title,
        content: insightJson.content,
        metadata: { severity: insightJson.severity, generated_at: new Date().toISOString() }
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
