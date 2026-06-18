-- Migration 093: Fix Emergency Freeze Function
-- This migration ensures the emergency_freeze_account function is correctly defined and accessible.

BEGIN;

-- Re-define the function to ensure it exists and has the correct signature
CREATE OR REPLACE FUNCTION public.emergency_freeze_account(p_reason TEXT DEFAULT 'User requested emergency freeze')
RETURNS BOOLEAN AS $$
BEGIN
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

-- Explicitly grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.emergency_freeze_account(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emergency_freeze_account(TEXT) TO anon;

COMMIT;
