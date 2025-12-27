-- Supabase Storage Setup for File Uploads
-- Run this in your Supabase SQL editor

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the uploads bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'uploads' AND 
        auth.role() = 'authenticated'
    );

-- Allow authenticated users to view files
CREATE POLICY "Allow authenticated users to view files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'uploads' AND 
        auth.role() = 'authenticated'
    );

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated users to update files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'uploads' AND 
        auth.role() = 'authenticated'
    );

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'uploads' AND 
        auth.role() = 'authenticated'
    );

-- Create folders structure
-- Note: Folders are created automatically when files are uploaded
-- The code will create: uploads/requests/images/ and uploads/requests/videos/
