-- Migration: Update profiles and loans for advanced assessment
-- Description: Adds risk profiling columns to profiles and extension tracking to loans.

-- 1. Update profiles table with risk profiling fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employment_status TEXT,
ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS financial_dependents INTEGER,
ADD COLUMN IF NOT EXISTS monthly_debt NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS primary_loan_use TEXT;

-- 2. Update loans table with extension tracking
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS months_already_extended INTEGER DEFAULT 0;

-- 3. Create a function to calculate tenure in months
CREATE OR REPLACE FUNCTION public.get_user_tenure_months(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_created_at TIMESTAMPTZ;
BEGIN
    SELECT created_at INTO v_created_at FROM public.profiles WHERE id = p_user_id;
    IF v_created_at IS NULL THEN
        RETURN 0;
    END IF;
    RETURN (EXTRACT(YEAR FROM age(now(), v_created_at)) * 12 + EXTRACT(MONTH FROM age(now(), v_created_at)))::INTEGER;
END;
$$;

-- 4. Create a function to calculate 3-month average monthly volume (deposits/credits)
CREATE OR REPLACE FUNCTION public.get_three_month_avg_volume(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_volume NUMERIC;
BEGIN
    -- Sum of all deposits (incoming transactions) in the last 90 days
    -- Assuming 'credit' or specific types indicate deposits
    SELECT COALESCE(SUM(amount), 0) INTO v_total_volume
    FROM public.transactions
    WHERE (receiver_id = p_user_id OR (user_id = p_user_id AND type = 'deposit'))
      AND created_at >= now() - INTERVAL '3 months';
    
    RETURN v_total_volume / 3.0;
END;
$$;
