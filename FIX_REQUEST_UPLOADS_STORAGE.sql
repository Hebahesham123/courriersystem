-- =============================================================================
-- Let the public customer request form (unauthenticated / anon) upload photos
-- and videos into the existing public "files" bucket, scoped to the
-- "requests/" folder so it can't touch anything else.
--
-- Run once in the Supabase SQL Editor.
-- (Logged-in admin uploads already work via the existing authenticated policy.)
-- =============================================================================

-- Anon may INSERT (upload) only under files/requests/...
DROP POLICY IF EXISTS "anon upload request attachments" ON storage.objects;
CREATE POLICY "anon upload request attachments"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'files' AND name LIKE 'requests/%');

-- Anon may READ those same files (the bucket is public, but make it explicit).
DROP POLICY IF EXISTS "anon read request attachments" ON storage.objects;
CREATE POLICY "anon read request attachments"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'files' AND name LIKE 'requests/%');
