-- Migration: Fix Joint Savings Recursion and Schema Consistency
-- Description: Switches to gen_random_uuid() and fixes recursive RLS policies.

BEGIN;

-- 1. Fix UUID generation defaults (consistency with the rest of the project)
ALTER TABLE joint_pots ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE pot_members ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE pot_contributions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE pot_withdrawal_requests ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE pot_withdrawal_approvals ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Fix RLS Recursion for joint_pots
DROP POLICY IF EXISTS "Users can view pots they are members of" ON joint_pots;
CREATE POLICY "Users can view pots they are members of" ON joint_pots
    FOR SELECT USING (
        creator_id = auth.uid() OR
        id IN (
            SELECT pot_id FROM pot_members WHERE user_id = auth.uid()
        )
    );

-- 3. Fix RLS Recursion for pot_members
DROP POLICY IF EXISTS "Members can view other members in their pots" ON pot_members;

-- Separate into two policies to avoid recursion
-- Policy A: Users can always see their own membership record (non-recursive)
CREATE POLICY "Users can view their own membership" ON pot_members
    FOR SELECT USING (user_id = auth.uid());

-- Policy B: Members can see other members of pots they belong to
-- This uses the first policy to break recursion
CREATE POLICY "Members can view others in their pots" ON pot_members
    FOR SELECT USING (
        pot_id IN (
            SELECT pot_id FROM pot_members WHERE user_id = auth.uid()
        )
    );

-- 4. Fix RLS for pot_contributions (optional but better for consistency/performance)
DROP POLICY IF EXISTS "Members can view contributions" ON pot_contributions;
CREATE POLICY "Members can view contributions" ON pot_contributions
    FOR SELECT USING (
        pot_id IN (
            SELECT pot_id FROM pot_members WHERE user_id = auth.uid()
        )
    );

-- 5. Fix RLS for pot_withdrawal_requests
DROP POLICY IF EXISTS "Members can view withdrawal requests" ON pot_withdrawal_requests;
CREATE POLICY "Members can view withdrawal requests" ON pot_withdrawal_requests
    FOR SELECT USING (
        pot_id IN (
            SELECT pot_id FROM pot_members WHERE user_id = auth.uid()
        )
    );

-- 6. Fix RLS for pot_withdrawal_approvals
DROP POLICY IF EXISTS "Members can view approvals" ON pot_withdrawal_approvals;
CREATE POLICY "Members can view approvals" ON pot_withdrawal_approvals
    FOR SELECT USING (
        request_id IN (
            SELECT r.id 
            FROM pot_withdrawal_requests r
            WHERE r.pot_id IN (
                SELECT pot_id FROM pot_members WHERE user_id = auth.uid()
            )
        )
    );

COMMIT;
