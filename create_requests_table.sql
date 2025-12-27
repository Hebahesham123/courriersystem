-- ============================================
-- Customer Requests Feature - Database Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    comment TEXT,
    order_id VARCHAR(100),
    image_url TEXT,
    video_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'process', 'approved', 'cancelled')),
    assignee VARCHAR(100),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create request_notes table for notes/comments on requests
CREATE TABLE IF NOT EXISTS request_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    note TEXT,
    author VARCHAR(255),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_assignee ON requests(assignee);
CREATE INDEX IF NOT EXISTS idx_request_notes_request_id ON request_notes(request_id);

-- Enable Row Level Security (RLS)
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for requests table
-- Allow all authenticated users to view requests
CREATE POLICY "Allow authenticated users to view requests" ON requests
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert requests
CREATE POLICY "Allow authenticated users to insert requests" ON requests
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update requests
CREATE POLICY "Allow authenticated users to update requests" ON requests
    FOR UPDATE
    TO authenticated
    USING (true);

-- Allow authenticated users to delete requests
CREATE POLICY "Allow authenticated users to delete requests" ON requests
    FOR DELETE
    TO authenticated
    USING (true);

-- Create RLS policies for request_notes table
CREATE POLICY "Allow authenticated users to view request_notes" ON request_notes
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert request_notes" ON request_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update request_notes" ON request_notes
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to delete request_notes" ON request_notes
    FOR DELETE
    TO authenticated
    USING (true);

-- Create storage bucket for uploads if not exists
-- Note: This needs to be done in the Storage section of Supabase Dashboard
-- Or via the API. The bucket name should be 'uploads'

-- Grant storage access (run this separately if bucket exists)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('uploads', 'uploads', true)
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE requests IS 'Customer requests/complaints management table';
COMMENT ON TABLE request_notes IS 'Notes and follow-up comments for customer requests';
