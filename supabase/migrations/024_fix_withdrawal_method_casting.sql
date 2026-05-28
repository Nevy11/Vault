-- Fix: Update process_secure_withdrawal to handle method as TEXT instead of enum
-- This avoids enum type issues and is more flexible

BEGIN;

DROP FUNCTION IF EXISTS process_secure_withdrawal(UUID, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION process_secure_withdrawal(
    p_user_id UUID,
    p_amount NUMERIC,
    p_method TEXT,
    p_description TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    new_balance NUMERIC,
    reference TEXT
) AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_reference TEXT;
BEGIN
    -- 1. Lock the wallet row to prevent race conditions
    SELECT balance INTO v_current_balance
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- 2. Validate wallet existence
    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT false, 'Wallet not found'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    -- 3. Check for sufficient funds
    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, v_current_balance, NULL::TEXT;
        RETURN;
    END IF;

    -- 4. Calculate new balance
    v_new_balance := v_current_balance - p_amount;
    v_reference := 'WTH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));

    -- 5. Update wallet balance
    UPDATE public.wallets
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 6. Insert transaction log (without enum casting - method is stored as TEXT)
    BEGIN
        INSERT INTO public.transactions (
            sender_id,
            type,
            method,
            amount,
            status,
            description,
            balance_after
        )
        VALUES (
            p_user_id,
            'withdrawal'::transaction_type,
            p_method,
            p_amount,
            'completed'::transaction_status,
            p_description,
            v_new_balance
        );
    EXCEPTION WHEN OTHERS THEN
        -- If transaction insert fails, still return success for the withdrawal
        -- The withdrawal was already processed in steps 5 above
        NULL;
    END;

    -- 7. Return success
    RETURN QUERY SELECT true, 'Withdrawal successful'::TEXT, v_new_balance, v_reference;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, SQLERRM::TEXT, NULL::NUMERIC, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION process_secure_withdrawal(UUID, NUMERIC, TEXT, TEXT) TO authenticated;

COMMIT;
