-- Migration: Fix Bill Splitting RLS v4 (Final Attempt)
-- Description: Uses a robust SECURITY DEFINER function with explicit search path to fix visibility.

BEGIN;

-- 1. Helper function with explicit search path
CREATE OR REPLACE FUNCTION public.check_is_split_participant(p_split_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.bill_split_members
        WHERE bill_split_id = p_split_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Clean up ALL previous splitting policies
DO $$
BEGIN
    -- Bill Splits Select Policies
    DROP POLICY IF EXISTS "bill_splits_select" ON public.bill_splits;
    DROP POLICY IF EXISTS "bill_splits_select_v2" ON public.bill_splits;
    DROP POLICY IF EXISTS "bill_splits_select_v3" ON public.bill_splits;
    DROP POLICY IF EXISTS "Users can select splits they created or belong to" ON public.bill_splits;
    DROP POLICY IF EXISTS "Users can view splits they are part of" ON public.bill_splits;
    
    -- Bill Split Members Select Policies
    DROP POLICY IF EXISTS "bill_split_members_select" ON public.bill_split_members;
    DROP POLICY IF EXISTS "bill_split_members_select_v2" ON public.bill_split_members;
    DROP POLICY IF EXISTS "bill_split_members_select_v3" ON public.bill_split_members;
    DROP POLICY IF EXISTS "Users can select split members" ON public.bill_split_members;
    DROP POLICY IF EXISTS "Users can view split member records they are part of" ON public.bill_split_members;
    
    -- Other DML Policies
    DROP POLICY IF EXISTS "bill_splits_insert_v2" ON public.bill_splits;
    DROP POLICY IF EXISTS "bill_splits_insert_v3" ON public.bill_splits;
    DROP POLICY IF EXISTS "bill_split_members_insert_v2" ON public.bill_split_members;
    DROP POLICY IF EXISTS "bill_split_members_insert_v3" ON public.bill_split_members;
END $$;

-- 3. Consolidated and Simplified Policies
CREATE POLICY "splits_select_v4" ON public.bill_splits
    FOR SELECT USING (
        creator_id = auth.uid() 
        OR public.check_is_split_participant(id, auth.uid())
    );

CREATE POLICY "members_select_v4" ON public.bill_split_members
    FOR SELECT USING (
        user_id = auth.uid() 
        OR creator_id = auth.uid()
    );

CREATE POLICY "splits_insert_v4" ON public.bill_splits
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "members_insert_v4" ON public.bill_split_members
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "splits_update_v4" ON public.bill_splits
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "members_update_v4" ON public.bill_split_members
    FOR UPDATE USING (user_id = auth.uid() OR creator_id = auth.uid());

COMMIT;
