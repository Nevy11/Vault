-- Migration: Add ID Number to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number TEXT;
