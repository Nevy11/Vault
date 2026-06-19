-- Migration 092: Integrate Phase 2 Security into Financial RPCs
-- This migration updates vault_transfer, process_secure_withdrawal, and pay_bill_split to check for frozen accounts, fraud risk, and cooling-off periods.

BEGIN;

-- 1. Update vault_transfer
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
    v_is_frozen BOOLEAN;
    v_fraud_risk RECORD;
BEGIN
    -- Check if account is frozen
    SELECT is_frozen INTO v_is_frozen FROM public.profiles WHERE id = p_sender_id;
    IF v_is_frozen THEN
        RETURN QUERY SELECT FALSE, 'Account is currently frozen. Please contact support.'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    -- Evaluate Fraud Risk
    SELECT * INTO v_fraud_risk FROM public.evaluate_transaction_risk(p_sender_id, p_amount);
    IF v_fraud_risk.is_fraudulent THEN
        PERFORM public.log_audit_event('transaction_blocked_fraud', 'blocked', jsonb_build_object('reason', v_fraud_risk.reason, 'code', v_fraud_risk.error_code));
        RETURN QUERY SELECT FALSE, v_fraud_risk.reason, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

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

-- 2. Update process_secure_withdrawal
CREATE OR REPLACE FUNCTION public.process_secure_withdrawal(
    p_user_id UUID,
    p_amount NUMERIC,
    p_method TEXT,
    p_description TEXT,
    p_idempotency_key UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    reference TEXT,
    new_balance NUMERIC
) AS $$
DECLARE
    v_wallet_id UUID;
    v_current_balance NUMERIC;
    v_reference TEXT;
    v_new_balance NUMERIC;
    v_existing_tx_id UUID;
    v_method transaction_method;
    v_is_frozen BOOLEAN;
    v_cooling_off_until TIMESTAMPTZ;
    v_fraud_risk RECORD;
BEGIN
    -- Check if account is frozen
    SELECT is_frozen, cooling_off_until INTO v_is_frozen, v_cooling_off_until 
    FROM public.profiles WHERE id = p_user_id;
    
    IF v_is_frozen THEN
        RETURN QUERY SELECT FALSE, 'Account is currently frozen. Please contact support.'::TEXT, NULL::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Check cooling-off period
    IF v_cooling_off_until IS NOT NULL AND v_cooling_off_until > NOW() THEN
        RETURN QUERY SELECT FALSE, 'Security cooling-off period active. Please try again after ' || v_cooling_off_until::TEXT, NULL::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Evaluate Fraud Risk
    SELECT * INTO v_fraud_risk FROM public.evaluate_transaction_risk(p_user_id, p_amount);
    IF v_fraud_risk.is_fraudulent THEN
        PERFORM public.log_audit_event('withdrawal_blocked_fraud', 'blocked', jsonb_build_object('reason', v_fraud_risk.reason, 'code', v_fraud_risk.error_code));
        RETURN QUERY SELECT FALSE, v_fraud_risk.reason, NULL::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, description, balance_after INTO v_existing_tx_id, v_reference, v_new_balance
        FROM public.transactions
        WHERE idempotency_key = p_idempotency_key;
        
        IF v_existing_tx_id IS NOT NULL THEN
            RETURN QUERY SELECT true, 'Duplicate withdrawal handled'::TEXT, v_reference, v_new_balance;
            RETURN;
        END IF;
    END IF;

    -- Cast method safely
    BEGIN
        v_method := p_method::transaction_method;
    EXCEPTION WHEN OTHERS THEN
        v_method := 'bank_account'::transaction_method;
    END;

    -- Lock and check balance
    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN QUERY SELECT false, 'Wallet not found'::TEXT, NULL::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, NULL::TEXT, v_current_balance;
        RETURN;
    END IF;

    v_new_balance := v_current_balance - p_amount;
    v_reference := 'WTH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));

    -- 1. Deduct balance
    UPDATE public.wallets
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = v_wallet_id;

    -- 2. Log transaction
    INSERT INTO public.transactions (
        sender_id, type, method, amount, status, description, balance_after, idempotency_key
    ) VALUES (
        p_user_id, 'withdrawal', v_method, p_amount, 'completed', 
        p_description || ' (Ref: ' || v_reference || ')', v_new_balance, p_idempotency_key
    );

    -- 3. Log Audit Event
    PERFORM public.log_audit_event('withdrawal_initiated', 'success', jsonb_build_object(
        'amount', p_amount,
        'method', p_method,
        'reference', v_reference
    ));

    RETURN QUERY SELECT true, 'Withdrawal processed successfully'::TEXT, v_reference, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update pay_bill_split
