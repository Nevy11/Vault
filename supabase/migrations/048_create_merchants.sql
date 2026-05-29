-- Migration: Create Merchants Table
-- Description: Supports B2C payments and business profiles.

CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_category TEXT,
    business_description TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- Everyone can view active merchants (for payment portal)
CREATE POLICY "Merchants are viewable by everyone"
    ON public.merchants FOR SELECT
    USING (is_active = true);

-- Owners can update their own merchant profile
CREATE POLICY "Owners can manage their own merchant profile"
    ON public.merchants ALL
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_merchants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_merchants_updated_at ON public.merchants;
CREATE TRIGGER tr_update_merchants_updated_at
    BEFORE UPDATE ON public.merchants
    FOR EACH ROW
    EXECUTE FUNCTION update_merchants_updated_at();
