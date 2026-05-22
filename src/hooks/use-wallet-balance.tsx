import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfileSignal } from '@/lib/profile-signal';
import { getCurrencyForNationality } from '@/lib/utils';

type WalletBalance = {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
} | null;

type UseWalletBalanceReturn = {
  balance: number | null;
  currency: string;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateBalance: (newBalance: number) => Promise<void>;
};

export function useWalletBalance(): UseWalletBalanceReturn {
  const [profile] = useProfileSignal();
  const [wallet, setWallet] = useState<WalletBalance>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvePreferredCurrency = async (userId: string) => {
    const profileNationality = (profile as any)?.nationality || (profile as any)?.country || "";

    const { data: latestLog, error: logError } = await supabase
      .from('activity_logs')
      .select('nationality, location')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (logError) {
      console.warn('Unable to load latest activity log for currency resolution:', logError.message || logError);
    }

    const rawNationality = profileNationality || latestLog?.nationality || latestLog?.location || "";
    return getCurrencyForNationality(rawNationality);
  };

  const fetchWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      const preferredCurrency = await resolvePreferredCurrency(user.id);

      // Fetch wallet data
      const { data, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No wallet found, create one
          const { data: newWallet, error: createError } = await supabase
            .from('wallets')
            .insert([
              {
                user_id: user.id,
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [profile?.email]);

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
        // Update local state
        setWallet({ ...wallet, balance: newBalance, updated_at: new Date().toISOString() });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return {
    balance: wallet?.balance ?? null,
    currency: wallet?.currency ?? 'USD',
    loading,
    error,
    refetch,
    updateBalance,
  };
}
