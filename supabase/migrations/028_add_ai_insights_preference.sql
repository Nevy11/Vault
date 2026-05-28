-- Add AI Advisor notification setting to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notifications_ai_insights BOOLEAN DEFAULT true;
