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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""; // Use service role for proactive checks

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id is required");

    // 1. Fetch User Data
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user_id).single();
    const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user_id).maybeSingle();
    const { data: savingsGoals } = await supabase.from("savings_goals").select("*").eq("user_id", user_id).eq("status", "active");
    const { data: loans } = await supabase.from("loans").select("*").eq("user_id", user_id).eq("status", "active");
    const { data: ledgerHistory } = await supabase.from("ledger_entries").select("*").eq("user_id", user_id).eq("status", "completed").order("created_at", { ascending: false }).limit(30);
    const { data: balanceHistory } = await supabase.from("balance_history").select("*").eq("wallet_id", wallet?.id).order("recorded_at", { ascending: false }).limit(10);
    const { data: securityLogs } = await supabase.from("activity_logs").select("*").eq("user_id", user_id).order("created_at", { ascending: false }).limit(5);

    // 2. Prepare Context for Gemini
    const latestBalance = balanceHistory?.[0]?.recorded_balance || wallet?.balance || 0;
    const previousBalance = balanceHistory?.[1]?.recorded_balance || latestBalance;
    const dropAmount = previousBalance - latestBalance;
    const dropPercentage = previousBalance > 0 ? (dropAmount / previousBalance) * 100 : 0;
    
    const isSharpDrop = dropPercentage > 15; // 15% drop is significant

    const context = {
      user: { 
        name: profile?.first_name, 
        email: profile?.email,
        phone: profile?.phone_number,
        kyc_status: profile?.kyc_status,
        nationality: profile?.nationality
      },
      wallet: { 
        balance: wallet?.balance, 
        currency: wallet?.currency,
        is_sharp_drop: isSharpDrop,
        drop_percentage: dropPercentage.toFixed(1) + "%",
        drop_amount: dropAmount
      },
      savings: savingsGoals,
      loans: loans,
      recent_activity: ledgerHistory?.map(l => ({ type: l.type, amount: l.amount, desc: l.description, date: l.created_at })),
      balance_trend: balanceHistory?.map(h => ({ balance: h.recorded_balance, date: h.recorded_at })),
      security_activity: securityLogs?.map(s => ({ type: s.action_type, location: s.location, device: s.device_info, date: s.created_at }))
    };

    // 3. Ask Gemini for proactive advice
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    
    const prompt = `
      You are an expert AI Financial Advisor for Vault OS. 
      You have DIRECT ACCESS to the user's real-time financial and security data.
      Analyze the following data for user ${profile?.first_name || 'User'}:
      ${JSON.stringify(context, null, 2)}

      IMPORTANT ALERT CONDITION:
      The user's balance has dropped by ${dropPercentage.toFixed(1)}% since the last check.
      ${isSharpDrop ? "THIS IS A SHARP DROP. You MUST alert the user about this drop specifically." : ""}

      Task:
      Check for:
      - Sharp balance drops (finances dropping) - Priority #1.
      - Upcoming loan due dates (within 3 days).
      - Savings goals falling behind schedule.
      - Unusual spending patterns.
      - Security risks (e.g., login from new location or suspicious action).
      - KYC requirements (remind if unverified).

      If you identify a significant event (especially a sharp balance drop), return a JSON object with:
      {
        "should_notify": true,
        "title": "Short catchy title (e.g., 'Sharp Balance Drop Detected')",
        "message": "Direct, professional, and helpful message explaining the drop or risk",
        "type": "warning"
      }
      Note: Always use "warning" for sharp drops. For other minor insights, you can use "info".
      If everything looks normal and no immediate advice is needed, return:
      { "should_notify": false }

      Important: ONLY return the JSON object. No markdown, no explanation.
    `;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      }),
    });

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = JSON.parse(resultText || '{"should_notify": false}');

    // 4. Send Notification if needed
    if (result.should_notify) {
      // Check user preference
      if (profile?.notifications_ai_insights !== false) {
        const { error: notifyError } = await supabase.from("notifications").insert({
          user_id: user_id,
          title: result.title,
          message: result.message,
          type: result.type || "info"
        });

        if (notifyError) console.error("Error inserting notification:", notifyError);
      }

      // Update check result regardless of notification preference for audit
      await supabase.from("advisor_checks")
        .update({ result_summary: `${result.title}: ${result.message}` })
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(1);
    }

    return new Response(JSON.stringify({ success: true, notified: result.should_notify }), {
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
