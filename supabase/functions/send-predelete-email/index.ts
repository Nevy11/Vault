import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("CRITICAL: Missing Supabase environment variables");
      return new Response(JSON.stringify({ error: "INTERNAL_CONFIG_ERROR" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Authorize request using the user's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Auth header missing");
      return new Response(JSON.stringify({ error: "MISSING_AUTH_HEADER" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "INVALID_TOKEN", details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get Password (no longer verifying, but keeping for request compatibility if needed)
    // Actually, let's just ignore it and use the JWT user directly.
    const email = user.email;

    if (!email) {
      console.error("User email not found in JWT");
      return new Response(JSON.stringify({ error: "EMAIL_NOT_FOUND" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log(`DEBUG: Bypassing password check for ${email}. Proceeding to email confirmation.`);

    // 2. Check Balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (wallet && Number(wallet.balance) > 0) {
      return new Response(
        JSON.stringify({ error: "Account balance must be zero before deletion." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4. Check Loans
    const { data: activeLoans, error: loanError } = await supabaseClient
      .from("loans")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (activeLoans && activeLoans.length > 0) {
      return new Response(
        JSON.stringify({ error: "All loans must be repaid fully before deletion." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 5. Check Savings
    const { data: activeSavings, error: savingsError } = await supabaseClient
      .from("savings_goals")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (activeSavings && activeSavings.length > 0) {
      return new Response(
        JSON.stringify({ error: "All savings must be withdrawn before deletion." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 6. Send Native Supabase Email using the 'Magic Link' template
    // We are repurposing this template as the Deletion template
    const origin = req.headers.get("origin") || "https://your-app-url.com";
    const { error: otpError } = await supabaseClient.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${origin}/confirm-deletion`,
      },
    });

    if (otpError) {
      console.error("OTP Error:", otpError.message);
      throw otpError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Confirmation email sent via Magic Link template" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
