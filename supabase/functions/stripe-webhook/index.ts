import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  const stripe = new Stripe(stripeKey || "", {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret || ""
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`Processing event: ${event.type}`);

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { user_id } = paymentIntent.metadata;
      const amount = paymentIntent.amount / 100; // Convert cents to decimal
      const currency = paymentIntent.currency.toUpperCase();

      console.log(`Payment succeeded for user ${user_id}: ${amount} ${currency}`);

      // Insert into ledger using the RPC function for atomicity
      const { data, error } = await supabase.rpc("create_ledger_entry", {
        p_user_id: user_id,
        p_amount: amount,
        p_currency: currency,
        p_type: "deposit",
        p_reference: paymentIntent.id,
        p_description: `Stripe Deposit: ${paymentIntent.id}`,
        p_metadata: { stripe_payment_intent: paymentIntent.id },
        p_status: "completed"
      });

      if (error) {
        console.error("Error creating ledger entry:", error);
        return new Response("Internal Server Error", { status: 500 });
      }

      console.log("Ledger entry created successfully:", data);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error.message);
    return new Response("Internal Server Error", { status: 500 });
  }
});
