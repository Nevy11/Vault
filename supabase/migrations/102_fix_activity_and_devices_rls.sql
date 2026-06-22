-- Migration 102: Fix RLS policies for activity_logs and user_devices
-- Also adds mac_address column to user_devices and a login trigger for activity_logs.

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. ACTIVITY LOGS – Enable RLS & add SELECT policy
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view their own activity logs"
    ON public.activity_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert their own activity logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service-role / SECURITY DEFINER functions can insert for any user
DROP POLICY IF EXISTS "Service role can manage activity logs" ON public.activity_logs;
CREATE POLICY "Service role can manage activity logs"
    ON public.activity_logs FOR ALL
    USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 2. USER DEVICES – Enable RLS & add policies
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own devices" ON public.user_devices;
CREATE POLICY "Users can view their own devices"
    ON public.user_devices FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own devices" ON public.user_devices;
CREATE POLICY "Users can insert their own devices"
    ON public.user_devices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own devices" ON public.user_devices;
CREATE POLICY "Users can update their own devices"
    ON public.user_devices FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage devices" ON public.user_devices;
CREATE POLICY "Service role can manage devices"
    ON public.user_devices FOR ALL
    USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 3. Add mac_address column to user_devices (referenced in app-shell.tsx)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS mac_address TEXT;
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- ─────────────────────────────────────────────────────────────
-- 4. Create or replace a SECURITY DEFINER RPC to register a device
--    and log the login event — callable from the client safely.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.register_device_and_log_login(
    p_device_name TEXT,
    p_mac_address TEXT DEFAULT NULL,
    p_browser TEXT DEFAULT NULL,
    p_os TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Upsert device record (match by user_id + device_name or mac_address)
    INSERT INTO public.user_devices (user_id, device_name, mac_address, browser, os, ip_address, last_login, is_active)
    VALUES (v_user_id, p_device_name, p_mac_address, p_browser, p_os, p_ip_address, NOW(), TRUE)
    ON CONFLICT DO NOTHING;

    -- Update last_login if device already exists
    UPDATE public.user_devices
    SET last_login = NOW(), is_active = TRUE
    WHERE user_id = v_user_id
      AND (
        (p_mac_address IS NOT NULL AND mac_address = p_mac_address)
        OR device_name = p_device_name
      );

    -- Log the login activity
    INSERT INTO public.activity_logs (user_id, action_type, device_info, location, ip_address)
    VALUES (v_user_id, 'login', p_device_name, p_location, p_ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
