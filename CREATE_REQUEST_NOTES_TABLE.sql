-- ============================================
-- Create request_notes table for customer requests
-- Run this in Supabase SQL Editor
-- ============================================

-- Create request_notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS request_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    note TEXT,
    author TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_request_notes_request_id ON request_notes(request_id);
CREATE INDEX IF NOT EXISTS idx_request_notes_created_at ON request_notes(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE request_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to view request_notes" ON request_notes;
DROP POLICY IF EXISTS "Allow authenticated users to insert request_notes" ON request_notes;
DROP POLICY IF EXISTS "Allow authenticated users to update request_notes" ON request_notes;
DROP POLICY IF EXISTS "Allow authenticated users to delete request_notes" ON request_notes;

-- Create RLS policies for request_notes table
-- Allow authenticated users to view request_notes
CREATE POLICY "Allow authenticated users to view request_notes" ON request_notes
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert request_notes
CREATE POLICY "Allow authenticated users to insert request_notes" ON request_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update request_notes
CREATE POLICY "Allow authenticated users to update request_notes" ON request_notes
    FOR UPDATE
    TO authenticated
    USING (true);

-- Allow authenticated users to delete request_notes
CREATE POLICY "Allow authenticated users to delete request_notes" ON request_notes
    FOR DELETE
    TO authenticated
    USING (true);

-- Verify the table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'request_notes' 
ORDER BY ordinal_position;

-- Test insert (optional - you can delete this after verifying)
-- INSERT INTO request_notes (request_id, note, author)
-- SELECT id, 'Test note', 'admin' FROM requests LIMIT 1;

COMMENT ON TABLE request_notes IS 'Notes and attachments for customer requests';



