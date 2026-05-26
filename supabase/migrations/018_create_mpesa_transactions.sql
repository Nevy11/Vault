-- Migration: Create M-PESA Transactions Ledger
-- Purpose: Secure storage and audit trail for M-PESA STK Push transactions.

CREATE TYPE transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- M-PESA identifiers for tracking
    merchant_request_id TEXT UNIQUE NOT NULL,
    checkout_request_id TEXT UNIQUE NOT NULL,
    mpesa_receipt_number TEXT UNIQUE, -- Only populated on SUCCESS
    
    -- Transaction details
    amount NUMERIC(12, 2) NOT NULL,
    phone_number TEXT NOT NULL, -- Format: 254XXXXXXXXX
    status transaction_status DEFAULT 'PENDING',
    result_desc TEXT, -- Detailed reason for failure/success from Safaricom
    
    -- Audit trail
    raw_callback_payload JSONB, -- Full response for forensic audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_mpesa_user_id ON public.mpesa_transactions(user_id);
CREATE INDEX idx_mpesa_checkout_id ON public.mpesa_transactions(checkout_request_id);
CREATE INDEX idx_mpesa_status ON public.mpesa_transactions(status);

-- Automatic updated_at trigger
CREATE OR REPLACE FUNCTION update_mpesa_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mpesa_transactions_timestamp
    BEFORE UPDATE ON public.mpesa_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_mpesa_transactions_updated_at();

-- RLS Policies
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mpesa transactions"
    ON public.mpesa_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Note: No direct INSERT/UPDATE from client side to ensure integrity.
-- Only service role (backend) should manage these.
CREATE POLICY "Service role can manage all mpesa transactions"
    ON public.mpesa_transactions
    USING (auth.role() = 'service_role');
