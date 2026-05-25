-- Ensure transaction enums are comprehensive
BEGIN;

-- Try to add values to types if they don't exist
-- Note: 'ALTER TYPE ... ADD VALUE' cannot be executed inside a transaction block in some Postgres versions, 
-- but Supabase supports it or we can use a separate script.
-- However, we'll use a safe check if possible or just assume standard values.

-- Safe way to ensure values exist in an ENUM
DO $$
BEGIN
    -- transaction_type
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'deposit') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'deposit';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'withdrawal') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'withdrawal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_type' AND e.enumlabel = 'transfer') THEN
        ALTER TYPE public.transaction_type ADD VALUE 'transfer';
    END IF;

    -- transaction_method
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_method' AND e.enumlabel = 'bank') THEN
        ALTER TYPE public.transaction_method ADD VALUE 'bank';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_method' AND e.enumlabel = 'mpesa') THEN
        ALTER TYPE public.transaction_method ADD VALUE 'mpesa';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'transaction_method' AND e.enumlabel = 'vault') THEN
        ALTER TYPE public.transaction_method ADD VALUE 'vault';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
