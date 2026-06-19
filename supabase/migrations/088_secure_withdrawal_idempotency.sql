-- Migration 088: Secure Withdrawal Idempotency & Audit
-- This migration updates process_secure_withdrawal to support idempotency_key and audit logging.

BEGIN;

CREATE OR REPLACE FUNCTION public.process_secure_withdrawal(
    p_user_id UUID,
    p_amount NUMERIC,
    p_method TEXT,
    p_description TEXT,
    p_idempotency_key UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    reference TEXT,
    new_balance NUMERIC
) AS $$
DECLARE
    v_wallet_id UUID;
    v_current_balance NUMERIC;
    v_reference TEXT;
    v_new_balance NUMERIC;
    v_existing_tx_id UUID;
    v_method transaction_method;
BEGIN
    -- Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, description, balance_after INTO v_existing_tx_id, v_reference, v_new_balance
        FROM public.transactions
        WHERE idempotency_key = p_idempotency_key;
        
        IF v_existing_tx_id IS NOT NULL THEN
            RETURN QUERY SELECT true, 'Duplicate withdrawal handled'::TEXT, v_reference, v_new_balance;
            RETURN;
        END IF;
    END IF;

    -- Cast method safely
    BEGIN
        v_method := p_method::transaction_method;
    EXCEPTION WHEN OTHERS THEN
        v_method := 'bank_account'::transaction_method;
    END;

    -- Lock and check balance
    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN QUERY SELECT false, 'Wallet not found'::TEXT, NULL::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, NULL::TEXT, v_current_balance;
        RETURN;
    END IF;

    v_new_balance := v_current_balance - p_amount;
    v_reference := 'WTH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));

    -- 1. Deduct balance
    UPDATE public.wallets
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = v_wallet_id;

    -- 2. Log transaction
    INSERT INTO public.transactions (
        sender_id, type, method, amount, status, description, balance_after, idempotency_key
    ) VALUES (
        p_user_id, 'withdrawal', v_method, p_amount, 'completed', 
        p_description || ' (Ref: ' || v_reference || ')', v_new_balance, p_idempotency_key
    );

    -- 3. Log Audit Event
    PERFORM public.log_audit_event('withdrawal_initiated', 'success', jsonb_build_object(
        'amount', p_amount,
        'method', p_method,
        'reference', v_reference
    ));

    RETURN QUERY SELECT true, 'Withdrawal processed successfully'::TEXT, v_reference, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
