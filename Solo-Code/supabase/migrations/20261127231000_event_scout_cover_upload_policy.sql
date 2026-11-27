-- Event scout: who may store an event poster.
-- The apply workflow signs in as a dedicated account that can do exactly one thing: add
-- scout-*.jpg|png|webp files to the team's events folder in the public project-media bucket.
-- It cannot read private data, change or delete anything; a leaked password only lets someone
-- add poster files to that folder.
--
-- Before running: create the account in Supabase → Authentication → Users → Add user
--   e-mail scout-uploader@samecor.com, a long random password, "Auto Confirm User" on.
-- Undo: DROP POLICY IF EXISTS scout_cover_upload ON storage.objects; then delete that user.

DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'scout-uploader@samecor.com';
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Create the user scout-uploader@samecor.com first (Authentication → Users → Add user), then run this again';
  END IF;
  DROP POLICY IF EXISTS scout_cover_upload ON storage.objects;
  EXECUTE format($p$
    CREATE POLICY scout_cover_upload ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'project-media'
        AND auth.uid() = %L::uuid
        AND name LIKE 'anthem/82039b6d-cdf4-4c46-958a-d770d849382c/events/scout-%%'
        AND (name LIKE '%%.jpg' OR name LIKE '%%.png' OR name LIKE '%%.webp')
        AND position('..' IN name) = 0
      )
  $p$, v_uid);
END $$;
