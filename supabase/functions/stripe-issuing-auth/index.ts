import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  let stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  if (!stripeKey || stripeKey === "sk_test_YOUR_KEY_HERE" || stripeKey.includes("y8z9") || stripeKey.length < 20) {
    console.error("CRITICAL: STRIPE_SECRET_KEY is not set or is a placeholder");
    return new Response(
      JSON.stringify({ 
        error: "Server configuration error: Valid Stripe secret key missing. Please set STRIPE_SECRET_KEY in Supabase secrets." 
      }), 
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Clean the key: remove any wrapping quotes or brackets that might have been added accidentally
  stripeKey = stripeKey.replace(/^["'[]+|["'\]]+$/g, "");

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("No signature", { status: 400 });

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_ISSUING_AUTH_SECRET");
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret || "");

    console.log(`Issuing Webhook Event: ${event.type}`);

    if (event.type === "issuing_authorization.request") {
      const auth = event.data.object as Stripe.Issuing.Authorization;
      const userId = auth.cardholder.metadata.user_id;
      const amount = auth.amount / 100; // Stripe cents to decimal
      const currency = auth.currency.toUpperCase();

      // 1. Check dynamic balance from ledger view
      const { data: balanceData, error: balanceError } = await supabase
        .from("wallet_balances")
        .select("balance")
        .eq("user_id", userId)
        .eq("currency", currency)
        .single();

      const currentBalance = balanceData?.balance || 0;

      if (balanceError && balanceError.code !== "PGRST116") {
        console.error("Balance check error:", balanceError);
        return new Response(JSON.stringify({ error: "Balance check failed" }), { status: 500 });
      }

      if (currentBalance >= amount) {
        // APPROVE
        console.log(`Approving auth for user ${userId}: ${amount} ${currency}`);

        // Create a PENDING ledger entry to "reserve" the funds
        await supabase.rpc("create_ledger_entry", {
          p_user_id: userId,
          p_amount: -amount, // Debit
          p_currency: currency,
          p_type: "issuing_auth",
          p_reference: auth.id,
          p_description: `Card Auth: ${auth.merchant_data.name}`,
          p_status: "pending",
        });

        // Respond to Stripe to approve
        // Note: In some webhook implementations, you respond with a JSON body
        // that Stripe expects for real-time auth.
        // For Stripe Issuing, you usually respond with status 200 and a specific payload
        // if you are using 'control_all_authorizations'.
        return new Response(JSON.stringify({ approve: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // DECLINE
        console.log(
          `Declining auth for user ${userId}: Insufficient funds (${currentBalance} < ${amount})`,
        );
        return new Response(JSON.stringify({ approve: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (event.type === "issuing_transaction.created") {
      const transaction = event.data.object as Stripe.Issuing.Transaction;
      const authId = transaction.authorization as string;

      // Finalize the ledger entry: Move from pending to completed
      const { error } = await supabase
        .from("ledger_entries")
        .update({ status: "completed" })
        .eq("reference", authId)
        .eq("status", "pending");

      if (error) console.error("Error finalizing ledger entry:", error);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error("Issuing Auth Webhook Error:", error.message);
    return new Response("Error", { status: 500 });
  }
});
