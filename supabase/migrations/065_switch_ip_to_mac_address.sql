-- Migration to update device tracking from IP to MAC address
-- Renames ip_address in activity_logs and adds mac_address to user_devices

BEGIN;

-- 1. Rename ip_address to mac_address in activity_logs
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'activity_logs' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE public.activity_logs RENAME COLUMN ip_address TO mac_address;
    END IF;
END $$;

-- 2. Add mac_address to user_devices if it doesn't exist
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

-- 3. Update comments to reflect the change
COMMENT ON COLUMN public.activity_logs.mac_address IS 'Device MAC address or hardware identifier (replacing IP)';
COMMENT ON COLUMN public.user_devices.mac_address IS 'Hardware identifier / MAC address for unique device tracking';

COMMIT;
