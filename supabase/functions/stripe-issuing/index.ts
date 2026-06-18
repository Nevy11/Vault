import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  if (
    !stripeKey ||
    stripeKey === "sk_test_YOUR_KEY_HERE" ||
    stripeKey.includes("y8z9") ||
    stripeKey.length < 20
  ) {
    console.error("CRITICAL: STRIPE_SECRET_KEY is not set or is a placeholder");
    return new Response(
      JSON.stringify({
        error:
          "Server configuration error: Valid Stripe secret key missing. Please set STRIPE_SECRET_KEY in Supabase secrets.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Clean the key: remove any wrapping quotes or brackets that might have been added accidentally
  stripeKey = stripeKey.replace(/^["'[]+|["'\]]+$/g, "");

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const { action, userId, cardholderId } = await req.json();

    if (action === "create-cardholder") {
      // In a real app, fetch user profile from DB first
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        throw new Error("User profile not found");
      }

      const cardholder = await stripe.issuing.cardholders.create({
        name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        phone_number: profile.phone_number || undefined,
        status: "active",
        type: "individual",
        billing: {
          address: {
            line1: "123 Vault St", // Placeholder - should come from profile/KYC
            city: "Nairobi",
            state: "KE",
            postal_code: "00100",
            country: "KE",
          },
        },
        metadata: {
          user_id: userId,
        },
      });

      return new Response(JSON.stringify(cardholder), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "create-card") {
      if (!cardholderId) throw new Error("Cardholder ID is required");

      const card = await stripe.issuing.cards.create({
        cardholder: cardholderId,
        currency: "usd",
        type: "virtual",
        status: "active",
      });

      return new Response(JSON.stringify(card), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
