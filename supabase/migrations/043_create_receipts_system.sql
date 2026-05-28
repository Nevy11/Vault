-- Migration: Create Receipts Table and Automated Generation Trigger
-- Description: Automatically generates a unique digital receipt when a transaction is 'completed'.

-- 1. Create the Receipts Table
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    receipt_number TEXT UNIQUE NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    transaction_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- External IDs (Stripe/M-Pesa)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexing for high-performance lookups
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON public.receipts(transaction_id);

-- 3. Enable Row-Level Security
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can only view their own receipts
CREATE POLICY "Users can view own receipts" 
ON public.receipts FOR SELECT 
USING (auth.uid() = user_id);

-- 5. PL/pgSQL Function to Generate Receipt Number
CREATE OR REPLACE FUNCTION generate_receipt_number() 
RETURNS TEXT AS $$
DECLARE
    new_receipt_no TEXT;
    done BOOL := FALSE;
BEGIN
    WHILE NOT done LOOP
        -- New format: VT- followed by 8 uppercase hex characters from a UUID
        new_receipt_no := 'VT-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
        
        -- Check for uniqueness
        IF NOT EXISTS (SELECT 1 FROM public.receipts WHERE receipt_number = new_receipt_no) THEN
            done := TRUE;
        END IF;
    END LOOP;
    RETURN new_receipt_no;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 6. Trigger Function to Auto-Generate Receipt on Completion
CREATE OR REPLACE FUNCTION fn_generate_transaction_receipt() 
RETURNS TRIGGER AS $$
DECLARE
    user_currency TEXT;
BEGIN
    -- Only generate if status transitioned to 'completed'
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
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

-- 7. Attach Trigger to Transactions Table
DROP TRIGGER IF EXISTS tr_generate_receipt_on_completion ON public.transactions;
CREATE TRIGGER tr_generate_receipt_on_completion
AFTER UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION fn_generate_transaction_receipt();
