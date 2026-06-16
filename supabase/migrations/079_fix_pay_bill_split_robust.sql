-- Migration: Fix pay_bill_split Method Null Error v2
-- Description: Uses a more robust approach to insert into transactions, avoiding potential enum/type mismatches.

BEGIN;

-- 1. Redefine the payment RPC with even more explicit and robust logic
CREATE OR REPLACE FUNCTION public.pay_bill_split(p_member_id UUID)
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
    v_description TEXT;
BEGIN
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
    SELECT balance, COALESCE(currency, 'USD') INTO v_payer_balance, v_currency
    FROM public.wallets
    WHERE user_id = v_payer_id
    FOR UPDATE;

    IF v_payer_balance IS NULL THEN
        RETURN QUERY SELECT false, 'Payer wallet not found'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    IF v_payer_balance < v_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, v_payer_balance;
        RETURN;
    END IF;

    -- Generate transaction reference
    v_reference := 'BS-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
    v_description := 'Bill Split: ' || COALESCE(v_title, 'Payment') || ' (Ref: ' || v_reference || ')';

    -- Deduct from payer
    UPDATE public.wallets
    SET balance = balance - v_amount,
        updated_at = NOW()
    WHERE user_id = v_payer_id;

    -- Credit payee (creator)
    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (v_payee_id, v_amount, v_currency)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + EXCLUDED.balance,
        updated_at = NOW();

    -- Log transaction using a more robust INSERT approach
    -- We'll use a dynamic approach to avoid column mismatch errors if possible,
    -- but for now, we'll just be very explicit and use TEXT values for enums
    -- which Postgres will cast automatically if they are valid.
    EXECUTE 'INSERT INTO public.transactions (
        sender_id,
        receiver_id,
        type,
        method,
        amount,
        status,
        description,
        balance_after,
        metadata,
        created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING id'
    INTO v_tx_id
    USING 
        v_payer_id, 
        v_payee_id, 
        'transfer', -- casted to transaction_type
        'vault',    -- casted to transaction_method
        v_amount, 
        'completed', -- casted to transaction_status
        v_description, 
        (v_payer_balance - v_amount),
        jsonb_build_object(
            'reference', v_reference,
            'bill_split_id', v_split_id,
            'bill_split_member_id', p_member_id
        );

    -- Log into ledger
    INSERT INTO public.ledger_entries (
        user_id,
        amount,
        currency,
        type,
        status,
        reference,
        description,
        metadata,
        created_at
    )
    VALUES (
        v_payer_id,
        -v_amount,
        v_currency,
        'transfer',
        'completed',
        v_reference,
        'Bill Split Paid: ' || COALESCE(v_title, 'Payment'),
        jsonb_build_object('bill_split_id', v_split_id, 'transaction_id', v_tx_id),
        NOW()
    );

    -- Update member status
    UPDATE public.bill_split_members
    SET status = 'paid',
        paid_at = NOW(),
        transaction_id = v_tx_id
    WHERE id = p_member_id;

    -- Check if all members are paid. If so, mark split as completed
    IF NOT EXISTS (
        SELECT 1 
        FROM public.bill_split_members 
        WHERE bill_split_id = v_split_id AND status = 'pending'
    ) THEN
        UPDATE public.bill_splits
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = v_split_id;
    END IF;

    RETURN QUERY SELECT true, 'Bill split paid successfully'::TEXT, (v_payer_balance - v_amount);

EXCEPTION WHEN OTHERS THEN
    -- Return the actual error message to help diagnostics
    RETURN QUERY SELECT false, 'Payment Error: ' || SQLERRM, v_payer_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
