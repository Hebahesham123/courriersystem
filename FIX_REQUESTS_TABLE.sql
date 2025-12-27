-- ============================================
-- FIX: Allow Public Form Submissions
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop the foreign key constraint on created_by and change to TEXT
-- First, check if column exists and alter it
ALTER TABLE requests 
ALTER COLUMN created_by TYPE TEXT;

-- Remove the foreign key if it exists (this may error if no FK - that's okay)
-- ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_created_by_fkey;

-- Step 2: Drop existing RLS policies and recreate with anonymous access
DROP POLICY IF EXISTS "Allow authenticated users to view requests" ON requests;
DROP POLICY IF EXISTS "Allow authenticated users to insert requests" ON requests;
DROP POLICY IF EXISTS "Allow authenticated users to update requests" ON requests;
DROP POLICY IF EXISTS "Allow authenticated users to delete requests" ON requests;
DROP POLICY IF EXISTS "Allow all for requests" ON requests;

-- Step 3: Create new policies that allow PUBLIC (anonymous) inserts
-- Allow anyone (including anonymous) to INSERT requests
CREATE POLICY "Allow public to insert requests" ON requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow only authenticated users to view requests
CREATE POLICY "Allow authenticated to view requests" ON requests
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow only authenticated users to update requests
CREATE POLICY "Allow authenticated to update requests" ON requests
    FOR UPDATE
    TO authenticated
    USING (true);

-- Allow only authenticated users to delete requests
CREATE POLICY "Allow authenticated to delete requests" ON requests
    FOR DELETE
    TO authenticated
    USING (true);

-- Step 4: Same for request_notes
DROP POLICY IF EXISTS "Allow authenticated users to view request_notes" ON request_notes;
DROP POLICY IF EXISTS "Allow authenticated users to insert request_notes" ON request_notes;
DROP POLICY IF EXISTS "Allow authenticated users to update request_notes" ON request_notes;
DROP POLICY IF EXISTS "Allow authenticated users to delete request_notes" ON request_notes;
DROP POLICY IF EXISTS "Allow all for request_notes" ON request_notes;

CREATE POLICY "Allow public to insert request_notes" ON request_notes
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated to view request_notes" ON request_notes
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated to update request_notes" ON request_notes
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated to delete request_notes" ON request_notes
    FOR DELETE
    TO authenticated
    USING (true);

-- Step 5: Allow anonymous uploads to storage bucket
-- Go to Storage > Policies in Supabase Dashboard and add:
-- Policy name: "Allow public uploads"
-- Allowed operation: INSERT
-- Target roles: anon, authenticated
-- USING expression: true
-- WITH CHECK expression: true

-- Or run this SQL (if bucket exists):
-- Note: Storage policies may need to be set via Dashboard

SELECT 'Policies updated! Anonymous users can now submit requests.' as status;

