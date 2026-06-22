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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Apply Rate Limiting
    const { data: allowed, error: rlError } = await supabase.rpc("check_rate_limit", {
        p_key: `ai_chat:${user.id}`,
        p_max_attempts: 10,
        p_window_seconds: 60
    });
    
    if (rlError) {
        console.error("Rate limit check error:", rlError);
    } else if (!allowed) {
        return new Response(JSON.stringify({ error: "Too many AI requests. Please wait a minute." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const body = await req.json().catch(() => ({}));
    const { messages, userInput } = body;

    // Fetch user profile and preferences (always needed)
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("language")
      .eq("user_id", user.id)
      .maybeSingle();

    const firstName = profile?.first_name || "User";
    const languageCode = preferences?.language || "en";
    const languageNames: Record<string, string> = {
      en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese", sw: "Swahili",
    };
    const targetLanguage = languageNames[languageCode] || "English";

    // POINT 2: Add Current Date and Time
    const currentDateTime = new Date().toLocaleString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short' 
    });

    const baseSystemPrompt = `You are the professional Finance Advisor for Vault OS. You are assisting ${firstName}.
Current Date and Time: ${currentDateTime}

FORMATTING INSTRUCTIONS:
- DO NOT use markdown asterisks (*) or double asterisks (**) for bolding or lists.
- For bullet points, use a simple dash (-) or a bullet symbol (•).
- For emphasis, use descriptive language or CAPITALIZED WORDS.
- Provide clean, professional plain text that is easy to read.
- YOU MUST RESPOND IN ${targetLanguage.toUpperCase()}.

CRITICAL RULES:
- If the user simply greets you (e.g. "hello", "hi"), DO NOT call the get_financial_context tool and DO NOT list their financial data. Simply reply with a warm, brief greeting and ask how you can help them today.
- Only fetch or summarize their financial data if they explicitly ask about their finances, spending, balances, or goals.

Your goal is to provide holistic financial advice. Keep responses friendly and actionable.`;

    const validMessages = (messages || []).filter(
      (m: any) => (m.sender === "user" || m.sender === "advisor") && m.text,
    );
    
    // POINT 5: Smarter Context Truncation (Slice by characters)
    let charCount = 0;
    const truncatedMessages = [];
    for (let i = validMessages.length - 1; i >= 0; i--) {
      const msg = validMessages[i];
      if (charCount + msg.text.length > 6000) break; // Limit to ~6k chars of history
      truncatedMessages.unshift(msg);
      charCount += msg.text.length;
    }
    const recentMessages = truncatedMessages;

    // POINT 3 & 4: Function to fetch financial data with raw transactions
    const fetchFinancialData = async () => {
      try {
        const { data: walletData } = await supabase.from("wallets").select("balance, currency").eq("user_id", user.id).maybeSingle();
        const { data: goalsData } = await supabase.from("savings_goals").select("title, target_amount, current_amount").eq("user_id", user.id).eq("status", "active");
        const { data: loansData } = await supabase.from("loans").select("interest_rate, due_date, remaining_balance").eq("user_id", user.id).eq("status", "active");
        
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: categoryData } = await supabase.from("transactions").select("category, amount").eq("sender_id", user.id).gte("created_at", thirtyDaysAgo);
        
        let spendingText = "No categorized spending.";
        if (categoryData && categoryData.length > 0) {
          const aggregates = categoryData.reduce((acc: any, curr: any) => {
            const cat = curr.category || "Uncategorized";
            acc[cat] = (acc[cat] || 0) + Number(curr.amount);
            return acc;
          }, {});
          spendingText = Object.entries(aggregates).map(([cat, amt]) => `- ${cat}: ${amt}`).join("\n");
        }

        const { data: recentTxs } = await supabase.from("transactions")
          .select("amount, category, type, description, created_at, status")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(10);
          
        let rawTxText = "No recent transactions.";
        if (recentTxs && recentTxs.length > 0) {
          rawTxText = recentTxs.map(tx => `- [${new Date(tx.created_at).toLocaleDateString()}] ${tx.type.toUpperCase()}: ${tx.amount} (${tx.category || 'Uncategorized'}) - ${tx.description || tx.status}`).join("\n");
        }

        const currency = walletData?.currency || "USD";
        const balance = walletData ? `${currency} ${walletData.balance.toLocaleString()}` : "Not found";

        return JSON.stringify({
          walletBalance: balance,
          spendingLast30Days: spendingText,
          recentTransactions: rawTxText,
          activeSavings: goalsData || "None",
          activeLoans: loansData || "None"
        });
      } catch(err) {
        return JSON.stringify({ error: "Failed to retrieve financial context" });
      }
    };

    const models = [
      { provider: "gemini", model: "gemini-1.5-flash" },
      { provider: "groq", model: "llama-3.3-70b-versatile" },
      { provider: "openrouter", model: "mistralai/mistral-7b-instruct:free" },
      { provider: "gemini", model: "gemini-1.5-pro" },
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
        if (
          modelConfig.provider === "groq" ||
          modelConfig.provider === "openai" ||
          modelConfig.provider === "openrouter"
        ) {
          let baseUrl = "https://api.openai.com/v1/chat/completions";
          let apiKey = OPENAI_API_KEY;
          if (modelConfig.provider === "groq") {
            baseUrl = "https://api.groq.com/openai/v1/chat/completions";
            apiKey = GROQ_API_KEY;
          } else if (modelConfig.provider === "openrouter") {
            baseUrl = "https://openrouter.ai/api/v1/chat/completions";
            apiKey = OPENROUTER_API_KEY;
          }

          const tools = [
            {
              type: "function",
              function: {
                name: "get_financial_context",
                description: "Fetch the user's wallet balance, savings goals, active loans, and recent transactions. Call this tool when the user asks about their finances, spending, balances, affordability, or history.",
                parameters: { type: "object", properties: {}, required: [] }
              }
            },
            {
              type: "function",
              function: {
                name: "prepare_transaction",
                description: "Prepare a financial transaction. Call this when the user asks to create a savings goal or set aside/deposit money into a savings goal.",
                parameters: {
                  type: "object",
                  properties: {
                    action_type: { type: "string", enum: ["create_savings_goal", "deposit_to_savings"] },
                    amount: { type: "number", description: "The amount to deposit or target amount for a new goal" },
                    goal_name: { type: "string", description: "The name of the savings goal" }
                  },
                  required: ["action_type", "amount", "goal_name"]
                }
              }
            }
          ];

          const openAiMessages = [
            { role: "system", content: baseSystemPrompt },
            ...recentMessages.map((m: any) => ({
              role: m.sender === "user" ? "user" : "assistant",
              content: m.text,
            })),
            ...(userInput ? [{ role: "user", content: userInput }] : []),
          ];

          let res = await fetch(baseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "https://vault-os.vercel.app",
              "X-Title": "Vault OS",
            },
            body: JSON.stringify({
              model: modelConfig.model,
              messages: openAiMessages,
              temperature: 0.7,
              tools,
              tool_choice: "auto"
            }),
          });
          
          if (!res.ok) throw new Error(await res.text());
          let data = await res.json();
          let message = data.choices[0].message;

          // Process tool call if requested
          if (message.tool_calls && message.tool_calls.length > 0) {
            const toolCall = message.tool_calls[0];
            if (toolCall.function.name === "get_financial_context") {
              const finData = await fetchFinancialData();
              openAiMessages.push(message);
              openAiMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                content: finData
              });

              res = await fetch(baseUrl, {
                 method: "POST",
                 headers: {
                   "Content-Type": "application/json",
                   Authorization: `Bearer ${apiKey}`,
                 },
                 body: JSON.stringify({
                    model: modelConfig.model,
                    messages: openAiMessages,
                    temperature: 0.7
                 })
              });
              if (!res.ok) throw new Error(await res.text());
              data = await res.json();
              aiResponse = data.choices[0].message.content;
              success = true;
              break;
            } else if (toolCall.function.name === "prepare_transaction") {
              const args = JSON.parse(toolCall.function.arguments);
              return new Response(JSON.stringify({ 
                text: `I've prepared the transaction to ${args.action_type === 'create_savings_goal' ? 'create a new savings goal' : 'deposit into savings'}. Please confirm below.`,
                action: args
              }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } else {
            aiResponse = message.content;
            success = true;
            break;
          }

        } else if (modelConfig.provider === "gemini") {
          let contents = recentMessages.map((msg: any) => ({
            role: msg.sender === "user" ? "user" : "model",
            parts: [{ text: msg.text }],
          }));
          
          if (userInput) {
            if (contents.length > 0 && contents[contents.length - 1].role === "user") {
              contents[contents.length - 1].parts[0].text += `\n${userInput}`;
            } else {
              contents.push({
                role: "user",
                parts: [{ text: userInput }],
              });
            }
          }

          const tools = [{
            functionDeclarations: [
              {
                name: "get_financial_context",
                description: "Fetch the user's wallet balance, savings goals, active loans, and recent transactions. Call this tool when the user asks about their finances, spending, balances, affordability, or history."
              },
              {
                name: "prepare_transaction",
                description: "Prepare a financial transaction. Call this when the user asks to create a savings goal or set aside/deposit money into a savings goal.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    action_type: { type: "STRING", description: "Either 'create_savings_goal' or 'deposit_to_savings'" },
                    amount: { type: "NUMBER", description: "The amount to deposit or target amount for a new goal" },
                    goal_name: { type: "STRING", description: "The name of the savings goal" }
                  },
                  required: ["action_type", "amount", "goal_name"]
                }
              }
            ]
          }];

          const reqBody: any = {
            systemInstruction: { parts: [{ text: baseSystemPrompt }] },
            contents,
            tools,
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          };

          let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqBody)
          });

          if (!res.ok) throw new Error(await res.text());
          let data = await res.json();
          let candidate = data.candidates?.[0];
          
          let functionCall = candidate?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;

          if (functionCall && functionCall.name === "get_financial_context") {
             const finData = await fetchFinancialData();
             contents.push(candidate.content);
             contents.push({
               role: "function",
               parts: [{
                 functionResponse: {
                   name: "get_financial_context",
                   response: { result: finData }
                 }
               }]
             });
             
             reqBody.contents = contents;
             delete reqBody.tools;
             res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reqBody)
             });
             if (!res.ok) throw new Error(await res.text());
             data = await res.json();
             candidate = data.candidates?.[0];
          } else if (functionCall && functionCall.name === "prepare_transaction") {
             const args = functionCall.args;
             return new Response(JSON.stringify({ 
               text: `I've prepared the transaction to ${args.action_type === 'create_savings_goal' ? 'create a new savings goal' : 'deposit into savings'}. Please confirm below.`,
               action: args
             }), {
               status: 200,
               headers: { ...corsHeaders, "Content-Type": "application/json" },
             });
          }

          aiResponse = candidate?.content?.parts?.[0]?.text;
          if (aiResponse) {
            success = true;
            break;
          }
        }
      } catch (err: any) {
        lastErrorMessage = err.message;
      }
    }

    if (!success) throw new Error(lastErrorMessage || "All AI models were unavailable.");

    // Final cleanup of any lingering asterisks if the AI ignored instructions
    const cleanedResponse = aiResponse
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold stars, keep text
      .replace(/^\* /gm, "• ") // Convert list stars to bullet symbols
      .replace(/\n\* /g, "\n• ") // Convert list stars after newlines
      .replace(/(\w)\*(\w)/g, "$1 $2"); // Remove accidental inline stars

    return new Response(JSON.stringify({ text: cleanedResponse }), {
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
