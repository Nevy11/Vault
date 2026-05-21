import { supabase } from "./supabase";

/**
 * Initiates an M-Pesa STK Push by calling the secure Supabase Edge Function.
 */
export async function initiateStkPush(params: {
  userId: string;
  phoneNumber: string;
  amount: number;
}) {
  try {
    // Normalize phone number
    let phone = params.phoneNumber.replace(/[^0-9]/g, "");
    if (phone.startsWith("0")) {
      phone = "254" + phone.slice(1);
    } else if (phone.startsWith("7") || phone.startsWith("1")) {
      phone = "254" + phone;
    }

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke("mpesa-deposit", {
      body: { 
        phoneNumber: phone, 
        amount: Math.round(params.amount) 
      },
    });

    if (error) {
      console.error("Edge Function error:", error);
      throw new Error(error.message || "Failed to initiate M-Pesa deposit");
    }

    // Create pending transaction in database
    await supabase.from("transactions").insert({
      sender_id: params.userId,
      type: "deposit",
      method: "mpesa",
      amount: params.amount,
      status: "pending",
      description: data.CheckoutRequestID, // Store ID here to match with callback
    });

    return data;
  } catch (error: any) {
    console.error("M-Pesa STK Push error:", error);
    throw error;
  }
}
