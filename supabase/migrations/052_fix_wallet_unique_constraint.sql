-- Migration: Fix Wallet Unique Constraint
-- Description: Ensures user_id is unique in the wallets table so that ON CONFLICT works correctly in vault_transfer.

BEGIN;

-- 1. Deduplicate wallets (if any)
-- We keep the wallet with the highest balance for each user
DELETE FROM public.wallets
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM public.wallets
    ORDER BY user_id, balance DESC, created_at ASC
);

-- 2. Add the unique constraint on user_id
-- We first drop any existing constraint that might be blocking or slightly different
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_user_id_key;
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_user_id_currency_key;

ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);

COMMIT;
