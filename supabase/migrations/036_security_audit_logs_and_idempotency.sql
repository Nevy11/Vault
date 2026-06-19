-- 036_security_audit_logs_and_idempotency.sql
-- Implement immutable audit logs and idempotency for transactions.

BEGIN;

-- 1. Create Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- e.g., 'PIN_CHANGE', 'LOGIN_ATTEMPT', 'ACCOUNT_DELETION'
    status TEXT NOT NULL, -- 'success', 'failure'
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only admins/service role can view all, users can view their own (optional)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
    ON public.audit_logs FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Add idempotency_key to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency_key ON public.transactions (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3. Add idempotency_key to ledger_entries
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_idempotency_key ON public.ledger_entries (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 4. Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_user_id UUID,
    p_action TEXT,
    p_status TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, status, metadata)
    VALUES (p_user_id, p_action, p_status, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
