-- Migration 096: Final Fix for Emergency Freeze
-- This migration unifies the overloaded functions to resolve PostgREST ambiguity and ensures correct permissions.

BEGIN;

-- Drop all variants to ensure a clean slate and resolve any overloading confusion in PostgREST
DROP FUNCTION IF EXISTS public.emergency_freeze_account();
DROP FUNCTION IF EXISTS public.emergency_freeze_account(text);

-- Create a single function with a default parameter for maximum compatibility with PostgREST
CREATE OR REPLACE FUNCTION public.emergency_freeze_account(p_reason TEXT DEFAULT 'User requested emergency freeze via settings')
RETURNS BOOLEAN AS $$
BEGIN
    -- Ensure the user is authenticated (PostgREST should have set auth.uid())
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Update the profile to set the frozen state
    UPDATE public.profiles
    SET is_frozen = TRUE,
        frozen_at = NOW(),
        frozen_reason = p_reason
    WHERE id = auth.uid();
    
    -- Log Audit Event for security tracking
    -- This uses the log_audit_event helper defined in migration 085
    PERFORM public.log_audit_event('account_frozen', 'success', jsonb_build_object('reason', p_reason));
    
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    -- Capture any errors and log them (PostgREST will return 400 with the error message)
    RAISE EXCEPTION 'Failed to freeze account: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions explicitly
GRANT EXECUTE ON FUNCTION public.emergency_freeze_account(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emergency_freeze_account(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.emergency_freeze_account(TEXT) TO service_role;

COMMIT;
