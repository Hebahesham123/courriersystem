-- Add Multiple Users: Admins and Couriers
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Create Users in Supabase Auth
-- ============================================
-- Note: You need to create these users in Authentication → Users first
-- OR use the Supabase Admin API to create them programmatically
-- 
-- For each user:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create new user"
-- 3. Enter email: name@gmail.com
-- 4. Enter password: name123!
-- 5. Click "Create User"
-- 6. Copy the User UUID
-- 7. Use that UUID in the INSERT statements below

-- ============================================
-- STEP 2: Insert Admins into users table
-- ============================================
-- Replace the UUIDs below with actual auth user IDs from Authentication → Users

-- Admins
INSERT INTO users (id, email, role, name) VALUES
  ('REPLACE_WITH_MARINA_UUID', 'marina@gmail.com', 'admin', 'Marina'),
  ('REPLACE_WITH_MARIAM_UUID', 'mariam@gmail.com', 'admin', 'Mariam'),
  ('REPLACE_WITH_TOKA_UUID', 'toka@gmail.com', 'admin', 'Toka'),
  ('REPLACE_WITH_SHROUQ_UUID', 'shrouq@gmail.com', 'admin', 'Shrouq'),
  ('REPLACE_WITH_HAGAR_UUID', 'hagar@gmail.com', 'admin', 'Hagar')
ON CONFLICT (id) 
DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  name = EXCLUDED.name;

-- ============================================
-- STEP 3: Insert Couriers into users table
-- ============================================

-- Couriers
INSERT INTO users (id, email, role, name) VALUES
  ('REPLACE_WITH_AHMED_UUID', 'ahmed@gmail.com', 'courier', 'Ahmed'),
  ('REPLACE_WITH_MOHAMED_UUID', 'mohamed@gmail.com', 'courier', 'Mohamed'),
  ('REPLACE_WITH_SALAH_UUID', 'salah@gmail.com', 'courier', 'Salah'),
  ('REPLACE_WITH_EMAD_UUID', 'emad@gmail.com', 'courier', 'Emad'),
  ('REPLACE_WITH_TEST1_UUID', 'test1@gmail.com', 'courier', 'Test1'),
  ('REPLACE_WITH_TEST2_UUID', 'test2@gmail.com', 'courier', 'Test2')
ON CONFLICT (id) 
DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  name = EXCLUDED.name;

-- ============================================
-- Verify Users Were Added
-- ============================================
SELECT 
  name,
  email,
  role,
  created_at
FROM users
WHERE email IN (
  'marina@gmail.com',
  'mariam@gmail.com',
  'toka@gmail.com',
  'shrouq@gmail.com',
  'hagar@gmail.com',
  'ahmed@gmail.com',
  'mohamed@gmail.com',
  'salah@gmail.com',
  'emad@gmail.com',
  'test1@gmail.com',
  'test2@gmail.com'
)
ORDER BY role, name;

