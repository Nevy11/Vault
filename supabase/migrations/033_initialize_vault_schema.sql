-- 1. Create ENUMs for categorized data
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_method') THEN
        CREATE TYPE transaction_method AS ENUM ('vault', 'mobile_money', 'bank_account', 'card_visa', 'card_mastercard');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status') THEN
        CREATE TYPE kyc_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'theme_preference') THEN
        CREATE TYPE theme_preference AS ENUM ('light', 'dark', 'system');
    END IF;
END $$;

-- 2. Profiles Table (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT UNIQUE,
    pin_hash TEXT, -- To store the hashed 6-digit PIN securely
    profile_photo_url TEXT, -- URL from the Supabase Storage Bucket
    kyc_status kyc_status DEFAULT 'unverified',
    kyc_tag TEXT,
    biometric_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Wallets Table (Stores current user net worth/balance)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    balance NUMERIC(12, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Net Worth / Balance History (To plot the line graph over time)
CREATE TABLE IF NOT EXISTS balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
    recorded_balance NUMERIC(12, 2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Registered Payment Methods (For Withdrawals & Deposits)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    method_type transaction_method NOT NULL,
    provider_name TEXT, -- e.g., 'Stripe', 'M-Pesa', 'Chase'
    account_details JSONB NOT NULL, -- Masked account number, routing info, etc.
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Transactions Table (Handles deposits, withdrawals, and P2P transfers)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Null if external deposit
    receiver_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Null if external withdrawal
    type transaction_type NOT NULL,
    method transaction_method NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status transaction_status DEFAULT 'pending',
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. User Preferences & Notifications Table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    theme theme_preference DEFAULT 'system',
    language TEXT DEFAULT 'en',
    notify_transfer_received BOOLEAN DEFAULT true,
    notify_account_login BOOLEAN DEFAULT true,
    notify_transfer_sent BOOLEAN DEFAULT true,
    notify_security_alerts BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Activity & Security Logs (Session history, login notifications, etc.)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- e.g., 'login', 'transfer_initiated', 'pin_change'
    ip_address TEXT,
    device_info TEXT, -- User-Agent string
    location TEXT,
    is_suspicious BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Device Management Table
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL, -- e.g., 'iPhone 13', 'Chrome on Windows'
    last_login TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Support Tickets (Help Page & Contact Form)
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Nullable if they log out before asking
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Savings Goals Table
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL,
    current_amount NUMERIC(12, 2) DEFAULT 0.00,
    start_date DATE NOT NULL,
    deadline_date DATE NOT NULL,
    funding_source TEXT,
    is_automated BOOLEAN DEFAULT false,
    automation_frequency TEXT, -- 'daily', 'weekly', 'monthly', 'yearly'
    automation_amount NUMERIC(12, 2),
    automation_provider TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'missed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Savings Ledger (Transactions specifically for savings goals)
CREATE TABLE IF NOT EXISTS savings_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    source TEXT NOT NULL, -- e.g., 'mpesa', 'kcb'
    type TEXT NOT NULL CHECK (type IN ('manual', 'automated')),
    running_total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own savings goals" ON savings_goals;
CREATE POLICY "Users can manage their own savings goals" ON savings_goals
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own savings ledger" ON savings_ledger;
CREATE POLICY "Users can view their own savings ledger" ON savings_ledger
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert to their own savings ledger" ON savings_ledger;
CREATE POLICY "Users can insert to their own savings ledger" ON savings_ledger
    FOR INSERT WITH CHECK (auth.uid() = user_id);
