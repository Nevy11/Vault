import { supabase } from "@/api/supabase";

/**
 * Type Definition for Receipt Data
 */
export interface Receipt {
  id: string;
  user_id: string;
  transaction_id: string;
  receipt_number: string;
  amount: number;
  currency: string;
  transaction_details: {
    type: string;
    method: string;
    description: string;
    completed_at: string;
  };
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Fetch Paginated Receipts (Client-side)
 */
export const getReceipts = async (payload: { data: { userId: string; page?: number; pageSize?: number } }) => {
  const { userId, page = 0, pageSize = 10 } = payload.data;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  console.log(`Fetching receipts for user ${userId}, range: ${from}-${to}`);

  const { data, error, count } = await supabase
    .from("receipts")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Supabase error fetching receipts:", error);
    throw new Error(error.message);
  }

  console.log(`Found ${data?.length || 0} receipts for user ${userId}`);

  return {
    receipts: (data as Receipt[]) || [],
    totalCount: count || 0,
  };
};

/**
 * Fetch Single Receipt Details (Client-side)
 */
export const getReceiptDetails = async (payload: { data: { receiptId: string } }) => {
  const { receiptId } = payload.data;
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", receiptId)
    .single();

  if (error) throw new Error(error.message);
  return data as Receipt;
};
