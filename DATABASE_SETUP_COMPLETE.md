# 🗄️ Complete Database Setup Guide

## ⚠️ IMPORTANT: What to Run in Your Database

You need to run **TWO main SQL scripts** in your Supabase SQL Editor to set up your database:

### Step 1: Main Database Schema (REQUIRED)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `bdquuixqypkmbvvfymvm`
3. Click on **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the contents of **`database_schema.sql`** file
6. Click **Run** (or press Ctrl+Enter)

This creates:
- ✅ `requests` table (for customer requests)
- ✅ `request_notes` table (for internal notes)
- ✅ Indexes for performance
- ✅ Row Level Security policies

### Step 2: Main Application Tables (REQUIRED)

Run this SQL in the same SQL Editor:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'courier')),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
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

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read all users" ON users
  FOR SELECT TO authenticated
  USING (true);

-- Create policies for orders table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_assigned_courier_id ON orders(assigned_courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
```

### Step 3: Create Test Users (OPTIONAL but Recommended)

After creating the tables, create some test users:

```sql
-- First, create auth users in Supabase Authentication
-- Go to: Authentication → Users → Add User
-- Create users with email/password

-- Then link them to the users table:
-- Replace the UUIDs below with actual auth user IDs from Authentication → Users

INSERT INTO users (id, email, role, name) VALUES
  ('YOUR_ADMIN_AUTH_USER_ID', 'admin@example.com', 'admin', 'Admin User'),
  ('YOUR_COURIER_AUTH_USER_ID', 'courier@example.com', 'courier', 'Courier User')
ON CONFLICT (id) DO NOTHING;
```

**To get auth user IDs:**
1. Go to **Authentication** → **Users** in Supabase
2. Create users there first
3. Copy their UUIDs
4. Use those UUIDs in the INSERT statement above

## 🔍 Verify Your Setup

After running the SQL:

1. Go to **Database** → **Tables** in Supabase
2. You should see:
   - ✅ `users` table
   - ✅ `orders` table
   - ✅ `requests` table
   - ✅ `request_notes` table

## 🚨 Troubleshooting White Screen

If you see a white screen, check:

1. **Environment Variables** - Make sure `.env` file has:
   ```env
   VITE_SUPABASE_URL=https://bdquuixqypkmbvvfymvm.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXV1aXhxeXBrbWJ2dmZ5bXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODgxNTQsImV4cCI6MjA4MDg2NDE1NH0.XK5oL2CyL_9-PGpDRjm1Mj4QPDGIqO-DIcNxZtQ0vIA
   ```

2. **Database Tables** - Make sure all tables are created (see above)

3. **Browser Console** - Open browser DevTools (F12) and check for errors:
   - Look for red error messages
   - Check if Supabase connection is working

4. **Restart Dev Server** - After updating `.env`, restart:
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

## 📝 Quick Checklist

- [ ] `.env` file exists with correct credentials
- [ ] `database_schema.sql` has been run
- [ ] Main application tables (users, orders) have been created
- [ ] Test users created in Authentication
- [ ] Test users linked to `users` table
- [ ] Development server restarted after `.env` changes
- [ ] Browser console checked for errors

## 🆘 Still Having Issues?

1. **Check browser console** (F12 → Console tab) for specific error messages
2. **Check Network tab** (F12 → Network) to see if API calls are failing
3. **Verify Supabase project is active** - Make sure your project isn't paused
4. **Check Row Level Security** - Make sure policies allow your operations

---

**Remember**: After making any changes to `.env`, you MUST restart your development server!

