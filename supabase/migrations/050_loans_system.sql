-- Migration: Loans and Loans Ledger
-- Description: Sets up the loans system according to user specifications.

-- 1. Create Loans Table (dropping existing if necessary to match spec)
DROP TABLE IF EXISTS public.loans CASCADE;

CREATE TABLE public.loans (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    repayment_period INTEGER NOT NULL, -- in months
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    remaining_balance NUMERIC(15, 2) NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone ('utc'::text, now()),
    CONSTRAINT loans_pkey PRIMARY KEY (id),
    CONSTRAINT loans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT loans_status_check CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'paid'::text, 'defaulted'::text]))
);

CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans USING btree (user_id);

-- 2. Create Loans Ledger Table
DROP TABLE IF EXISTS public.loans_ledger CASCADE;

CREATE TABLE public.loans_ledger (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    source TEXT NOT NULL,
    payment_type TEXT NOT NULL,
    remaining_balance NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT loans_ledger_pkey PRIMARY KEY (id),
    CONSTRAINT loans_ledger_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans (id) ON DELETE CASCADE,
    CONSTRAINT loans_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT loans_ledger_payment_type_check CHECK (payment_type = ANY (ARRAY['manual'::text, 'automated'::text]))
);

CREATE INDEX IF NOT EXISTS idx_loans_ledger_loan_id ON public.loans_ledger USING btree (loan_id);
CREATE INDEX IF NOT EXISTS idx_loans_ledger_user_id ON public.loans_ledger USING btree (user_id);

-- 3. Enable RLS and add policies
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own loans" ON public.loans
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own loans ledger" ON public.loans_ledger
    FOR ALL USING (auth.uid() = user_id);

-- 4. RPC for Loan Disbursement
CREATE OR REPLACE FUNCTION public.disburse_loan(
    p_amount NUMERIC,
    p_interest_rate NUMERIC,
    p_repayment_period INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_loan_id UUID;
    v_due_date TIMESTAMPTZ;
    v_total_due NUMERIC;
BEGIN
    -- Check if user already has an active loan
    IF EXISTS (SELECT 1 FROM public.loans WHERE user_id = auth.uid() AND status = 'active') THEN
        RETURN jsonb_build_object('success', false, 'message', 'You already have an active loan.');
    END IF;

    v_due_date := now() + (p_repayment_period || ' months')::interval;
    v_total_due := p_amount + (p_amount * (p_interest_rate / 100));

    INSERT INTO public.loans (
        user_id,
        amount,
        interest_rate,
        repayment_period,
        due_date,
        remaining_balance,
        status
    ) VALUES (
        auth.uid(),
        p_amount,
        p_interest_rate,
        p_repayment_period,
        v_due_date,
        v_total_due,
        'active'
    ) RETURNING id INTO v_loan_id;

    RETURN jsonb_build_object(
        'success', true,
        'loan_id', v_loan_id,
        'total_due', v_total_due,
        'due_date', v_due_date
    );
END;
$$;

-- 5. RPC for Loan Repayment
CREATE OR REPLACE FUNCTION public.repay_loan(
    p_loan_id UUID,
    p_amount NUMERIC,
    p_source TEXT,
    p_payment_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_remaining NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    SELECT remaining_balance INTO v_remaining
    FROM public.loans
    WHERE id = p_loan_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Loan not found.');
    END IF;

    v_new_balance := v_remaining - p_amount;
    IF v_new_balance < 0 THEN
        v_new_balance := 0;
    END IF;

    -- Update Loan
    UPDATE public.loans
    SET remaining_balance = v_new_balance,
        status = CASE WHEN v_new_balance = 0 THEN 'paid' ELSE 'active' END
    WHERE id = p_loan_id;

    -- Insert Ledger Entry
    INSERT INTO public.loans_ledger (
        loan_id,
        user_id,
        amount,
        source,
        payment_type,
        remaining_balance
    ) VALUES (
        p_loan_id,
        auth.uid(),
        p_amount,
        p_source,
        p_payment_type,
        v_new_balance
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance
    );
END;
$$;

-- 6. Grant Permissions
GRANT EXECUTE ON FUNCTION public.disburse_loan(NUMERIC, NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repay_loan(UUID, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT ALL ON public.loans TO authenticated;
GRANT ALL ON public.loans_ledger TO authenticated;
