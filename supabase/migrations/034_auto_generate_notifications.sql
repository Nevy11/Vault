-- Migration to auto-generate notifications from transactions and activity logs

-- 1. Function to handle transaction notifications (Transfer Sent/Received)
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
    IF NEW.type = 'deposit' AND NEW.status = 'completed' THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            COALESCE(NEW.receiver_id, NEW.sender_id),
            'Deposit Successful',
            'Your deposit of $' || NEW.amount || ' has been credited to your wallet.',
            'success'
        );
    END IF;

    -- Notification for Withdrawals
    IF NEW.type = 'withdrawal' AND NEW.status = 'completed' THEN
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

-- 2. Trigger for transactions
DROP TRIGGER IF EXISTS on_transaction_completed ON public.transactions;
CREATE TRIGGER on_transaction_completed
    AFTER INSERT OR UPDATE OF status ON public.transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION public.handle_transaction_notification();


-- 3. Function to handle activity log notifications (Logins, Security Alerts)
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

    -- Notification for Security Alerts (e.g., suspicious activity)
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

-- 4. Trigger for activity_logs
DROP TRIGGER IF EXISTS on_activity_logged ON public.activity_logs;
CREATE TRIGGER on_activity_logged
    AFTER INSERT ON public.activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_activity_notification();
