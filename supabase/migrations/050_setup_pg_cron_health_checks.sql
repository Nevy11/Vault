-- Migration: Setup Scheduled Health Checks with pg_cron
-- Description: Periodically triggers the financial-health-check edge function for all active users.

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Function to trigger health checks for all eligible users
CREATE OR REPLACE FUNCTION public.trigger_scheduled_health_checks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
    v_headers jsonb;
BEGIN
    -- We need a valid authorization header to call the edge function.
    -- In a cron context, we don't have a request header, so we might need 
    -- to use a service role key or a predefined secret if we were calling directly.
    -- However, since we're using pg_net within Supabase, we can call the local internal URL
    -- or just rely on the fact that the Edge Function handles its own auth if we pass a system secret.
    
    -- For now, we'll identify users who haven't had a check in 24 hours.
    FOR v_user IN 
        SELECT p.id 
        FROM public.profiles p
        LEFT JOIN public.advisor_checks ac ON p.id = ac.user_id
        WHERE ac.last_check_at IS NULL OR ac.last_check_at < NOW() - INTERVAL '24 hours'
    LOOP
        -- Log the attempt
        INSERT INTO public.advisor_checks (user_id, last_check_at, result_summary)
        VALUES (v_user.id, NOW(), 'Scheduled check initiated');

        -- Trigger the edge function via pg_net
        -- Note: We use the project's internal reference if possible, or a placeholder.
        -- Since we're in a migration, we don't know the exact URL, but Supabase functions 
        -- are usually at http://localhost:54321/functions/v1/... locally or the project URL remotely.
        PERFORM net.http_post(
            url := 'http://localhost:54321/functions/v1/financial-health-check',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'apikey', current_setting('app.settings.service_role_key', true) -- Try to get service key if available
            ),
            body := jsonb_build_object('userId', v_user.id)
        );
    END LOOP;
END;
$$;

-- 2. Schedule the job to run every day at midnight
-- cron.schedule(job_name, schedule, command)
SELECT cron.schedule(
    'daily-financial-health-check',
    '0 0 * * *',
    'SELECT public.trigger_scheduled_health_checks();'
);
