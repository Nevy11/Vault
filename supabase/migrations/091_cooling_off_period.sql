-- Migration 091: Withdrawal Cooling-off Period
-- This migration adds a cooling-off period to profiles after sensitive changes like PIN updates.

BEGIN;

-- 1. Update profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cooling_off_until TIMESTAMPTZ;

-- 2. Trigger to set cooling-off period on PIN change
CREATE OR REPLACE FUNCTION public.set_cooling_off_on_pin_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.pin_hash IS DISTINCT FROM NEW.pin_hash THEN
        NEW.cooling_off_until := NOW() + INTERVAL '24 hours';
        
        -- Log to Audit
        PERFORM public.log_audit_event('cooling_off_triggered', 'success', jsonb_build_object('reason', 'pin_change', 'until', NEW.cooling_off_until));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_set_cooling_off_on_pin_change ON public.profiles;
CREATE TRIGGER tr_set_cooling_off_on_pin_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_cooling_off_on_pin_change();

COMMIT;
