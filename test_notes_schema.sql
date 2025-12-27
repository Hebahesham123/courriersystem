-- Test if the image_url column exists in request_notes table
-- Run this in your Supabase SQL editor to check the current schema

-- Check if image_url column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'request_notes' 
AND column_name = 'image_url';

-- Check the current structure of request_notes table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'request_notes'
ORDER BY ordinal_position;

-- Check if there are any notes with images
SELECT id, note, image_url, author, created_at
FROM request_notes
WHERE image_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Check all recent notes
SELECT id, note, image_url, author, created_at
FROM request_notes
ORDER BY created_at DESC
LIMIT 10;
