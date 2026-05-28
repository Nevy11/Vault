import { useEffect, useState } from "react";
import { supabase } from "@/api/supabase";
import { useProfileSignal } from "@/lib/profile-signal";

export type Transaction = {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  type: "transfer" | "deposit" | "withdrawal";
  method: "vault" | "mpesa" | "bank";
  amount: number;
  status: "pending" | "completed" | "failed";
  description: string;
  created_at: string;
  balance_after: number | null;
  sender?: {
    first_name: string;
    last_name: string;
    kyc_tag: string;
    profile_photo_url: string | null;
  };
  receiver?: {
    first_name: string;
    last_name: string;
    kyc_tag: string;
    profile_photo_url: string | null;
  };
};

export interface TransactionOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: "transfer" | "deposit" | "withdrawal" | "all";
  status?: "pending" | "completed" | "failed" | "all";
}

export function useTransactions(enabled = true, options: TransactionOptions = {}) {
  const [profile] = useProfileSignal();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    page = 0,
    pageSize = 10,
    search = "",
    type = "all",
    status = "all"
  } = options;

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      let userId = profile?.id;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }
      
      if (!userId) {
        setLoading(false);
        return;
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("transactions")
        .select(
          `
          *,
          sender:profiles!sender_id(first_name, last_name, kyc_tag, profile_photo_url),
          receiver:profiles!receiver_id(first_name, last_name, kyc_tag, profile_photo_url)
          `,
          { count: "exact" }
        )
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .range(from, to);

      // Apply Filters
      if (type !== "all") {
        query = query.eq("type", type);
      }
      if (status !== "all") {
        query = query.eq("status", status);
      }
      if (search) {
        query = query.ilike("description", `%${search}%`);
      }

      const { data, error: txError, count } = await query;

      if (txError) throw txError;

      if (page === 0) {
        setTransactions(data as Transaction[] || []);
      } else {
        setTransactions(prev => [...prev, ...(data as Transaction[] || [])]);
      }
      
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error("Error fetching transactions:", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    fetchTransactions();
  }, [profile?.id, enabled, page, search, type, status]);

  useEffect(() => {
    if (!enabled || !profile?.id) return;

    const channel = supabase
      .channel(`transactions_realtime_${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `sender_id=eq.${profile.id}`,
        },
        () => fetchTransactions()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `receiver_id=eq.${profile.id}`,
        },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, enabled]);

  return { 
    transactions, 
    totalCount, 
    loading, 
    error, 
    refetch: fetchTransactions,
    hasMore: transactions.length < totalCount
  };
}
