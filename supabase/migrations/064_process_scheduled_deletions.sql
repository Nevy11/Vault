-- Migration: Process Scheduled Account Deletions
-- Description: Periodically checks for accounts scheduled for deletion whose grace period has expired.

CREATE OR REPLACE FUNCTION public.process_scheduled_account_deletions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request RECORD;
BEGIN
    FOR v_request IN 
        SELECT user_id 
        FROM public.account_deletion_requests 
        WHERE status = 'scheduled' 
          AND deletion_date <= NOW()
    LOOP
        -- Trigger the delete-account edge function via pg_net
        PERFORM net.http_post(
            url := 'http://localhost:54321/functions/v1/delete-account',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := jsonb_build_object('userId', v_request.user_id)
        );
    END LOOP;
END;
$$;

-- Schedule the job to run every hour
SELECT cron.schedule(
    'process-scheduled-account-deletions',
    '0 * * * *',
    'SELECT public.process_scheduled_account_deletions();'
);
