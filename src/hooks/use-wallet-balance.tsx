import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/api/supabase';
import { useProfileSignal } from '@/lib/profile-signal';
import { getCurrencyForNationality } from '@/lib/utils';

const KES_USD_RATE = 130.0;

type WalletBalance = {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
} | null;

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
  const [wallet, setWallet] = useState<WalletBalance>(null);
  const [displayBalance, setDisplayBalance] = useState<number | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [secondaryBalance, setSecondaryBalance] = useState<BalanceBreakdown | undefined>(undefined);
  const [loading, setLoading] = useState(true);
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

      const preferredCurrency = await resolvePreferredCurrency(userId);
      const nativeCurrency = walletData.currency || 'USD';
      const nativeAmount = Number(walletData.balance ?? 0);
      let primaryCurrency = nativeCurrency;
      let primaryAmount = nativeAmount;

      if (preferredCurrency !== nativeCurrency) {
        primaryCurrency = preferredCurrency;
        if (nativeCurrency === 'USD' && preferredCurrency === 'KSH') {
          primaryAmount = nativeAmount * KES_USD_RATE;
        } else if (nativeCurrency === 'KSH' && preferredCurrency === 'USD') {
          primaryAmount = nativeAmount / KES_USD_RATE;
        }
      }

      setDisplayBalance(primaryAmount);
      setDisplayCurrency(primaryCurrency);

      const alternateCurrency = primaryCurrency === 'USD' ? 'KSH' : 'USD';
      const alternateAmount = primaryCurrency === 'USD'
        ? primaryAmount * KES_USD_RATE
        : primaryAmount / KES_USD_RATE;

      setSecondaryBalance({
        amount: Number(alternateAmount.toFixed(2)),
        currency: alternateCurrency,
        label: alternateCurrency === 'USD' ? 'USD equivalent' : 'KES equivalent',
      });
    },
    [resolvePreferredCurrency],
  );

  const fetchWallet = useCallback(async () => {
    try {
      setIsSyncing(true);
      setLoading(true);
      setError(null);

      const userId = await getUserId();
      if (!userId) {
        setLoading(false);
        setIsSyncing(false);
        return;
      }

      const preferredCurrency = await resolvePreferredCurrency(userId);

      const { data, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          const { data: newWallet, error: createError } = await supabase
            .from('wallets')
            .insert([
              {
                user_id: userId,
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
            await computeBalances(newWallet, userId);
          }
        } else {
          setError(fetchError.message);
        }
      } else {
        if (data.currency !== preferredCurrency) {
          const { error: updateCurrencyError } = await supabase
            .from('wallets')
            .update({ currency: preferredCurrency, updated_at: new Date().toISOString() })
            .eq('id', data.id);

          if (!updateCurrencyError) {
            data.currency = preferredCurrency;
          }
        }

        setWallet(data);
        await computeBalances(data, userId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [computeBalances, getUserId, resolvePreferredCurrency]);

  useEffect(() => {
    fetchWallet();
  }, [profile?.id, fetchWallet]);

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
          { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${profile.id}` },
          async () => {
            if (!mounted) return;
            await fetchWallet();
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
