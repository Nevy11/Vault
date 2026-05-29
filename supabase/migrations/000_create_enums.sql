-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create transaction enums
-- This migration creates the enum types needed for the transactions table

BEGIN;

-- Create transaction_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer');
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create transaction_method enum with all supported payment methods
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_method') THEN
        CREATE TYPE public.transaction_method AS ENUM ('bank', 'mpesa', 'vault');
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create transaction_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed');
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
