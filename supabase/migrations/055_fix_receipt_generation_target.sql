-- Migration: Fix Receipt Generation for all transaction types
-- Description: Ensures receipts are generated for both deposits (where sender_id is NULL) and withdrawals/transfers.

BEGIN;

CREATE OR REPLACE FUNCTION fn_generate_transaction_receipt() 
RETURNS TRIGGER AS $$
DECLARE
    v_target_user_id UUID;
    v_user_currency TEXT;
    v_should_generate BOOL := FALSE;
BEGIN
    -- Determine the target user (the one who owns the transaction record)
    -- For deposits: receiver_id is the user
    -- For withdrawals/transfers: sender_id is the user
    v_target_user_id := COALESCE(NEW.sender_id, NEW.receiver_id);

    -- Skip if no user can be associated (shouldn't happen for completed transactions)
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
$$ LANGUAGE plpgsql;

-- Retroactively generate missing receipts
DO $$
DECLARE
    tx RECORD;
    v_target_user_id UUID;
    v_user_currency TEXT;
BEGIN
    FOR tx IN 
        SELECT * FROM public.transactions 
        WHERE status = 'completed' 
        AND id NOT IN (SELECT transaction_id FROM public.receipts)
    LOOP
        v_target_user_id := COALESCE(tx.sender_id, tx.receiver_id);
        
        IF v_target_user_id IS NOT NULL THEN
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
                tx.id,
                generate_receipt_number(),
                tx.amount,
                COALESCE(v_user_currency, 'USD'),
                jsonb_build_object(
                    'type', tx.type,
                    'method', tx.method,
                    'description', tx.description,
                    'completed_at', COALESCE(tx.updated_at, tx.created_at)
                ),
                COALESCE(tx.metadata, '{}'::jsonb)
            );
        END IF;
    END LOOP;
END $$;

COMMIT;
