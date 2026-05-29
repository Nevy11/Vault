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

  const { page = 0, pageSize = 10, search = "", type = "all", status = "all" } = options;

  const getUserId = async (): Promise<string | null> => {
    if (profile?.id) {
      return profile.id;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      // 1. Fetch transactions (with pagination and filtering)
      let query = supabase
        .from("transactions")
        .select(
          `
          *,
          sender:profiles!sender_id(first_name, last_name, kyc_tag, profile_photo_url),
          receiver:profiles!receiver_id(first_name, last_name, kyc_tag, profile_photo_url)
          `,
          { count: "exact" },
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

      // 2. Fetch recent balance snapshots for balance_after mapping
      const { data: historyData, error: historyError } = await supabase
        .from("balance_history")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(50); // Fetch a reasonable number of history snapshots

      const { data, error: txError, count } = await query;
      if (txError) throw txError;
      if (historyError) throw historyError;

      // Map transactions and inject balance_after from history
      const mappedTransactions = (data || []).map((t) => {
        const snapshot = (historyData || []).find(
          (h) =>
            new Date(h.recorded_at).getTime() >= new Date(t.created_at).getTime() - 2000 &&
            new Date(h.recorded_at).getTime() <= new Date(t.created_at).getTime() + 2000,
        );

        return {
          ...t,
          balance_after: snapshot ? Number(snapshot.recorded_balance) : t.balance_after,
          source: "transactions" as const,
        };
      });

      if (page === 0) {
        setTransactions((mappedTransactions as Transaction[]) || []);
      } else {
        setTransactions((prev) => [...prev, ...((mappedTransactions as Transaction[]) || [])]);
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
        () => fetchTransactions(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `receiver_id=eq.${profile.id}`,
        },
        () => fetchTransactions(),
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
    hasMore: transactions.length < totalCount,
  };
}
