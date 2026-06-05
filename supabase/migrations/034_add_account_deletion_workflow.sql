-- Create account_deletion_requests table
CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    confirmation_token TEXT UNIQUE,
    recovery_token TEXT UNIQUE,
    status TEXT DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'scheduled', 'restored', 'completed')),
    scheduled_at TIMESTAMPTZ,
    deletion_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for account_deletion_requests
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deletion requests" ON account_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Add scheduled_deletion_date to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scheduled_deletion_date TIMESTAMPTZ;
