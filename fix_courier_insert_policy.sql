-- Fix for Courier Duplicate Order RLS Policy
-- Run this SQL in your Supabase SQL Editor to allow couriers to duplicate and delete orders

-- Add INSERT policy for couriers to create duplicated orders
CREATE POLICY "Couriers can insert duplicated orders" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'courier'
    )
    AND 
    -- Ensure the order is assigned to the courier who is creating it
    assigned_courier_id = auth.uid()
  );

-- Add DELETE policy for couriers to delete duplicated orders
CREATE POLICY "Couriers can delete duplicated orders" ON orders
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'courier'
    )
    AND 
    -- Only allow deletion of duplicated orders
    order_id LIKE '%(نسخة)%'
    AND
    -- Ensure the order is assigned to the courier who is deleting it
    assigned_courier_id = auth.uid()
  );

-- Alternative: More permissive policy if you want couriers to have full INSERT access
-- (uncomment if you want couriers to have full INSERT access)
/*
CREATE POLICY "Couriers can insert orders" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'courier'
    )
  );
*/

-- Verify the policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'orders' 
ORDER BY policyname;
