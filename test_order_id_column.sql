-- Test and verify the order_id column in the requests table
-- Run this in your Supabase SQL Editor to check the table structure

-- 1. Check if the order_id column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'requests' 
AND column_name = 'order_id';

-- 2. Check the current table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'requests'
ORDER BY ordinal_position;

-- 3. Check if there are any existing records with order_id
SELECT id, name, email, order_id, created_at
FROM requests
WHERE order_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check the most recent records
SELECT id, name, email, order_id, created_at
FROM requests
ORDER BY created_at DESC
LIMIT 5;

-- 5. If order_id column doesn't exist, add it
-- ALTER TABLE requests ADD COLUMN IF NOT EXISTS order_id TEXT;

-- 6. Test inserting a record with order_id
-- INSERT INTO requests (name, email, phone, comment, order_id, created_by, created_at, updated_at)
-- VALUES ('Test User', 'test@example.com', '123456789', 'Test comment', 'TEST-ORDER-123', 'test-script', NOW(), NOW());

-- 7. Verify the test record was inserted
-- SELECT * FROM requests WHERE email = 'test@example.com';

-- 8. Clean up test record (optional)
-- DELETE FROM requests WHERE email = 'test@example.com';
