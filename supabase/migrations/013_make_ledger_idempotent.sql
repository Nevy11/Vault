-- Migration to make create_ledger_entry idempotent based on reference
CREATE OR REPLACE FUNCTION public.create_ledger_entry(
    p_user_id UUID,
    p_amount NUMERIC,
    p_currency TEXT,
    p_type TEXT,
    p_reference TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_status TEXT DEFAULT 'completed'
)
RETURNS UUID AS $$
DECLARE
    v_entry_id UUID;
    v_current_balance NUMERIC;
BEGIN
    -- Idempotency check: If reference exists, return the existing ID
    IF p_reference IS NOT NULL THEN
        SELECT id INTO v_entry_id FROM public.ledger_entries WHERE reference = p_reference LIMIT 1;
        IF v_entry_id IS NOT NULL THEN
            RETURN v_entry_id;
        END IF;
    END IF;

    -- Optional: Check for sufficient funds if it's a debit (negative amount)
    IF p_amount < 0 THEN
        SELECT COALESCE(balance, 0) INTO v_current_balance 
        FROM public.wallet_balances 
        WHERE user_id = p_user_id AND currency = p_currency;
        
        IF (v_current_balance + p_amount) < 0 THEN
            RAISE EXCEPTION 'Insufficient funds';
        END IF;
    END IF;

    INSERT INTO public.ledger_entries (
        user_id, amount, currency, type, reference, description, metadata, status
    ) VALUES (
        p_user_id, p_amount, p_currency, p_type, p_reference, p_description, p_metadata, p_status
    ) RETURNING id INTO v_entry_id;

    -- Update legacy wallets table
    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (p_user_id, p_amount, p_currency)
    ON CONFLICT (user_id, currency) DO UPDATE
    SET balance = (SELECT COALESCE(balance, 0) FROM public.wallet_balances WHERE user_id = p_user_id AND currency = p_currency),
        updated_at = NOW();

    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
