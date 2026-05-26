-- Add unique constraint to wallets table to ensure ON CONFLICT works in ledger functions
-- This also prevents duplicate wallets for the same user/currency pair

BEGIN;

-- First, remove any potential duplicate wallets (keeping the one with the highest balance)
DELETE FROM public.wallets a
USING public.wallets b
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.currency = b.currency;

-- Add the unique constraint
ALTER TABLE public.wallets
ADD CONSTRAINT wallets_user_id_currency_key UNIQUE (user_id, currency);

-- Re-verify or update the create_ledger_entry function if needed
-- (The existing one should work now that the constraint exists)

COMMIT;
