-- Create trigger to automatically generate KYC tags for new profiles

BEGIN;

-- Create a function to generate and assign unique KYC tags
CREATE OR REPLACE FUNCTION assign_kyc_tag()
RETURNS TRIGGER AS $$
DECLARE
    v_base_tag TEXT;
    v_tag TEXT;
    v_counter INTEGER := 1;
BEGIN
    -- Only generate if kyc_tag is NULL
    IF NEW.kyc_tag IS NULL THEN
        -- Generate base tag from first and last names
        v_base_tag := concat(
            '@',
            lower(trim(both '.' FROM regexp_replace(regexp_replace(coalesce(NEW.first_name, ''), '[^a-z0-9]+', '.', 'g'), '\.+', '.', 'g'))),
            '.',
            lower(trim(both '.' FROM regexp_replace(regexp_replace(coalesce(NEW.last_name, ''), '[^a-z0-9]+', '.', 'g'), '\.+', '.', 'g')))
        );
        
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
DROP TRIGGER IF EXISTS assign_kyc_tag_trigger ON public.profiles;
CREATE TRIGGER assign_kyc_tag_trigger
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION assign_kyc_tag();

COMMIT;
