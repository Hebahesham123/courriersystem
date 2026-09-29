-- =============================================================================
-- Repair role (تصليح) + repair assignment / status tracking
--
-- Run this whole file once in the Supabase SQL Editor BEFORE creating the
-- repair account (create-repair-user.mjs). It:
--   1) allows the new 'repair' role on the users table (keeps admin/courier/warehouse)
--   2) adds repair_* columns to orders (who it's assigned to, the repair status,
--      and the admin "received back" confirmation)
--   3) adds RLS policies so a repair user can read/update ONLY the orders assigned
--      to them, and read proof images
-- =============================================================================

-- 1) Allow role = 'repair' (keep the previously-allowed roles) ----------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'courier', 'warehouse', 'repair'));


-- 2) Repair columns on orders -------------------------------------------------
-- Kept completely separate from assigned_courier_id / status so the delivery
-- flow, settlement and reports are never affected.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS repair_assigned_to        uuid REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS repair_assigned_at        timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS repair_assigned_by        text;
-- repair_status: 'assigned' (admin sent it, not yet received) -> 'received'
--   -> 'in_process' -> 'returned' (repair user done, sent back to admin)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS repair_status             text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS repair_note               text;
-- Admin confirms he physically got the item back after 'returned'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS repair_admin_received     boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS repair_admin_received_at  timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS repair_admin_received_by  text;
-- Which item of a multi-item order is being repaired.
-- NULL  => the whole order is under repair.
-- object => a single line item: { index, title, variant_title, sku, quantity, product_id }
ALTER TABLE orders ADD COLUMN IF NOT EXISTS repair_item               jsonb;
-- Snapshot of the customer request this repair came from (comment / photos /
-- video / notes) so the repair user can see the customer's context.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS repair_request            jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_repair_assigned_to ON orders(repair_assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_repair_status      ON orders(repair_status);


-- 3) RLS policies for the repair role ----------------------------------------
-- A repair user can only see / update orders assigned to THEM (mirrors the
-- courier pattern). Admin already has full access via its FOR ALL policy.
DROP POLICY IF EXISTS "Repair can read assigned orders"   ON orders;
DROP POLICY IF EXISTS "Repair can update assigned orders" ON orders;

CREATE POLICY "Repair can read assigned orders" ON orders
  FOR SELECT TO authenticated
  USING (repair_assigned_to = auth.uid());

CREATE POLICY "Repair can update assigned orders" ON orders
  FOR UPDATE TO authenticated
  USING (repair_assigned_to = auth.uid())
  WITH CHECK (repair_assigned_to = auth.uid());

-- Let repair staff view proof images for their assigned orders
DROP POLICY IF EXISTS "Repair can read order proofs" ON order_proofs;
CREATE POLICY "Repair can read order proofs" ON order_proofs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'repair'));

-- Verify
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'users'::regclass AND conname = 'users_role_check';
