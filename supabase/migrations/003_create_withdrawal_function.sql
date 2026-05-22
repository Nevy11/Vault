-- Supabase RPC Function for secure withdrawal
-- This function handles balance updates in a transaction-safe manner

CREATE OR REPLACE FUNCTION process_withdrawal(
    p_user_id UUID,
    p_amount NUMERIC,
    p_tx_id TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    new_balance NUMERIC,
    message TEXT
) AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- Start transaction
    -- Lock the wallet row for update
    SELECT balance INTO v_current_balance
    FROM wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check if wallet exists
    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT 
            false as success,
            NULL::NUMERIC as new_balance,
            'Wallet not found'::TEXT as message;
        RETURN;
    END IF;
    
    -- Check if sufficient balance
    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT 
            false as success,
            v_current_balance as new_balance,
            'Insufficient balance'::TEXT as message;
        RETURN;
    END IF;
    
    -- Perform the withdrawal
    v_new_balance := v_current_balance - p_amount;
    
    UPDATE wallets
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log the transaction (optional - create a transactions table if needed)
    -- INSERT INTO withdrawal_logs (user_id, amount, tx_id, balance_before, balance_after)
    -- VALUES (p_user_id, p_amount, p_tx_id, v_current_balance, v_new_balance);
    
    RETURN QUERY SELECT 
        true as success,
        v_new_balance as new_balance,
        'Withdrawal successful'::TEXT as message;
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_withdrawal(UUID, NUMERIC, TEXT) TO authenticated;
