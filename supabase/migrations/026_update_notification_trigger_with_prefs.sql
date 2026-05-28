-- Update handle_transaction_notification to respect user preferences
CREATE OR REPLACE FUNCTION public.handle_transaction_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_title TEXT;
    v_message TEXT;
    v_type TEXT;
    v_pref_received BOOLEAN;
    v_pref_sent BOOLEAN;
BEGIN
    -- Determine the user and message based on transaction type
    IF NEW.type = 'deposit' AND NEW.status = 'completed' THEN
        v_user_id := NEW.receiver_id;
        v_title := 'Deposit Successful';
        v_message := 'Your deposit of ' || NEW.amount || ' has been credited to your wallet.';
        v_type := 'success';
        
        -- Check preference
        SELECT notifications_transfer_received INTO v_pref_received FROM public.profiles WHERE id = v_user_id;
        IF NOT COALESCE(v_pref_received, true) THEN
            RETURN NEW;
        END IF;

    ELSIF NEW.type = 'withdrawal' AND NEW.status = 'completed' THEN
        v_user_id := NEW.sender_id;
        v_title := 'Withdrawal Completed';
        v_message := 'Your withdrawal of ' || NEW.amount || ' has been processed successfully.';
        v_type := 'info';

        -- Check preference
        SELECT notifications_transfer_sent INTO v_pref_sent FROM public.profiles WHERE id = v_user_id;
        IF NOT COALESCE(v_pref_sent, true) THEN
            RETURN NEW;
        END IF;

    ELSIF NEW.type = 'transfer' AND NEW.status = 'completed' THEN
        -- Notify the receiver
        SELECT notifications_transfer_received INTO v_pref_received FROM public.profiles WHERE id = NEW.receiver_id;
        IF COALESCE(v_pref_received, true) THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.receiver_id,
                'Payment Received',
                'You have received ' || NEW.amount || ' from a Vault user.',
                'success'
            );
        END IF;

        -- Notify the sender
        SELECT notifications_transfer_sent INTO v_pref_sent FROM public.profiles WHERE id = NEW.sender_id;
        IF COALESCE(v_pref_sent, true) THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.sender_id,
                'Transfer Sent',
                'Your transfer of ' || NEW.amount || ' has been sent successfully.',
                'info'
            );
        END IF;
        
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
