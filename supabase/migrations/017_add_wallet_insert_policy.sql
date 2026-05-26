-- Migration: Add INSERT policy for wallets
-- This allows users to initialize their own wallet during sign up.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'wallets' AND policyname = 'Users can insert their own wallet'
    ) THEN
        CREATE POLICY "Users can insert their own wallet"
            ON public.wallets FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

COMMIT;
