-- Migration: Integrate Loans with Wallet Balance
-- Description: Updates disburse_loan and repay_loan to update wallet balance via ledger entries.

BEGIN;

-- 1. Update disburse_loan to credit the user's wallet
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
BEGIN
    v_user_id := auth.uid();
    
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

    -- Update Wallet Balance and Log Transaction via Ledger
    -- Using 'deposit' type to increase balance. 
    -- Loan is principal amount credited to the wallet.
    PERFORM public.create_ledger_entry(
        v_user_id,
        p_amount,
        'KES', -- Loans in this app are currently KES based as per frontend
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

-- 2. Update repay_loan to deduct from user's wallet when applicable
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
    v_user_id UUID;
    v_wallet_balance NUMERIC;
BEGIN
    v_user_id := auth.uid();

    -- 1. Handle Vault Wallet deduction if applicable
    -- Check for both internal key and display name for robustness
    -- The frontend passes 'Vault' or 'vault_balance' or similar depending on translation
    IF p_source = 'Vault Wallet' OR p_source = 'Vault Account' OR p_source = 'vault_balance' OR p_source = 'Vault' THEN
        -- Check for sufficient funds in KES wallet
        SELECT balance INTO v_wallet_balance
        FROM public.wallets
        WHERE user_id = v_user_id AND currency = 'KES'
        FOR UPDATE;

        IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN
            -- Try to check the only wallet if unique(user_id) is enforced
            SELECT balance INTO v_wallet_balance
            FROM public.wallets
            WHERE user_id = v_user_id
            FOR UPDATE;
            
            IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN
                RETURN jsonb_build_object('success', false, 'message', 'Insufficient vault balance.');
            END IF;
        END IF;

        -- Deduct from wallet and log transaction via Ledger
        -- Using negative amount and 'withdrawal' type
        PERFORM public.create_ledger_entry(
            v_user_id,
            -p_amount,
            'KES',
            'withdrawal',
            p_loan_id::TEXT || '_' || floor(extract(epoch from now()))::TEXT, -- Unique reference
            'Loan Repayment for Loan ID: ' || p_loan_id,
            jsonb_build_object(
                'loan_id', p_loan_id,
                'payment_method', 'vault',
                'type', 'loan_repayment'
            )
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

    -- Insert into Loans Ledger (the loan-specific history table)
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

-- 3. Ensure create_ledger_entry is consistent with the latest wallet constraints
-- Specifically using ON CONFLICT (user_id) if (user_id, currency) is no longer unique
CREATE OR REPLACE FUNCTION public.create_ledger_entry(
    p_user_id UUID,
    p_amount NUMERIC,
    p_currency TEXT,
    p_type TEXT,
    p_reference TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_status TEXT DEFAULT 'completed'
)
RETURNS UUID AS $$
DECLARE
    v_entry_id UUID;
    v_new_balance NUMERIC;
BEGIN
    -- 1. Idempotency check: If reference exists, return the existing entry ID
    IF p_reference IS NOT NULL THEN
        SELECT id INTO v_entry_id FROM public.ledger_entries WHERE reference = p_reference LIMIT 1;
        IF v_entry_id IS NOT NULL THEN
            RETURN v_entry_id;
        END IF;
    END IF;

    -- 2. Insert into ledger_entries (The immutable source of truth)
    INSERT INTO public.ledger_entries (
        user_id, amount, currency, type, reference, description, metadata, status
    ) VALUES (
        p_user_id, p_amount, p_currency, p_type, p_reference, p_description, p_metadata, p_status
    ) RETURNING id INTO v_entry_id;

    -- 3. Update the wallets table for real-time balance tracking
    SELECT COALESCE(SUM(amount), 0) INTO v_new_balance 
    FROM public.ledger_entries 
    WHERE user_id = p_user_id AND currency = p_currency AND status = 'completed';

    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (p_user_id, v_new_balance, p_currency)
    ON CONFLICT (user_id) DO UPDATE 
    SET balance = v_new_balance,
        currency = EXCLUDED.currency,
        updated_at = NOW();

    -- 4. Log into transactions table for UI visibility
    IF p_reference IS NOT NULL THEN
        UPDATE public.transactions 
        SET status = p_status::transaction_status,
            balance_after = v_new_balance,
            description = COALESCE(p_description, description)
        WHERE description = p_reference OR id::TEXT = p_reference;
        
        IF NOT FOUND THEN
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
            ) VALUES (
                CASE WHEN p_amount < 0 THEN p_user_id ELSE NULL END,
                CASE WHEN p_amount >= 0 THEN p_user_id ELSE NULL END,
                p_type::transaction_type,
                COALESCE((p_metadata->>'payment_method')::transaction_method, 'bank'::transaction_method),
                ABS(p_amount),
                p_status::transaction_status,
                p_description,
                v_new_balance,
                p_metadata
            );
        END IF;
    ELSE
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
        ) VALUES (
            CASE WHEN p_amount < 0 THEN p_user_id ELSE NULL END,
            CASE WHEN p_amount >= 0 THEN p_user_id ELSE NULL END,
            p_type::transaction_type,
            COALESCE((p_metadata->>'payment_method')::transaction_method, 'bank'::transaction_method),
            ABS(p_amount),
            p_status::transaction_status,
            p_description,
            v_new_balance,
            p_metadata
        );
    END IF;

    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
