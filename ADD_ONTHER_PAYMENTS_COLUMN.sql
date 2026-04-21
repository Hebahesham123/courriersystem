-- Adds onther_payments column to orders so the COURIER can split the collected amount
-- across multiple payment methods (e.g. 2000 cash + 1500 instapay + 500 wallet).
-- Run once in the Supabase SQL editor.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS onther_payments jsonb;

COMMENT ON COLUMN orders.onther_payments IS
  'Array of { method, amount } entries for courier-side split payments. Used when payment_sub_type = ''onther''.';
