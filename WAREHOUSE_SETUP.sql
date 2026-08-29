-- =============================================================================
-- Warehouse role ("المخزن") + Returns receipt tracking
--
-- Run this whole file once in the Supabase SQL Editor BEFORE creating the
-- warehouse accounts. It:
--   1) allows the new 'warehouse' role on the users table
--   2) adds columns to record whether the warehouse physically received an order
--   3) adds RLS policies so warehouse users can read orders / proofs and tick
--      the "received" checkbox
-- =============================================================================

-- 1) Allow role = 'warehouse' -------------------------------------------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'courier', 'warehouse'));


-- 2) Warehouse receipt columns on orders -------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warehouse_received      boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warehouse_received_at   timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warehouse_received_by   text;

CREATE INDEX IF NOT EXISTS idx_orders_warehouse_received ON orders(warehouse_received);


-- 3) RLS policies for the warehouse role -------------------------------------
-- Warehouse staff can READ every order and UPDATE them (the UI only exposes the
-- "received" toggle). Additive to the existing admin/courier policies.
DROP POLICY IF EXISTS "Warehouse can read orders"   ON orders;
DROP POLICY IF EXISTS "Warehouse can update orders" ON orders;

CREATE POLICY "Warehouse can read orders" ON orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'warehouse'));

CREATE POLICY "Warehouse can update orders" ON orders
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'warehouse'));

-- Let warehouse staff view courier-uploaded proof images
DROP POLICY IF EXISTS "Warehouse can read order proofs" ON order_proofs;
CREATE POLICY "Warehouse can read order proofs" ON order_proofs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'warehouse'));

-- Verify
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'users'::regclass AND conname = 'users_role_check';
