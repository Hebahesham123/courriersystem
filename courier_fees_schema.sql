-- Courier Fees Schema
-- Run this SQL in your Supabase SQL editor to implement individual fees for each courier

-- Create courier_fees table to store individual fees for each courier
CREATE TABLE IF NOT EXISTS courier_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    courier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fee_amount numeric NOT NULL DEFAULT 0,
    fee_date date NOT NULL DEFAULT CURRENT_DATE,
    is_active boolean NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one active fee per courier per date
    UNIQUE(courier_id, fee_date, is_active)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courier_fees_courier_id ON courier_fees(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_fees_fee_date ON courier_fees(fee_date);
CREATE INDEX IF NOT EXISTS idx_courier_fees_is_active ON courier_fees(is_active);
CREATE INDEX IF NOT EXISTS idx_courier_fees_courier_date ON courier_fees(courier_id, fee_date);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_courier_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_courier_fees_updated_at 
    BEFORE UPDATE ON courier_fees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_courier_fees_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE courier_fees ENABLE ROW LEVEL SECURITY;

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

-- Insert sample courier fees data (optional - replace with actual courier IDs)
-- You can run this after creating some courier users
/*
INSERT INTO courier_fees (courier_id, fee_amount, fee_date, created_by) VALUES
('courier-uuid-1', 5.00, CURRENT_DATE, 'admin-uuid'),
('courier-uuid-2', 4.50, CURRENT_DATE, 'admin-uuid'),
('courier-uuid-3', 6.00, CURRENT_DATE, 'admin-uuid');
*/

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'courier_fees'
ORDER BY ordinal_position;
