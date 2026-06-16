-- Migration: Fix Bill Splitting RLS and Performance
-- Description: Consolidates and optimizes RLS policies for bill splits and members.

BEGIN;

-- 1. Clean up old policies for bill_splits
DROP POLICY IF EXISTS "Users can select splits they created or belong to" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can view splits they are part of" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can create splits" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can insert splits they created" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can update splits they created" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can delete splits they created" ON public.bill_splits;

-- 2. Clean up old policies for bill_split_members
DROP POLICY IF EXISTS "Users can select split members" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can view split member records they are part of" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can create split members" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can insert split members" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can update split members they own or created" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can delete split members" ON public.bill_split_members;

-- 3. Consolidated bill_splits policies
-- Using a subquery with EXISTS is generally more reliable than IN for RLS joins
CREATE POLICY "bill_splits_select" ON public.bill_splits
    FOR SELECT USING (
        auth.uid() = creator_id 
        OR EXISTS (
            SELECT 1 FROM public.bill_split_members 
            WHERE bill_split_members.bill_split_id = public.bill_splits.id 
            AND bill_split_members.user_id = auth.uid()
        )
    );

CREATE POLICY "bill_splits_insert" ON public.bill_splits
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "bill_splits_update" ON public.bill_splits
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "bill_splits_delete" ON public.bill_splits
    FOR DELETE USING (auth.uid() = creator_id);

-- 4. Consolidated bill_split_members policies
CREATE POLICY "bill_split_members_select" ON public.bill_split_members
    FOR SELECT USING (
        user_id = auth.uid() 
        OR creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.bill_splits
            WHERE bill_splits.id = bill_split_members.bill_split_id
            AND bill_splits.creator_id = auth.uid()
        )
    );

CREATE POLICY "bill_split_members_insert" ON public.bill_split_members
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "bill_split_members_update" ON public.bill_split_members
    FOR UPDATE USING (user_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY "bill_split_members_delete" ON public.bill_split_members
    FOR DELETE USING (creator_id = auth.uid());

COMMIT;
