-- Add balance_after to transactions to track historical balances
BEGIN;

ALTER TABLE IF EXISTS public.transactions
ADD COLUMN IF NOT EXISTS balance_after NUMERIC(12, 2);

COMMIT;
