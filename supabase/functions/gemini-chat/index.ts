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
      throw new Error("No AI API keys are set. Please set at least one key.");
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

    // Fetch user profile, preferences, and wallet
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const { data: preferences } = await supabase.from("user_preferences").select("language").eq("user_id", user.id).maybeSingle();
    const { data: wallet } = await supabase.from("wallets").select("id, balance, currency").eq("user_id", user.id).maybeSingle();

    // 1. Fetch active savings goals & ledger
    const { data: savingsGoals } = await supabase.from("savings_goals").select("id, title, target_amount, current_amount, deadline_date, status").eq("user_id", user.id).eq("status", "active");
    const { data: savingsLedger } = await supabase.from("savings_ledger").select("amount, type, created_at, goal_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);

    // 2. Fetch active loans
    const { data: loans } = await supabase
      .from("loans")
      .select("id, amount, interest_rate, due_date, remaining_balance, status")
      .eq("user_id", user.id)
      .eq("status", "active");

    // 3. Fetch recent loan payments
    const { data: loansLedger } = await supabase
      .from("loans_ledger")
      .select("amount, payment_type, created_at, loan_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const body = await req.json().catch(() => ({}));
    const { messages, userInput } = body;

    const firstName = profile?.first_name || "User";
    const currency = wallet?.currency || "USD";
    const balance = wallet ? `${currency} ${wallet.balance.toLocaleString()}` : "unknown";
    
    // Format Knowledge Strings
    const goalsText = savingsGoals && savingsGoals.length > 0
      ? savingsGoals.map(g => `- Goal: ${g.title} (${currency} ${g.current_amount.toLocaleString()}/${g.target_amount.toLocaleString()})`).join("\n")
      : "No active savings goals.";

    const loansText = loans && loans.length > 0
      ? loans.map(l => `- Loan: ${currency} ${l.remaining_balance.toLocaleString()} (Due: ${new Date(l.due_date).toLocaleDateString()}, Rate: ${l.interest_rate}%)`).join("\n")
      : "No active loans.";

    const recentActivity = [
      ...(savingsLedger?.map(l => `- Saved: ${currency} ${l.amount.toLocaleString()} (${l.type}) on ${new Date(l.created_at).toLocaleDateString()}`) || []),
      ...(loansLedger?.map(l => `- Loan Payment: ${currency} ${l.amount.toLocaleString()} (${l.payment_type}) on ${new Date(l.created_at).toLocaleDateString()}`) || [])
    ].slice(0, 10);

    const languageCode = preferences?.language || "en";
    const languageNames: Record<string, string> = { en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese", sw: "Swahili" };
    const targetLanguage = languageNames[languageCode] || "English";

    const systemPrompt = `You are the professional Finance Advisor for Vault OS. You are assisting ${firstName}.
- Wallet Balance: ${balance}
- Active Savings:
${goalsText}
- Active Loans:
${loansText}
- Recent Activity:
${recentActivity.length > 0 ? recentActivity.join("\n") : "No recent activity."}

Your goal is to provide holistic financial advice. Help the user balance between saving for their goals and paying off their loans. Keep responses friendly and actionable. YOU MUST RESPOND IN ${targetLanguage.toUpperCase()}.`;

    const validMessages = (messages || []).filter((m: any) => (m.sender === "user" || m.sender === "advisor") && m.text);
    const recentMessages = validMessages.slice(-29);

    const models = [
      { provider: "gemini", model: "gemini-1.5-flash" },
      { provider: "groq", model: "llama-3.3-70b-versatile" },
      { provider: "openrouter", model: "mistralai/mistral-7b-instruct:free" },
      { provider: "gemini", model: "gemini-1.5-pro" },
      { provider: "openrouter", model: "google/gemma-7b-it:free" },
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

      try {
        if (modelConfig.provider === "groq" || modelConfig.provider === "openai" || modelConfig.provider === "openrouter") {
          let baseUrl = "https://api.openai.com/v1/chat/completions";
          let apiKey = OPENAI_API_KEY;
          if (modelConfig.provider === "groq") { baseUrl = "https://api.groq.com/openai/v1/chat/completions"; apiKey = GROQ_API_KEY; }
          else if (modelConfig.provider === "openrouter") { baseUrl = "https://openrouter.ai/api/v1/chat/completions"; apiKey = OPENROUTER_API_KEY; }

          const res = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "HTTP-Referer": "https://vault-os.vercel.app", "X-Title": "Vault OS" },
            body: JSON.stringify({
              model: modelConfig.model,
              messages: [{ role: "system", content: systemPrompt }, ...recentMessages.map((m: any) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })), ...(userInput ? [{ role: "user", content: userInput }] : [])],
              temperature: 0.7,
            }),
          });
          if (res.ok) { const data = await res.json(); aiResponse = data.choices[0].message.content; success = true; break; }
          else { const errorData = await res.json(); lastErrorMessage = errorData?.error?.message || res.statusText; }
        } else if (modelConfig.provider === "gemini") {
          const advisorPersona = `[SYSTEM INSTRUCTION: ${systemPrompt}]\n\n`;
          let contents = [];
          const firstUserIndex = recentMessages.findIndex((m: any) => m.sender === "user");
          if (firstUserIndex !== -1) {
            contents = recentMessages.slice(firstUserIndex).map((msg: any, idx: number) => ({ role: msg.sender === "user" ? "user" : "model", parts: [{ text: idx === 0 ? advisorPersona + msg.text : msg.text }] }));
          }
          if (userInput) {
            if (contents.length > 0 && contents[contents.length - 1].role === "user") { contents[contents.length - 1].parts[0].text += `\n${userInput}`; }
            else { contents.push({ role: "user", parts: [{ text: contents.length === 0 ? advisorPersona + userInput : userInput }] }); }
          }
          const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelConfig.model}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } }),
          });
          if (res.ok) { const data = await res.json(); aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text; if (aiResponse) { success = true; break; } }
          else { const errorData = await res.json(); lastErrorMessage = errorData?.error?.message || res.statusText; }
        }
      } catch (err: any) { lastErrorMessage = err.message; }
    }

    if (!success) throw new Error(lastErrorMessage || "All AI models were unavailable.");
    return new Response(JSON.stringify({ text: aiResponse }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
