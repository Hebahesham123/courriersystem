-- Simple Fix for Courier DELETE Permission
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Check current RLS policies
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'orders' 
ORDER BY policyname;

-- Step 2: Remove any existing DELETE policies for couriers
DROP POLICY IF EXISTS "Couriers can delete duplicated orders" ON orders;
DROP POLICY IF EXISTS "Couriers can delete orders" ON orders;

-- Step 3: Create a simple DELETE policy for couriers
CREATE POLICY "Couriers can delete duplicated orders" ON orders
  FOR DELETE TO authenticated
  USING (
    -- Check if user is a courier
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

-- Step 4: Verify the policy was created
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'orders' 
AND policyname = 'Couriers can delete duplicated orders';

-- Step 5: Test if the policy works (this should not return an error)
-- The policy should now allow couriers to delete duplicated orders
