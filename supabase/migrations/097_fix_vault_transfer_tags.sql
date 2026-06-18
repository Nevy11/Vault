-- Migration 097: Fix vault_transfer Tag Handling
-- This migration ensures vault_transfer correctly handles KYC tags that start with '@' and matches the format used in the profiles table.

BEGIN;

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
    -- 1. Validate Input
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT false, 'Amount must be positive'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    -- 2. Check for frozen account
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_sender_id AND is_frozen = TRUE) THEN
        RETURN QUERY SELECT false, 'Your account is frozen. Please contact support.'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    -- 3. Clean and format the tag (Ensure it starts with @ to match the profiles table)
    v_clean_tag := '@' || LOWER(LTRIM(p_recipient_tag, '@'));
    
    -- 4. Find recipient
    SELECT id INTO v_recipient_id FROM public.profiles WHERE kyc_tag = v_clean_tag;

    IF v_recipient_id IS NULL THEN
        RETURN QUERY SELECT false, 'Recipient not found'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    IF v_recipient_id = p_sender_id THEN
        RETURN QUERY SELECT false, 'Cannot transfer to yourself'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    -- 5. Check balance
    SELECT balance INTO v_sender_balance FROM public.wallets WHERE user_id = p_sender_id FOR UPDATE;
    
    IF v_sender_balance IS NULL THEN
        RETURN QUERY SELECT false, 'Wallet not found'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    IF v_sender_balance < p_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, v_sender_balance, NULL::TEXT;
        RETURN;
    END IF;

    -- 6. Execute Transfer
    v_reference := 'TXV' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));

    -- Update Sender Wallet
    UPDATE public.wallets 
    SET balance = balance - p_amount, 
        updated_at = NOW() 
    WHERE user_id = p_sender_id;

    -- Update Recipient Wallet
    UPDATE public.wallets 
    SET balance = balance + p_amount, 
        updated_at = NOW() 
    WHERE user_id = v_recipient_id;

    v_new_balance := v_sender_balance - p_amount;

    -- 7. Log Transactions
    -- Log for Sender
    INSERT INTO public.transactions (
        sender_id, receiver_id, type, method, amount, status, description, balance_after, category, reference
    ) VALUES (
        p_sender_id, v_recipient_id, 'transfer', 'vault', p_amount, 'completed', 
        COALESCE(p_note, 'Vault Transfer Ref: ' || v_reference), v_new_balance, COALESCE(p_category, 'Transfer'), v_reference
    );

    -- Log for Recipient
    INSERT INTO public.transactions (
        sender_id, receiver_id, type, method, amount, status, description, balance_after, category, reference
    ) VALUES (
        v_recipient_id, p_sender_id, 'deposit', 'vault', p_amount, 'completed', 
        'Received from @' || (SELECT kyc_tag FROM public.profiles WHERE id = p_sender_id), NULL, COALESCE(p_category, 'Deposit'), v_reference
    );

    -- Log to Audit Log
    PERFORM public.log_audit_event('transfer_completed', 'success', jsonb_build_object(
        'sender_id', p_sender_id,
        'recipient_id', v_recipient_id,
        'amount', p_amount,
        'reference', v_reference,
        'category', p_category,
        'note', p_note
    ));

    RETURN QUERY SELECT true, 'Transfer successful'::TEXT, v_new_balance, v_reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
