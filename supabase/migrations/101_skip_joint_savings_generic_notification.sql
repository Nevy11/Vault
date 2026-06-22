-- Skip generic withdrawal notification for Joint Savings deposits
CREATE OR REPLACE FUNCTION public.handle_transaction_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_title_key TEXT;
    v_message_key TEXT;
    v_type TEXT;
    v_metadata JSONB;
    v_pref_received BOOLEAN;
    v_pref_sent BOOLEAN;
BEGIN
    -- Determine the user and message based on transaction type
    IF NEW.type = 'deposit' AND NEW.status = 'completed' THEN
        v_user_id := NEW.receiver_id;
        v_title_key := 'nav.notifications.deposit_success_title';
        v_message_key := 'nav.notifications.deposit_success_msg';
        v_metadata := jsonb_build_object('amount', NEW.amount);
        v_type := 'success';
        
        -- Check preference
        SELECT notifications_transfer_received INTO v_pref_received FROM public.profiles WHERE id = v_user_id;
        IF NOT COALESCE(v_pref_received, true) THEN
            RETURN NEW;
        END IF;

    ELSIF NEW.type = 'withdrawal' AND NEW.status = 'completed' THEN
        -- Skip generic notification for Joint Savings
        IF NEW.description LIKE 'Joint Savings%' THEN
            RETURN NEW;
        END IF;

        v_user_id := NEW.sender_id;
        v_title_key := 'nav.notifications.withdrawal_success_title';
        v_message_key := 'nav.notifications.withdrawal_success_msg';
        v_metadata := jsonb_build_object('amount', NEW.amount);
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
            INSERT INTO public.notifications (user_id, title, message, title_key, message_key, metadata, type)
            VALUES (
                NEW.receiver_id,
                'Payment Received', -- Fallback
                'You have received ' || NEW.amount || ' from a Vault user.', -- Fallback
                'nav.notifications.payment_received_title',
                'nav.notifications.payment_received_msg',
                jsonb_build_object('amount', NEW.amount),
                'success'
            );
        END IF;

        -- Notify the sender
        SELECT notifications_transfer_sent INTO v_pref_sent FROM public.profiles WHERE id = NEW.sender_id;
        IF COALESCE(v_pref_sent, true) THEN
            INSERT INTO public.notifications (user_id, title, message, title_key, message_key, metadata, type)
            VALUES (
                NEW.sender_id,
                'Transfer Sent', -- Fallback
                'Your transfer of ' || NEW.amount || ' has been sent successfully.', -- Fallback
                'nav.notifications.transfer_sent_title',
                'nav.notifications.transfer_sent_msg',
                jsonb_build_object('amount', NEW.amount),
                'info'
            );
        END IF;
        
        RETURN NEW;
    ELSE
        RETURN NEW;
    END IF;

    -- Insert the notification
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, title_key, message_key, metadata, type)
        VALUES (
            v_user_id, 
            COALESCE(v_title_key, 'Notification'), -- Simple fallback title
            COALESCE(v_message_key, 'Message'), -- Simple fallback message
            v_title_key, 
            v_message_key, 
            v_metadata, 
            v_type
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
