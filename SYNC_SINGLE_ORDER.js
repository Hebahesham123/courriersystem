import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

if (!supabaseUrl || !supabaseServiceKey || !SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Import sync functions from shopify-sync.js
import('./server/shopify-sync.js').then(async (syncModule) => {
  const orderId = process.argv[2];

  if (!orderId) {
    console.error('Usage: node SYNC_SINGLE_ORDER.js <shopify_order_id>');
    console.error('Example: node SYNC_SINGLE_ORDER.js 1234567890');
    process.exit(1);
  }

  try {
    console.log(`\n🔄 Syncing order ${orderId} from Shopify...\n`);

    // Fetch order from Shopify
    const url = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/orders/${orderId}.json`;
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const shopifyOrder = data.order;

    console.log(`✅ Fetched order from Shopify: ${shopifyOrder.name || shopifyOrder.id}`);
    console.log(`   Line items: ${shopifyOrder.line_items?.length || 0}\n`);

    // Check if order exists in database
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('shopify_order_id', String(orderId))
      .is('base_order_id', null)
      .maybeSingle();

    if (!existingOrder) {
      console.error(`❌ Order not found in database. Please sync the order first.`);
      process.exit(1);
    }

    // Use the sync functions directly
    // Note: We need to call convertShopifyOrderToDB and syncOrderItems
    // But these are not exported, so we'll need to replicate the logic or export them
    
    // For now, let's call the sync endpoint if the server is running
    const syncUrl = `http://localhost:3002/api/shopify/sync-order/${orderId}`;
    console.log(`📡 Calling sync endpoint: ${syncUrl}\n`);
    
    const syncResponse = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (syncResponse.ok) {
      const result = await syncResponse.json();
      console.log(`✅ Sync completed successfully!`);
      console.log(`   Result:`, JSON.stringify(result, null, 2));
    } else {
      const errorText = await syncResponse.text();
      console.error(`❌ Sync failed: ${syncResponse.status} ${syncResponse.statusText}`);
      console.error(`   Error: ${errorText}`);
      console.error(`\n⚠️  Make sure the shopify-sync server is running on port 3002`);
      console.error(`   Start it with: node server/shopify-sync.js\n`);
    }

  } catch (error) {
    console.error(`❌ Error:`, error.message);
    if (error.message.includes('fetch failed')) {
      console.error(`\n⚠️  Make sure the shopify-sync server is running on port 3002`);
      console.error(`   Start it with: node server/shopify-sync.js\n`);
    }
  }
}).catch(err => {
  console.error('❌ Error loading sync module:', err);
  console.error('\n⚠️  Alternative: Make sure the shopify-sync server is running');
  console.error('   Start it with: node server/shopify-sync.js');
  console.error('   Then use: curl -X POST http://localhost:3002/api/shopify/sync-order/' + (process.argv[2] || 'ORDER_ID'));
});


