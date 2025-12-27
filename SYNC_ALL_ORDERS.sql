-- Sync All Orders from Shopify
-- This will reset the sync state to fetch all orders from the beginning

-- Option 1: Reset last_synced_at to a very old date (will sync all orders)
UPDATE shopify_sync_state
SET 
  last_synced_at = '2020-01-01T00:00:00Z'::timestamptz,
  last_sync_status = NULL,
  last_sync_error = NULL,
  updated_at = now()
WHERE id = 1;

-- After running this, the next cron job (or manual sync) will fetch ALL orders from Shopify
-- This might take a while if you have many orders

-- Option 2: Or manually trigger sync to fetch all orders now
-- The function will use the old date and fetch everything

