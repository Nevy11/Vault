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
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!GEMINI_API_KEY && !GROQ_API_KEY && !OPENROUTER_API_KEY && !OPENAI_API_KEY) {
      throw new Error("No AI API keys are set. Please set at least one key (GEMINI, GROQ, or OPENROUTER).");
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const { data: preferences } = await supabase.from("user_preferences").select("language").eq("user_id", user.id).maybeSingle();
    const { data: wallet } = await supabase.from("wallets").select("id, balance, currency").eq("user_id", user.id).maybeSingle();

    const body = await req.json().catch(() => ({}));
    const { messages, userInput } = body;

    const firstName = profile?.first_name || "User";
    const balance = wallet ? `${wallet.currency} ${wallet.balance.toLocaleString()}` : "unknown";
    const languageCode = preferences?.language || "en";
    const languageNames: Record<string, string> = {
      en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese", sw: "Swahili",
    };
    const targetLanguage = languageNames[languageCode] || "English";

    const systemPrompt = `You are a helpful and professional Finance Advisor for Vault OS. You are assisting ${firstName}. User's current wallet balance: ${balance}. Your goal is to help users manage their money, plan budgets, and understand their finances. Keep your responses concise, actionable, and friendly. Refer to the user by name occasionally to build rapport. YOU MUST RESPOND IN ${targetLanguage.toUpperCase()}. Even if the user asks in another language, your reply should be in ${targetLanguage}.`;

    const validMessages = (messages || []).filter((m: any) => (m.sender === "user" || m.sender === "advisor") && m.text);
    const recentMessages = validMessages.slice(-29);

    // THE ULTIMATE FAILOVER LIST (All Free except OpenAI)
    const models = [
      { provider: "gemini", model: "gemini-1.5-flash" },
      { provider: "groq", model: "llama-3.3-70b-versatile" },
      { provider: "openrouter", model: "mistralai/mistral-7b-instruct:free" }, // Free backup 1
      { provider: "gemini", model: "gemini-1.5-pro" },
      { provider: "openrouter", model: "google/gemma-7b-it:free" }, // Free backup 2
      { provider: "groq", model: "llama-3.1-8b-instant" },
      { provider: "openai", model: "gpt-4o-mini" },
    ];

    let aiResponse = "";
    let success = false;
    let lastErrorMessage = "";

    for (const modelConfig of models) {
      if (modelConfig.provider === "openai" && !OPENAI_API_KEY) continue;
      if (modelConfig.provider === "gemini" && !GEMINI_API_KEY) continue;
      if (modelConfig.provider === "groq" && !GROQ_API_KEY) continue;
      if (modelConfig.provider === "openrouter" && !OPENROUTER_API_KEY) continue;

      console.log(`[Chat] Trying ${modelConfig.provider}: ${modelConfig.model}`);

      try {
        if (modelConfig.provider === "groq" || modelConfig.provider === "openai" || modelConfig.provider === "openrouter") {
          let baseUrl = "https://api.openai.com/v1/chat/completions";
          let apiKey = OPENAI_API_KEY;

          if (modelConfig.provider === "groq") {
            baseUrl = "https://api.groq.com/openai/v1/chat/completions";
            apiKey = GROQ_API_KEY;
          } else if (modelConfig.provider === "openrouter") {
            baseUrl = "https://openrouter.ai/api/v1/chat/completions";
            apiKey = OPENROUTER_API_KEY;
          }

          const res = await fetch(baseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "https://vault-os.vercel.app", // Required for OpenRouter
              "X-Title": "Vault OS",
            },
            body: JSON.stringify({
              model: modelConfig.model,
              messages: [
                { role: "system", content: systemPrompt },
                ...recentMessages.map((m: any) => ({
                  role: m.sender === "user" ? "user" : "assistant",
                  content: m.text,
                })),
                ...(userInput ? [{ role: "user", content: userInput }] : []),
              ],
              temperature: 0.7,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            aiResponse = data.choices[0].message.content;
            success = true;
            console.log(`[Chat] Success with ${modelConfig.provider}: ${modelConfig.model}`);
            break;
          } else {
            const errorData = await res.json();
            lastErrorMessage = errorData?.error?.message || res.statusText;
            console.warn(`[Chat] ${modelConfig.provider} failed: ${lastErrorMessage}`);
          }
        } else if (modelConfig.provider === "gemini") {
          const advisorPersona = `[SYSTEM INSTRUCTION: ${systemPrompt}]\n\n`;
          let contents = [];
          const firstUserIndex = recentMessages.findIndex((m: any) => m.sender === "user");
          if (firstUserIndex !== -1) {
            contents = recentMessages.slice(firstUserIndex).map((msg: any, idx: number) => ({
              role: msg.sender === "user" ? "user" : "model",
              parts: [{ text: idx === 0 ? advisorPersona + msg.text : msg.text }],
            }));
          }
          if (userInput) {
            if (contents.length > 0 && contents[contents.length - 1].role === "user") {
              contents[contents.length - 1].parts[0].text += `\n${userInput}`;
            } else {
              contents.push({ role: "user", parts: [{ text: contents.length === 0 ? advisorPersona + userInput : userInput }] });
            }
          }

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } }),
          });

          if (res.ok) {
            const data = await res.json();
            aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiResponse) {
              success = true;
              console.log(`[Chat] Success with Gemini: ${modelConfig.model}`);
              break;
            }
          } else {
            const errorData = await res.json();
            lastErrorMessage = errorData?.error?.message || res.statusText;
            console.warn(`[Chat] Gemini failed: ${lastErrorMessage}`);
          }
        }
      } catch (err: any) {
        console.error(`[Chat] Error with ${modelConfig.model}:`, err.message);
        lastErrorMessage = err.message;
      }
    }

    if (!success) throw new Error(lastErrorMessage || "All AI models were unavailable.");

    return new Response(JSON.stringify({ text: aiResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Chat] Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
