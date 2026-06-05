-- Migration to fix device tracking schema
-- Ensure mac_address exists in activity_logs and user_devices

BEGIN;

-- 1. Ensure mac_address exists in activity_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activity_logs' AND column_name = 'mac_address'
    ) THEN
        ALTER TABLE public.activity_logs ADD COLUMN mac_address TEXT;
    END IF;
END $$;

-- 2. Ensure mac_address exists in user_devices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_devices' AND column_name = 'mac_address'
    ) THEN
        ALTER TABLE public.user_devices ADD COLUMN mac_address TEXT;
    END IF;
END $$;

COMMIT;
