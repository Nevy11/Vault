import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

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
        error: "Server configuration error: Valid Stripe secret key missing. Please set STRIPE_SECRET_KEY in Supabase secrets." 
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

  try {
    // Validate request method
    if (req.method !== "POST") {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const body = await req.json();
    console.log("Received request body:", JSON.stringify(body));

    const { amount, currency = "usd", user_id } = body;

    if (!amount || isNaN(Number(amount))) {
      console.error("Invalid amount received:", amount);
      return new Response(JSON.stringify({ error: "Valid numeric amount is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "http://localhost:8081";
    const unitAmount = Math.round(Number(amount) * 100);

    console.log(`Creating session: ${unitAmount} ${currency} for user ${user_id}`);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "us_bank_account"],
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ["payment_method"],
          },
        },
      },
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: "Vault Wallet Deposit",
              description: `Deposit to Vault Wallet`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard`,
      metadata: {
        user_id: user_id || "unknown",
      },
      payment_intent_data: {
        metadata: {
          user_id: user_id || "unknown",
        },
      },
    });

    console.log("Session created successfully:", session.id);

    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Stripe Checkout Error Detail:", error);

    // Attempt to extract the most descriptive error message
    const message = error.raw?.message || error.message || "An unexpected error occurred";

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
