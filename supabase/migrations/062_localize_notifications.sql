-- Add metadata column to notifications for dynamic values
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add title_key and message_key to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title_key TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message_key TEXT;
