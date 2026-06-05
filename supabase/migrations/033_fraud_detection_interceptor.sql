-- Fraud Detection Interceptor
-- This migration adds a trigger-based fraud detection mechanism to the transactions table.

BEGIN;

-- 1. Create a function to evaluate fraud risk
CREATE OR REPLACE FUNCTION check_transaction_fraud()
RETURNS TRIGGER AS $$
DECLARE
    v_recent_count INTEGER;
    v_avg_amount NUMERIC;
    v_spike_threshold NUMERIC;
BEGIN
    -- Only check for withdrawals and transfers (outbound transactions)
    IF NEW.type NOT IN ('withdrawal', 'transfer') THEN
        RETURN NEW;
    END IF;

    -- A. VELOCITY CHECK
    -- Flag if > 3 transactions in 5 minutes
    SELECT count(*) INTO v_recent_count
    FROM public.transactions
    WHERE sender_id = NEW.sender_id
      AND created_at > NOW() - INTERVAL '5 minutes';

    IF v_recent_count >= 3 THEN
        RAISE EXCEPTION 'FRAUD_VELOCITY_LIMIT: Too many transactions in a short period'
        USING ERRCODE = 'P0001'; -- Custom error code for application to catch
    END IF;

    -- B. VALUE SPIKE CHECK
    -- Calculate rolling average of last 10 transactions
    -- Only check if the user has at least 3 previous transactions
    SELECT AVG(amount) INTO v_avg_amount
    FROM (
        SELECT amount
        FROM public.transactions
        WHERE sender_id = NEW.sender_id
        ORDER BY created_at DESC
        LIMIT 10
    ) as recent_txs;

    IF v_avg_amount IS NOT NULL THEN
        -- Check against 400% threshold
        v_spike_threshold := v_avg_amount * 4.0;
        
        -- If current amount is > 400% of average, and we have enough history
        IF NEW.amount > v_spike_threshold AND (SELECT count(*) FROM (SELECT 1 FROM public.transactions WHERE sender_id = NEW.sender_id LIMIT 3) t) = 3 THEN
            RAISE EXCEPTION 'FRAUD_VALUE_SPIKE: Transaction amount exceeds historical average threshold'
            USING ERRCODE = 'P0002';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to the transactions table
-- We use BEFORE INSERT so we can block the transaction before it's persisted or balance is updated.
DROP TRIGGER IF EXISTS tr_check_transaction_fraud ON public.transactions;
CREATE TRIGGER tr_check_transaction_fraud
    BEFORE INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_transaction_fraud();

COMMIT;
