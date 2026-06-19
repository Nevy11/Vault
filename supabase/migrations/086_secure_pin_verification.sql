-- Migration 086: Secure PIN Verification with Rate Limiting
-- This migration updates the verify_current_pin function to include rate limiting and audit logging.

BEGIN;

CREATE OR REPLACE FUNCTION public.verify_current_pin(provided_pin_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_valid BOOLEAN;
    v_rate_limit_key TEXT;
BEGIN
    -- Only allow authenticated users
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_rate_limit_key := 'pin_verify:' || auth.uid();
    
    -- Check Rate Limit: Max 5 attempts per 10 minutes (600 seconds)
    IF NOT public.check_rate_limit(v_rate_limit_key, 5, 600) THEN
        PERFORM public.log_audit_event('pin_verify_blocked', 'blocked', jsonb_build_object('reason', 'rate_limit_exceeded'));
        RAISE EXCEPTION 'Too many attempts. Please try again in 10 minutes.';
    END IF;

    -- Check if the provided hash matches
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND pin_hash = provided_pin_hash
    ) INTO v_is_valid;

    IF v_is_valid THEN
        -- Reset rate limit on success to allow future legitimate attempts
        DELETE FROM public.rate_limits WHERE key = v_rate_limit_key;
        PERFORM public.log_audit_event('pin_verify_success', 'success');
    ELSE
        PERFORM public.log_audit_event('pin_verify_failure', 'failure');
    END IF;

    RETURN v_is_valid;
END;
$$;

COMMIT;
