import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/api/supabase';
import { useProfileSignal } from '@/lib/profile-signal';
import { getCurrencyForNationality } from '@/lib/utils';

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
};

export function useWalletBalance(): UseWalletBalanceReturn {
  const [profile] = useProfileSignal();
  const [wallet, setWallet] = useState<WalletBalance>(getCachedWallet());
  const walletRef = useRef<WalletBalance>(wallet);
  const [displayBalance, setDisplayBalance] = useState<number | null>(wallet?.balance ?? null);
  const [displayCurrency, setDisplayCurrency] = useState(wallet?.currency ?? 'USD');
  const [secondaryBalance, setSecondaryBalance] = useState<BalanceBreakdown | undefined>(undefined);
  const [loading, setLoading] = useState(!wallet);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const channelRef = useRef<any>(null);

  const resolvePreferredCurrency = useCallback(
    async (userId: string) => {
      const profileNationality = (profile as any)?.nationality || (profile as any)?.country || '';

      const { data: latestLog, error: logError } = await supabase
        .from('activity_logs')
        .select('location')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logError) {
        console.warn(
          'Unable to load latest activity log for currency resolution:',
          logError.message || logError,
        );
      }

      const rawNationality = profileNationality || latestLog?.location || '';
      return getCurrencyForNationality(rawNationality);
    },
    [profile],
  );

  const getUserId = useCallback(async (): Promise<string | null> => {
    if (profile?.id) {
      return profile.id;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      throw authError;
    }

    return user?.id ?? null;
  }, [profile]);

  const computeBalances = useCallback(
    async (walletData: WalletBalance, userId: string) => {
      if (!walletData) {
        setDisplayBalance(null);
        setDisplayCurrency('USD');
        setSecondaryBalance(undefined);
        return;
      }

      // We'll use the currency defined in the wallet record itself as the primary
      // instead of trying to resolve it from logs every time.
      const nativeCurrency = walletData.currency || 'USD';
      const nativeAmount = Number(walletData.balance ?? 0);
      
      // Determine if we should show a secondary balance (e.g. KES for USD wallets or vice-versa)
      // For now, we'll assume the native wallet currency is what the user wants to see primary.
      setDisplayBalance(nativeAmount);
      setDisplayCurrency(nativeCurrency);

      const alternateCurrency = nativeCurrency === 'USD' ? 'KSH' : 'USD';
      const alternateAmount = nativeCurrency === 'USD'
        ? nativeAmount * KES_USD_RATE
        : nativeAmount / KES_USD_RATE;

      setSecondaryBalance({
        amount: Number(alternateAmount.toFixed(2)),
        currency: alternateCurrency,
        label: alternateCurrency === 'USD' ? 'USD equivalent' : 'KES equivalent',
      });
    },
    [],
  );

  const fetchWallet = useCallback(async (isSilent = false) => {
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
        .from('wallets')
        .select('*')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
      } else if (!data) {
        // Only create if it definitely doesn't exist and we aren't in a loop
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert([
            {
              user_id: currentUserId,
              balance: 0,
              currency: 'USD',
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
        // Update local state only if data actually changed
        const prev = walletRef.current;
        const changed = !prev || prev.id !== data.id || prev.balance !== data.balance || prev.currency !== data.currency;
        
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
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [computeBalances, profile?.id]);

  useEffect(() => {
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

      // Use a unique suffix to prevent channel name collisions
      const uniqueSuffix = Math.random().toString(36).substring(7);
      channel = supabase
        .channel(`wallet-balance-updates-${profile.id}-${uniqueSuffix}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'wallets', 
            filter: `user_id=eq.${profile.id}` 
          },
          async () => {
            if (!mounted) return;
            console.log("Real-time wallet update detected, refetching...");
            await fetchWallet(true);
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'balances', filter: `user_id=eq.${profile.id}` },
          async () => {
            if (!mounted) return;
            await fetchWallet();
          },
        )
        .subscribe((status: string) => {
          if (!mounted) return;
          if (status === 'SUBSCRIBED') {
            setIsRealtimeConnected(true);
            setIsSyncing(false);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
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
      setError('Wallet not found');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        const updatedWallet = { ...wallet, balance: newBalance, updated_at: new Date().toISOString() };
        setWallet(updatedWallet);
        walletRef.current = updatedWallet;
        const userId = await getUserId();
        if (userId) {
          await computeBalances(updatedWallet, userId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
  };
}
