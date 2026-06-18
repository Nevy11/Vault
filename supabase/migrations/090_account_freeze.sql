-- Migration 090: Emergency Account Freeze
-- This migration adds a frozen state to user profiles and a function to trigger it.

BEGIN;

-- 1. Update profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS frozen_reason TEXT;

-- 2. Create RPC for users to freeze their own account
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

COMMIT;
