import { useState, useEffect } from "react";
import { supabase } from "@/api/supabase";
import { useProfile } from "@/hooks/use-profile";

export function useWallet(providerType?: "vault" | "bank" | "mobile") {
  const { profile } = useProfile();
  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    async function fetchWallet(userId: string) {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance, currency")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        setWallet({ balance: Number(data.balance), currency: data.currency });
      }
      setLoading(false);
    }

    const userId = profile.id;
    fetchWallet(userId);

    const channelId = Math.random().toString(36).slice(2, 9);
    const channel = supabase
      .channel(`wallet_changes_${userId}_${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchWallet(userId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerType, profile?.id]);

  return { wallet, loading };
}
