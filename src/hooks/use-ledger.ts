import { useEffect, useState } from "react";
import { supabase } from "@/api/supabase";
import { useProfileSignal } from "@/lib/profile-signal";

export type LedgerEntry = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  reference: string | null;
  description: string | null;
  created_at: string;
};

export function useLedger(enabled = true, currency?: string) {
  const [profile] = useProfileSignal();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const userId = profile?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from("ledger_entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (currency) {
        query = query.eq("currency", currency);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEntries(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    fetchLedger();

    const userId = profile?.id;
    if (!userId) return;

    const channelId = Math.random().toString(36).slice(2, 9);
    const channel = supabase
      .channel(`ledger_changes_${userId}_${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ledger_entries",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchLedger();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, enabled]);

  return { entries, loading, error, refetch: fetchLedger };
}
