-- Setup Verification Webhooks
-- This migration sets up triggers to notify the support email for all pending verifications.

BEGIN;

-- 1. Ensure HTTP extension is available
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";

-- 2. Function to call notify-fraud Edge Function
CREATE OR REPLACE FUNCTION public.trigger_verification_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_url TEXT;
    v_payload JSONB;
BEGIN
    v_url := 'https://vwxlnchdathjuprrlite.supabase.co/functions/v1/notify-fraud';

    IF (TG_TABLE_NAME = 'transactions') THEN
        v_payload := jsonb_build_object(
            'table', 'transactions',
            'record', row_to_json(NEW),
            'type', 'FRAUD_FLAG'
        );
    ELSIF (TG_TABLE_NAME = 'profiles') THEN
        v_payload := jsonb_build_object(
            'table', 'profiles',
            'record', row_to_json(NEW),
            'type', 'KYC_SUBMISSION'
        );
    END IF;

    -- Note: The actual HTTP call should be configured as a Webhook in the Supabase Dashboard
    -- for better security and management. This function structure prepares the payload.
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger for Transactions
DROP TRIGGER IF EXISTS tr_notify_pending_transaction ON public.transactions;
CREATE TRIGGER tr_notify_pending_transaction
    AFTER INSERT OR UPDATE OF status ON public.transactions
    FOR EACH ROW
    WHEN (NEW.status = 'pending_verification')
    EXECUTE FUNCTION public.trigger_verification_notification();

-- 4. Create Trigger for Profiles
DROP TRIGGER IF EXISTS tr_notify_pending_kyc ON public.profiles;
CREATE TRIGGER tr_notify_pending_kyc
    AFTER UPDATE OF kyc_status ON public.profiles
    FOR EACH ROW
    WHEN (NEW.kyc_status = 'pending' AND (OLD.kyc_status IS NULL OR OLD.kyc_status != 'pending'))
    EXECUTE FUNCTION public.trigger_verification_notification();

COMMIT;
