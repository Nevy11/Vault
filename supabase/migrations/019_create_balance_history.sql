-- Create balance_history table to store balance snapshots for transactions
BEGIN;

CREATE TABLE IF NOT EXISTS public.balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
    recorded_balance NUMERIC(12, 2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.balance_history ENABLE ROW LEVEL SECURITY;

-- Create Policy: Users can only see their own balance history
CREATE POLICY "Users can view their own balance history"
    ON public.balance_history FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM wallets WHERE id = balance_history.wallet_id
        )
    );

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_balance_history_wallet_id ON public.balance_history(wallet_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_recorded_at ON public.balance_history(recorded_at DESC);

-- Create a function to automatically record balance history
CREATE OR REPLACE FUNCTION public.record_balance_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only record if the balance has actually changed
    IF (OLD.balance IS DISTINCT FROM NEW.balance) THEN
        INSERT INTO public.balance_history (wallet_id, recorded_balance)
        VALUES (NEW.id, NEW.balance);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to capture every balance change
DROP TRIGGER IF EXISTS trigger_record_balance_history ON public.wallets;
CREATE TRIGGER trigger_record_balance_history
    AFTER UPDATE ON public.wallets
    FOR EACH ROW
    EXECUTE FUNCTION public.record_balance_history();

-- Also capture the initial balance upon wallet creation
CREATE OR REPLACE FUNCTION public.record_initial_balance_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.balance_history (wallet_id, recorded_balance)
    VALUES (NEW.id, NEW.balance);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_record_initial_balance_history ON public.wallets;
CREATE TRIGGER trigger_record_initial_balance_history
    AFTER INSERT ON public.wallets
    FOR EACH ROW
    EXECUTE FUNCTION public.record_initial_balance_history();

COMMIT;
