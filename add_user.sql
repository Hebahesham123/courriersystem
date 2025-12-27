-- Add User to Database
-- User ID: 00024acc-b902-4844-a996-2111e199ab09
-- Email: test@gmail.com
-- Role: courier
-- Run this in Supabase SQL Editor

INSERT INTO users (id, email, role, name) 
VALUES (
  '00024acc-b902-4844-a996-2111e199ab09',
  'test@gmail.com',
  'courier',
  'Test Courier'  -- You can change this name if needed
)
ON CONFLICT (id) 
DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  name = EXCLUDED.name;

-- Verify the user was added
SELECT * FROM users WHERE id = '00024acc-b902-4844-a996-2111e199ab09';

