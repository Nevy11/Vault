import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload = await req.json();
  console.log("M-Pesa Callback Received:", JSON.stringify(payload));

  // Extract M-Pesa Result
  const body = payload.Body.stkCallback;
  const resultCode = body.ResultCode;
  const checkoutRequestId = body.CheckoutRequestID;

  if (resultCode === 0) {
    // Success: Update database
    console.log("Transaction Success:", checkoutRequestId);
    
    // 1. Fetch the pending transaction
    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("description", checkoutRequestId)
      .eq("status", "pending")
      .maybeSingle();

    if (txError || !tx) {
      console.error("Error fetching transaction:", txError || "Transaction not found");
      return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Transaction not found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = tx.receiver_id || tx.sender_id;

    // 2. Update wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", userId)
      .single();

    if (walletError || !wallet) {
      console.error("Error fetching wallet:", walletError || "Wallet not found");
      return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Wallet not found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const newBalance = Number(wallet.balance) + Number(tx.amount);

    const { error: walletUpdateError } = await supabase
      .from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (walletUpdateError) {
      console.error("Error updating wallet balance:", walletUpdateError);
      return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "Wallet update failed" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Update the transaction status and balance_after
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ 
        status: "completed",
        balance_after: newBalance
      })
      .eq("id", tx.id);

    // 4. Record in immutable ledger
    await supabase.from("ledger_entries").insert({
      user_id: userId,
      amount: tx.amount,
      currency: "USD",
      type: "deposit",
      status: "completed",
      reference: checkoutRequestId,
      description: `M-Pesa Deposit: ${checkoutRequestId}`,
      metadata: { mpesa_checkout_id: checkoutRequestId, payment_method: 'mpesa' }
    });

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }), {
      headers: { "Content-Type": "application/json" },
    });
});
