-- Migration: Multi-Currency Funding Rails (Bank Transfers)
-- Purpose: Support direct bank transfers as a funding source

BEGIN;

-- 1. Create verified bank accounts table (System accounts users can send money to)
CREATE TABLE IF NOT EXISTS public.system_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    swift_code TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active system bank accounts for funding
CREATE POLICY "Public system bank accounts visibility"
    ON public.system_bank_accounts FOR SELECT
    USING (is_active = true);

-- 2. Add some seed data for common regions
INSERT INTO public.system_bank_accounts (bank_name, account_number, account_holder, currency)
VALUES 
('Vault US Treasury (Chase)', '123456789', 'Vault Financial Inc', 'USD'),
('Vault Kenya (KCB)', '987654321', 'Vault Africa Ltd', 'KES')
ON CONFLICT DO NOTHING;

-- 3. Update transaction_method enum to include 'direct_bank' if not already there
-- Note: Since we used TEXT in some recent RPCs for flexibility, we'll just ensure 
-- the UI and backend logic support 'direct_bank'.

COMMIT;
