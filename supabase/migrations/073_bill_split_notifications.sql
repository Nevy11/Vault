-- Migration: Bill Split Notifications
-- Description: Automatically notifies users when they are added to a split.

BEGIN;

-- 1. Create the notification handler function
CREATE OR REPLACE FUNCTION public.handle_bill_split_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_title TEXT;
    v_creator_name TEXT;
BEGIN
    -- Get split details and creator name
    SELECT s.title, p.first_name || ' ' || p.last_name
    INTO v_title, v_creator_name
    FROM public.bill_splits s
    JOIN public.profiles p ON p.id = s.creator_id
    WHERE s.id = NEW.bill_split_id;

    -- Insert notification for the member
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        NEW.user_id,
        'New Split Request',
        v_creator_name || ' requested ' || NEW.amount || ' for "' || v_title || '".',
        'info'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_bill_split_member_added ON public.bill_split_members;
CREATE TRIGGER on_bill_split_member_added
    AFTER INSERT ON public.bill_split_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_bill_split_notification();

COMMIT;
