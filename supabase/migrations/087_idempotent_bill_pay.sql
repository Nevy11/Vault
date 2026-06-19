-- Migration 087: Idempotent Bill Split Payment
-- This migration updates pay_bill_split to support idempotency_key.

BEGIN;

CREATE OR REPLACE FUNCTION public.pay_bill_split(
    p_member_id UUID,
    p_idempotency_key UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    new_balance NUMERIC
) AS $$
DECLARE
    v_split_id UUID;
    v_payer_id UUID;
    v_payee_id UUID;
    v_amount NUMERIC;
    v_status TEXT;
    v_title TEXT;
    v_currency TEXT;
    v_payer_balance NUMERIC;
    v_reference TEXT;
    v_tx_id UUID;
    v_existing_tx_id UUID;
    v_new_balance NUMERIC;
BEGIN
    -- Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, balance_after INTO v_existing_tx_id, v_new_balance
        FROM public.transactions
        WHERE idempotency_key = p_idempotency_key;
        
        IF v_existing_tx_id IS NOT NULL THEN
            RETURN QUERY SELECT true, 'Duplicate payment handled'::TEXT, v_new_balance;
            RETURN;
        END IF;
    END IF;

    -- Get member and split details
    SELECT m.bill_split_id, m.user_id, m.creator_id, m.amount, m.status, s.title
    INTO v_split_id, v_payer_id, v_payee_id, v_amount, v_status, v_title
    FROM public.bill_split_members m
    JOIN public.bill_splits s ON s.id = m.bill_split_id
    WHERE m.id = p_member_id;

    IF v_payer_id IS NULL THEN
        RETURN QUERY SELECT false, 'Bill split member record not found'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Ensure correct user is paying
    IF v_payer_id != auth.uid() THEN
        RETURN QUERY SELECT false, 'Unauthorized payment attempt'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    IF v_status = 'paid' THEN
        RETURN QUERY SELECT false, 'This bill split share is already paid'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Lock and check payer wallet balance
    SELECT balance, currency INTO v_payer_balance, v_currency
    FROM public.wallets
    WHERE user_id = v_payer_id
    FOR UPDATE;

    IF v_payer_balance IS NULL THEN
        RETURN QUERY SELECT false, 'Payer wallet not found'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    IF v_payer_balance < v_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance to pay split'::TEXT, v_payer_balance;
        RETURN;
    END IF;

    v_new_balance := v_payer_balance - v_amount;
    v_reference := 'BS-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));

    -- 1. Deduct from payer
    UPDATE public.wallets
    SET balance = v_new_balance, updated_at = NOW()
    WHERE user_id = v_payer_id;

    -- 2. Credit to payee (creator)
    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (v_payee_id, v_amount, v_currency)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + EXCLUDED.balance, updated_at = NOW();

    -- 3. Log transaction
    INSERT INTO public.transactions (
        sender_id, receiver_id, type, method, amount, status, description, balance_after, idempotency_key
    ) VALUES (
        v_payer_id, v_payee_id, 'transfer', 'vault', v_amount, 'completed', 
        'Split Payment: ' || v_title, v_new_balance, p_idempotency_key
    ) RETURNING id INTO v_tx_id;

    -- 4. Update member status
    UPDATE public.bill_split_members
    SET status = 'paid', paid_at = NOW(), transaction_id = v_tx_id
    WHERE id = p_member_id;

    -- 5. Check if all members paid (optional optimization)
    -- This could be a trigger or a check here.

    -- Log to Audit Log
    PERFORM public.log_audit_event('bill_split_paid', 'success', jsonb_build_object(
        'split_id', v_split_id,
        'amount', v_amount,
        'title', v_title
    ));

    RETURN QUERY SELECT true, 'Bill split paid successfully'::TEXT, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
