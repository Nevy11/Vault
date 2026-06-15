-- Migration: Create Bill Splitting System Tables and RPCs
-- Description: Adds tables for tracking bill splits and their members, enables RLS, registers tables for real-time replication, and adds a transaction-safe RPC function to pay a member's split share.

BEGIN;

-- 1. Create Bill Splits Table
CREATE TABLE IF NOT EXISTS public.bill_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    amount_per_person NUMERIC(12, 2) NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Bill Split Members Table
CREATE TABLE IF NOT EXISTS public.bill_split_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_split_id UUID NOT NULL REFERENCES public.bill_splits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_at TIMESTAMPTZ,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bill_splits_creator ON public.bill_splits(creator_id);
CREATE INDEX IF NOT EXISTS idx_bill_split_members_user ON public.bill_split_members(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_split_members_split ON public.bill_split_members(bill_split_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.bill_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_split_members ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies for bill_splits
DROP POLICY IF EXISTS "Users can select splits they created or belong to" ON public.bill_splits;
CREATE POLICY "Users can select splits they created or belong to" ON public.bill_splits
    FOR SELECT USING (
        auth.uid() = creator_id 
        OR id IN (SELECT bill_split_id FROM public.bill_split_members WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert splits they created" ON public.bill_splits;
CREATE POLICY "Users can insert splits they created" ON public.bill_splits
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can update splits they created" ON public.bill_splits;
CREATE POLICY "Users can update splits they created" ON public.bill_splits
    FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can delete splits they created" ON public.bill_splits;
CREATE POLICY "Users can delete splits they created" ON public.bill_splits
    FOR DELETE USING (auth.uid() = creator_id);

-- 6. Define RLS Policies for bill_split_members
DROP POLICY IF EXISTS "Users can select split members" ON public.bill_split_members;
CREATE POLICY "Users can select split members" ON public.bill_split_members
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can insert split members" ON public.bill_split_members;
CREATE POLICY "Users can insert split members" ON public.bill_split_members
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can update split members they own or created" ON public.bill_split_members;
CREATE POLICY "Users can update split members they own or created" ON public.bill_split_members
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can delete split members" ON public.bill_split_members;
CREATE POLICY "Users can delete split members" ON public.bill_split_members
    FOR DELETE USING (auth.uid() = creator_id);

-- 7. Add Tables to Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bill_splits') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_splits;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bill_split_members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_split_members;
    END IF;
END $$;

-- 8. Create Transaction-Safe payment RPC
CREATE OR REPLACE FUNCTION pay_bill_split(p_member_id UUID)
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
    SELECT balance, currency INTO v_payer_balance, v_currency
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

    -- Log transaction
    INSERT INTO public.transactions (
        sender_id,
        receiver_id,
        type,
        method,
        amount,
        status,
        description,
        balance_after,
        metadata
    )
    VALUES (
        v_payer_id,
        v_payee_id,
        'transfer'::transaction_type,
        'vault'::transaction_method,
        v_amount,
        'completed'::transaction_status,
        'Bill Split: ' || v_title || ' (Ref: ' || v_reference || ')',
        (v_payer_balance - v_amount),
        jsonb_build_object(
            'reference', v_reference,
            'bill_split_id', v_split_id,
            'bill_split_member_id', p_member_id
        )
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
        metadata
    )
    VALUES (
        v_payer_id,
        -v_amount,
        v_currency,
        'transfer',
        'completed',
        v_reference,
        'Bill Split Paid: ' || v_title,
        jsonb_build_object('bill_split_id', v_split_id, 'transaction_id', v_tx_id)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
