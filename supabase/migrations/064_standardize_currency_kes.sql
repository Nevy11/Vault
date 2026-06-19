-- Migration: Standardize Currency to KES
-- Description: Updates all occurrences of 'KSH' to 'KES' in the wallets and currency_rates tables.

BEGIN;

-- 1. Update wallets table
UPDATE public.wallets
SET currency = 'KES'
WHERE currency = 'KSH';

-- 2. Update currency_rates table
UPDATE public.currency_rates
SET from_currency = 'KES'
WHERE from_currency = 'KSH';

UPDATE public.currency_rates
SET to_currency = 'KES'
WHERE to_currency = 'KSH';

-- 3. Update transaction history (optional but good for consistency)
UPDATE public.transactions
SET metadata = jsonb_set(metadata, '{recipient_currency}', '"KES"')
WHERE metadata->>'recipient_currency' = 'KSH';

-- 4. Update ledger entries
UPDATE public.ledger_entries
SET currency = 'KES'
WHERE currency = 'KSH';

-- 5. Update savings goals
UPDATE public.savings_goals
SET funding_source = REPLACE(funding_source, 'KSH', 'KES')
WHERE funding_source LIKE '%KSH%';

COMMIT;
