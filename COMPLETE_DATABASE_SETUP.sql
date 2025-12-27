-- ============================================
-- COMPLETE DATABASE SETUP FOR COURIER PRO
-- ============================================
-- Run this ENTIRE file in Supabase SQL Editor
-- Go to: Supabase Dashboard → SQL Editor → New Query
-- Copy and paste everything below, then click RUN
-- ============================================

-- ============================================
-- 1. CREATE USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'courier')),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. CREATE ORDERS TABLE/
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  customer_name text NOT NULL,
  address text NOT NULL,
  mobile_number text NOT NULL,
  total_order_fees numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'valu', 'partial')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'delivered', 'canceled', 'partial')),
  assigned_courier_id uuid REFERENCES users(id),
  delivery_fee numeric DEFAULT 0,
  partial_paid_amount numeric DEFAULT 0,
  internal_comment text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 3. CREATE REQUESTS TABLE (for customer requests)
-- ============================================
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

-- ============================================
-- 4. CREATE REQUEST NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS request_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    author VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE POLICIES FOR USERS TABLE
-- ============================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read all users" ON users;

-- Create new policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read all users" ON users
  FOR SELECT TO authenticated
  USING (true);

-- ============================================
-- 7. CREATE POLICIES FOR ORDERS TABLE
-- ============================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can do everything with orders" ON orders;
DROP POLICY IF EXISTS "Couriers can read assigned orders" ON orders;
DROP POLICY IF EXISTS "Couriers can update assigned orders" ON orders;

-- Create new policies
CREATE POLICY "Admin can do everything with orders" ON orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Couriers can read assigned orders" ON orders
  FOR SELECT TO authenticated
  USING (assigned_courier_id = auth.uid());

CREATE POLICY "Couriers can update assigned orders" ON orders
  FOR UPDATE TO authenticated
  USING (assigned_courier_id = auth.uid());

-- ============================================
-- 8. CREATE POLICIES FOR REQUESTS TABLE
-- ============================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read requests" ON requests;
DROP POLICY IF EXISTS "Allow admins to insert requests" ON requests;
DROP POLICY IF EXISTS "Allow admins to update requests" ON requests;
DROP POLICY IF EXISTS "Allow admins to delete requests" ON requests;

-- Create new policies
CREATE POLICY "Allow authenticated users to read requests" ON requests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to insert requests" ON requests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to update requests" ON requests
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to delete requests" ON requests
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- 9. CREATE POLICIES FOR REQUEST NOTES TABLE
-- ============================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read notes" ON request_notes;
DROP POLICY IF EXISTS "Allow admins to insert notes" ON request_notes;
DROP POLICY IF EXISTS "Allow admins to update notes" ON request_notes;
DROP POLICY IF EXISTS "Allow admins to delete notes" ON request_notes;

-- Create new policies
CREATE POLICY "Allow authenticated users to read notes" ON request_notes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to insert notes" ON request_notes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to update notes" ON request_notes
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to delete notes" ON request_notes
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- 10. CREATE INDEXES FOR PERFORMANCE
-- ============================================
-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_assigned_courier_id ON orders(assigned_courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);

-- Requests table indexes
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_assignee ON requests(assignee);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_email ON requests(email);

-- Request notes table indexes
CREATE INDEX IF NOT EXISTS idx_request_notes_request_id ON request_notes(request_id);
CREATE INDEX IF NOT EXISTS idx_request_notes_created_at ON request_notes(created_at);

-- ============================================
-- 11. CREATE FUNCTION TO UPDATE UPDATED_AT TIMESTAMP
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 12. CREATE TRIGGER FOR ORDERS TABLE
-- ============================================
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 13. CREATE TRIGGER FOR REQUESTS TABLE
-- ============================================
DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at 
    BEFORE UPDATE ON requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 14. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON users TO authenticated;
GRANT ALL ON orders TO authenticated;
GRANT ALL ON requests TO authenticated;
GRANT ALL ON request_notes TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================
-- ✅ SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. Go to Authentication → Users in Supabase
-- 2. Create test users (admin@example.com, courier@example.com)
-- 3. Copy their UUIDs from Authentication → Users
-- 4. Run the INSERT statement below (replace UUIDs with actual ones)
-- ============================================

-- ============================================
-- 15. INSERT TEST USERS (OPTIONAL)
-- ============================================
-- IMPORTANT: First create users in Authentication → Users
-- Then replace the UUIDs below with actual auth user IDs
-- Uncomment and run this after creating auth users:

/*
INSERT INTO users (id, email, role, name) VALUES
  ('REPLACE_WITH_ADMIN_AUTH_USER_ID', 'admin@example.com', 'admin', 'Admin User'),
  ('REPLACE_WITH_COURIER_AUTH_USER_ID', 'courier@example.com', 'courier', 'Courier User')
ON CONFLICT (id) DO NOTHING;
*/

