import axios from "axios";
import { Request, Response, NextFunction } from "express";

/**
 * 1. OAUTH TOKEN MANAGEMENT
 */
interface DarajaToken {
  access_token: string;
  expires_in: string;
  timestamp: number;
}

let cachedToken: DarajaToken | null = null;

export const getDarajaToken = async () => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("M-PESA credentials missing in environment variables");
  }

  // Check cache (Safaricom tokens usually last 3600 seconds)
  if (
    cachedToken &&
    Date.now() - cachedToken.timestamp < (parseInt(cachedToken.expires_in) - 60) * 1000
  ) {
    return cachedToken.access_token;
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const response = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: { Authorization: `Basic ${auth}` },
    },
  );

  cachedToken = {
    ...response.data,
    timestamp: Date.now(),
  };

  return response.data.access_token;
};

/**
 * 2. STK PUSH UTILS
 */
export const generateMpesaPassword = (shortCode: string, passKey: string, timestamp: string) => {
  return Buffer.from(`${shortCode}${passKey}${timestamp}`).toString("base64");
};

export const getTimestamp = () => {
  return new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
};

/**
 * 3. STK PUSH ENDPOINT HANDLER
 */
export const initiateStkPush = async (req: Request, res: Response) => {
  const { phone, amount, userId } = req.body;

  // Validation: Ensure 254XXXXXXXXX format
  const formattedPhone = phone.replace(/[^0-9]/g, "");
  if (!/^254\d{9}$/.test(formattedPhone)) {
    return res.status(400).json({ error: "Invalid phone number format. Must be 254XXXXXXXXX" });
  }

  try {
    const token = await getDarajaToken();
    const timestamp = getTimestamp();
    const storeNumber = process.env.MPESA_STORE_NUMBER || process.env.MPESA_SHORTCODE || "4237581";
    const tillNumber = process.env.MPESA_TILL_NUMBER || "3491665";
    const passKey = process.env.MPESA_PASSKEY || "";

    const password = generateMpesaPassword(storeNumber, passKey, timestamp);

    const payload = {
      BusinessShortCode: storeNumber,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: tillNumber,
      PhoneNumber: formattedPhone,
      CallBackURL: `${process.env.APP_BASE_URL}/api/v1/vault/callback`,
      AccountReference: `Vault_${userId}`,
      TransactionDesc: "Wallet Deposit",
    };

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/query", // or /v1/processrequest
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    // PERSISTENCE: Save pending transaction to DB here
    // await db.transactions.create({ data: { checkoutRequestId: response.data.CheckoutRequestID, ... } })

    return res.status(200).json(response.data);
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error("M-PESA STK Push Error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to initiate STK Push" });
  }
};

/**
 * 4. WEBHOOK CALLBACK HANDLER
 */
export const handleMpesaCallback = async (req: Request, res: Response) => {
  const { Body } = req.body;

  if (!Body || !Body.stkCallback) {
    return res.status(400).send("Invalid callback payload");
  }

  const { ResultCode, ResultDesc, CallbackMetadata, CheckoutRequestID } = Body.stkCallback;

  try {
    if (ResultCode === 0) {
      // Success: Securely parse metadata array
      const metadata: Record<string, unknown> = {};
      CallbackMetadata.Item.forEach((item: { Name: string; Value: unknown }) => {
        metadata[item.Name] = item.Value;
      });

      const mpesaReceipt = metadata.MpesaReceiptNumber;
      const amount = metadata.Amount;
      const phoneNumber = metadata.PhoneNumber;

      console.log(`Transaction Success: ${mpesaReceipt} for ${amount} by ${phoneNumber}`);

      // PERSISTENCE: Update DB record
      // await db.transactions.update({
      //   where: { checkoutRequestId: CheckoutRequestID },
      //   data: { status: 'SUCCESS', mpesaReceipt, rawLogs: Body }
      // });
    } else {
      console.warn(`Transaction Failed/Cancelled: ${ResultDesc}`);
      // await db.transactions.update({ where: { checkoutRequestId: CheckoutRequestID }, data: { status: 'FAILED' } });
    }

    return res.status(200).send("Callback Received");
  } catch (error) {
    console.error("Callback Processing Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};
