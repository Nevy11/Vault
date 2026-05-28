-- Migration: Enable Realtime for Receipts Table
-- Description: Ensures the receipts table is part of the supabase_realtime publication.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'receipts') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.receipts;
    END IF;
END $$;

COMMIT;
