-- Create Joint Savings System
CREATE TABLE IF NOT EXISTS joint_pots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pot_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pot_id UUID REFERENCES joint_pots(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', -- 'admin' or 'member'
    status TEXT NOT NULL DEFAULT 'invited', -- 'invited', 'active', 'declined'
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(pot_id, user_id)
);

CREATE TABLE IF NOT EXISTS pot_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pot_id UUID REFERENCES joint_pots(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type TEXT NOT NULL DEFAULT 'deposit', -- 'deposit', 'withdrawal'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pot_withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pot_id UUID REFERENCES joint_pots(id) ON DELETE CASCADE NOT NULL,
    requester_id UUID REFERENCES auth.users(id) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'executed', 'rejected'
    approvals_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pot_withdrawal_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES pot_withdrawal_requests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved', -- 'approved', 'rejected'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(request_id, user_id)
);

-- Enable RLS
ALTER TABLE joint_pots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_withdrawal_approvals ENABLE ROW LEVEL SECURITY;

-- Policies for joint_pots
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view pots they are members of') THEN
        CREATE POLICY "Users can view pots they are members of" ON joint_pots
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM pot_members
                    WHERE pot_id = joint_pots.id AND user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create pots') THEN
        CREATE POLICY "Users can create pots" ON joint_pots
            FOR INSERT WITH CHECK (auth.uid() = creator_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update their pots') THEN
        CREATE POLICY "Admins can update their pots" ON joint_pots
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM pot_members
                    WHERE pot_id = joint_pots.id AND user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END
$$;

-- Policies for pot_members
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can view other members in their pots') THEN
        CREATE POLICY "Members can view other members in their pots" ON pot_members
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM pot_members AS m
                    WHERE m.pot_id = pot_members.pot_id AND m.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can be added to pots') THEN
        CREATE POLICY "Users can be added to pots" ON pot_members
            FOR INSERT WITH CHECK (
                -- Allow users to add themselves (usually as admin during creation)
                auth.uid() = user_id OR
                -- Allow existing admins to invite others
                EXISTS (
                    SELECT 1 FROM pot_members
                    WHERE pot_id = pot_members.pot_id AND user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own membership status') THEN
        CREATE POLICY "Users can update their own membership status" ON pot_members
            FOR UPDATE USING (user_id = auth.uid());
    END IF;
END
$$;

-- Policies for pot_contributions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can view contributions') THEN
        CREATE POLICY "Members can view contributions" ON pot_contributions
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM pot_members
                    WHERE pot_id = pot_contributions.pot_id AND user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can make contributions') THEN
        CREATE POLICY "Members can make contributions" ON pot_contributions
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM pot_members
                    WHERE pot_id = pot_contributions.pot_id AND user_id = auth.uid() AND status = 'active'
                )
            );
    END IF;
END
$$;

-- Policies for pot_withdrawal_requests
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can view withdrawal requests') THEN
        CREATE POLICY "Members can view withdrawal requests" ON pot_withdrawal_requests
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM pot_members
                    WHERE pot_id = pot_withdrawal_requests.pot_id AND user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can create withdrawal requests') THEN
        CREATE POLICY "Members can create withdrawal requests" ON pot_withdrawal_requests
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM pot_members
                    WHERE pot_id = pot_withdrawal_requests.pot_id AND user_id = auth.uid() AND status = 'active'
                )
            );
    END IF;
END
$$;

-- Policies for pot_withdrawal_approvals
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can view approvals') THEN
        CREATE POLICY "Members can view approvals" ON pot_withdrawal_approvals
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM pot_members m
                    JOIN pot_withdrawal_requests r ON r.pot_id = m.pot_id
                    WHERE r.id = pot_withdrawal_approvals.request_id AND m.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can cast approvals') THEN
        CREATE POLICY "Members can cast approvals" ON pot_withdrawal_approvals
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM pot_members m
                    JOIN pot_withdrawal_requests r ON r.pot_id = m.pot_id
                    WHERE r.id = pot_withdrawal_approvals.request_id AND m.user_id = auth.uid() AND m.status = 'active'
                )
            );
    END IF;
