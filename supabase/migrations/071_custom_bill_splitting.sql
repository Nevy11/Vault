-- Migration: Custom Bill Splitting Support
-- Description: Adds a new RPC to handle custom split amounts per person.

BEGIN;

-- 1. Create v3 function for custom splits
CREATE OR REPLACE FUNCTION public.create_bill_split_v3(
    p_title TEXT,
    p_total_amount NUMERIC,
    p_category TEXT,
    p_members JSONB, -- Array of {user_id: UUID, amount: NUMERIC}
    p_creator_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_split_id UUID;
    v_creator_id UUID := auth.uid();
    v_member RECORD;
    v_avg_share NUMERIC;
BEGIN
    -- Validation
    IF v_creator_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Calculate average share for the header (optional, but keeps consistency)
    v_avg_share := ROUND(p_total_amount / (jsonb_array_length(p_members) + 1), 2);

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
        v_avg_share,
        p_category,
        'active'
    )
    RETURNING id INTO v_split_id;

    -- 2. Add Participants with their specific amounts
    FOR v_member IN SELECT * FROM jsonb_to_recordset(p_members) AS x(user_id UUID, amount NUMERIC) LOOP
        INSERT INTO public.bill_split_members (
            bill_split_id,
            user_id,
            creator_id,
            amount,
            status
        )
        VALUES (
            v_split_id,
            v_member.user_id,
            v_creator_id,
            v_member.amount,
            'pending'
        );
    END LOOP;

    RETURN jsonb_build_object(
        'id', v_split_id,
        'success', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
