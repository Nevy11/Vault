import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("CRITICAL: STRIPE_SECRET_KEY is not set in environment");
    return new Response(JSON.stringify({ error: "Server configuration error: Stripe key missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

    // Create a VerificationSession
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      options: {
        document: {
          require_id_number: true,
          require_matching_selfie: true,
          require_live_capture: true,
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