END
$$;

-- Trigger to update joint_pots balance on contribution
CREATE OR REPLACE FUNCTION update_pot_balance_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'deposit' THEN
        UPDATE joint_pots
        SET balance = balance + NEW.amount,
            updated_at = now()
        WHERE id = NEW.pot_id;
    ELSIF NEW.type = 'withdrawal' THEN
        UPDATE joint_pots
        SET balance = balance - NEW.amount,
            updated_at = now()
        WHERE id = NEW.pot_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_pot_contribution ON pot_contributions;
CREATE TRIGGER on_pot_contribution
    AFTER INSERT ON pot_contributions
    FOR EACH ROW EXECUTE FUNCTION update_pot_balance_on_contribution();

-- Trigger to handle withdrawal approvals and auto-execution
CREATE OR REPLACE FUNCTION handle_withdrawal_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_member_count INTEGER;
    v_approval_count INTEGER;
    v_pot_id UUID;
    v_amount DECIMAL(15, 2);
    v_requester_id UUID;
BEGIN
    -- Get pot_id and amount from the request
    SELECT pot_id, amount, requester_id INTO v_pot_id, v_amount, v_requester_id
    FROM pot_withdrawal_requests
    WHERE id = NEW.request_id;

    -- Count active members in the pot
    SELECT COUNT(*) INTO v_member_count
    FROM pot_members
    WHERE pot_id = v_pot_id AND status = 'active';

    -- Update approvals_count on the request
    SELECT COUNT(*) INTO v_approval_count
    FROM pot_withdrawal_approvals
    WHERE request_id = NEW.request_id AND status = 'approved';

    UPDATE pot_withdrawal_requests
    SET approvals_count = v_approval_count,
        updated_at = now()
    WHERE id = NEW.request_id;

    -- If all members have approved, execute the withdrawal
    IF v_approval_count >= v_member_count THEN
        UPDATE pot_withdrawal_requests
        SET status = 'executed',
            updated_at = now()
        WHERE id = NEW.request_id;

        -- Create a contribution record for the withdrawal to update balance
        INSERT INTO pot_contributions (pot_id, user_id, amount, type)
        VALUES (v_pot_id, v_requester_id, v_amount, 'withdrawal');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_withdrawal_approval ON pot_withdrawal_approvals;
CREATE TRIGGER on_withdrawal_approval
    AFTER INSERT OR UPDATE ON pot_withdrawal_approvals
    FOR EACH ROW EXECUTE FUNCTION handle_withdrawal_approval();

-- Trigger to update joined_at on status change to active
CREATE OR REPLACE FUNCTION update_member_joined_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
        NEW.joined_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_member_status_change ON pot_members;
CREATE TRIGGER on_member_status_change
    BEFORE UPDATE ON pot_members
    FOR EACH ROW EXECUTE FUNCTION update_member_joined_at();

-- Trigger to notify user when invited to a joint pot
CREATE OR REPLACE FUNCTION notify_pot_invitation()
RETURNS TRIGGER AS $$
DECLARE
    v_pot_title TEXT;
    v_creator_name TEXT;
BEGIN
    -- Get pot title
    SELECT title INTO v_pot_title FROM joint_pots WHERE id = NEW.pot_id;
    
    -- Get creator name
    SELECT p.first_name INTO v_creator_name 
    FROM profiles p
    JOIN joint_pots jp ON jp.creator_id = p.id
    WHERE jp.id = NEW.pot_id;

    -- Insert notification for the invited user
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
        NEW.user_id,
        'Joint Savings Invitation',
        v_creator_name || ' has invited you to join the "' || v_pot_title || '" shared pot.',
        'info',
        jsonb_build_object('pot_id', NEW.pot_id, 'type', 'pot_invite')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_pot_invite ON pot_members;
CREATE TRIGGER on_pot_invite
    AFTER INSERT ON pot_members
    FOR EACH ROW
    WHEN (NEW.status = 'invited')
    EXECUTE FUNCTION notify_pot_invitation();

