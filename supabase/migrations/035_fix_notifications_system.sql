-- Consolidated Migration for Notifications System

-- 1. Create Notifications Table (if not exists)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- e.g., 'info', 'success', 'warning', 'error'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (using DO blocks to avoid errors if they already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own notifications') THEN
        CREATE POLICY "Users can view their own notifications"
            ON public.notifications FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own notifications') THEN
        CREATE POLICY "Users can update their own notifications"
            ON public.notifications FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Enable Realtime (Ignore error if already enabled)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 5. Function to handle transaction notifications
CREATE OR REPLACE FUNCTION public.handle_transaction_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Notification for Sender (Transfer Sent)
    IF NEW.sender_id IS NOT NULL AND NEW.status = 'completed' AND NEW.type = 'transfer' THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.sender_id,
            'Transfer Sent',
            'You sent $' || NEW.amount || ' to ' || COALESCE((SELECT kyc_tag FROM public.profiles WHERE id = NEW.receiver_id), 'another user') || '.',
            'info'
        );
    END IF;

    -- Notification for Receiver (Transfer Received)
    IF NEW.receiver_id IS NOT NULL AND NEW.status = 'completed' AND NEW.type = 'transfer' THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.receiver_id,
            'Transfer Received',
            'You received $' || NEW.amount || ' from ' || COALESCE((SELECT kyc_tag FROM public.profiles WHERE id = NEW.sender_id), 'another user') || '.',
            'success'
        );
    END IF;
    
    -- Notification for Deposits
    IF NEW.type = 'deposit' AND NEW.status = 'completed' AND COALESCE(NEW.receiver_id, NEW.sender_id) IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            COALESCE(NEW.receiver_id, NEW.sender_id),
            'Deposit Successful',
            'Your deposit of $' || NEW.amount || ' has been credited to your wallet.',
            'success'
        );
    END IF;

    -- Notification for Withdrawals
    IF NEW.type = 'withdrawal' AND NEW.status = 'completed' AND NEW.sender_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.sender_id,
            'Withdrawal Successful',
            'Your withdrawal of $' || NEW.amount || ' has been processed.',
            'info'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for transactions
DROP TRIGGER IF EXISTS on_transaction_completed ON public.transactions;
CREATE TRIGGER on_transaction_completed
    AFTER INSERT OR UPDATE OF status ON public.transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION public.handle_transaction_notification();

-- 7. Function to handle activity log notifications
CREATE OR REPLACE FUNCTION public.handle_activity_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Notification for Login
    IF NEW.action_type = 'login' THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            'New Account Login',
            'Your account was accessed from a ' || COALESCE(NEW.device_info, 'new device') || ' in ' || COALESCE(NEW.location, 'Unknown Location') || '.',
            'info'
        );
    END IF;

    -- Notification for Security Alerts
    IF NEW.is_suspicious = true THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            'Security Alert',
            'A suspicious activity was detected on your account: ' || NEW.action_type || '. If this wasn''t you, please change your PIN immediately.',
            'warning'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger for activity_logs
DROP TRIGGER IF EXISTS on_activity_logged ON public.activity_logs;
CREATE TRIGGER on_activity_logged
    AFTER INSERT ON public.activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_activity_notification();
