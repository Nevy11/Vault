-- Migration: Atomic Financial Operations and Currency Handling
-- Description: Standardizes disburse_loan, repay_loan, and adds process_savings_contribution.

BEGIN;

-- 1. Updated disburse_loan with Wallet Crediting and Currency Conversion
CREATE OR REPLACE FUNCTION public.disburse_loan(
    p_amount NUMERIC,
    p_interest_rate NUMERIC,
    p_repayment_period INTEGER
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
    v_wallet_id UUID;
    v_wallet_currency TEXT;
    v_wallet_balance NUMERIC;
    v_credit_amount NUMERIC;
    v_rate NUMERIC;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated.');
    END IF;

    -- Check if user already has an active loan
    IF EXISTS (SELECT 1 FROM public.loans WHERE user_id = v_user_id AND status = 'active') THEN
        RETURN jsonb_build_object('success', false, 'message', 'You already have an active loan.');
    END IF;

    -- Get Wallet Info
    SELECT id, balance, currency INTO v_wallet_id, v_wallet_balance, v_wallet_currency
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Wallet not found. Please initialize your wallet first.');
    END IF;

    -- Calculate Loan Details (p_amount is in KES)
    v_due_date := now() + (p_repayment_period || ' months')::interval;
    v_total_due := p_amount + (p_amount * (p_interest_rate / 100));

    -- Currency Conversion for Disbursement
    IF v_wallet_currency = 'KES' THEN
        v_credit_amount := p_amount;
    ELSE
        SELECT rate INTO v_rate 
        FROM public.currency_rates 
        WHERE from_currency = 'KES' AND to_currency = v_wallet_currency;
        
        IF v_rate IS NULL THEN
            -- Fallback to hardcoded if table is missing or rate not found
            v_rate := 1.0 / 130.5;
        END IF;
        
        v_credit_amount := p_amount * v_rate;
    END IF;

    -- 1. Create Loan Record
    INSERT INTO public.loans (
        user_id,
        amount,
        interest_rate,
        repayment_period,
        due_date,
        remaining_balance,
        status
    ) VALUES (
        v_user_id,
        p_amount,
        p_interest_rate,
        p_repayment_period,
        v_due_date,
        v_total_due,
        'active'
    ) RETURNING id INTO v_loan_id;

    -- 2. Credit Wallet
    UPDATE public.wallets
    SET balance = balance + v_credit_amount,
        updated_at = now()
    WHERE id = v_wallet_id;

    -- 3. Log Transaction
    INSERT INTO public.transactions (
        sender_id,
        receiver_id,
        type,
        method,
        amount,
        status,
        description,
        balance_after
    ) VALUES (
        NULL, -- From System
        v_user_id,
        'deposit',
        'loan',
        v_credit_amount,
        'completed',
        'Loan Disbursement (Loan ID: ' || v_loan_id || ')',
        v_wallet_balance + v_credit_amount
    );

    RETURN jsonb_build_object(
        'success', true,
        'loan_id', v_loan_id,
        'total_due', v_total_due,
        'due_date', v_due_date,
        'credited_amount', v_credit_amount,
        'currency', v_wallet_currency,
        'message', 'Loan of KES ' || p_amount || ' disbursed successfully to your ' || v_wallet_currency || ' wallet.'
    );
END;
$$;

-- 2. Updated repay_loan with Correct Currency Conversion
CREATE OR REPLACE FUNCTION public.repay_loan(
    p_loan_id UUID,
    p_amount NUMERIC,
    p_source TEXT,
    p_payment_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_remaining NUMERIC;
    v_new_balance NUMERIC;
    v_wallet_id UUID;
    v_wallet_balance NUMERIC;
    v_wallet_currency TEXT;
    v_user_id UUID;
    v_deduction_amount NUMERIC;
    v_rate NUMERIC;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated.');
    END IF;

    -- 1. Handle Vault Wallet deduction if applicable
    IF p_source = 'Vault Wallet' OR p_source = 'Vault Account' OR p_source = 'vault_balance' OR p_source = 'Vault' THEN
        SELECT id, balance, currency INTO v_wallet_id, v_wallet_balance, v_wallet_currency
        FROM public.wallets
        WHERE user_id = v_user_id
        FOR UPDATE;

        IF v_wallet_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Vault wallet not found.');
        END IF;

        -- Currency Conversion (p_amount is in KES)
        IF v_wallet_currency = 'KES' THEN
            v_deduction_amount := p_amount;
        ELSE
            SELECT rate INTO v_rate 
            FROM public.currency_rates 
            WHERE from_currency = 'KES' AND to_currency = v_wallet_currency;
            
            IF v_rate IS NULL THEN
                v_rate := 1.0 / 130.5;
            END IF;
            
            v_deduction_amount := p_amount * v_rate;
        END IF;

        IF v_wallet_balance < v_deduction_amount THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient vault balance.');
        END IF;

        -- Deduct from wallet
        UPDATE public.wallets
        SET balance = balance - v_deduction_amount,
            updated_at = now()
        WHERE id = v_wallet_id;

        -- Log transaction for the deduction
        INSERT INTO public.transactions (
            sender_id,
            type,
            method,
            amount,
            status,
            description,
            balance_after
        ) VALUES (
            v_user_id,
            'withdrawal',
            'vault',
            v_deduction_amount,
            'completed',
            'Loan Repayment for Loan ID: ' || p_loan_id,
            v_wallet_balance - v_deduction_amount
        );
    END IF;

    -- 2. Process Loan Update
    SELECT remaining_balance INTO v_remaining
    FROM public.loans
    WHERE id = p_loan_id AND user_id = v_user_id
    FOR UPDATE;

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
        v_user_id,
        p_amount,
        p_source,
        p_payment_type,
        v_new_balance
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'message', 'Repayment of KES ' || p_amount || ' successful.'
    );
END;
$$;

-- 3. New process_savings_contribution RPC
CREATE OR REPLACE FUNCTION public.process_savings_contribution(
    p_goal_id UUID,
    p_amount NUMERIC,
    p_source TEXT,
    p_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_wallet_id UUID;
    v_wallet_balance NUMERIC;
    v_wallet_currency TEXT;
    v_deduction_amount NUMERIC;
    v_rate NUMERIC;
    v_goal_current NUMERIC;
    v_new_total NUMERIC;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated.');
    END IF;

    -- 1. Handle Vault Balance deduction if applicable
    IF p_source = 'Vault Wallet' OR p_source = 'Vault Account' OR p_source = 'vault_balance' OR p_source = 'Vault' THEN
        SELECT id, balance, currency INTO v_wallet_id, v_wallet_balance, v_wallet_currency
        FROM public.wallets
        WHERE user_id = v_user_id
        FOR UPDATE;

        IF v_wallet_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Vault wallet not found.');
        END IF;

        -- Currency Conversion (p_amount is in KES)
        IF v_wallet_currency = 'KES' THEN
            v_deduction_amount := p_amount;
        ELSE
            SELECT rate INTO v_rate 
            FROM public.currency_rates 
            WHERE from_currency = 'KES' AND to_currency = v_wallet_currency;
            
            IF v_rate IS NULL THEN
                v_rate := 1.0 / 130.5;
            END IF;
            
            v_deduction_amount := p_amount * v_rate;
        END IF;

        IF v_wallet_balance < v_deduction_amount THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient vault balance.');
        END IF;

        -- Deduct from wallet
        UPDATE public.wallets
        SET balance = balance - v_deduction_amount,
            updated_at = now()
        WHERE id = v_wallet_id;

        -- Log Transaction
        INSERT INTO public.transactions (
            sender_id,
            receiver_id,
            type,
            method,
            amount,
            status,
            description,
            balance_after
        ) VALUES (
            v_user_id,
            NULL, -- To Savings
            'transfer',
            'vault',
            v_deduction_amount,
            'completed',
            'Transferred to savings (Goal ID: ' || p_goal_id || ')',
            v_wallet_balance - v_deduction_amount
        );
    END IF;

    -- 2. Update Savings Goal
    SELECT current_amount INTO v_goal_current
    FROM public.savings_goals
    WHERE id = p_goal_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Savings goal not found.');
    END IF;

    v_new_total := v_goal_current + p_amount;

    UPDATE public.savings_goals
    SET current_amount = v_new_total,
        status = CASE WHEN v_new_total >= target_amount THEN 'completed' ELSE 'active' END,
        updated_at = now()
    WHERE id = p_goal_id;

    -- 3. Insert into Savings Ledger
    INSERT INTO public.savings_ledger (
        goal_id,
        user_id,
        amount,
        source,
        type,
        running_total
    ) VALUES (
        p_goal_id,
        v_user_id,
        p_amount,
        p_source,
        p_type,
        v_new_total
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_total', v_new_total,
        'message', 'Contribution of KES ' || p_amount || ' added successfully.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.disburse_loan(NUMERIC, NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repay_loan(UUID, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_savings_contribution(UUID, NUMERIC, TEXT, TEXT) TO authenticated;

COMMIT;
