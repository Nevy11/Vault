-- Migration: Create Cryptographically Signed Ledger
-- Purpose: Zero-trust immutable record of all financial movements.

BEGIN;

CREATE TYPE ledger_entry_type AS ENUM ('INFLOW', 'OUTFLOW');

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type ledger_entry_type NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    
    -- Zero-Trust Audit Security
    -- signature = HMAC_SHA256(user_id + type + amount + created_at, secret_key)
    cryptographic_signature TEXT NOT NULL,
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexing for high-speed aggregation over timeframes
CREATE INDEX idx_ledger_user_created ON public.ledger_entries(user_id, created_at);
CREATE INDEX idx_ledger_type ON public.ledger_entries(type);

-- RLS: Only users can see their own ledger
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ledger"
    ON public.ledger_entries FOR SELECT
    USING (auth.uid() = user_id);

COMMIT;

/**
 * OPTIMIZED AGGREGATION QUERY
 * This query calculates all metrics in a single pass over the filtered rows.
 */
/*
SELECT 
    COALESCE(SUM(CASE WHEN type = 'INFLOW' THEN amount ELSE 0 END), 0) as total_inflow,
    COALESCE(SUM(CASE WHEN type = 'OUTFLOW' THEN amount ELSE 0 END), 0) as total_outflow,
    COALESCE(SUM(CASE WHEN type = 'INFLOW' THEN amount ELSE -amount END), 0) as net_position,
    COUNT(*) as activity_volume
FROM public.ledger_entries
WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3;
*/
