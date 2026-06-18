-- 039_categorization_webhook.sql
-- Set up a webhook to automatically categorize new transactions using the Edge Function.

BEGIN;

-- 1. Enable the HTTP extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";

-- 2. Create the trigger function that calls the Edge Function
CREATE OR REPLACE FUNCTION public.trigger_transaction_categorization()
RETURNS TRIGGER AS $$
DECLARE
    v_url TEXT;
    v_service_key TEXT;
BEGIN
    -- These would ideally be fetched from a secure vault or config table
    -- For local/demo, we assume the environment variables are set in Supabase
    v_url := 'https://vwxlnchdathjuprrlite.supabase.co/functions/v1/categorize-transaction';
    v_service_key := 'YOUR_SUPABASE_SERVICE_ROLE_KEY'; -- This should be handled via Supabase dashboard HTTP hooks for better security

    -- For security, we recommend using the Supabase Dashboard "Webhooks" UI 
    -- to create a "POST" hook to your Edge Function on "INSERT" to "transactions".
    -- The SQL below is for reference but the Dashboard UI is the standard way.
    
    /*
    PERFORM extensions.http_post(
        v_url,
        jsonb_build_object('transactionId', NEW.id)::text,
        'application/json',
        jsonb_build_object('Authorization', 'Bearer ' || v_service_key)::text
    );
    */

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
