-- Create KYC tags for existing users who do not yet have one.
-- Uses normalized first and last names and appends a numeric suffix for duplicates.

BEGIN;

WITH missing_profiles AS (
  SELECT
    id,
    lower(trim(regexp_replace(coalesce(first_name, ''), '[^a-z0-9]+', '.', 'g'))) AS norm_first,
    lower(trim(regexp_replace(coalesce(last_name, ''), '[^a-z0-9]+', '.', 'g'))) AS norm_last
  FROM public.profiles
  WHERE kyc_tag IS NULL
), base_tags AS (
  SELECT
    id,
    concat('@', regexp_replace(trim(both '.' FROM regexp_replace(norm_first, '\\.+', '.', 'g')), '\\.+', '.', 'g'), '.', regexp_replace(trim(both '.' FROM regexp_replace(norm_last, '\\.+', '.', 'g')), '\\.+', '.', 'g')) AS base_tag
  FROM missing_profiles
), ordered_tags AS (
  SELECT
    bt.id,
    bt.base_tag,
    row_number() OVER (PARTITION BY bt.base_tag ORDER BY bt.id) AS row_num,
    (SELECT count(*) FROM public.profiles p WHERE p.kyc_tag IS NOT NULL AND p.kyc_tag LIKE bt.base_tag || '%') AS existing_count
  FROM base_tags bt
)
UPDATE public.profiles p
SET kyc_tag = CASE
    WHEN o.existing_count = 0 AND o.row_num = 1 THEN o.base_tag
    ELSE o.base_tag || (o.existing_count + o.row_num)::text
  END
FROM ordered_tags o
WHERE p.id = o.id;

COMMIT;
