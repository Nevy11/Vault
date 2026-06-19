-- Migration 089: Advanced Fraud Detection (DB-Level)
-- This migration adds an RPC to evaluate transaction risk based on velocity and value spikes.

BEGIN;

CREATE OR REPLACE FUNCTION public.evaluate_transaction_risk(
    p_user_id UUID,
    p_amount NUMERIC
)
RETURNS TABLE (
    is_fraudulent BOOLEAN,
    reason TEXT,
    error_code TEXT
) AS $$
DECLARE
    v_velocity_count INTEGER;
    v_rolling_avg NUMERIC;
    v_spike_threshold NUMERIC;
    v_five_minutes_ago TIMESTAMPTZ := NOW() - INTERVAL '5 minutes';
BEGIN
    -- 1. Velocity Check: Max 3 transactions in 5 minutes
    SELECT COUNT(*) INTO v_velocity_count
    FROM public.transactions
    WHERE sender_id = p_user_id
    AND created_at >= v_five_minutes_ago;

    IF v_velocity_count >= 3 THEN
        RETURN QUERY SELECT TRUE, 'Velocity limit exceeded: too many transactions in a short period.'::TEXT, 'ERR_FRAUD_VELOCITY'::TEXT;
        RETURN;
    END IF;

    -- 2. Value Spike Check: > 400% of rolling average (last 10 transactions)
    SELECT AVG(amount) INTO v_rolling_avg
    FROM (
        SELECT amount
        FROM public.transactions
        WHERE sender_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 10
    ) AS last_txs;

    -- If the user has at least 3 transactions, apply spike check
    IF v_rolling_avg IS NOT NULL AND (SELECT COUNT(*) FROM (SELECT 1 FROM public.transactions WHERE sender_id = p_user_id LIMIT 3) AS t) = 3 THEN
        v_spike_threshold := v_rolling_avg * 4.0;
        
        IF p_amount > v_spike_threshold THEN
            RETURN QUERY SELECT TRUE, 'Transaction amount exceeds historical average spike threshold.'::TEXT, 'ERR_FRAUD_SPIKE'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- No fraud detected
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
