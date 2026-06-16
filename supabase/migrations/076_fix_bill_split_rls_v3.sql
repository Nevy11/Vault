-- Migration: Fix Bill Splitting RLS v3 (Robust Version)
-- Description: Uses SECURITY DEFINER functions to bypass RLS subquery issues.

BEGIN;

-- 1. Create a helper function to check membership without RLS interference
CREATE OR REPLACE FUNCTION public.check_is_bill_split_member(p_split_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.bill_split_members
        WHERE bill_split_id = p_split_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean up ALL previous select policies for bill_splits
DROP POLICY IF EXISTS "bill_splits_select" ON public.bill_splits;
DROP POLICY IF EXISTS "bill_splits_select_v2" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can select splits they created or belong to" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can view splits they are part of" ON public.bill_splits;

-- 3. Create a NEW robust select policy for bill_splits
CREATE POLICY "bill_splits_select_v3" ON public.bill_splits
    FOR SELECT USING (
        auth.uid() = creator_id 
        OR public.check_is_bill_split_member(id, auth.uid())
    );

-- 4. Clean up and ensure robust policies for bill_split_members
DROP POLICY IF EXISTS "bill_split_members_select" ON public.bill_split_members;
DROP POLICY IF EXISTS "bill_split_members_select_v2" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can select split members" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can view split member records they are part of" ON public.bill_split_members;

CREATE POLICY "bill_split_members_select_v3" ON public.bill_split_members
    FOR SELECT USING (user_id = auth.uid() OR creator_id = auth.uid());

-- 5. Ensure other DML policies are present
DROP POLICY IF EXISTS "bill_splits_insert_v2" ON public.bill_splits;
CREATE POLICY "bill_splits_insert_v3" ON public.bill_splits
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "bill_split_members_insert_v2" ON public.bill_split_members;
CREATE POLICY "bill_split_members_insert_v3" ON public.bill_split_members
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

COMMIT;
