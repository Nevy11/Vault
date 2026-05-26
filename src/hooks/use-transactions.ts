import { useEffect, useState } from 'react';
import { supabase } from '@/api/supabase';
import { useProfileSignal } from '@/lib/profile-signal';

export type Transaction = {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  type: 'transfer' | 'deposit' | 'withdrawal';
  method: 'vault' | 'mpesa' | 'bank';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
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

    const { data: { user } } = await supabase.auth.getUser();
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

      // Fetch both simultaneously
      const [
        { data: transactionsData, error: transactionsError },
        { data: ledgerData, error: ledgerError }
      ] = await Promise.all([
        supabase
          .from('transactions')
          .select(`
            *,
            sender:profiles!sender_id(first_name, last_name, kyc_tag, profile_photo_url),
            receiver:profiles!receiver_id(first_name, last_name, kyc_tag, profile_photo_url)
          `)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
        supabase
          .from('ledger_entries')
          .select('*')
          .eq('user_id', userId)
      ]);

      if (transactionsError) throw transactionsError;
      if (ledgerError) throw ledgerError;

      // Map and merge
      const mappedTransactions = (transactionsData || []).map(t => ({
        ...t,
        source: 'transactions' as const
      }));

      const mappedLedger = (ledgerData || []).map(l => ({
        id: l.id,
        sender_id: userId,
        receiver_id: userId,
        type: (l.type === 'deposit' || l.type === 'withdrawal') ? l.type : 'transfer',
        method: 'vault' as const,
        amount: Math.abs(Number(l.amount)),
        status: l.status === 'completed' ? 'completed' : 'pending',
        description: l.description || '',
        created_at: l.created_at,
        balance_after: null,
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
      }));

      const merged = [...mappedTransactions, ...mappedLedger].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(merged as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'transactions'
        }, 
        (payload) => {
          // Manually check if the updated transaction involves the current user
          const record = payload.new || payload.old;
          if (record && (record.sender_id === userId || record.receiver_id === userId)) {
            fetchTransactions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, enabled]);

  return { transactions, loading, error, refetch: fetchTransactions };
}
