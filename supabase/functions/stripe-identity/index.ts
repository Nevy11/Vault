import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  if (!stripeKey || stripeKey === "sk_test_YOUR_KEY_HERE" || stripeKey.includes("y8z9") || stripeKey.length < 20) {
    console.error("CRITICAL: STRIPE_SECRET_KEY is not set or is a placeholder");
    return new Response(
      JSON.stringify({ 
        error: "Server configuration error: Valid Stripe secret key missing. Please set STRIPE_SECRET_KEY in Supabase secrets with 'supabase secrets set STRIPE_SECRET_KEY=sk_test_...'" 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Clean the key: remove any wrapping quotes or brackets that might have been added accidentally
  stripeKey = stripeKey.replace(/^["'[]+|["'\]]+$/g, "");

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { user_id } = body;

    console.log("Received request body:", JSON.stringify(body));

    if (!user_id) {
      console.warn("User ID missing in request");
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Creating Identity VerificationSession for user: ${user_id}`);

    // Create a VerificationSession with strict options for biometric verification
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      options: {
        document: {
          require_id_number: true,
          require_matching_selfie: true, // Triggers selfie capture
          require_live_capture: true,    // Forces liveness detection (prevents photo-of-photo)
          // allow_selfie_capture_method: "auto", // Note: This is usually handled by the SDK
        },
      },
      metadata: {
        user_id: user_id,
      },
    });

    // Update profile status to pending
    await supabase
      .from("profiles")
      .update({ kyc_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", user_id);

    return new Response(
      JSON.stringify({
        url: session.url,
        id: session.id,
        client_secret: session.client_secret,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error creating VerificationSession:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
