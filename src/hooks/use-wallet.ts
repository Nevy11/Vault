import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabase';

export function useWallet(providerType?: 'vault' | 'bank' | 'mobile') {
  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWallet() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // If 'vault', fetch the primary wallet. 
      // For bank/mobile, in a real app you might have different tables, 
      // but assuming they all map to the 'wallets' or a similar structure:
      const { data, error } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        // Here you could apply logic based on providerType if necessary
        setWallet({ balance: Number(data.balance), currency: data.currency });
      }
      setLoading(false);
    }

    fetchWallet();

    const channel = supabase
      .channel('wallet_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => {
        fetchWallet();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerType]);

  return { wallet, loading };
}
