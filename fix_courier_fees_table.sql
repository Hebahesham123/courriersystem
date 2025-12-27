-- Fix Courier Fees Table - Add Missing Columns
-- Run this SQL in your Supabase SQL editor to fix the table structure

-- First, let's check what columns currently exist
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'courier_fees'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
ALTER TABLE courier_fees 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_courier_fees_courier_id ON courier_fees(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_fees_fee_date ON courier_fees(fee_date);
CREATE INDEX IF NOT EXISTS idx_courier_fees_is_active ON courier_fees(is_active);
CREATE INDEX IF NOT EXISTS idx_courier_fees_courier_date ON courier_fees(courier_id, fee_date);

-- Create the function for updating timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION update_courier_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_courier_fees_updated_at ON courier_fees;
CREATE TRIGGER update_courier_fees_updated_at 
    BEFORE UPDATE ON courier_fees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_courier_fees_updated_at();

-- Add unique constraint if it doesn't exist
-- First, drop any existing constraint with the same name
ALTER TABLE courier_fees DROP CONSTRAINT IF EXISTS courier_fees_courier_id_fee_date_is_active_key;

-- Add the unique constraint
ALTER TABLE courier_fees 
ADD CONSTRAINT courier_fees_courier_id_fee_date_is_active_key 
UNIQUE (courier_id, fee_date, is_active);

-- Enable RLS if not already enabled
ALTER TABLE courier_fees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage courier fees" ON courier_fees;
DROP POLICY IF EXISTS "Couriers can read own fees" ON courier_fees;

-- Create policies for RLS
-- Admin users can do everything with courier fees
CREATE POLICY "Admin can manage courier fees" ON courier_fees
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Couriers can read their own fees
CREATE POLICY "Couriers can read own fees" ON courier_fees
    FOR SELECT TO authenticated
    USING (courier_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON courier_fees TO authenticated;

-- Verify the final table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'courier_fees'
ORDER BY ordinal_position;

-- Check if the unique constraint was created
SELECT 
    constraint_name, 
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'courier_fees' 
AND constraint_type = 'UNIQUE';

-- Check if indexes were created
SELECT 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename = 'courier_fees';
