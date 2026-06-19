-- Add text_size column to user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS text_size TEXT DEFAULT '100';
