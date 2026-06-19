-- Migration 099: Refactor Freeze to Suspension
-- This migration renames 'is_frozen' to 'is_suspended' and adds recovery logic.

BEGIN;

-- 1. Rename columns in profiles table
-- We check for existence first to be safe
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_frozen') THEN
        ALTER TABLE public.profiles RENAME COLUMN is_frozen TO is_suspended;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'frozen_at') THEN
        ALTER TABLE public.profiles RENAME COLUMN frozen_at TO suspended_at;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'frozen_reason') THEN
        ALTER TABLE public.profiles RENAME COLUMN frozen_reason TO suspended_reason;
    END IF;
END $$;

-- 2. Drop old 'freeze' functions
DROP FUNCTION IF EXISTS public.emergency_freeze_account();
DROP FUNCTION IF EXISTS public.emergency_freeze_account(text);

-- 3. Create new 'suspend' function with mandatory reason
CREATE OR REPLACE FUNCTION public.suspend_account(p_reason TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'A reason for suspension is required';
    END IF;

    UPDATE public.profiles
    SET is_suspended = TRUE,
        suspended_at = NOW(),
        suspended_reason = p_reason
    WHERE id = auth.uid();
    
    PERFORM public.log_audit_event('account_suspended', 'success', jsonb_build_object('reason', p_reason));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create 'unsuspend_account' function (requires auth, will be called after OTP verification)
CREATE OR REPLACE FUNCTION public.unsuspend_account()
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.profiles
    SET is_suspended = FALSE,
        suspended_at = NULL,
        suspended_reason = NULL
    WHERE id = auth.uid();
    
    PERFORM public.log_audit_event('account_unsuspended', 'success', NULL);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.suspend_account(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsuspend_account() TO authenticated;

-- 6. Update vault_transfer and other security checks to use 'is_suspended'
-- We'll just recreate the function to point to the new column
CREATE OR REPLACE FUNCTION public.vault_transfer(
    p_sender_id UUID,
    p_recipient_tag TEXT,
    p_amount NUMERIC,
    p_category TEXT DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
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
BEGIN
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT false, 'Amount must be positive'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_sender_id AND is_suspended = TRUE) THEN
        RETURN QUERY SELECT false, 'Your account is suspended. Please restore it to continue.'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    v_clean_tag := '@' || LOWER(LTRIM(p_recipient_tag, '@'));
    SELECT id INTO v_recipient_id FROM public.profiles WHERE kyc_tag = v_clean_tag;

    IF v_recipient_id IS NULL THEN
        RETURN QUERY SELECT false, 'Recipient not found'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    IF v_recipient_id = p_sender_id THEN
        RETURN QUERY SELECT false, 'Cannot transfer to yourself'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    SELECT balance INTO v_sender_balance FROM public.wallets WHERE user_id = p_sender_id FOR UPDATE;
    
    IF v_sender_balance IS NULL THEN
        RETURN QUERY SELECT false, 'Wallet not found'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    IF v_sender_balance < p_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, v_sender_balance, NULL::TEXT;
        RETURN;
    END IF;

    v_reference := 'TXV' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));

    UPDATE public.wallets SET balance = balance - p_amount, updated_at = NOW() WHERE user_id = p_sender_id;
    UPDATE public.wallets SET balance = balance + p_amount, updated_at = NOW() WHERE user_id = v_recipient_id;

    v_new_balance := v_sender_balance - p_amount;

    INSERT INTO public.transactions (sender_id, receiver_id, type, method, amount, status, description, balance_after, category, reference)
    VALUES (p_sender_id, v_recipient_id, 'transfer', 'vault', p_amount, 'completed', COALESCE(p_note, 'Vault Transfer Ref: ' || v_reference), v_new_balance, COALESCE(p_category, 'Transfer'), v_reference);

    INSERT INTO public.transactions (sender_id, receiver_id, type, method, amount, status, description, balance_after, category, reference)
    VALUES (v_recipient_id, p_sender_id, 'deposit', 'vault', p_amount, 'completed', 'Received from @' || (SELECT kyc_tag FROM public.profiles WHERE id = p_sender_id), NULL, COALESCE(p_category, 'Deposit'), v_reference);

    PERFORM public.log_audit_event('transfer_completed', 'success', jsonb_build_object('sender_id', p_sender_id, 'recipient_id', v_recipient_id, 'amount', p_amount, 'reference', v_reference));

    RETURN QUERY SELECT true, 'Transfer successful'::TEXT, v_new_balance, v_reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
