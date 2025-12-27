-- Create Courier Fees Table from Scratch
-- Run this SQL in your Supabase SQL editor to create the complete table

-- Create the courier_fees table
CREATE TABLE IF NOT EXISTS courier_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    courier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fee_amount numeric NOT NULL DEFAULT 0,
    fee_date date NOT NULL DEFAULT CURRENT_DATE,
    is_active boolean NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Add unique constraint to ensure one active fee per courier per date
ALTER TABLE courier_fees 
ADD CONSTRAINT courier_fees_courier_id_fee_date_is_active_key 
UNIQUE (courier_id, fee_date, is_active);

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

-- Verify the table was created successfully
SELECT 
    'Table created successfully!' as status,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'courier_fees';

-- Show the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'courier_fees'
ORDER BY ordinal_position;
