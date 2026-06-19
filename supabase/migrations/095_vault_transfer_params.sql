-- Migration 095: Update vault_transfer with Category and Note
-- This migration adds p_category and p_note parameters to the vault_transfer function.

BEGIN;

-- 1. Ensure transactions table has the required columns (idempotency key is usually added in a separate migration, but we ensure it here if needed)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category TEXT;
-- Note: description already exists and can be used for p_note

-- 2. Update vault_transfer function
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

    -- 3. Check for cooling-off period (if applicable, simplified here)
    -- 4. Check Fraud Risk (if applicable)

    -- 5. Find recipient
    v_clean_tag := REPLACE(p_recipient_tag, '@', '');
    SELECT id INTO v_recipient_id FROM public.profiles WHERE kyc_tag = v_clean_tag;

    IF v_recipient_id IS NULL THEN
        RETURN QUERY SELECT false, 'Recipient not found'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    IF v_recipient_id = p_sender_id THEN
        RETURN QUERY SELECT false, 'Cannot transfer to yourself'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    -- 6. Check balance
    SELECT balance INTO v_sender_balance FROM public.wallets WHERE user_id = p_sender_id FOR UPDATE;
    
    IF v_sender_balance < p_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, v_sender_balance, NULL::TEXT;
        RETURN;
    END IF;

    -- 7. Execute Transfer
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

    -- 8. Log Transactions
    -- Log for Sender
    INSERT INTO public.transactions (
        sender_id, receiver_id, type, method, amount, status, description, balance_after, category
    ) VALUES (
        p_sender_id, v_recipient_id, 'transfer', 'vault', p_amount, 'completed', 
        COALESCE(p_note, 'Vault Transfer Ref: ' || v_reference), v_new_balance, COALESCE(p_category, 'Transfer')
    );

    -- Log for Recipient
    INSERT INTO public.transactions (
        sender_id, receiver_id, type, method, amount, status, description, balance_after, category
    ) VALUES (
        v_recipient_id, p_sender_id, 'deposit', 'vault', p_amount, 'completed', 
        'Received from @' || (SELECT kyc_tag FROM public.profiles WHERE id = p_sender_id), NULL, COALESCE(p_category, 'Deposit')
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
