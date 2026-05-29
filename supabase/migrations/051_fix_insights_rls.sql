-- Migration: Fix RLS for Financial Insights
-- Description: Allows Edge Functions (via authenticated users) to insert insights.

-- 1. Allow authenticated users (and the Edge Function acting as one) to insert insights for themselves
CREATE POLICY "Users can insert their own insights"
    ON public.financial_insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 2. Ensure system role/service role can also manage all insights if needed (extra safety for cron jobs)
CREATE POLICY "Service role can manage all insights"
    ON public.financial_insights FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');
