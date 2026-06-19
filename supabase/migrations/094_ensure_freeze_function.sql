-- Migration 094: Ensure Emergency Freeze Function
-- This migration drops and recreates the function to resolve schema cache issues.

BEGIN;

-- Drop existing function if it exists to avoid overloading issues
DROP FUNCTION IF EXISTS public.emergency_freeze_account(TEXT);

-- Re-create the function with a clean signature
CREATE OR REPLACE FUNCTION public.emergency_freeze_account(p_reason TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Ensure the user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.profiles
    SET is_frozen = TRUE,
        frozen_at = NOW(),
        frozen_reason = p_reason
    WHERE id = auth.uid();
    
    -- Log Audit Event
    PERFORM public.log_audit_event('account_frozen', 'success', jsonb_build_object('reason', p_reason));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Explicitly grant execute permissions
GRANT EXECUTE ON FUNCTION public.emergency_freeze_account(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emergency_freeze_account(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.emergency_freeze_account(TEXT) TO service_role;

-- Create an overloaded version with no arguments for convenience (matches the DEFAULT behavior)
CREATE OR REPLACE FUNCTION public.emergency_freeze_account()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.emergency_freeze_account('User requested emergency freeze');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.emergency_freeze_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.emergency_freeze_account() TO anon;
GRANT EXECUTE ON FUNCTION public.emergency_freeze_account() TO service_role;

COMMIT;
