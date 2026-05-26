-- Consolidate create_ledger_entry to be idempotent and correctly log to transactions
-- This version ensures that deposits and withdrawals are always visible in the UI
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
    v_new_balance NUMERIC;
BEGIN
    -- 1. Idempotency check: If reference exists, return the existing entry ID
    IF p_reference IS NOT NULL THEN
        SELECT id INTO v_entry_id FROM public.ledger_entries WHERE reference = p_reference LIMIT 1;
        IF v_entry_id IS NOT NULL THEN
            RETURN v_entry_id;
        END IF;
    END IF;

    -- 2. Insert into ledger_entries (The immutable source of truth)
    INSERT INTO public.ledger_entries (
        user_id, amount, currency, type, reference, description, metadata, status
    ) VALUES (
        p_user_id, p_amount, p_currency, p_type, p_reference, p_description, p_metadata, p_status
    ) RETURNING id INTO v_entry_id;

    -- 3. Update the wallets table for real-time balance tracking
    -- We calculate the balance from the ledger entries (view) to ensure accuracy
    SELECT COALESCE(SUM(amount), 0) INTO v_new_balance 
    FROM public.ledger_entries 
    WHERE user_id = p_user_id AND currency = p_currency AND status = 'completed';

    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (p_user_id, v_new_balance, p_currency)
    ON CONFLICT (user_id, currency) DO UPDATE 
    SET balance = v_new_balance,
        updated_at = NOW();

    -- 4. Log into transactions table for UI visibility
    -- We use p_reference to avoid duplicates if DepositPanel already inserted a pending record
    IF p_reference IS NOT NULL THEN
        UPDATE public.transactions 
        SET status = p_status::transaction_status,
            balance_after = v_new_balance,
            description = COALESCE(p_description, description)
        WHERE description = p_reference OR id::TEXT = p_reference;
        
        -- If no row was updated, insert a new one
        IF NOT FOUND THEN
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
                CASE WHEN p_amount < 0 THEN p_user_id ELSE NULL END,
                CASE WHEN p_amount >= 0 THEN p_user_id ELSE NULL END,
                p_type::transaction_type,
                COALESCE((p_metadata->>'payment_method')::transaction_method, 'bank'::transaction_method),
                ABS(p_amount),
                p_status::transaction_status,
                p_description,
                v_new_balance
            );
        END IF;
    ELSE
        -- No reference provided, just insert
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
            CASE WHEN p_amount < 0 THEN p_user_id ELSE NULL END,
            CASE WHEN p_amount >= 0 THEN p_user_id ELSE NULL END,
            p_type::transaction_type,
            COALESCE((p_metadata->>'payment_method')::transaction_method, 'bank'::transaction_method),
            ABS(p_amount),
            p_status::transaction_status,
            p_description,
            v_new_balance
        );
    END IF;

    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
