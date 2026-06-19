-- Migration: 088_unified_ledger_description.sql
-- Description: Updates the vault_transfer RPC to use the requested description format for unified ledger.
-- Format: "Vault Transfer Ref: VT-XXXXXXXX (FX: 1.000000 KES)"

BEGIN;

-- Drop existing versions to resolve any ambiguity with overloads
DROP FUNCTION IF EXISTS vault_transfer(UUID, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS vault_transfer(UUID, TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS vault_transfer(UUID, TEXT, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION vault_transfer(
    p_sender_id UUID,
    p_recipient_tag TEXT,
    p_amount NUMERIC,
    p_category TEXT DEFAULT 'Transfer',
    p_note TEXT DEFAULT NULL
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
    v_sender_currency TEXT;
    v_recipient_currency TEXT;
    v_exchange_rate NUMERIC(18, 6) := 1.0;
    v_recipient_amount NUMERIC;
    v_clean_tag TEXT;
    v_reference TEXT;
    v_description TEXT;
BEGIN
    -- Standardize the tag
    v_clean_tag := '@' || LOWER(LTRIM(p_recipient_tag, '@'));
    
    -- Find recipient
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
    
    -- Lock sender wallet and get currency
    SELECT balance, currency INTO v_sender_balance, v_sender_currency
    FROM public.wallets
    WHERE user_id = p_sender_id
    FOR UPDATE;
    
    IF v_sender_balance IS NULL THEN
        RETURN QUERY SELECT false, 'Sender wallet not found'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    -- Get recipient currency
    SELECT currency INTO v_recipient_currency
    FROM public.wallets
    WHERE user_id = v_recipient_id;

    -- Default to USD
    IF v_recipient_currency IS NULL THEN
        v_recipient_currency := 'USD';
    END IF;

    -- Normalize currency codes
    IF v_sender_currency = 'KSH' THEN v_sender_currency := 'KES'; END IF;
    IF v_recipient_currency = 'KSH' THEN v_recipient_currency := 'KES'; END IF;

    -- Calculate FX if currencies differ
    IF v_sender_currency != v_recipient_currency THEN
        SELECT rate INTO v_exchange_rate
        FROM public.currency_rates
        WHERE from_currency = v_sender_currency AND to_currency = v_recipient_currency;

        IF v_exchange_rate IS NULL THEN
            -- Try inverse
            SELECT 1.0 / rate INTO v_exchange_rate
            FROM public.currency_rates
            WHERE from_currency = v_recipient_currency AND to_currency = v_sender_currency;
        END IF;

        IF v_exchange_rate IS NULL THEN
            -- Fallback to KES/USD if one of them is KES and the other is USD
            IF (v_sender_currency = 'USD' AND v_recipient_currency = 'KES') THEN
                v_exchange_rate := 130.0;
            ELSIF (v_sender_currency = 'KES' AND v_recipient_currency = 'USD') THEN
                v_exchange_rate := 1.0 / 130.0;
            ELSE
                RETURN QUERY SELECT false, 'Unsupported currency conversion: ' || v_sender_currency || ' to ' || v_recipient_currency, v_sender_balance, NULL::TEXT;
                RETURN;
            END IF;
        END IF;
    END IF;

    v_recipient_amount := p_amount * v_exchange_rate;
    
    IF v_sender_balance < p_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, v_sender_balance, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Generate reference
    v_reference := 'VT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
    
    -- CONSTRUCT DESCRIPTION AS REQUESTED
    -- Example: "Vault Transfer Ref: VT-18C43C9A (FX: 1.000000 KES)"
    v_description := 'Vault Transfer Ref: ' || v_reference || ' (FX: ' || TO_CHAR(v_exchange_rate, 'FM999999.999999') || ' ' || v_recipient_currency || ')';
    
    -- Append note if provided
    IF p_note IS NOT NULL AND p_note <> '' THEN
        v_description := v_description || ' (' || p_note || ')';
    END IF;
    
    -- Update sender balance
    UPDATE public.wallets
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_sender_id;

    -- Update recipient balance
    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (v_recipient_id, v_recipient_amount, v_recipient_currency)
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
        balance_after,
        category,
        metadata
    )
    VALUES (
        p_sender_id, 
        v_recipient_id, 
        'transfer'::transaction_type, 
        'vault'::transaction_method, 
        p_amount, 
        'completed'::transaction_status,
        v_description,
        (v_sender_balance - p_amount),
        COALESCE(p_category, 'Transfer'),
        jsonb_build_object(
            'exchange_rate', v_exchange_rate,
            'recipient_currency', v_recipient_currency,
            'recipient_amount', v_recipient_amount,
            'reference', v_reference,
            'note', p_note
        )
    );
    
    RETURN QUERY SELECT true, 'Transfer successful'::TEXT, (v_sender_balance - p_amount), v_reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
