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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { transactionId } = await req.json();

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select("id, description, amount, type")
      .eq("id", transactionId)
      .single();

    if (txError || !tx) throw new Error("Transaction not found");

    const prompt = `
      Classify this financial transaction into exactly ONE of these categories:
      Dining, Shopping, Transport, Utilities, Entertainment, Healthcare, Groceries, Personal, Income, Transfer.

      Transaction Description: "${tx.description}"
      Transaction Type: "${tx.type}"
      Transaction Amount: ${tx.amount}

      Return ONLY the category name as a single word. If unsure, return 'Personal'.
    `;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await res.json();
    const category = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Personal";

    await supabase
      .from("transactions")
      .update({ category })
      .eq("id", transactionId);

    return new Response(JSON.stringify({ success: true, category }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
