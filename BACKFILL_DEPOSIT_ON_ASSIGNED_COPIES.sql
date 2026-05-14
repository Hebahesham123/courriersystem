-- Backfill admin_prepaid_* (deposit) on date-suffixed / assigned order copies
-- from their base order, where the copy has NO deposit but the base DOES.
--
-- Use this after a courier assignment dropped the deposit (e.g. base order
-- shows the deposit but the assigned ##XXXXX-DD copy does not).
--
-- This NEVER clears a deposit. It only fills in missing values from the base.

-- 1) Preview which rows will be updated. Run this first.
SELECT
  c.id                          AS copy_id,
  c.order_id                    AS copy_order_id,
  c.assigned_courier_id,
  c.status,
  b.id                          AS base_id,
  b.order_id                    AS base_order_id,
  b.admin_prepaid_amount        AS base_deposit_amount,
  b.admin_prepaid_method        AS base_deposit_method,
  b.admin_prepaid_at            AS base_deposit_at,
  b.admin_prepaid_by            AS base_deposit_by
FROM orders c
JOIN orders b ON b.id = c.base_order_id
WHERE c.base_order_id IS NOT NULL
  AND b.admin_prepaid_amount IS NOT NULL
  AND (c.admin_prepaid_amount IS NULL OR c.admin_prepaid_amount = 0);

-- 2) Apply the backfill. Uncomment after reviewing the preview.
-- UPDATE orders c
-- SET admin_prepaid_amount = b.admin_prepaid_amount,
--     admin_prepaid_method = b.admin_prepaid_method,
--     admin_prepaid_at     = b.admin_prepaid_at,
--     admin_prepaid_by     = b.admin_prepaid_by,
--     updated_at           = NOW()
-- FROM orders b
-- WHERE c.base_order_id = b.id
--   AND b.admin_prepaid_amount IS NOT NULL
--   AND (c.admin_prepaid_amount IS NULL OR c.admin_prepaid_amount = 0);

-- 3) Verify (should return 0 rows after the update above).
-- SELECT COUNT(*) AS still_missing
-- FROM orders c
-- JOIN orders b ON b.id = c.base_order_id
-- WHERE b.admin_prepaid_amount IS NOT NULL
--   AND (c.admin_prepaid_amount IS NULL OR c.admin_prepaid_amount = 0);
