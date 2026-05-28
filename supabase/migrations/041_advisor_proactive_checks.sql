-- Migration: Setup Advisor Proactive Checks
-- Date: 2026-05-28

-- 1. Advisor Checks Tracking Table
CREATE TABLE IF NOT EXISTS public.advisor_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    last_check_at TIMESTAMPTZ DEFAULT NOW(),
    result_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_advisor_checks_user_id ON public.advisor_checks(user_id);

-- 2. Function to call the advisor check edge function
-- Note: This assumes pg_net is available in Supabase
CREATE OR REPLACE FUNCTION public.trigger_advisor_health_check()
RETURNS TRIGGER AS $$
DECLARE
    v_last_check TIMESTAMPTZ;
    v_user_id UUID;
BEGIN
    -- Get user_id from wallet
    SELECT user_id INTO v_user_id FROM public.wallets WHERE id = NEW.wallet_id;
    
    -- Check when the last advisor check was run for this user
    SELECT MAX(last_check_at) INTO v_last_check FROM public.advisor_checks WHERE user_id = v_user_id;
    
    -- Only run check if it's been at least 12 hours since the last one
    -- or if there's no previous check
    IF v_last_check IS NULL OR v_last_check < NOW() - INTERVAL '12 hours' THEN
        -- Insert a record to mark that a check is being triggered
        INSERT INTO public.advisor_checks (user_id, last_check_at) VALUES (v_user_id, NOW());
        
        -- Call the Edge Function
        -- Replace <PROJECT_REF> with your actual project reference if running manually, 
        -- but in Supabase environment, we can use the relative path or secret
        PERFORM net.http_post(
            url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/financial-health-check',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', current_setting('request.headers')::json->>'authorization'
            ),
            body := jsonb_build_object('user_id', v_user_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger on balance_history
DROP TRIGGER IF EXISTS trigger_advisor_health_check ON public.balance_history;
CREATE TRIGGER trigger_advisor_health_check
    AFTER INSERT ON public.balance_history
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_advisor_health_check();
