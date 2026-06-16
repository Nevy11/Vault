-- 1. Update the fraud detection to mark as 'pending_verification' instead of blocking
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
    SELECT count(*) INTO v_recent_count
    FROM public.transactions
    WHERE sender_id = NEW.sender_id
      AND created_at > NOW() - INTERVAL '5 minutes';

    IF v_recent_count >= 3 THEN
        -- Still block velocity for high risk
        RAISE EXCEPTION 'FRAUD_VELOCITY_LIMIT: Too many transactions in a short period'
        USING ERRCODE = 'P0001';
    END IF;

    -- B. VALUE SPIKE CHECK
    SELECT AVG(amount) INTO v_avg_amount
    FROM (
        SELECT amount
        FROM public.transactions
        WHERE sender_id = NEW.sender_id
        ORDER BY created_at DESC
        LIMIT 10
    ) as recent_txs;

    IF v_avg_amount IS NOT NULL THEN
        v_spike_threshold := v_avg_amount * 4.0;
        
        -- If current amount is > 400% of average, mark as pending verification
        IF NEW.amount > v_spike_threshold AND (SELECT count(*) FROM (SELECT 1 FROM public.transactions WHERE sender_id = NEW.sender_id LIMIT 3) t) = 3 THEN
            NEW.status := 'pending_verification';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
