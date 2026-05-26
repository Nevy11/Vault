-- Enable real-time for core tables to ensure dashboard updates instantly
BEGIN;

-- Enable replication for wallets and transactions if not already enabled
-- Note: 'supabase_realtime' is the default publication name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wallets') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transactions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ledger_entries') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_entries;
    END IF;
END $$;

COMMIT;
