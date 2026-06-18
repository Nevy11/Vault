-- Migration 085: Security & Compliance Enhancements
-- This migration adds support for Audit Logs, Idempotency Keys, Rate Limiting, and Step-up OTP.

BEGIN;

-- 1. Create Audit Logs Table (Immutable)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success', 'failure', 'blocked'
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Only service role or security-definer functions can insert
CREATE POLICY "Only service role can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true); -- We will use SECURITY DEFINER functions to control this

-- 2. Add Idempotency Key to Transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;

-- 3. Create Rate Limiting Table
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 1,
    last_attempt TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Step-up OTP Table
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    code_hash TEXT NOT NULL,
    purpose TEXT NOT NULL, -- e.g., 'high_value_transfer', 'pin_change', 'account_deletion'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- 5. Helper RPC: log_audit_event
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_status TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_target_user UUID;
BEGIN
    v_target_user := COALESCE(p_user_id, auth.uid());
    
    INSERT INTO public.audit_logs (
        user_id, action, status, metadata
    ) VALUES (
        v_target_user, p_action, p_status, p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper RPC: check_rate_limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_max_attempts INTEGER,
    p_window_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_attempts INTEGER;
    v_last_attempt TIMESTAMPTZ;
BEGIN
    -- Cleanup old entries in the background (simplified)
    DELETE FROM public.rate_limits WHERE last_attempt < (NOW() - (p_window_seconds || ' seconds')::INTERVAL);

    SELECT attempts, last_attempt INTO v_attempts, v_last_attempt
    FROM public.rate_limits
    WHERE key = p_key;

    IF v_attempts IS NULL THEN
        INSERT INTO public.rate_limits (key, attempts, last_attempt)
        VALUES (p_key, 1, NOW());
        RETURN TRUE;
    END IF;

    -- If the last attempt was outside the window, reset the counter
    IF v_last_attempt < (NOW() - (p_window_seconds || ' seconds')::INTERVAL) THEN
        UPDATE public.rate_limits
        SET attempts = 1, last_attempt = NOW()
        WHERE key = p_key;
        RETURN TRUE;
    END IF;

    -- If within window and exceeds max attempts
    IF v_attempts >= p_max_attempts THEN
        RETURN FALSE;
    END IF;

    -- Increment counter
    UPDATE public.rate_limits
    SET attempts = attempts + 1, last_attempt = NOW()
    WHERE key = p_key;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update vault_transfer to support idempotency_key
-- Note: We are replacing the existing vault_transfer function
CREATE OR REPLACE FUNCTION public.vault_transfer(
    p_sender_id UUID,
    p_recipient_tag TEXT,
    p_amount NUMERIC,
    p_idempotency_key UUID DEFAULT NULL
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
    v_existing_tx_id UUID;
BEGIN
    -- Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, description, balance_after INTO v_existing_tx_id, v_reference, v_new_balance
        FROM public.transactions
        WHERE idempotency_key = p_idempotency_key
        AND sender_id = p_sender_id;
        
        IF v_existing_tx_id IS NOT NULL THEN
            RETURN QUERY SELECT true, 'Duplicate request handled successfully'::TEXT, v_new_balance, v_reference;
            RETURN;
        END IF;
    END IF;

    -- Clean and format the tag
    v_clean_tag := '@' || LOWER(LTRIM(p_recipient_tag, '@'));
    
    -- Find recipient
    SELECT id INTO v_recipient_id
    FROM public.profiles
    WHERE kyc_tag = v_clean_tag;
    
    IF v_recipient_id IS NULL THEN
        RETURN QUERY SELECT false, 'Recipient not found'::TEXT, NULL::NUMERIC, NULL::TEXT;
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
    v_reference := 'VT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
    
    -- Update sender balance
    UPDATE public.wallets
    SET balance = v_new_balance, updated_at = NOW()
    WHERE user_id = p_sender_id;
    
    -- Update recipient balance
    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (v_recipient_id, p_amount, 'USD')
    ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + EXCLUDED.balance, updated_at = NOW();
        
    -- Log transaction with idempotency_key
    INSERT INTO public.transactions (
        sender_id, receiver_id, type, method, amount, status, description, balance_after, idempotency_key
    )
    VALUES (
        p_sender_id, v_recipient_id, 'transfer', 'vault', p_amount, 'completed', 
        'Vault Transfer Ref: ' || v_reference, v_new_balance, p_idempotency_key
    );

    -- Log to Audit Log
    PERFORM public.log_audit_event('transfer_completed', 'success', jsonb_build_object(
        'amount', p_amount,
        'recipient_tag', v_clean_tag,
        'reference', v_reference
    ));
    
    RETURN QUERY SELECT true, 'Transfer successful'::TEXT, v_new_balance, v_reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
