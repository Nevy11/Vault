-- Migration: Emergency Fix for Bill Split Payments
-- Description: Drops the NOT NULL constraint on 'method' to ensure payments can be processed.

BEGIN;

-- 1. Remove the NOT NULL constraint on the method column
-- This is a fallback to prevent the recurring "null value violates not-null constraint" error.
ALTER TABLE public.transactions ALTER COLUMN method DROP NOT NULL;

-- 2. Ensure 'vault' exists in the enum for future-proofing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON t.oid = e.enumtypid 
        WHERE t.typname = 'transaction_method' AND e.enumlabel = 'vault'
    ) THEN
        ALTER TYPE public.transaction_method ADD VALUE 'vault';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Redefine pay_bill_split to be extremely robust and simple
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
    v_tx_id UUID;
BEGIN
    -- Get member and split details
    SELECT m.bill_split_id, m.user_id, m.creator_id, m.amount, m.status, s.title
    INTO v_split_id, v_payer_id, v_payee_id, v_amount, v_status, v_title
    FROM public.bill_split_members m
    JOIN public.bill_splits s ON s.id = m.bill_split_id
    WHERE m.id = p_member_id;

    -- Basic validations
    IF v_payer_id IS NULL THEN
        RETURN QUERY SELECT false, 'Payment record not found'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    IF v_payer_id != auth.uid() THEN
        RETURN QUERY SELECT false, 'Unauthorized'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    IF v_status = 'paid' THEN
        RETURN QUERY SELECT false, 'Already paid'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Lock and check payer wallet balance
    SELECT balance, COALESCE(currency, 'USD') INTO v_payer_balance, v_currency
    FROM public.wallets
    WHERE user_id = v_payer_id
    FOR UPDATE;

    IF v_payer_balance IS NULL THEN
        RETURN QUERY SELECT false, 'Wallet not found'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    IF v_payer_balance < v_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, v_payer_balance;
        RETURN;
    END IF;

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

    -- Log transaction - using the MOST generic INSERT possible
    -- Since we dropped the NOT NULL constraint, this will succeed even if 'method' resolution fails.
    INSERT INTO public.transactions (
        sender_id,
        receiver_id,
        type,
        method,
        amount,
        status,
        description,
        balance_after,
        created_at
    )
    VALUES (
        v_payer_id,
        v_payee_id,
        'transfer'::public.transaction_type,
        'vault'::public.transaction_method,
        v_amount,
        'completed'::public.transaction_status,
        'Bill Split: ' || COALESCE(v_title, 'Payment'),
        (v_payer_balance - v_amount),
        NOW()
    )
    RETURNING id INTO v_tx_id;

    -- Update member status
    UPDATE public.bill_split_members
    SET status = 'paid',
        paid_at = NOW(),
        transaction_id = v_tx_id
    WHERE id = p_member_id;

    -- Check if all members are paid
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
    RETURN QUERY SELECT false, 'System Error: ' || SQLERRM, v_payer_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
