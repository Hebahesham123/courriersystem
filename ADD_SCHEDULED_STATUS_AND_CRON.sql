-- =============================================================================
-- Scheduled assignments: keep future-dated orders hidden from the confirmation
-- webhook until their day arrives.
--
-- How it works:
--   * When an admin assigns an order to a courier for a FUTURE day, the app writes
--     status = 'scheduled' (instead of 'assigned'). The external system that fires
--     the customer confirmation webhook only reacts to status = 'assigned', so a
--     'scheduled' order stays silent.
--   * A cron job (below) runs regularly and flips every 'scheduled' order whose day
--     has arrived to 'assigned'. That makes the webhook start seeing it, exactly as
--     if it had just been assigned today.
--
-- Run this whole file once in the Supabase SQL Editor.
-- =============================================================================

-- 1) Allow the new 'scheduled' status on the orders table --------------------------
--    (drop whichever status constraint name your DB currently uses, then re-add one
--     that includes every status the app can produce, plus 'scheduled').
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS check_status;

ALTER TABLE orders
ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'pending',
  'assigned',
  'scheduled',
  'delivered',
  'canceled',
  'partial',
  'return',
  'hand_to_hand',
  'receiving_part',
  'deleted'
) OR status IS NULL);


-- 2) Activation cron job ----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- A scheduled order's `assigned_at` holds the day it should go live. Once that
-- calendar day (in local Cairo time) is today or earlier, promote it to 'assigned'.
-- Re-run safe: only touches rows still in 'scheduled'.
SELECT cron.unschedule('activate-scheduled-orders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'activate-scheduled-orders'
);

SELECT cron.schedule(
  'activate-scheduled-orders',
  '*/15 * * * *', -- every 15 minutes
  $$
  UPDATE orders
  SET status = 'assigned',
      updated_at = now()
  WHERE status = 'scheduled'
    AND (assigned_at AT TIME ZONE 'Africa/Cairo')::date
        <= (now() AT TIME ZONE 'Africa/Cairo')::date;
  $$
);

-- Verify the job is scheduled
SELECT jobname, schedule FROM cron.job WHERE jobname = 'activate-scheduled-orders';

-- Optional: activate anything already due right now, without waiting for the cron.
UPDATE orders
SET status = 'assigned',
    updated_at = now()
WHERE status = 'scheduled'
  AND (assigned_at AT TIME ZONE 'Africa/Cairo')::date
      <= (now() AT TIME ZONE 'Africa/Cairo')::date;
