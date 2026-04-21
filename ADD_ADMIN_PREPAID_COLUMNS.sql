-- Adds admin-side split payment (prepaid portion) columns to orders.
-- Admin records how much was already paid + the method used, courier collects the rest.
-- Run once in the Supabase SQL editor.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS admin_prepaid_amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS admin_prepaid_method text,
  ADD COLUMN IF NOT EXISTS admin_prepaid_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_prepaid_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- Optional sanity check (won't fail if already valid)
-- ALTER TABLE orders
--   ADD CONSTRAINT admin_prepaid_method_check
--   CHECK (
--     admin_prepaid_method IS NULL
--     OR admin_prepaid_method IN ('cash', 'paymob', 'instapay', 'valu', 'card')
--   );

COMMENT ON COLUMN orders.admin_prepaid_amount IS 'Portion of the order total the admin has already collected/recorded as paid';
COMMENT ON COLUMN orders.admin_prepaid_method IS 'Payment method used for the admin prepaid portion (cash, paymob, instapay, valu, card)';
COMMENT ON COLUMN orders.admin_prepaid_at   IS 'When the admin split-payment entry was saved';
COMMENT ON COLUMN orders.admin_prepaid_by   IS 'Admin user who recorded the prepaid portion';
