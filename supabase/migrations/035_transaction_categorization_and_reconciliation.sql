-- 035_transaction_categorization_and_reconciliation.sql
-- Add transaction categorization and automated reconciliation logic.

BEGIN;

-- 1. Add category column to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Backfill categories based on common patterns
UPDATE public.transactions 
SET category = 'Transfer' 
WHERE type = 'transfer' AND category IS NULL;

UPDATE public.transactions 
SET category = 'Withdrawal' 
WHERE type = 'withdrawal' AND category IS NULL;

UPDATE public.transactions 
SET category = 'Deposit' 
WHERE type = 'deposit' AND category IS NULL;

-- 3. Create a reconciliation table to log results
CREATE TABLE IF NOT EXISTS public.reconciliation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    wallet_id UUID REFERENCES public.wallets(id),
    wallet_balance NUMERIC(15, 4),
    ledger_sum NUMERIC(15, 4),
    difference NUMERIC(15, 4),
    status TEXT, -- 'balanced' or 'unbalanced'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create reconciliation function
CREATE OR REPLACE FUNCTION reconcile_wallet(p_wallet_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_wallet_balance NUMERIC(15, 4);
    v_ledger_sum NUMERIC(15, 4);
    v_user_id UUID;
    v_currency TEXT;
    v_status TEXT;
    v_diff NUMERIC(15, 4);
BEGIN
    -- Get current wallet balance and currency
    SELECT balance, user_id, currency INTO v_wallet_balance, v_user_id, v_currency
    FROM public.wallets
    WHERE id = p_wallet_id;

    -- Calculate sum from ledger entries for this user and currency
    SELECT COALESCE(SUM(amount), 0) INTO v_ledger_sum
    FROM public.ledger_entries
    WHERE user_id = v_user_id 
      AND currency = v_currency
      AND status = 'completed';

    v_diff := v_wallet_balance - v_ledger_sum;
    
    IF ABS(v_diff) < 0.0001 THEN -- Account for floating point precision
        v_status := 'balanced';
    ELSE
        v_status := 'unbalanced';
    END IF;

    -- Log the result
    INSERT INTO public.reconciliation_logs (user_id, wallet_id, wallet_balance, ledger_sum, difference, status)
    VALUES (v_user_id, p_wallet_id, v_wallet_balance, v_ledger_sum, v_diff, v_status);

    RETURN jsonb_build_object(
        'wallet_id', p_wallet_id,
        'user_id', v_user_id,
        'currency', v_currency,
        'wallet_balance', v_wallet_balance,
        'ledger_sum', v_ledger_sum,
        'difference', v_diff,
        'status', v_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
