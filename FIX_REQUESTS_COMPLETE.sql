-- ============================================
-- COMPLETE FIX: Requests Table for Public Form
-- Run this STEP BY STEP in Supabase SQL Editor
-- ============================================

-- STEP 1: Check if the table exists, if not create it fresh
-- Run this first to see the current structure:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'requests';

-- STEP 2: Drop and recreate the table (easiest solution)
-- WARNING: This will delete all existing data!

DROP TABLE IF EXISTS request_notes CASCADE;
DROP TABLE IF EXISTS requests CASCADE;

-- STEP 3: Create fresh requests table with correct types
CREATE TABLE requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    comment TEXT,
    order_id TEXT,  -- TEXT to allow long comma-separated order IDs
    image_url TEXT,
    video_url TEXT,
    status TEXT DEFAULT 'pending',
    assignee TEXT,
    created_by TEXT,  -- TEXT instead of UUID to accept any value
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 4: Create request_notes table
CREATE TABLE request_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    note TEXT,
    author TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 5: Create indexes
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX idx_request_notes_request_id ON request_notes(request_id);

-- STEP 6: Enable RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_notes ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create policies that allow ANONYMOUS inserts
-- For requests table
CREATE POLICY "public_insert_requests" ON requests
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "auth_select_requests" ON requests
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "auth_update_requests" ON requests
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "auth_delete_requests" ON requests
    FOR DELETE TO authenticated
    USING (true);

-- For request_notes table
CREATE POLICY "public_insert_notes" ON request_notes
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "auth_select_notes" ON request_notes
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "auth_update_notes" ON request_notes
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "auth_delete_notes" ON request_notes
    FOR DELETE TO authenticated
    USING (true);

-- STEP 8: Test insert (this should work)
INSERT INTO requests (name, email, phone, comment, created_by)
VALUES ('Test User', 'test@test.com', '123456', 'Test comment', 'user:public-form');

-- Verify it worked
SELECT * FROM requests;

-- If you see the test record, delete it:
-- DELETE FROM requests WHERE name = 'Test User';

