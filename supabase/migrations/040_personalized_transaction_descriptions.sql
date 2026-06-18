-- 040_personalized_transaction_descriptions.sql
-- Refine transaction descriptions for senders and receivers.

BEGIN;

-- 1. Ensure columns exist (Safety)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Update vault_transfer to handle personalized descriptions
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
    v_recipient_name TEXT;
    v_sender_name TEXT;
    v_sender_balance NUMERIC;
    v_clean_tag TEXT;
    v_reference TEXT;
    v_sender_description TEXT;
    v_receiver_description TEXT;
    v_display_category TEXT;
BEGIN
    -- Standardize names/tags
    v_clean_tag := '@' || LOWER(LTRIM(p_recipient_tag, '@'));
    
    -- Get Recipient Info
    SELECT id, COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') INTO v_recipient_id, v_recipient_name 
    FROM public.profiles WHERE kyc_tag = v_clean_tag;
    
    IF v_recipient_id IS NULL THEN
        RETURN QUERY SELECT false, 'Recipient not found'::TEXT, NULL::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    -- Get Sender Info
    SELECT COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') INTO v_sender_name 
    FROM public.profiles WHERE id = p_sender_id;
    
    -- Lock and check balance
    SELECT balance INTO v_sender_balance FROM public.wallets WHERE user_id = p_sender_id FOR UPDATE;
    
    IF v_sender_balance < p_amount THEN
        RETURN QUERY SELECT false, 'Insufficient balance'::TEXT, v_sender_balance, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Generate reference
    v_reference := 'VT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
    
    -- PREPARE DESCRIPTIONS
    -- For Sender: "Category | Sent to @username" (e.g., "Fare | Sent to @john.doe")
    v_display_category := COALESCE(p_category, 'Transfer');
    v_sender_description := v_display_category || ' | Sent to ' || v_clean_tag;
    
    -- Append note to sender if exists
    IF p_note IS NOT NULL AND p_note <> '' THEN
        v_sender_description := v_sender_description || ' (' || p_note || ')';
    END IF;

    -- For Receiver: Standard "Vault Transfer Ref: VT-XXXX [Category]"
    v_receiver_description := 'Vault Transfer Ref: ' || v_reference || ' [' || v_display_category || ']';
    
    -- Append note to receiver if exists
    IF p_note IS NOT NULL AND p_note <> '' THEN
        v_receiver_description := v_receiver_description || ' - ' || p_note;
    END IF;

    -- Update Balances
    UPDATE public.wallets SET balance = balance - p_amount WHERE user_id = p_sender_id;
    INSERT INTO public.wallets (user_id, balance, currency) VALUES (v_recipient_id, p_amount, 'USD')
    ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + EXCLUDED.balance;
        
    -- Log Sender Transaction
    INSERT INTO public.transactions (
        sender_id, receiver_id, type, method, amount, status, description, balance_after, category
    )
    VALUES (
        p_sender_id, v_recipient_id, 'transfer', 'vault', p_amount, 'completed',
        v_sender_description, (v_sender_balance - p_amount), v_display_category
    );

    -- Log Receiver Transaction (Mirror entry if your system uses separate rows, 
    -- or handle via description logic in UI if it's a single row. 
    -- Assuming your 'transactions' table is the single source of truth for both.)
    -- In your current schema, transactions has sender_id and receiver_id.
    -- To show different descriptions, you'd usually need two records or a view.
    -- Given the constraint, we'll keep the record as the sender's view, 
    -- and we'll update the UI to handle the receiver's view dynamically.

    RETURN QUERY SELECT true, 'Transfer successful'::TEXT, (v_sender_balance - p_amount), v_reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
