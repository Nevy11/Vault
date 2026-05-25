-- Update create_ledger_entry to also log in public.transactions for UI visibility
BEGIN;

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
    v_new_balance NUMERIC;
BEGIN
    -- 1. Ledger entry for immutable history
    INSERT INTO public.ledger_entries (
        user_id, amount, currency, type, reference, description, metadata, status
    ) VALUES (
        p_user_id, p_amount, p_currency, p_type, p_reference, p_description, p_metadata, p_status
    ) RETURNING id INTO v_entry_id;

    -- 2. Update the legacy wallets table for real-time balance tracking
    -- We calculate the new balance from the ledger view
    SELECT COALESCE(balance, 0) INTO v_new_balance 
    FROM public.wallet_balances 
    WHERE user_id = p_user_id AND currency = p_currency;

    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (p_user_id, COALESCE(v_new_balance, 0), p_currency)
    ON CONFLICT (user_id) DO UPDATE 
    SET balance = COALESCE(v_new_balance, 0),
        updated_at = NOW();

    -- 3. Log into transactions table so it shows up in "Recent Activity"
    -- Handle type mapping: ledger 'deposit' -> transaction 'deposit', etc.
    INSERT INTO public.transactions (
        sender_id,
        receiver_id,
        type,
        method,
        amount,
        status,
        description,
        balance_after
    ) VALUES (
        CASE WHEN p_amount < 0 THEN p_user_id ELSE NULL END, -- sender if negative
        CASE WHEN p_amount >= 0 THEN p_user_id ELSE NULL END, -- receiver if positive
        p_type::transaction_type,
        COALESCE((p_metadata->>'payment_method')::transaction_method, 'bank'::transaction_method),
        ABS(p_amount),
        p_status::transaction_status,
        p_description,
        v_new_balance
    );

    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
