import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not set. Please set it in Supabase secrets." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Using the latest available model from your key's listing
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

    const { messages, userInput } = await req.json();

    // System instruction to define the persona
    const system_instruction = {
      parts: [{ text: "You are a helpful and professional Finance Advisor for Vault OS. Your goal is to help users manage their money, plan budgets, and understand their finances. Keep your responses concise, actionable, and friendly." }]
    };

    // Format history for Gemini
    let contents = [];
    const validMessages = (messages || []).filter((m: any) => m.sender === "user" || m.sender === "advisor");

    if (validMessages.length > 0) {
      // Find the first user message to start history correctly
      const firstUserIndex = validMessages.findIndex((m: any) => m.sender === "user");
      if (firstUserIndex !== -1) {
        contents = validMessages.slice(firstUserIndex).map((msg: any) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        }));
      }
    }

    // Add current user input
    if (userInput) {
      contents.push({
        role: "user",
        parts: [{ text: userInput }],
      });
    }

    if (contents.length === 0) {
      throw new Error("No user input provided");
    }

    console.log(`Calling Gemini 3.5 Flash...`);

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
      return new Response(JSON.stringify({ 
        error: data.error?.message || `Gemini error: ${response.status}`,
        details: data
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";

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
