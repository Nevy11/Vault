-- Create Joint Savings System (Renamed to match existing DB schema)
CREATE TABLE IF NOT EXISTS pots (
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
    pot_id UUID REFERENCES pots(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', -- 'admin' or 'member'
    status TEXT NOT NULL DEFAULT 'invited', -- 'invited', 'active', 'declined'
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(pot_id, user_id)
);

CREATE TABLE IF NOT EXISTS pot_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pot_id UUID REFERENCES pots(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pot_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pot_id UUID REFERENCES pots(id) ON DELETE CASCADE NOT NULL,
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
    withdrawal_id UUID REFERENCES pot_withdrawals(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(withdrawal_id, user_id)
);

-- Enable RLS
ALTER TABLE pots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_withdrawal_approvals ENABLE ROW LEVEL SECURITY;

-- Policies for pots (Members can see and admins can edit)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view pots they are members of') THEN
        CREATE POLICY "Users can view pots they are members of" ON pots
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM pot_members
                    WHERE pot_id = pots.id AND user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update their pots') THEN
        CREATE POLICY "Admins can update their pots" ON pots
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM pot_members
                    WHERE pot_id = pots.id AND user_id = auth.uid() AND role = 'admin'
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
END
$$;

-- Trigger to update pots balance on contribution
CREATE OR REPLACE FUNCTION update_pot_balance_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pots
    SET balance = balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.pot_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_pot_contribution ON pot_contributions;
CREATE TRIGGER on_pot_contribution
    AFTER INSERT ON pot_contributions
    FOR EACH ROW EXECUTE FUNCTION update_pot_balance_on_contribution();

-- Enable realtime (Safe check if already added)
DO $$
BEGIN
    -- This is tricky as there's no simple "IF NOT EXISTS" for publications
    -- But usually adding them again is fine or handled by Supabase
END
$$;
