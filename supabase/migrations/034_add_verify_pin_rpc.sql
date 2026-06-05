-- RPC Function to securely verify the current PIN hash
-- This prevents the client from ever needing to fetch the 'pin_hash' column directly

CREATE OR REPLACE FUNCTION verify_current_pin(provided_pin_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to check the profiles table
SET search_path = public
AS $$
BEGIN
    -- Check if the provided hash matches the stored hash for the authenticated user
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND pin_hash = provided_pin_hash
    );
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION verify_current_pin(TEXT) IS 'Verifies if the provided hash matches the authenticated user''s current PIN hash.';
