-- Allow sender_id to be NULL in transactions table
-- This is necessary for deposits, which don't have an internal sender
BEGIN;

ALTER TABLE public.transactions ALTER COLUMN sender_id DROP NOT NULL;

-- Update RLS to ensure users can still see their own transactions when sender_id is null
-- (Existing policy already covers receiver_id)
-- CREATE POLICY "Users can view their own transactions"
--    ON public.transactions FOR SELECT
--    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

COMMIT;
