-- Migration 098: Fix Joint Pots Creator Foreign Key
-- This migration updates the creator_id foreign key to point to the profiles table
-- instead of auth.users to resolve PostgREST join ambiguity and errors.

BEGIN;

-- 1. Identify and drop the existing foreign key constraint
-- The default name is usually 'joint_pots_creator_id_fkey'
ALTER TABLE public.joint_pots DROP CONSTRAINT IF EXISTS joint_pots_creator_id_fkey;

-- 2. Add the new constraint pointing to public.profiles
-- This helps PostgREST find the relationship when selecting 'profiles' via 'creator' alias
ALTER TABLE public.joint_pots
ADD CONSTRAINT joint_pots_creator_id_fkey 
FOREIGN KEY (creator_id) 
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;
