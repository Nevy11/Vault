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
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Fetch wallet balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance, currency")
      .eq("user_id", user.id)
      .maybeSingle();

    const GEMINI_API_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

    const { messages, userInput } = await req.json();

    // Create a personalized system instruction
    const firstName = profile?.first_name || "User";
    const balance = wallet ? `${wallet.currency} ${wallet.balance.toLocaleString()}` : "unknown";

    const system_instruction = {
      parts: [
        {
          text: `You are a helpful and professional Finance Advisor for Vault OS. 
        You are assisting ${firstName}. 
        User's current wallet balance: ${balance}.
        Your goal is to help users manage their money, plan budgets, and understand their finances. 
        Keep your responses concise, actionable, and friendly. 
        Refer to the user by name occasionally to build rapport.`,
        },
      ],
    };

    let contents = [];
    const validMessages = (messages || []).filter(
      (m: any) => m.sender === "user" || m.sender === "advisor",
    );

    if (validMessages.length > 0) {
      const firstUserIndex = validMessages.findIndex((m: any) => m.sender === "user");
      if (firstUserIndex !== -1) {
        contents = validMessages.slice(firstUserIndex).map((msg: any) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        }));
      }
    }

    if (userInput) {
      contents.push({
        role: "user",
        parts: [{ text: userInput }],
      });
    }

    if (contents.length === 0) {
      throw new Error("No conversation history or input provided.");
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        system_instruction,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      throw new Error(data.error?.message || `Gemini error: ${response.status}`);
    }

    const aiResponse =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm sorry, I couldn't generate a response.";

    return new Response(JSON.stringify({ text: aiResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
