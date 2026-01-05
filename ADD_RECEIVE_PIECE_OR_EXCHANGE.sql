-- RUN THIS IN SUPABASE SQL EDITOR
-- This adds the column to track "استلام قطعه" (receive_piece) and "تبديل" (exchange) status

-- Add column to orders table for receive_piece_or_exchange status
-- Values: NULL (normal order), 'receive_piece' (استلام قطعه), 'exchange' (تبديل)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS receive_piece_or_exchange TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_receive_piece_or_exchange 
ON public.orders(receive_piece_or_exchange);

-- Refresh schema cache after running: 
-- Settings -> API -> Refresh Schema Cache

