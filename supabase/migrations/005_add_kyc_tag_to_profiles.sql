-- Add unique KYC tag field to profiles

BEGIN;

ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS kyc_tag TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_kyc_tag_unique
ON public.profiles(kyc_tag);

COMMIT;
