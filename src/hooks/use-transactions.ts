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

export function useTransactions(enabled = true) {
  const [profile] = useProfileSignal();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Fetch transactions, ledger, and balance history simultaneously
      const [
        { data: transactionsData, error: transactionsError },
        { data: ledgerData, error: ledgerError },
        { data: historyData, error: historyError }
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select(
            `
            *,
            sender:profiles!sender_id(first_name, last_name, kyc_tag, profile_photo_url),
            receiver:profiles!receiver_id(first_name, last_name, kyc_tag, profile_photo_url)
          `,
          )
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
        supabase
          .from('ledger_entries')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('balance_history')
          .select('*')
          .order('recorded_at', { ascending: false })
      ]);

      if (transactionsError) throw transactionsError;
      if (ledgerError) throw ledgerError;
      if (historyError) throw historyError;

      // Map and merge
      const mappedTransactions = (transactionsData || []).map(t => {
        // Try to find exact match in balance_history first
        const snapshot = (historyData || []).find(h => 
          new Date(h.recorded_at).getTime() >= new Date(t.created_at).getTime() - 2000 &&
          new Date(h.recorded_at).getTime() <= new Date(t.created_at).getTime() + 2000
        );

        return {
          ...t,
          balance_after: snapshot ? Number(snapshot.recorded_balance) : t.balance_after,
          source: 'transactions' as const
        };
      });

      const mappedLedger = (ledgerData || []).map(l => {
        // Try to find exact match in balance_history first
        const snapshot = (historyData || []).find(h => 
          new Date(h.recorded_at).getTime() >= new Date(l.created_at).getTime() - 2000 &&
          new Date(h.recorded_at).getTime() <= new Date(l.created_at).getTime() + 2000
        );

        return {
          id: l.id,
          sender_id: userId,
          receiver_id: userId,
          type: l.type || 'transfer',
          method: 'vault' as const,
          amount: Number(l.amount),
          status: l.status === 'completed' ? 'completed' : 'pending',
          description: l.description || '',
          created_at: l.created_at,
          balance_after: snapshot ? Number(snapshot.recorded_balance) : null,
          source: 'ledger' as const,
        sender: {
          first_name: profile?.first_name || 'Vault',
          last_name: profile?.last_name || 'User',
          kyc_tag: '',
          profile_photo_url: profile?.profile_photo_url || null
        },
        receiver: {
          first_name: profile?.first_name || 'Vault',
          last_name: profile?.last_name || 'User',
          kyc_tag: '',
          profile_photo_url: profile?.profile_photo_url || null
        }
        };
      });

      // merge and sort newest -> oldest
      const merged = [...mappedTransactions, ...mappedLedger].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      // Try to fill missing balance_after values by deriving a running balance
      // Start from the current wallet balance (if available) and walk backwards
      let currentBalance: number | null = null;
      try {
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', userId)
          .maybeSingle();

        if (!walletError && walletData && typeof walletData.balance !== 'undefined') {
          currentBalance = Number(walletData.balance);
        }
      } catch (e) {
        // ignore wallet fetch errors — we'll gracefully fall back
        currentBalance = null;
      }

      if (currentBalance !== null) {
        const filled = merged.map((tx) => ({ ...tx }));
        for (const tx of filled) {
          // If DB already provided a balance_after, trust it and update currentBalance
          if (tx.balance_after != null) {
            currentBalance = Number(tx.balance_after);
            continue;
          }

          // Use currentBalance as the balance after this transaction
          tx.balance_after = currentBalance;

          // Determine net effect of this transaction on balance (positive = credit)
          let netEffect = 0;
          const amt = Number(tx.amount) || 0;
          if (tx.type === 'deposit') {
            netEffect = amt;
          } else if (tx.type === 'withdrawal') {
            netEffect = -amt;
          } else if (tx.type === 'transfer') {
            // If sender_id equals userId, it was an outgoing transfer (debit)
            if (tx.sender_id === userId) netEffect = -amt;
            else if (tx.receiver_id === userId) netEffect = amt;
            else netEffect = -amt; // conservative default
          } else {
            // Fallback: if amount is positive assume credit
            netEffect = amt;
          }

          // previous (older) balance before this tx
          currentBalance = Number((currentBalance - netEffect).toFixed(4));
        }

        setTransactions(filled as any);
      } else {
        setTransactions(merged as any);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchTransactions();

    const userId = profile?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`transaction_changes_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        (payload) => {
          // Manually check if the updated transaction involves the current user
          const record = payload.new || payload.old;
          if (record && (record.sender_id === userId || record.receiver_id === userId)) {
            fetchTransactions();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, enabled]);

  return { transactions, loading, error, refetch: fetchTransactions };
}
