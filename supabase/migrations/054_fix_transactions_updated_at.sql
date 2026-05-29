-- Migration: Fix missing updated_at on transactions
-- Description: Adds updated_at column to transactions table to satisfy triggers and ensure consistency.

BEGIN;

-- Add updated_at column to transactions if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Ensure the trigger function exists (should be there from 001, but being safe)
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-apply trigger just in case
DROP TRIGGER IF EXISTS update_transactions_updated_at_trigger ON public.transactions;
CREATE TRIGGER update_transactions_updated_at_trigger
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transactions_updated_at();

COMMIT;
