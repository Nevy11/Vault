-- Migration: Process Vault Repayment RPC
-- Description: Creates a new function name to avoid potential schema cache issues with the previous name.

CREATE OR REPLACE FUNCTION public.process_vault_repayment(
    p_loan_id UUID,
    p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet_balance NUMERIC;
    v_remaining_loan NUMERIC;
    v_new_loan_balance NUMERIC;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- 1. Check Wallet Balance
    SELECT balance INTO v_wallet_balance
    FROM wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance.');
    END IF;

    -- 2. Check Loan Balance
    SELECT remaining_balance INTO v_remaining_loan
    FROM loans
    WHERE id = p_loan_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Loan not found.');
    END IF;

    -- 3. Calculate New Balances
    v_new_loan_balance := v_remaining_loan - p_amount;
    IF v_new_loan_balance < 0 THEN
        v_new_loan_balance := 0;
    END IF;

    -- 4. Update Wallet
    UPDATE wallets
    SET balance = balance - p_amount,
        updated_at = now()
    WHERE user_id = v_user_id;

    -- 5. Update Loan
    UPDATE loans
    SET remaining_balance = v_new_loan_balance,
        status = CASE WHEN v_new_loan_balance = 0 THEN 'paid' ELSE 'active' END
    WHERE id = p_loan_id;

    -- 6. Insert Ledger Entry
    INSERT INTO loans_ledger (
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
        'Vault Wallet',
        'automated',
        v_new_loan_balance
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_loan_balance,
        'wallet_balance', v_wallet_balance - p_amount
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_vault_repayment(UUID, NUMERIC) TO authenticated;
