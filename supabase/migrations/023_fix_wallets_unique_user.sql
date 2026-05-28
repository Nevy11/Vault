-- Fix wallets table to ensure user_id is unique for ledger consistency
BEGIN;

-- Add unique constraint to user_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'wallets_user_id_key'
    ) THEN
        ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
    END IF;
END $$;

COMMIT;
