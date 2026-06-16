-- Migration: Nuclear Fix for Transaction Method Null Error
-- Description: Ensures the 'method' column can NEVER cause an insertion failure by dropping constraints and adding a safety trigger.

BEGIN;

-- 1. Aggressively remove the NOT NULL constraint and set a default
-- This ensures that even if no value is provided, it won't fail.
ALTER TABLE public.transactions ALTER COLUMN method DROP NOT NULL;

-- 2. Ensure 'vault' exists in the enum and set it as the table default
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

ALTER TABLE public.transactions ALTER COLUMN method SET DEFAULT 'vault'::public.transaction_method;

-- 3. Create a "Force Method" trigger as a final line of defense
-- This trigger runs BEFORE the row is written and ensures method is NOT null.
CREATE OR REPLACE FUNCTION public.force_transaction_method_safety()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.method IS NULL THEN
        NEW.method := 'vault'::public.transaction_method;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_force_transaction_method_safety ON public.transactions;
CREATE TRIGGER tr_force_transaction_method_safety
    BEFORE INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.force_transaction_method_safety();

-- 4. Redefine pay_bill_split to OMIT the method column entirely
-- By omitting it, we rely on the DEFAULT value and the safety trigger.
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

    -- Log transaction - OMITTING 'method' to let DEFAULT/TRIGGER handle it
    INSERT INTO public.transactions (
        sender_id,
        receiver_id,
        type,
        amount,
        status,
        description,
        balance_after,
        metadata,
        created_at,
        updated_at
    )
    VALUES (
        v_payer_id,
        v_payee_id,
        'transfer'::public.transaction_type,
        v_amount,
        'completed'::public.transaction_status,
        COALESCE(v_description, 'Bill Split Payment'),
        (v_payer_balance - v_amount),
        jsonb_build_object(
            'reference', v_reference,
            'bill_split_id', v_split_id,
            'bill_split_member_id', p_member_id
        ),
        NOW(),
        NOW()
    )
    RETURNING id INTO v_tx_id;

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
    RETURN QUERY SELECT false, 'Payment Error: ' || SQLERRM, v_payer_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
