-- Migration: Fix Receipt Trigger to fire on INSERT and retroactively generate missing receipts
-- Description: The previous trigger only fired on UPDATE, meaning transactions inserted as 'completed' (like vault transfers) bypassed the receipt generation.

CREATE OR REPLACE FUNCTION fn_generate_transaction_receipt() 
RETURNS TRIGGER AS $$
DECLARE
    user_currency TEXT;
    should_generate BOOL := FALSE;
BEGIN
    -- Determine if we should generate a receipt based on the operation type
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'completed' THEN
            should_generate := TRUE;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
            should_generate := TRUE;
        END IF;
    END IF;

    IF should_generate THEN
        -- Fetch currency from user's wallet
        SELECT currency INTO user_currency FROM public.wallets WHERE user_id = NEW.sender_id LIMIT 1;
        
        INSERT INTO public.receipts (
            user_id,
            transaction_id,
            receipt_number,
            amount,
            currency,
            transaction_details,
            metadata
        ) VALUES (
            NEW.sender_id,
            NEW.id,
            generate_receipt_number(),
            NEW.amount,
            COALESCE(user_currency, 'USD'),
            jsonb_build_object(
                'type', NEW.type,
                'method', NEW.method,
                'description', NEW.description,
                'completed_at', NOW()
            ),
            COALESCE(NEW.metadata, '{}'::jsonb)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to fire on both INSERT and UPDATE
DROP TRIGGER IF EXISTS tr_generate_receipt_on_completion ON public.transactions;
CREATE TRIGGER tr_generate_receipt_on_completion
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION fn_generate_transaction_receipt();

-- Retroactively generate receipts for any completed transactions that missed out
DO $$
DECLARE
    tx RECORD;
    user_currency TEXT;
BEGIN
    FOR tx IN 
        SELECT * FROM public.transactions 
        WHERE status = 'completed' 
        AND id NOT IN (SELECT transaction_id FROM public.receipts)
    LOOP
        SELECT currency INTO user_currency FROM public.wallets WHERE user_id = tx.sender_id LIMIT 1;
        
        INSERT INTO public.receipts (
            user_id,
            transaction_id,
            receipt_number,
            amount,
            currency,
            transaction_details,
            metadata
        ) VALUES (
            tx.sender_id,
            tx.id,
            generate_receipt_number(),
            tx.amount,
            COALESCE(user_currency, 'USD'),
            jsonb_build_object(
                'type', tx.type,
                'method', tx.method,
                'description', tx.description,
                'completed_at', COALESCE(tx.updated_at, tx.created_at)
            ),
            COALESCE(tx.metadata, '{}'::jsonb)
        );
    END LOOP;
END $$;
