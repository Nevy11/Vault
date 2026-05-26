-- Add policy to allow users to insert their own transactions
BEGIN;

CREATE POLICY "Users can insert their own transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

COMMIT;
