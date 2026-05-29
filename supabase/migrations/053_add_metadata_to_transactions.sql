-- Migration: Add metadata to transactions
-- Description: Adds a JSONB metadata column to the transactions table to store extra details like FX rates and references.

BEGIN;

-- Add the metadata column if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

COMMIT;
