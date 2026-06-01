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
      console.error("Missing GEMINI_API_KEY");
      throw new Error("GEMINI_API_KEY is not set in Edge Function secrets.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No Authorization header provided" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      .select("id, balance, currency")
      .eq("user_id", user.id)
      .maybeSingle();

    const body = await req.json().catch(() => ({}));
    const { messages, userInput } = body;

    if (!userInput && (!messages || messages.length === 0)) {
      throw new Error("No conversation history or input provided.");
    }

    // Create a personalized instruction string to prepend
    const firstName = profile?.first_name || "User";
    const balance = wallet ? `${wallet.currency} ${wallet.balance.toLocaleString()}` : "unknown";
    const advisorPersona = `[SYSTEM INSTRUCTION: You are a helpful and professional Finance Advisor for Vault OS. You are assisting ${firstName}. User's current wallet balance: ${balance}. Your goal is to help users manage their money, plan budgets, and understand their finances. Keep your responses concise, actionable, and friendly. Refer to the user by name occasionally to build rapport.]\n\n`;

    let contents = [];
    const validMessages = (messages || []).filter(
      (m: any) => (m.sender === "user" || m.sender === "advisor") && m.text,
    );

    if (validMessages.length > 0) {
      // Limit context to last 29 messages as requested for better context awareness
      const recentMessages = validMessages.slice(-29);
      
      // Gemini contents must alternate user/model and start with user
      const firstUserIndex = recentMessages.findIndex((m: any) => m.sender === "user");
      if (firstUserIndex !== -1) {
        contents = recentMessages.slice(firstUserIndex).map((msg: any, idx: number) => {
          let text = msg.text;
          // Prepend persona to the very first user message in this window
          if (idx === 0) {
            text = advisorPersona + text;
          }
          return {
            role: msg.sender === "user" ? "user" : "model",
            parts: [{ text }],
          };
        });
      }
    }

    // Ensure the last role is 'user' before adding model response
    if (userInput) {
      if (contents.length > 0 && contents[contents.length - 1].role === "user") {
        contents[contents.length - 1].parts[0].text += `\n${userInput}`;
      } else {
        // If this is the first and only message, prepend persona
        const text = contents.length === 0 ? advisorPersona + userInput : userInput;
        contents.push({
          role: "user",
          parts: [{ text }],
        });
      }
    }

    if (contents.length === 0) {
      throw new Error("Conversation must start with a user message.");
    }

    console.log(`Calling Gemini with ${contents.length} messages for user ${user.id}`);

    // High-Reliability Multi-Tier Failover Logic
    const models = [
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent",
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent"
    ];

    const tryCallGemini = async (modelUrl: string) => {
      try {
        const res = await fetch(`${modelUrl}?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        });
        return res;
      } catch (err) {
        return null;
      }
    };

    let response = null;
    let data = null;
    let success = false;

    // Iterate through the failover chain
    for (let i = 0; i < models.length; i++) {
      const currentModelUrl = models[i];
      const modelName = currentModelUrl.split('/models/')[1].split(':')[0];
      
      console.log(`Attempting model ${i + 1}/${models.length}: ${modelName}`);
      
      response = await tryCallGemini(currentModelUrl);
      if (!response) continue;

      data = await response.json();

      // If successful, break the loop
      if (response.ok) {
        success = true;
        console.log(`Success with model: ${modelName}`);
        break;
      }

      // If we get an error that isn't a 400 (Bad Request), try next model
      if (response.status === 503 || response.status === 429 || response.status === 404) {
        console.warn(`Model ${modelName} returned ${response.status}. Trying next in chain...`);
        continue;
      }

      // For other serious errors (400 Bad Request), don't retry as the payload might be the issue
      break;
    }

    if (!success) {
      console.error("All models in failover chain failed.", data);
      throw new Error(data?.error?.message || `All AI models were unavailable (Last status: ${response?.status})`);
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
