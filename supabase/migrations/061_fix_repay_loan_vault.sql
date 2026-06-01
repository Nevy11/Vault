-- Migration: Fix Repay Loan Vault Deduction
-- Description: Updates the repay_loan RPC to properly deduct from vault balance and log transactions.

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
    v_wallet_balance NUMERIC;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- 1. Handle Vault Wallet deduction if applicable
    -- Check for both internal key and display name for robustness
    IF p_source = 'Vault Wallet' OR p_source = 'Vault Account' OR p_source = 'vault_balance' THEN
        SELECT balance INTO v_wallet_balance
        FROM public.wallets
        WHERE user_id = v_user_id
        FOR UPDATE;

        IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient vault balance.');
        END IF;

        -- Deduct from wallet
        UPDATE public.wallets
        SET balance = balance - p_amount,
            updated_at = now()
        WHERE user_id = v_user_id;

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
            p_amount,
            'completed',
            'Loan Repayment for Loan ID: ' || p_loan_id,
            v_wallet_balance - p_amount
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

GRANT EXECUTE ON FUNCTION public.repay_loan(UUID, NUMERIC, TEXT, TEXT) TO authenticated;
