import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")?.trim();

  if (!stripeKey) {
    console.error("CRITICAL: STRIPE_SECRET_KEY is not set");
    return new Response("Configuration Error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("Error: No stripe-signature header");
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    let event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret || "");
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`🔔 Webhook Event Received: ${event.type}`);

    let user_id: string | undefined;
    let amount: number | undefined;
    let currency: string | undefined;
    let reference: string | undefined;
    const payment_method: string = "bank";

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      user_id = paymentIntent.metadata.user_id;
      amount = paymentIntent.amount / 100;
      currency = paymentIntent.currency.toUpperCase();
      reference = paymentIntent.id;
      console.log(`Processing PaymentIntent ${reference} for user ${user_id}`);
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      user_id = session.metadata?.user_id;
      amount = (session.amount_total || 0) / 100;
      currency = (session.currency || "USD").toUpperCase();
      reference = (session.payment_intent as string) || session.id;
      console.log(`Processing Checkout Session ${session.id} for user ${user_id}`);
    } else if (event.type === "identity.verification_session.verified") {
      const session = event.data.object as any;
      user_id = session.metadata?.user_id;
      console.log(`✅ Identity Verified for user: ${user_id}`);

      if (user_id) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ kyc_status: "verified", updated_at: new Date().toISOString() })
          .eq("id", user_id);

        if (updateError) {
          console.error("Error updating profile kyc_status:", updateError);
        }
      }
    } else if (event.type === "identity.verification_session.requires_input") {
      const session = event.data.object as any;
      user_id = session.metadata?.user_id;
      console.log(`ℹ️ Identity Requires Input for user: ${user_id}`);

      if (user_id) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ kyc_status: "unverified", updated_at: new Date().toISOString() })
          .eq("id", user_id);

        if (updateError) {
          console.error("Error updating profile kyc_status:", updateError);
        }
      }
    } else if (event.type === "identity.verification_session.canceled") {
      const session = event.data.object as any;
      user_id = session.metadata?.user_id;
      console.log(`❌ Identity Canceled for user: ${user_id}`);
    }

    if (
      (event.type === "payment_intent.succeeded" || event.type === "checkout.session.completed") &&
      user_id &&
      user_id !== "unknown" &&
      amount &&
      amount > 0
    ) {
      // Validate UUID format to prevent RPC crash
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user_id)) {
        console.error(`Error: Invalid user_id format: ${user_id}`);
        return new Response("Invalid User ID", { status: 400 });
      }

      console.log(`Attempting to record ledger entry for user ${user_id}...`);

      const { data, error: rpcError } = await supabase.rpc("create_ledger_entry", {
        p_user_id: user_id,
        p_amount: amount,
        p_currency: currency || "USD",
        p_type: "deposit",
        p_reference: reference,
        p_description: `Stripe Deposit: ${reference}`,
        p_metadata: {
          stripe_event_type: event.type,
          payment_method: payment_method,
        },
        p_status: "completed",
      });

      if (rpcError) {
        console.error("CRITICAL: Error calling create_ledger_entry:", JSON.stringify(rpcError));
        return new Response("Internal Server Error", { status: 500 });
      }

      console.log(`✅ Transaction recorded successfully. Ledger ID: ${data}`);
    } else {
      console.warn(
        `⚠️ Skipped processing event ${event.type}: Missing or unknown user_id/amount. (User: ${user_id}, Amount: ${amount})`,
      );
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
