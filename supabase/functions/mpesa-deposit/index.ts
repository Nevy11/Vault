import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Support both VITE_ prefixed (legacy) and clean env var names
const CONSUMER_KEY = Deno.env.get("DARAJA_CONSUMER_KEY") || Deno.env.get("VITE_DARAJA_CONSUMER_KEY")!;
const CONSUMER_SECRET = Deno.env.get("DARAJA_CONSUMER_SECRET") || Deno.env.get("VITE_DARAJA_CONSUMER_SECRET")!;
const ENV = Deno.env.get("DARAJA_ENV") || Deno.env.get("VITE_DARAJA_ENV") || "sandbox";
const SHORTCODE = Deno.env.get("DARAJA_SHORTCODE") || Deno.env.get("VITE_DARAJA_SHORTCODE") || "174379";
const PASSKEY = Deno.env.get("DARAJA_PASSKEY") || Deno.env.get("VITE_DARAJA_PASSKEY") || Deno.env.get("VITE_DARAJA_PASS_KEY") || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

const DARAJA_AUTH_URL = ENV === "sandbox"
  ? "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
  : "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

const DARAJA_STK_PUSH_URL = ENV === "sandbox"
  ? "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
  : "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

async function getAccessToken() {
  const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
  const response = await fetch(DARAJA_AUTH_URL, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!response.ok) throw new Error("Failed to get Daraja access token");
  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { phoneNumber, amount } = await req.json();
    const accessToken = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    
    const password = btoa(`${SHORTCODE}${PASSKEY}${timestamp}`);

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: phoneNumber,
      PartyB: SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: `${Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL")}/functions/v1/mpesa-callback`,
      AccountReference: "VaultDeposit",
      TransactionDesc: `Deposit of ${amount}`,
    };

    const response = await fetch(DARAJA_STK_PUSH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
