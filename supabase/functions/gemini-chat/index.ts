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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
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

    // Fetch Savings Goals
    const { data: savingsGoals } = await supabase
      .from("savings_goals")
      .select("title, target_amount, current_amount, deadline, status")
      .eq("user_id", user.id)
      .eq("status", "active");

    // Fetch Loans
    const { data: loans } = await supabase
      .from("loans")
      .select("amount, remaining_balance, due_date, status")
      .eq("user_id", user.id)
      .eq("status", "active");

    // Portfolio Analytics: Fetch more ledger history for context
    const { data: ledgerHistory } = await supabase
      .from("ledger_entries")
      .select("amount, type, description, created_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch Balance History for trend analysis (last 7 recordings)
    const { data: balanceHistory } = await supabase
      .from("balance_history")
      .select("recorded_balance, recorded_at")
      .eq("wallet_id", wallet?.id)
      .order("recorded_at", { ascending: false })
      .limit(7);

    // Fetch Recent Security Logs
    const { data: securityLogs } = await supabase
      .from("activity_logs")
      .select("action_type, location, device_info, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const portfolioSummary = ledgerHistory && ledgerHistory.length > 0
      ? ledgerHistory.map(entry => `- ${entry.created_at.split('T')[0]}: ${entry.type} of ${wallet?.currency} ${Math.abs(entry.amount)} (${entry.description || 'No description'})`).join('\n')
      : "No recent transaction history found.";

    const savingsSummary = savingsGoals && savingsGoals.length > 0
      ? savingsGoals.map(g => `- ${g.title}: ${wallet?.currency} ${g.current_amount}/${g.target_amount} (Target: ${g.deadline.split('T')[0]})`).join('\n')
      : "No active savings goals.";

    const loansSummary = loans && loans.length > 0
      ? loans.map(l => `- Loan: ${wallet?.currency} ${l.remaining_balance} remaining of ${l.amount} (Due: ${l.due_date.split('T')[0]})`).join('\n')
      : "No active loans.";

    const securitySummary = securityLogs && securityLogs.length > 0
      ? securityLogs.map(log => `- ${log.created_at.split('T')[0]}: ${log.action_type.replace('_', ' ')} from ${log.location || 'Unknown'} using ${log.device_info || 'Unknown device'}`).join('\n')
      : "No recent security activity.";

    const balanceTrend = balanceHistory && balanceHistory.length > 1
      ? `Recent balance trend: ${balanceHistory.map(h => h.recorded_balance).reverse().join(' -> ')}`
      : "";

    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    const { messages, userInput } = await req.json();

    // Create a personalized system instruction with comprehensive real-time financial data
    const firstName = profile?.first_name || "User";
    const balanceStr = wallet ? `${wallet.currency} ${wallet.balance.toLocaleString()}` : "unknown";
    
    const system_instruction = {
      parts: [{ 
        text: `You are a helpful and professional Finance Advisor for Vault OS. 
        You have DIRECT ACCESS to the user's REAL-TIME financial data and account details.
        
        User Identity & Status:
        - Name: ${profile?.first_name} ${profile?.last_name}
        - Email: ${profile?.email}
        - Phone: ${profile?.phone_number || 'Not set'}
        - Nationality: ${profile?.nationality || 'Not set'}
        - KYC Status: ${profile?.kyc_status}
        
        Current Financial Position:
        - Wallet Balance: ${balanceStr}.
        
        Recent Portfolio Activity:
        ${portfolioSummary}

        Active Savings Goals:
        ${savingsSummary}

        Active Loans:
        ${loansSummary}

        Security Context (Recent Activity):
        ${securitySummary}

        ${balanceTrend}

        Your goal:
        1. Provide advice based on their ACTUAL live data provided above.
        2. Analyze spending patterns, savings progress, and loan obligations.
        3. Identify risks (e.g., dropping balance, upcoming loan due dates, unusual security logs).
        4. Refer to the user by name.
        5. If they ask about their "status" or "account", you can see it all.
        
        Style Guide:
        - Keep responses concise and actionable.
        - Use markdown for headers (**bold**, *italics*, bullet points).
        - If the user asks for suggestions, provide them in brackets like this: [Option A] [Option B]. 
        
        Important: You are an AI, remind the user to check important financial info with a professional.` 
      }]
    };

    let contents = [];
    const validMessages = (messages || []).filter((m: any) => m.sender === "user" || m.sender === "advisor");

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
