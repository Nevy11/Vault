-- Add notification settings to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notifications_transfer_received BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_transfer_sent BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_account_login BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_security_alerts BOOLEAN DEFAULT true;
