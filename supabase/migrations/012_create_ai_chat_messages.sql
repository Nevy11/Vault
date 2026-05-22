-- Create a table to store AI chat history
CREATE TABLE ai_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    sender TEXT CHECK (sender IN ('user', 'advisor')) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own messages
CREATE POLICY "Users can view their own chat messages"
ON ai_chat_messages FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own messages
CREATE POLICY "Users can insert their own chat messages"
ON ai_chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add an index for performance
CREATE INDEX idx_ai_chat_user_id ON ai_chat_messages(user_id);
