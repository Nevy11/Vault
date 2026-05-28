-- Migration: Create Currency Rates Table
-- Description: Stores exchange rates for multi-currency support.

BEGIN;

CREATE TABLE IF NOT EXISTS public.currency_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate NUMERIC(18, 6) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_currency, to_currency)
);

-- Enable RLS
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

-- Everyone can view rates
CREATE POLICY "Currency rates are viewable by everyone"
    ON public.currency_rates FOR SELECT
    USING (true);

-- Seed with some initial rates (relative to USD)
INSERT INTO public.currency_rates (from_currency, to_currency, rate)
VALUES 
    ('USD', 'KES', 130.50),
    ('KES', 'USD', 0.00766),
    ('USD', 'EUR', 0.92),
    ('EUR', 'USD', 1.08),
    ('USD', 'GBP', 0.79),
    ('GBP', 'USD', 1.26)
ON CONFLICT (from_currency, to_currency) DO UPDATE 
SET rate = EXCLUDED.rate, updated_at = NOW();

COMMIT;
