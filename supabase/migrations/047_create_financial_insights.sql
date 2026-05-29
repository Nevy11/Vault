-- Migration: Create Financial Insights Table
-- Description: Stores AI-generated insights and predictions for users.

CREATE TABLE IF NOT EXISTS public.financial_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('prediction', 'alert', 'tip', 'milestone')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.financial_insights ENABLE ROW LEVEL SECURITY;

-- Users can view their own insights
CREATE POLICY "Users can view their own insights"
    ON public.financial_insights FOR SELECT
    USING (auth.uid() = user_id);

-- Create index for faster access
CREATE INDEX IF NOT EXISTS idx_financial_insights_user_id ON public.financial_insights(user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_financial_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_financial_insights_updated_at ON public.financial_insights;
CREATE TRIGGER tr_update_financial_insights_updated_at
    BEFORE UPDATE ON public.financial_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_insights_updated_at();
