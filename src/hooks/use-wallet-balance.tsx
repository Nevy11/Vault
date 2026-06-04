import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/api/supabase";
import { useProfileSignal } from "@/lib/profile-signal";
import { getCurrencyForNationality } from "@/lib/utils";

const KES_USD_RATE = 130.0;
const WALLET_CACHE_KEY = "vault_wallet_cache";

type WalletBalance = {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
} | null;

// Helper to get cached wallet
const getCachedWallet = (): WalletBalance => {
  if (typeof window === "undefined") return null;
  const cached = localStorage.getItem(WALLET_CACHE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch (e) {
    return null;
  }
};

type BalanceBreakdown = {
  amount: number;
  currency: string;
  label: string;
};

type UseWalletBalanceReturn = {
  balance: number | null;
  currency: string;
  loading: boolean;
  error: string | null;
  isRealtimeConnected: boolean;
  isSyncing: boolean;
  secondaryBalance?: BalanceBreakdown;
  refetch: () => Promise<void>;
  updateBalance: (newBalance: number) => Promise<void>;
  changeCurrency: (newCurrency: string) => Promise<void>;
};

export function useWalletBalance(): UseWalletBalanceReturn {
  const [profile] = useProfileSignal();
  const [wallet, setWallet] = useState<WalletBalance>(null);
  const walletRef = useRef<WalletBalance>(null);
  const [displayBalance, setDisplayBalance] = useState<number | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [secondaryBalance, setSecondaryBalance] = useState<BalanceBreakdown | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const channelRef = useRef<any>(null);

  // Initialize from cache on mount to avoid hydration mismatch
  useEffect(() => {
    const cached = getCachedWallet();
    if (cached) {
      setWallet(cached);
      walletRef.current = cached;
      setDisplayBalance(cached.balance);
      setDisplayCurrency(cached.currency);
      setLoading(false);

      const alternateCurrency = cached.currency === "USD" ? "KES" : "USD";
      const alternateAmount =
        cached.currency === "USD" ? cached.balance * KES_USD_RATE : cached.balance / KES_USD_RATE;

      setSecondaryBalance({
        amount: Number(alternateAmount.toFixed(2)),
        currency: alternateCurrency,
        label: alternateCurrency === "USD" ? "USD equivalent" : "KES equivalent",
      });
    }
  }, []);

  const resolvePreferredCurrency = useCallback(
    async (userId: string) => {
      const profileNationality = (profile as any)?.nationality || (profile as any)?.country || "";

      const { data: latestLog, error: logError } = await supabase
        .from("activity_logs")
        .select("location")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logError) {
        console.warn(
          "Unable to load latest activity log for currency resolution:",
          logError.message || logError,
        );
      }

      const rawNationality = profileNationality || latestLog?.location || "";
      const detected = getCurrencyForNationality(rawNationality);
      return detected === "KSH" ? "KES" : detected;
    },
    [profile],
  );

  const getUserId = useCallback(async (): Promise<string | null> => {
    if (profile?.id) {
      return profile.id;
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      throw authError;
    }

    return user?.id ?? null;
  }, [profile]);

  const computeBalances = useCallback(async (walletData: WalletBalance, userId: string) => {
    if (!walletData) {
      setDisplayBalance(null);
      setDisplayCurrency("USD");
      setSecondaryBalance(undefined);
      return;
    }

    const nativeCurrency = walletData.currency || "USD";
    const nativeAmount = Number(walletData.balance ?? 0);

    setDisplayBalance(nativeAmount);
    setDisplayCurrency(nativeCurrency);

    const alternateCurrency = nativeCurrency === "USD" ? "KES" : "USD";
    const alternateAmount =
      nativeCurrency === "USD" ? nativeAmount * KES_USD_RATE : nativeAmount / KES_USD_RATE;

    setSecondaryBalance({
      amount: Number(alternateAmount.toFixed(2)),
      currency: alternateCurrency,
      label: alternateCurrency === "USD" ? "USD equivalent" : "KES equivalent",
    });
  }, []);

  const fetchWallet = useCallback(
    async (isSilent = false) => {
      try {
        const currentUserId = profile?.id;
        if (!currentUserId) {
          if (!isSilent) setLoading(false);
          return;
        }

        setIsSyncing(true);
        if (!isSilent && !walletRef.current) setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", currentUserId)
          .maybeSingle();

        if (fetchError) {
          setError(fetchError.message);
        } else if (!data) {
          const preferredCurrency = await resolvePreferredCurrency(currentUserId);
          const { data: newWallet, error: createError } = await supabase
            .from("wallets")
            .insert([
              {
                user_id: currentUserId,
                balance: 0,
                currency: preferredCurrency,
              },
            ])
            .select()
            .single();

          if (createError) {
            setError(createError.message);
          } else {
            setWallet(newWallet);
            walletRef.current = newWallet;
            if (typeof window !== "undefined") {
              localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(newWallet));
            }
            await computeBalances(newWallet, currentUserId);
          }
        } else {
          const prev = walletRef.current;
          const changed =
            !prev ||
            prev.id !== data.id ||
            prev.balance !== data.balance ||
            prev.currency !== data.currency;

          if (changed) {
            setWallet(data);
            walletRef.current = data;
            if (typeof window !== "undefined") {
              localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(data));
            }
            await computeBalances(data, currentUserId);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        setIsSyncing(false);
      }
    },
    [computeBalances, profile?.id, resolvePreferredCurrency],
  );

  useEffect(() => {
    // 1. Try loading from cache first (Safe after mount)
    const cached = getCachedWallet();
    if (cached) {
      setWallet(cached);
      walletRef.current = cached;
      setDisplayBalance(cached.balance);
      setDisplayCurrency(cached.currency);
      setLoading(false);
    }
    // 2. Then fetch fresh data
    fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    let mounted = true;
    let channel: any;

    if (!profile?.id) return;

    const setupRealtime = () => {
      setIsSyncing(true);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const uniqueSuffix = Math.random().toString(36).substring(7);
      channel = supabase
        .channel(`wallet-balance-updates-${profile.id}-${uniqueSuffix}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "wallets",
            filter: `user_id=eq.${profile.id}`,
          },
          async () => {
            if (!mounted) return;
            console.log("Real-time wallet update detected, refetching...");
            await fetchWallet(true);
          },
        )
        .subscribe((status: string) => {
          if (!mounted) return;
          if (status === "SUBSCRIBED") {
            setIsRealtimeConnected(true);
            setIsSyncing(false);
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            setIsRealtimeConnected(false);
            setIsSyncing(false);
          }
        });

      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchWallet, profile?.id]);

  const refetch = async () => {
    await fetchWallet();
  };

  const updateBalance = async (newBalance: number) => {
    if (!wallet?.id) {
      setError("Wallet not found");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", wallet.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        const updatedWallet = {
          ...wallet,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        };
        setWallet(updatedWallet);
        walletRef.current = updatedWallet;
        if (profile?.id) {
          await computeBalances(updatedWallet, profile.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const changeCurrency = async (newCurrency: string) => {
    if (!wallet?.id) {
      setError("Wallet not found");
      return;
    }

    try {
      setIsSyncing(true);
      const { error: updateError } = await supabase
        .from("wallets")
        .update({ currency: newCurrency, updated_at: new Date().toISOString() })
        .eq("id", wallet.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        await fetchWallet(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    balance: displayBalance,
    currency: displayCurrency,
    loading,
    error,
    isRealtimeConnected,
    isSyncing,
    secondaryBalance,
    refetch,
    updateBalance,
    changeCurrency,
  };
}
