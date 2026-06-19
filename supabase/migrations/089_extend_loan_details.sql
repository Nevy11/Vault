-- Migration: Extend Loan and Profile Details
-- Description: Adds next of kin and detailed loan use fields for enhanced loan processing.

-- 1. Update profiles table with additional demographic fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS next_of_kin_name TEXT,
ADD COLUMN IF NOT EXISTS next_of_kin_phone TEXT,
ADD COLUMN IF NOT EXISTS next_of_kin_relationship TEXT,
ADD COLUMN IF NOT EXISTS home_address TEXT;

-- 2. Update loans table with detailed purpose
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS detailed_use_of_money TEXT,
ADD COLUMN IF NOT EXISTS additional_info JSONB DEFAULT '{}'::jsonb;

-- 3. Update disburse_loan RPC to accept these new fields
CREATE OR REPLACE FUNCTION public.disburse_loan(
    p_amount NUMERIC,
    p_interest_rate NUMERIC,
    p_repayment_period INTEGER,
    p_detailed_use TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_loan_id UUID;
    v_due_date TIMESTAMPTZ;
    v_total_due NUMERIC;
    v_user_id UUID;
BEGIN
    -- Use provided user_id or authenticated user
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User ID could not be determined.');
    END IF;
    
    -- Check if user already has an active loan
    IF EXISTS (SELECT 1 FROM public.loans WHERE user_id = v_user_id AND status = 'active') THEN
        RETURN jsonb_build_object('success', false, 'message', 'You already have an active loan.');
    END IF;

    v_due_date := now() + (p_repayment_period || ' months')::interval;
    v_total_due := p_amount + (p_amount * (p_interest_rate / 100));

    -- Insert Loan
    INSERT INTO public.loans (
        user_id,
        amount,
        interest_rate,
        repayment_period,
        due_date,
        remaining_balance,
        status,
        detailed_use_of_money
    ) VALUES (
        v_user_id,
        p_amount,
        p_interest_rate,
        p_repayment_period,
        v_due_date,
        v_total_due,
        'active',
        p_detailed_use
    ) RETURNING id INTO v_loan_id;

    -- Update Wallet Balance and Log Transaction via Ledger
    PERFORM public.create_ledger_entry(
        v_user_id,
        p_amount,
        'KES',
        'deposit',
        v_loan_id::TEXT,
        'Loan Disbursement: ' || v_loan_id,
        jsonb_build_object(
            'loan_id', v_loan_id,
            'payment_method', 'vault',
            'type', 'loan_disbursement'
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'loan_id', v_loan_id,
        'total_due', v_total_due,
        'due_date', v_due_date
    );
END;
$$;
