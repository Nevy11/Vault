import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select(`
          *,
          sender:profiles!sender_id(first_name, last_name, kyc_tag, profile_photo_url),
          receiver:profiles!receiver_id(first_name, last_name, kyc_tag, profile_photo_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setTransactions(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel('transaction_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { transactions, loading, error, refetch: fetchTransactions };
}
