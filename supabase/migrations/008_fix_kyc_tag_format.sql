-- Fix KYC tag generation to use complete names and match TypeScript logic
BEGIN;

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS assign_kyc_tag_trigger ON public.profiles;
DROP FUNCTION IF EXISTS assign_kyc_tag();

-- Create improved function that preserves all letters and matches utils.ts logic
CREATE OR REPLACE FUNCTION assign_kyc_tag()
RETURNS TRIGGER AS $$
DECLARE
    v_base_first TEXT;
    v_base_last TEXT;
    v_base_tag TEXT;
    v_tag TEXT;
    v_counter INTEGER := 2;
BEGIN
    -- Only generate if kyc_tag is NULL
    IF NEW.kyc_tag IS NULL THEN
        -- Get clean names (lowercase, replace non-alphanumeric with dots, trim dots)
        -- This matches the logic in src/lib/utils.ts
        v_base_first := lower(trim(both '.' FROM regexp_replace(coalesce(NEW.first_name, 'user'), '[^a-z0-9]+', '.', 'gi')));
        v_base_last := lower(trim(both '.' FROM regexp_replace(coalesce(NEW.last_name, 'account'), '[^a-z0-9]+', '.', 'gi')));
        
        -- Generate base tag
        v_base_tag := concat('@', v_base_first, '.', v_base_last);
        v_tag := v_base_tag;
        
        -- Ensure uniqueness by appending a counter if needed
        WHILE EXISTS(SELECT 1 FROM public.profiles WHERE kyc_tag = v_tag AND id != NEW.id) LOOP
            v_tag := v_base_tag || v_counter::text;
            v_counter := v_counter + 1;
        END LOOP;
        
        NEW.kyc_tag := v_tag;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to assign KYC tag on profile creation
CREATE TRIGGER assign_kyc_tag_trigger
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION assign_kyc_tag();

-- Update existing profiles with incorrect KYC tags
-- We use a temporary function or loop to handle uniqueness during backfill
DO $$
DECLARE
    r RECORD;
    v_base_first TEXT;
    v_base_last TEXT;
    v_base_tag TEXT;
    v_tag TEXT;
    v_counter INTEGER;
BEGIN
    FOR r IN 
        SELECT id, first_name, last_name, kyc_tag 
        FROM public.profiles 
        WHERE kyc_tag IS NULL 
           OR kyc_tag NOT LIKE '@%'
           OR (first_name IS NOT NULL AND lower(kyc_tag) NOT LIKE CONCAT('%', lower(regexp_replace(first_name, '[^a-z0-9]+', '', 'gi')), '%'))
    LOOP
        v_base_first := lower(trim(both '.' FROM regexp_replace(coalesce(r.first_name, 'user'), '[^a-z0-9]+', '.', 'gi')));
        v_base_last := lower(trim(both '.' FROM regexp_replace(coalesce(r.last_name, 'account'), '[^a-z0-9]+', '.', 'gi')));
        v_base_tag := concat('@', v_base_first, '.', v_base_last);
        v_tag := v_base_tag;
        v_counter := 2;

        WHILE EXISTS(SELECT 1 FROM public.profiles WHERE kyc_tag = v_tag AND id != r.id) LOOP
            v_tag := v_base_tag || v_counter::text;
            v_counter := v_counter + 1;
        END LOOP;

        UPDATE public.profiles SET kyc_tag = v_tag WHERE id = r.id;
    END LOOP;
END $$;

COMMIT;
