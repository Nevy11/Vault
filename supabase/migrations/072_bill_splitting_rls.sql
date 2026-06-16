-- Migration: Bill Splitting RLS Policies
-- Description: Adds security policies to allow users to see splits they created or are members of.

BEGIN;

-- 1. Enable RLS
ALTER TABLE public.bill_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_split_members ENABLE ROW LEVEL SECURITY;

-- 2. Bill Splits Policies
DROP POLICY IF EXISTS "Users can view splits they are part of" ON public.bill_splits;
CREATE POLICY "Users can view splits they are part of" ON public.bill_splits
    FOR SELECT USING (
        auth.uid() = creator_id 
        OR id IN (SELECT bill_split_id FROM public.bill_split_members WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can create splits" ON public.bill_splits;
CREATE POLICY "Users can create splits" ON public.bill_splits
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can delete splits they created" ON public.bill_splits;
CREATE POLICY "Users can delete splits they created" ON public.bill_splits
    FOR DELETE USING (auth.uid() = creator_id);

-- 3. Bill Split Members Policies
DROP POLICY IF EXISTS "Users can view split member records they are part of" ON public.bill_split_members;
CREATE POLICY "Users can view split member records they are part of" ON public.bill_split_members
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can create split members" ON public.bill_split_members;
CREATE POLICY "Users can create split members" ON public.bill_split_members
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

COMMIT;
