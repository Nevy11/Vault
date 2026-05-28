-- Function to handle transaction notifications
CREATE OR REPLACE FUNCTION public.handle_transaction_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_title TEXT;
    v_message TEXT;
    v_type TEXT;
BEGIN
    -- Determine the user and message based on transaction type
    IF NEW.type = 'deposit' AND NEW.status = 'completed' THEN
        v_user_id := NEW.receiver_id;
        v_title := 'Deposit Successful';
        v_message := 'Your deposit of ' || NEW.amount || ' has been credited to your wallet.';
        v_type := 'success';
    ELSIF NEW.type = 'withdrawal' AND NEW.status = 'completed' THEN
        v_user_id := NEW.sender_id;
        v_title := 'Withdrawal Completed';
        v_message := 'Your withdrawal of ' || NEW.amount || ' has been processed successfully.';
        v_type := 'info';
    ELSIF NEW.type = 'transfer' AND NEW.status = 'completed' THEN
        -- Notify the receiver
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.receiver_id,
            'Payment Received',
            'You have received ' || NEW.amount || ' from a Vault user.',
            'success'
        );
        -- Return to handle the sender if needed or just exit
        RETURN NEW;
    ELSE
        RETURN NEW;
    END IF;

    -- Insert the notification
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (v_user_id, v_title, v_message, v_type);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for completed transactions
DROP TRIGGER IF EXISTS on_transaction_completed ON public.transactions;
CREATE TRIGGER on_transaction_completed
    AFTER INSERT OR UPDATE OF status
    ON public.transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION public.handle_transaction_notification();
