-- Update vault_transfer to store balance_after in transactions
BEGIN;

CREATE OR REPLACE FUNCTION vault_transfer(
    p_sender_id UUID,
    p_recipient_tag TEXT,
    p_amount NUMERIC
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    new_balance NUMERIC,
    reference TEXT
) AS $$
DECLARE
    v_recipient_id UUID;
    v_sender_balance NUMERIC;
    v_clean_tag TEXT;
    v_reference TEXT;
    v_new_balance NUMERIC;
BEGIN
    -- Clean and format the tag to match DB storage (@username in lowercase)
    v_clean_tag := '@' || LOWER(LTRIM(p_recipient_tag, '@'));
    
    -- Find recipient by KYC tag
    SELECT id INTO v_recipient_id
    FROM public.profiles
    WHERE kyc_tag = v_clean_tag;
    
    IF v_recipient_id IS NULL THEN
        RETURN QUERY SELECT false, 'Recipient with tag ' || v_clean_tag || ' not found'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;
    
    IF v_recipient_id = p_sender_id THEN
        RETURN QUERY SELECT false, 'You cannot send money to yourself'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Lock sender wallet
    SELECT balance INTO v_sender_balance
    FROM public.wallets
    WHERE user_id = p_sender_id
    FOR UPDATE;
    
    IF v_sender_balance IS NULL THEN
        RETURN QUERY SELECT false, 'Sender wallet not found'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;
    
    IF v_sender_balance < p_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, v_sender_balance, NULL::TEXT;
        RETURN;
    END IF;
    
    v_new_balance := v_sender_balance - p_amount;
    
    -- Generate reference
    v_reference := 'VT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
    
    -- Update sender balance
    UPDATE public.wallets
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_sender_id;
    
    -- Update recipient balance
    -- We need to know recipient's new balance too if we wanted to log it for them, 
    -- but usually transaction logs are from the perspective of the initiator or general ledger.
    -- For simplicity, we'll focus on the sender's perspective here.
    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (v_recipient_id, p_amount, 'USD')
    ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + EXCLUDED.balance,
        updated_at = NOW();
        
    -- Log transaction
    INSERT INTO public.transactions (
        sender_id, 
        receiver_id, 
        type, 
        method, 
        amount, 
        status, 
        description,
        balance_after
    )
    VALUES (
        p_sender_id, 
        v_recipient_id, 
        'transfer'::transaction_type, 
        'vault'::transaction_method, 
        p_amount, 
        'completed'::transaction_status,
        'Vault Transfer Ref: ' || v_reference,
        v_new_balance
    );
    
    RETURN QUERY SELECT true, 'Transfer successful'::TEXT, v_new_balance, v_reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
