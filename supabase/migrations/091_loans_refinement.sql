-- Migration: Refine Demographics and Loan Form
-- Description: Adds kra_pin and kyc_verified_at to profiles, adds snapshot columns to loans, sets up trigger to set kyc_verified_at on status = 'verified', schedules daily check to reset expired KYC (1 year limit), and updates disburse_loan.

BEGIN;

-- 1. Edit profiles table to add kra_pin and kyc_verified_at
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS kra_pin TEXT,
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;

-- 2. Edit loans table to add snapshot columns for employment terms, active credit obligations
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS snapshot_employment_status TEXT,
ADD COLUMN IF NOT EXISTS snapshot_active_credit_obligations TEXT,
ADD COLUMN IF NOT EXISTS snapshot_next_of_kin_relationship TEXT;

-- 3. Create Trigger to automatically set kyc_verified_at when kyc_status is updated to 'verified'
CREATE OR REPLACE FUNCTION public.update_kyc_verified_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kyc_status = 'verified'::public.kyc_status AND (OLD.kyc_status IS NULL OR OLD.kyc_status <> 'verified'::public.kyc_status) THEN
    NEW.kyc_verified_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_kyc_verified_at_trigger ON public.profiles;

CREATE TRIGGER update_kyc_verified_at_trigger
BEFORE UPDATE OF kyc_status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_kyc_verified_at();

-- 4. Create daily cron job logic to check for expired KYC and reset it
CREATE OR REPLACE FUNCTION public.check_and_reset_expired_kyc()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET kyc_status = 'unverified'::public.kyc_status,
        kyc_verified_at = NULL
    WHERE kyc_status = 'verified'::public.kyc_status
      AND kyc_verified_at IS NOT NULL
      AND kyc_verified_at < now() - INTERVAL '1 year';
END;
$$;

-- Schedule the cron job using pg_cron (if extension is enabled)
SELECT cron.schedule(
    'daily-kyc-expiry-check',
    '0 0 * * *',
    'SELECT public.check_and_reset_expired_kyc();'
);

-- 5. Recreate public.disburse_loan to capture all the new loan snapshots
CREATE OR REPLACE FUNCTION public.disburse_loan(
    p_amount NUMERIC,
    p_interest_rate NUMERIC,
    p_repayment_period INTEGER,
    p_detailed_use TEXT DEFAULT NULL,
    p_employment_status TEXT DEFAULT NULL,
    p_monthly_income NUMERIC DEFAULT NULL,
    p_active_credit_obligations TEXT DEFAULT NULL,
    p_next_of_kin_name TEXT DEFAULT NULL,
    p_next_of_kin_phone TEXT DEFAULT NULL,
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
    
    -- Check if user already has an active loan (limit of one active loan at a time)
    IF EXISTS (SELECT 1 FROM public.loans WHERE user_id = v_user_id AND status = 'active') THEN
        RETURN jsonb_build_object('success', false, 'message', 'You already have an active loan.');
    END IF;

    -- Fetch profile details for snapshot if any are missing
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
        snapshot_employment_status,
        snapshot_active_credit_obligations,
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
        COALESCE(p_monthly_income, v_profile.monthly_income),
        COALESCE(p_employment_status, v_profile.employment_status),
        p_active_credit_obligations,
        COALESCE(p_next_of_kin_name, v_profile.next_of_kin_name),
        COALESCE(p_next_of_kin_phone, v_profile.next_of_kin_phone)
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
