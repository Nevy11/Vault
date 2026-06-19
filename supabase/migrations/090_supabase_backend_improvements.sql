-- Migration: Supabase Backend Improvements for Loans
-- Description: Adds missing demographic fields, application snapshots, and logging triggers.

BEGIN;

-- 1. Extend Profiles Table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employer_name TEXT,
ADD COLUMN IF NOT EXISTS employer_phone TEXT,
ADD COLUMN IF NOT EXISTS monthly_expenses NUMERIC DEFAULT 0;

-- 2. Extend Loans Table for Application Snapshots
-- This captures the state of the user's financial profile at the time of the loan application.
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS snapshot_monthly_income NUMERIC,
ADD COLUMN IF NOT EXISTS snapshot_monthly_expenses NUMERIC,
ADD COLUMN IF NOT EXISTS snapshot_employer_name TEXT,
ADD COLUMN IF NOT EXISTS snapshot_next_of_kin_name TEXT,
ADD COLUMN IF NOT EXISTS snapshot_next_of_kin_phone TEXT;

-- 3. Update disburse_loan RPC to handle more comprehensive data
CREATE OR REPLACE FUNCTION public.disburse_loan(
    p_amount NUMERIC,
    p_interest_rate NUMERIC,
    p_repayment_period INTEGER,
    p_detailed_use TEXT DEFAULT NULL,
    p_employer_name TEXT DEFAULT NULL,
    p_monthly_expenses NUMERIC DEFAULT NULL,
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
    v_profile RECORD;
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

    -- Fetch profile details for snapshot
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;

    v_due_date := now() + (p_repayment_period || ' months')::interval;
    v_total_due := p_amount + (p_amount * (p_interest_rate / 100));

    -- Insert Loan with Snapshots
    INSERT INTO public.loans (
        user_id,
        amount,
        interest_rate,
        repayment_period,
        due_date,
        remaining_balance,
        status,
        detailed_use_of_money,
        snapshot_monthly_income,
        snapshot_monthly_expenses,
        snapshot_employer_name,
        snapshot_next_of_kin_name,
        snapshot_next_of_kin_phone
    ) VALUES (
        v_user_id,
        p_amount,
        p_interest_rate,
        p_repayment_period,
        v_due_date,
        v_total_due,
        'active',
        p_detailed_use,
        v_profile.monthly_income,
        COALESCE(p_monthly_expenses, v_profile.monthly_expenses),
        COALESCE(p_employer_name, v_profile.employer_name),
        v_profile.next_of_kin_name,
        v_profile.next_of_kin_phone
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
            'type', 'loan_disbursement',
            'detailed_use', p_detailed_use
        )
    );

    -- Log to activity_logs
    INSERT INTO public.activity_logs (user_id, action_type, device_info)
    VALUES (v_user_id, 'loan_disbursed', 'Loan ID: ' || v_loan_id || ' | Amount: ' || p_amount);

    RETURN jsonb_build_object(
        'success', true,
        'loan_id', v_loan_id,
        'total_due', v_total_due,
        'due_date', v_due_date
    );
END;
$$;

COMMIT;
