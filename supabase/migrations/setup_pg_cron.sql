-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing cron job if it exists
SELECT cron.unschedule('shopify-sync-every-5-min') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'shopify-sync-every-5-min'
);

-- Schedule cron job to run every 5 minutes
-- IMPORTANT: Replace YOUR_ANON_KEY with your actual Supabase anon key
-- Get it from: Dashboard → Settings → API → anon/public key
SELECT cron.schedule(
  'shopify-sync-every-5-min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://bdquuixqypkmbvvfymvm.supabase.co/functions/v1/shopify-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_ANON_KEY_HERE',
        'apikey', 'YOUR_ANON_KEY_HERE'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Verify cron job is scheduled
SELECT * FROM cron.job WHERE jobname = 'shopify-sync-every-5-min';