CREATE OR REPLACE FUNCTION public.pay_bill_split(
    p_member_id UUID,
    p_idempotency_key UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    new_balance NUMERIC
) AS $$
DECLARE
    v_split_id UUID;
    v_payer_id UUID;
    v_payee_id UUID;
    v_amount NUMERIC;
    v_status TEXT;
    v_title TEXT;
    v_currency TEXT;
    v_payer_balance NUMERIC;
    v_reference TEXT;
    v_tx_id UUID;
    v_existing_tx_id UUID;
    v_new_balance NUMERIC;
    v_is_frozen BOOLEAN;
BEGIN
    -- Check if account is frozen
    SELECT is_frozen INTO v_is_frozen FROM public.profiles WHERE id = auth.uid();
    IF v_is_frozen THEN
        RETURN QUERY SELECT FALSE, 'Account is currently frozen. Please contact support.'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, balance_after INTO v_existing_tx_id, v_new_balance
        FROM public.transactions
        WHERE idempotency_key = p_idempotency_key;
        
        IF v_existing_tx_id IS NOT NULL THEN
            RETURN QUERY SELECT true, 'Duplicate payment handled'::TEXT, v_new_balance;
            RETURN;
        END IF;
    END IF;

    -- Get member and split details
    SELECT m.bill_split_id, m.user_id, m.creator_id, m.amount, m.status, s.title
    INTO v_split_id, v_payer_id, v_payee_id, v_amount, v_status, v_title
    FROM public.bill_split_members m
    JOIN public.bill_splits s ON s.id = m.bill_split_id
    WHERE m.id = p_member_id;

    IF v_payer_id IS NULL THEN
        RETURN QUERY SELECT false, 'Bill split member record not found'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Ensure correct user is paying
    IF v_payer_id != auth.uid() THEN
        RETURN QUERY SELECT false, 'Unauthorized payment attempt'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    IF v_status = 'paid' THEN
        RETURN QUERY SELECT false, 'This bill split share is already paid'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Lock and check payer wallet balance
    SELECT balance, currency INTO v_payer_balance, v_currency
    FROM public.wallets
    WHERE user_id = v_payer_id
    FOR UPDATE;

    IF v_payer_balance IS NULL THEN
        RETURN QUERY SELECT false, 'Payer wallet not found'::TEXT, NULL::NUMERIC;
        RETURN;
    END IF;

    IF v_payer_balance < v_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance to pay split'::TEXT, v_payer_balance;
        RETURN;
    END IF;

    v_new_balance := v_payer_balance - v_amount;
    v_reference := 'BS-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));

    -- 1. Deduct from payer
    UPDATE public.wallets
    SET balance = v_new_balance, updated_at = NOW()
    WHERE user_id = v_payer_id;

    -- 2. Credit to payee (creator)
    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (v_payee_id, v_amount, v_currency)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + EXCLUDED.balance, updated_at = NOW();

    -- 3. Log transaction
    INSERT INTO public.transactions (
        sender_id, receiver_id, type, method, amount, status, description, balance_after, idempotency_key
    ) VALUES (
        v_payer_id, v_payee_id, 'transfer', 'vault', v_amount, 'completed', 
        'Split Payment: ' || v_title, v_new_balance, p_idempotency_key
    ) RETURNING id INTO v_tx_id;

    -- 4. Update member status
    UPDATE public.bill_split_members
    SET status = 'paid', paid_at = NOW(), transaction_id = v_tx_id
    WHERE id = p_member_id;

    -- Log to Audit Log
    PERFORM public.log_audit_event('bill_split_paid', 'success', jsonb_build_object(
        'split_id', v_split_id,
        'amount', v_amount,
        'title', v_title
    ));

    RETURN QUERY SELECT true, 'Bill split paid successfully'::TEXT, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
