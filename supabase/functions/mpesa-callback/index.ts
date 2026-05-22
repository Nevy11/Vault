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
    
    // Update the transaction status based on the CheckoutRequestID
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("description", checkoutRequestId); // Using description as a temporary store for checkoutRequestId

    if (updateError) {
      console.error("Error updating transaction status:", updateError);
    }
  } else {
    // Failure
    console.log("Transaction Failed:", checkoutRequestId, body.ResultDesc);
  }

  return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }), {
    headers: { "Content-Type": "application/json" },
  });
});
