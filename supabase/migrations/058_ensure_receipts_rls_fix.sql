-- Migration: Ensure Receipts RLS and Trigger Fix
-- Description: Adds INSERT policy to receipts table and ensures the trigger function is SECURITY DEFINER.

BEGIN;

-- 1. Ensure the trigger function is SECURITY DEFINER and has proper search path
CREATE OR REPLACE FUNCTION public.fn_generate_transaction_receipt() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_user_id UUID;
    v_user_currency TEXT;
    v_should_generate BOOL := FALSE;
BEGIN
    -- Determine the target user (the one who owns the transaction record)
    v_target_user_id := COALESCE(NEW.sender_id, NEW.receiver_id);

    -- Skip if no user can be associated
    IF v_target_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Determine if we should generate a receipt based on the operation type
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'completed' THEN
            v_should_generate := TRUE;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
            v_should_generate := TRUE;
        END IF;
    END IF;

    IF v_should_generate THEN
        -- Check if receipt already exists for this transaction (idempotency)
        IF NOT EXISTS (SELECT 1 FROM public.receipts WHERE transaction_id = NEW.id) THEN
            -- Fetch currency from user's wallet
            SELECT currency INTO v_user_currency FROM public.wallets WHERE user_id = v_target_user_id LIMIT 1;
            
            INSERT INTO public.receipts (
                user_id,
                transaction_id,
                receipt_number,
                amount,
                currency,
                transaction_details,
                metadata
            ) VALUES (
                v_target_user_id,
                NEW.id,
                generate_receipt_number(),
                NEW.amount,
                COALESCE(v_user_currency, 'USD'),
                jsonb_build_object(
                    'type', NEW.type,
                    'method', NEW.method,
                    'description', NEW.description,
                    'completed_at', NOW()
                ),
                COALESCE(NEW.metadata, '{}'::jsonb)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Add explicit INSERT policy for receipts as a fallback
-- This allows the user's session to perform the insert if SECURITY DEFINER isn't enough for some reason.
DROP POLICY IF EXISTS "Users can insert own receipts" ON public.receipts;
CREATE POLICY "Users can insert own receipts" 
ON public.receipts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Ensure SELECT policy exists
DROP POLICY IF EXISTS "Users can view own receipts" ON public.receipts;
CREATE POLICY "Users can view own receipts" 
ON public.receipts FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Ensure service role has full access
DROP POLICY IF EXISTS "Service role can manage all receipts" ON public.receipts;
CREATE POLICY "Service role can manage all receipts"
ON public.receipts
USING (auth.role() = 'service_role');

COMMIT;
