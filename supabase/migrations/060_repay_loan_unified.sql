-- Migration: Unified Repay Loan RPC
-- Description: Re-creates the repay_loan function with Vault Wallet support to ensure it is applied to the database.

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
    IF p_source = 'Vault Wallet' THEN
        SELECT balance INTO v_wallet_balance
        FROM public.wallets
        WHERE user_id = v_user_id
        FOR UPDATE;

        IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance.');
        END IF;

        UPDATE public.wallets
        SET balance = balance - p_amount,
            updated_at = now()
        WHERE user_id = v_user_id;
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
        'new_balance', v_new_balance
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.repay_loan(UUID, NUMERIC, TEXT, TEXT) TO authenticated;
