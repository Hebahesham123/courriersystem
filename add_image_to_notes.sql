-- Add image support to request_notes table
-- Run this in your Supabase SQL editor

-- Add image_url column to request_notes table
ALTER TABLE request_notes 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Modify note column to allow null values (for image-only notes)
ALTER TABLE request_notes 
ALTER COLUMN note DROP NOT NULL;

-- Create index for better performance when querying notes with images
CREATE INDEX IF NOT EXISTS idx_request_notes_image_url ON request_notes(image_url);

-- Update existing notes to have NULL image_url (optional)
UPDATE request_notes 
SET image_url = NULL 
WHERE image_url IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'request_notes' 
ORDER BY ordinal_position;
