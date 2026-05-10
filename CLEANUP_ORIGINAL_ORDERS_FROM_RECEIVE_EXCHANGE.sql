-- Clears receive_piece_or_exchange from all original (اصلي) orders.
-- After this runs, only courier-assigned date-suffixed copies (base_order_id IS NOT NULL)
-- can appear in the استلام قطعه / تبديل screen.
--
-- Run once in the Supabase SQL editor.

-- 1) Preview what will be cleared (run this first to confirm the count is what you expect).
SELECT
  id,
  order_id,
  customer_name,
  receive_piece_or_exchange,
  base_order_id,
  shopify_order_id
FROM orders
WHERE base_order_id IS NULL
  AND receive_piece_or_exchange IN ('receive_piece', 'exchange');

-- 2) Apply the cleanup. Uncomment and run after reviewing the preview above.
-- UPDATE orders
-- SET receive_piece_or_exchange = NULL,
--     updated_at = NOW()
-- WHERE base_order_id IS NULL
--   AND receive_piece_or_exchange IN ('receive_piece', 'exchange');

-- 3) Verify nothing remains (should return 0 rows).
-- SELECT COUNT(*) AS remaining_originals
-- FROM orders
-- WHERE base_order_id IS NULL
--   AND receive_piece_or_exchange IN ('receive_piece', 'exchange');
