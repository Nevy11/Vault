import { useState, useEffect } from "react";
import { supabase } from "@/api/supabase";
import { profileSignal } from "@/lib/profile-signal";

export function useWallet(providerType?: "vault" | "bank" | "mobile") {
  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWallet(userId: string) {
      // If 'vault', fetch the primary wallet.
      // For bank/mobile, in a real app you might have different tables,
      // but assuming they all map to the 'wallets' or a similar structure:
      const { data, error } = await supabase
        .from("wallets")
        .select("balance, currency")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        // Here you could apply logic based on providerType if necessary
        setWallet({ balance: Number(data.balance), currency: data.currency });
      }
      setLoading(false);
    }

    const currentProfile = profileSignal.get();
    if (!currentProfile?.id) {
      setLoading(false);
      return;
    }

    const userId = currentProfile.id;
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
  }, [providerType]);

  return { wallet, loading };
}
