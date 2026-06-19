-- Migration: Loan Assessment Logic (V2)
-- Description: Core logic engine for loan eligibility, limits, and interest rates with fixed penalty logic.

CREATE OR REPLACE FUNCTION public.calculate_loan_assessment(
    p_requested_amount NUMERIC,
    p_requested_period_months INTEGER,
    p_is_extension_request BOOLEAN DEFAULT FALSE,
    p_loan_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_tenure_months INTEGER;
    v_avg_volume NUMERIC;
    v_max_limit NUMERIC;
    v_interest_rate NUMERIC;
    v_extension_penalty NUMERIC := 0;
    v_months_extended INTEGER := 0;
    v_remaining_principal NUMERIC := 0;
    v_total_due NUMERIC;
    v_status TEXT := 'approved';
    v_message TEXT := 'Loan assessment successful.';
    v_penalty_rate NUMERIC;
BEGIN
    v_user_id := auth.uid();
    
    -- 1. Tenure Check
    v_tenure_months := public.get_user_tenure_months(v_user_id);
    IF v_tenure_months < 9 THEN
        RETURN jsonb_build_object(
            'status', 'rejected',
            'message', 'We appreciate your interest. However, you must be a member for at least 9 months to qualify for a loan. You currently have ' || v_tenure_months || ' months tenure.'
        );
    END IF;

    -- 2. Average Volume & Limit Calculation (Disabled/Forced for Testing)
    -- v_avg_volume := public.get_three_month_avg_volume(v_user_id);
    v_max_limit := 999999999; -- Manually set to a high limit for testing

    -- 3. Extension Logic
    IF p_is_extension_request THEN
        IF p_loan_id IS NULL THEN
            RETURN jsonb_build_object('status', 'error', 'message', 'Loan ID is required for extension requests.');
        END IF;

        SELECT remaining_balance, months_already_extended 
        INTO v_remaining_principal, v_months_extended
        FROM public.loans
        WHERE id = p_loan_id AND user_id = v_user_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('status', 'error', 'message', 'Active loan not found.');
        END IF;

        -- Penalty calculation: 1% per month extended, capped at 3%
        -- Month 1 extension -> 1%
        -- Month 2 extension -> 2%
        -- Month 3 extension -> 3%
        -- Month 4+ extension -> 3% (frozen)
        v_penalty_rate := LEAST((v_months_extended + 1) * 0.01, 0.03);
        v_extension_penalty := v_remaining_principal * v_penalty_rate;
        
        v_total_due := v_remaining_principal + v_extension_penalty;
        
        RETURN jsonb_build_object(
            'status', 'approved',
            'calculated_limit', v_max_limit,
            'base_interest', 0,
            'extension_penalties', v_extension_penalty,
            'total_repayment_due', v_total_due,
            'months_already_extended', v_months_extended + 1
        );
    END IF;

    -- 4. New Loan Logic
    -- Check Limit
    IF p_requested_amount > v_max_limit THEN
        RETURN jsonb_build_object(
            'status', 'rejected',
            'message', 'The requested amount exceeds your maximum loan limit of KES ' || v_max_limit || '.',
            'calculated_limit', v_max_limit
        );
    END IF;

    -- Interest Rate Schedule
    v_interest_rate := CASE 
        WHEN p_requested_period_months <= 1 THEN 3
        WHEN p_requested_period_months <= 3 THEN 4
        WHEN p_requested_period_months <= 5 THEN 5
        WHEN p_requested_period_months <= 7 THEN 6
        WHEN p_requested_period_months <= 9 THEN 7
        WHEN p_requested_period_months <= 12 THEN 9
        ELSE 12 
    END;

    v_total_due := p_requested_amount + (p_requested_amount * (v_interest_rate / 100));

    RETURN jsonb_build_object(
        'status', 'approved',
        'calculated_limit', v_max_limit,
        'base_interest', v_interest_rate,
        'extension_penalties', 0,
        'total_repayment_due', v_total_due
    );
END;
$$;
