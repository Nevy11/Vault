-- Migration: Fix Bill Splitting RLS v2
-- Description: Simplified and more robust RLS policies for bill splitting.

BEGIN;

-- 1. Aggressively clean up ALL potential policies for bill_splits
DROP POLICY IF EXISTS "bill_splits_select" ON public.bill_splits;
DROP POLICY IF EXISTS "bill_splits_insert" ON public.bill_splits;
DROP POLICY IF EXISTS "bill_splits_update" ON public.bill_splits;
DROP POLICY IF EXISTS "bill_splits_delete" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can select splits they created or belong to" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can view splits they are part of" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can create splits" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can insert splits they created" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can update splits they created" ON public.bill_splits;
DROP POLICY IF EXISTS "Users can delete splits they created" ON public.bill_splits;

-- 2. Aggressively clean up ALL potential policies for bill_split_members
DROP POLICY IF EXISTS "bill_split_members_select" ON public.bill_split_members;
DROP POLICY IF EXISTS "bill_split_members_insert" ON public.bill_split_members;
DROP POLICY IF EXISTS "bill_split_members_update" ON public.bill_split_members;
DROP POLICY IF EXISTS "bill_split_members_delete" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can select split members" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can view split member records they are part of" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can create split members" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can insert split members" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can update split members they own or created" ON public.bill_split_members;
DROP POLICY IF EXISTS "Users can delete split members" ON public.bill_split_members;

-- 3. Consolidated bill_splits policies
-- Using IN (SELECT ...) is often more reliable than EXISTS with joined RLS
CREATE POLICY "bill_splits_select_v2" ON public.bill_splits
    FOR SELECT USING (
        auth.uid() = creator_id 
        OR id IN (
            SELECT bill_split_id FROM public.bill_split_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "bill_splits_insert_v2" ON public.bill_splits
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "bill_splits_update_v2" ON public.bill_splits
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "bill_splits_delete_v2" ON public.bill_splits
    FOR DELETE USING (auth.uid() = creator_id);

-- 4. Consolidated bill_split_members policies
CREATE POLICY "bill_split_members_select_v2" ON public.bill_split_members
    FOR SELECT USING (user_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY "bill_split_members_insert_v2" ON public.bill_split_members
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "bill_split_members_update_v2" ON public.bill_split_members
    FOR UPDATE USING (user_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY "bill_split_members_delete_v2" ON public.bill_split_members
    FOR DELETE USING (creator_id = auth.uid());

COMMIT;
