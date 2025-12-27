-- Database Schema for Customer Requests System
-- Run this SQL manually in your Supabase SQL editor

-- Create the requests table
CREATE TABLE IF NOT EXISTS requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    comment TEXT NOT NULL,
         image_url TEXT,
     video_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'process', 'approved', 'cancelled')),
    assignee VARCHAR(100),
    created_by VARCHAR(100) NOT NULL DEFAULT 'user:formspree',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the request_notes table
CREATE TABLE IF NOT EXISTS request_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    author VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_assignee ON requests(assignee);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_email ON requests(email);
CREATE INDEX IF NOT EXISTS idx_request_notes_request_id ON request_notes(request_id);
CREATE INDEX IF NOT EXISTS idx_request_notes_created_at ON request_notes(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_requests_updated_at 
    BEFORE UPDATE ON requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

 -- Insert sample data for testing (optional)
 INSERT INTO requests (name, email, phone, comment, image_url, video_url, status, assignee, created_by) VALUES
 ('John Smith', 'john@example.com', '+1234567890', 'Need fast delivery service for downtown area', NULL, NULL, 'pending', NULL, 'admin:manual'),
 ('Sarah Johnson', 'sarah@example.com', '+1987654321', 'Urgent delivery request for hospital', NULL, NULL, 'process', 'Toka', 'admin:manual'),
 ('Michael Brown', 'michael@example.com', '+1122334455', 'Commercial goods delivery', NULL, NULL, 'approved', 'Marina', 'admin:manual'),
 ('Emily Davis', 'emily@example.com', '+1555666777', 'Home delivery request', NULL, NULL, 'cancelled', NULL, 'admin:manual');

-- Insert sample notes (optional)
INSERT INTO request_notes (request_id, note, author) VALUES
((SELECT id FROM requests WHERE email = 'sarah@example.com' LIMIT 1), 'Contacted customer and confirmed request', 'admin'),
((SELECT id FROM requests WHERE email = 'sarah@example.com' LIMIT 1), 'Assigned Toka to the request', 'admin'),
((SELECT id FROM requests WHERE email = 'michael@example.com' LIMIT 1), 'Delivery completed successfully', 'Marina'),
((SELECT id FROM requests WHERE email = 'emily@example.com' LIMIT 1), 'Customer cancelled due to emergency', 'admin');

-- Enable Row Level Security (RLS) for production use
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (adjust according to your authentication setup)
-- This example allows all authenticated users to read, but only admins to modify
CREATE POLICY "Allow authenticated users to read requests" ON requests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to insert requests" ON requests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to update requests" ON requests
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to delete requests" ON requests
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read notes" ON request_notes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to insert notes" ON request_notes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to update notes" ON request_notes
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to delete notes" ON request_notes
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON requests TO authenticated;
GRANT ALL ON request_notes TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create a view for easy querying of requests with note counts
CREATE OR REPLACE VIEW requests_with_notes AS
SELECT 
    r.*,
    COUNT(rn.id) as note_count,
    MAX(rn.created_at) as last_note_at
FROM requests r
LEFT JOIN request_notes rn ON r.id = rn.request_id
GROUP BY r.id, r.name, r.email, r.phone, r.comment, r.image_url, r.status, r.assignee, r.created_by, r.created_at, r.updated_at;

-- Grant access to the view
GRANT SELECT ON requests_with_notes TO authenticated;
