-- Migration: Improved Bill Splitting System
-- Description: Adds atomic split creation, cancellation, and automated notifications.

BEGIN;

-- 1. Atomic Split Creation Function
CREATE OR REPLACE FUNCTION public.create_bill_split_v2(
    p_title TEXT,
    p_total_amount NUMERIC,
    p_category TEXT,
    p_member_ids UUID[],
    p_include_creator BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_split_id UUID;
    v_creator_id UUID := auth.uid();
    v_share_count INTEGER;
    v_base_share NUMERIC;
    v_total_allocated NUMERIC := 0;
    v_member_id UUID;
    v_member_amount NUMERIC;
    v_result JSONB;
BEGIN
    -- Validation
    IF v_creator_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF ARRAY_LENGTH(p_member_ids, 1) IS NULL OR ARRAY_LENGTH(p_member_ids, 1) = 0 THEN
        RAISE EXCEPTION 'At least one participant is required';
    END IF;

    -- Calculate shares
    v_share_count := ARRAY_LENGTH(p_member_ids, 1);
    IF p_include_creator THEN
        v_share_count := v_share_count + 1;
    END IF;

    v_base_share := ROUND(p_total_amount / v_share_count, 2);

    -- 1. Create the Split Header
    INSERT INTO public.bill_splits (
        creator_id,
        title,
        total_amount,
        amount_per_person,
        category,
        status
    )
    VALUES (
        v_creator_id,
        p_title,
        p_total_amount,
        v_base_share,
        p_category,
        'active'
    )
    RETURNING id INTO v_split_id;

    -- 2. Add Participants (except the last one to handle rounding)
    FOR i IN 1..(ARRAY_LENGTH(p_member_ids, 1)) LOOP
        v_member_id := p_member_ids[i];
        
        -- If this is the absolute last person in the entire split (including creator)
        -- we give them the remainder.
        IF NOT p_include_creator AND i = ARRAY_LENGTH(p_member_ids, 1) THEN
            v_member_amount := p_total_amount - v_total_allocated;
        ELSE
            v_member_amount := v_base_share;
        END IF;

        INSERT INTO public.bill_split_members (
            bill_split_id,
            user_id,
            creator_id,
            amount,
            status
        )
        VALUES (
            v_split_id,
            v_member_id,
            v_creator_id,
            v_member_amount,
            'pending'
        );
        
        v_total_allocated := v_total_allocated + v_member_amount;
    END LOOP;

    -- Note: If include_creator is true, the creator's share is implicitly the remainder
    -- but we don't store the creator as a 'member' who needs to pay themselves.
    -- The UI handles showing the creator's share.

    SELECT jsonb_build_object(
        'id', v_split_id,
        'title', p_title,
        'total_amount', p_total_amount,
        'share_per_person', v_base_share
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Split Cancellation Function
CREATE OR REPLACE FUNCTION public.cancel_bill_split(p_split_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_creator_id UUID;
    v_status TEXT;
BEGIN
    SELECT creator_id, status INTO v_creator_id, v_status
    FROM public.bill_splits
    WHERE id = p_split_id;

    IF v_creator_id IS NULL THEN
        RAISE EXCEPTION 'Split not found';
    END IF;

    IF v_creator_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Only the creator can cancel this split';
    END IF;

    -- Optional: Prevent cancellation if someone has already paid?
    -- For now, let's allow it but maybe in a real app you'd want to refund.
    -- Since our pay_bill_split function is atomic, we can just delete.
    
    DELETE FROM public.bill_splits WHERE id = p_split_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Automated Notifications for Split Members
CREATE OR REPLACE FUNCTION public.handle_bill_split_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_title TEXT;
    v_creator_tag TEXT;
    v_currency TEXT;
BEGIN
    -- Get split details
    SELECT s.title, p.kyc_tag
    INTO v_title, v_creator_tag
    FROM public.bill_splits s
    JOIN public.profiles p ON p.id = s.creator_id
    WHERE s.id = NEW.bill_split_id;

    -- Notify the member
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        NEW.user_id,
        'New Split Request',
        'You have a new split request for "' || v_title || '" from ' || v_creator_tag || '. Your share is ' || NEW.amount || '.',
        'info'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bill_split_member_added ON public.bill_split_members;
CREATE TRIGGER on_bill_split_member_added
    AFTER INSERT ON public.bill_split_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_bill_split_notification();

COMMIT;
