-- Add nationality field to activity_logs for currency mapping and audit

BEGIN;

ALTER TABLE IF EXISTS public.activity_logs
ADD COLUMN IF NOT EXISTS nationality TEXT;

COMMIT;
