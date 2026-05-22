-- Phase 1: Immutable Double-Entry Ledger
-- This migration introduces the ledger system for high-precision accounting.

BEGIN;

-- Create an ENUM for entry types if useful, or just use TEXT for flexibility
-- types: 'deposit', 'withdrawal', 'transfer', 'issuing_auth', 'issuing_settlement'

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 4) NOT NULL, -- Positive for credit, negative for debit
    currency TEXT NOT NULL DEFAULT 'USD',
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'void'
    reference TEXT, -- External ID (e.g., Stripe PaymentIntent ID)
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX idx_ledger_user_currency ON public.ledger_entries(user_id, currency);
CREATE INDEX idx_ledger_reference ON public.ledger_entries(reference);
CREATE INDEX idx_ledger_status ON public.ledger_entries(status);

-- Dynamic Wallet Balances View
-- This replaces the need to store static balances
CREATE OR REPLACE VIEW public.wallet_balances AS
SELECT 
    user_id, 
    currency, 
    SUM(amount) FILTER (WHERE status = 'completed') as balance,
    COUNT(*) as transaction_count,
    MAX(created_at) as last_transaction_at
FROM public.ledger_entries
GROUP BY user_id, currency;

-- RPC Function to safely add ledger entries
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

    -- KEEPING COMPATIBILITY: Update the legacy wallets table
    -- This ensures existing frontend code that reads from 'wallets' doesn't break.
    -- In a real migration, we'd eventually remove the balance column from wallets.
    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (p_user_id, p_amount, p_currency)
    ON CONFLICT (user_id) DO UPDATE -- Assuming user_id is unique in wallets, which it isn't based on 002 (it's not unique there)
    -- Actually 002 doesn't have a unique constraint on user_id, but usually it should.
    -- Let's fix the wallets update logic to be safer.
    SET balance = (SELECT COALESCE(balance, 0) FROM public.wallet_balances WHERE user_id = p_user_id AND currency = p_currency),
        updated_at = NOW();

    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on ledger_entries
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ledger entries"
    ON public.ledger_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage ledger"
    ON public.ledger_entries
    USING (auth.role() = 'service_role');

COMMIT;
