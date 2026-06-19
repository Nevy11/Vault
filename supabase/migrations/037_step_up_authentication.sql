-- 037_step_up_authentication.sql
-- Implement step-up authentication requirements for high-value transactions.

BEGIN;

-- 1. Create a table for pending transactions that require step-up auth
CREATE TABLE IF NOT EXISTS public.pending_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL, -- 'transfer', 'withdrawal'
    amount NUMERIC(15, 4) NOT NULL,
    currency TEXT NOT NULL,
    payload JSONB NOT NULL, -- The original function arguments
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'authorized', 'expired', 'denied'
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Function to check if step-up is required
CREATE OR REPLACE FUNCTION check_step_up_requirement(
    p_user_id UUID,
    p_amount NUMERIC,
    p_currency TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_threshold NUMERIC;
BEGIN
    -- Default threshold: $500 or equivalent
    v_threshold := 500.00;
    
    IF p_currency = 'KES' THEN
        v_threshold := 50000.00;
    END IF;
    
    RETURN p_amount >= v_threshold;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Update vault_transfer to handle step-up
-- (This is a simplified version; in a real app, you'd move the core logic to a private function)
CREATE OR REPLACE FUNCTION vault_transfer_v2(
    p_sender_id UUID,
    p_recipient_tag TEXT,
    p_amount NUMERIC,
    p_authorized_id UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    new_balance NUMERIC,
    reference TEXT,
    requires_auth BOOLEAN,
    auth_id UUID
) AS $$
DECLARE
    v_recipient_id UUID;
    v_sender_balance NUMERIC;
    v_clean_tag TEXT;
    v_reference TEXT;
    v_step_up_required BOOLEAN;
BEGIN
    -- Check if step-up is required and if it hasn't been authorized yet
    v_step_up_required := check_step_up_requirement(p_sender_id, p_amount, 'USD');
    
    IF v_step_up_required AND p_authorized_id IS NULL THEN
        -- Create a pending authorization
        INSERT INTO public.pending_authorizations (user_id, type, amount, currency, payload)
        VALUES (p_sender_id, 'transfer', p_amount, 'USD', jsonb_build_object('recipient_tag', p_recipient_tag))
        RETURNING id INTO p_authorized_id;
        
        RETURN QUERY SELECT false, 'Step-up authentication required for high-value transfer'::TEXT, NULL::NUMERIC, NULL::TEXT, true, p_authorized_id;
        RETURN;
    END IF;
    
    -- If p_authorized_id is provided, verify it
    IF p_authorized_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.pending_authorizations 
            WHERE id = p_authorized_id AND user_id = p_sender_id AND status = 'authorized'
        ) THEN
            RETURN QUERY SELECT false, 'Invalid or unauthorized session'::TEXT, NULL::NUMERIC, NULL::TEXT, false, NULL::UUID;
            RETURN;
        END IF;
    END IF;

    -- [ORIGINAL vault_transfer LOGIC FOLLOWS]
    -- Clean and format the tag to match DB storage (@username in lowercase)
    v_clean_tag := '@' || LOWER(LTRIM(p_recipient_tag, '@'));
    
    -- Find recipient by KYC tag
    SELECT id INTO v_recipient_id
    FROM public.profiles
    WHERE kyc_tag = v_clean_tag;
    
    IF v_recipient_id IS NULL THEN
        RETURN QUERY SELECT false, 'Recipient with tag ' || v_clean_tag || ' not found'::TEXT, NULL::NUMERIC, NULL::TEXT, false, NULL::UUID;
        RETURN;
    END IF;
    
    IF v_recipient_id = p_sender_id THEN
        RETURN QUERY SELECT false, 'You cannot send money to yourself'::TEXT, NULL::NUMERIC, NULL::TEXT, false, NULL::UUID;
        RETURN;
    END IF;
    
    -- Lock sender wallet
    SELECT balance INTO v_sender_balance
    FROM public.wallets
    WHERE user_id = p_sender_id
    FOR UPDATE;
    
    IF v_sender_balance IS NULL THEN
        RETURN QUERY SELECT false, 'Sender wallet not found'::TEXT, NULL::NUMERIC, NULL::TEXT, false, NULL::UUID;
        RETURN;
    END IF;
    
    IF v_sender_balance < p_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, v_sender_balance, NULL::TEXT, false, NULL::UUID;
        RETURN;
    END IF;
    
    -- Generate reference
    v_reference := 'VT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
    
    -- Update sender balance
    UPDATE public.wallets
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_sender_id;

    -- Update recipient balance
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
        (v_sender_balance - p_amount)
    );

    -- Mark authorization as consumed if it existed
    IF p_authorized_id IS NOT NULL THEN
        UPDATE public.pending_authorizations SET status = 'consumed' WHERE id = p_authorized_id;
    END IF;
    
    RETURN QUERY SELECT true, 'Transfer successful'::TEXT, (v_sender_balance - p_amount), v_reference, false, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
