-- Migration: Setup Advisor Proactive Checks
-- Date: 2026-05-28

-- Enable pg_net for edge function triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

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
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    v_last_check TIMESTAMPTZ;
    v_user_id UUID;
    v_headers jsonb;
BEGIN
    SELECT user_id INTO v_user_id FROM public.wallets WHERE id = NEW.wallet_id;
    SELECT MAX(last_check_at) INTO v_last_check FROM public.advisor_checks WHERE user_id = v_user_id;
    
    -- Attempt to get headers safely, default to empty json if not available
    BEGIN
        v_headers := current_setting('request.headers')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        v_headers := '{}'::jsonb;
    END;

    IF v_last_check IS NULL OR v_last_check < NOW() - INTERVAL '12 hours' THEN
        INSERT INTO public.advisor_checks (user_id, last_check_at) VALUES (v_user_id, NOW());
        
        PERFORM net.http_post(
            url := 'https://' || (v_headers->>'host') || '/functions/v1/financial-health-check',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', (v_headers->>'authorization')
            ),
            body := jsonb_build_object('user_id', v_user_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. Trigger on balance_history
DROP TRIGGER IF EXISTS trigger_advisor_health_check ON public.balance_history;
CREATE TRIGGER trigger_advisor_health_check
    AFTER INSERT ON public.balance_history
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_advisor_health_check();
