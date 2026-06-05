-- Migration to add currency rates table and update profiles
BEGIN;

-- 1. Create currency_rates table
CREATE TABLE IF NOT EXISTS public.currency_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate NUMERIC(18, 6) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_currency, to_currency)
);

-- 2. Add country and primary_currency to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS primary_currency TEXT DEFAULT 'USD';

COMMIT;
