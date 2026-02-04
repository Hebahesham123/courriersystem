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

async function fetchShopifyOrder(orderId) {
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
  return data.order;
}

async function checkRemovedItems(shopifyOrderId) {
  console.log(`\n🔍 Checking removed items for order: ${shopifyOrderId}\n`);

  try {
    // Fetch from Shopify
    const shopifyOrder = await fetchShopifyOrder(shopifyOrderId);
    console.log(`✅ Fetched order from Shopify: ${shopifyOrder.name || shopifyOrder.id}`);
    console.log(`   Shopify has ${shopifyOrder.line_items?.length || 0} line items\n`);

    // Fetch from database
    const { data: dbOrder, error: orderError } = await supabase
      .from('orders')
      .select('id, shopify_order_id, order_id')
      .eq('shopify_order_id', String(shopifyOrderId))
      .is('base_order_id', null)
      .maybeSingle();

    if (orderError || !dbOrder) {
      console.error(`❌ Order not found in database:`, orderError);
      return;
    }

    console.log(`✅ Found order in database: ${dbOrder.order_id} (DB ID: ${dbOrder.id})\n`);

    // Fetch items from database
    const { data: dbItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', dbOrder.id)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error(`❌ Error fetching items:`, itemsError);
      return;
    }

    console.log(`✅ Found ${dbItems?.length || 0} items in database\n`);

    // Analyze Shopify items
    console.log('📋 SHOPIFY LINE ITEMS:');
    shopifyOrder.line_items.forEach((item, index) => {
      const isRemoved = item.quantity === 0 || 
                       item.fulfillment_status === 'removed' ||
                       (item.properties && item.properties._is_removed) ||
                       item.cancelled === true;
      
      console.log(`\n  Item ${index + 1}: "${item.title}"`);
      console.log(`    Shopify ID: ${item.id}`);
      console.log(`    Quantity: ${item.quantity}`);
      console.log(`    Price: ${item.price}`);
      console.log(`    Fulfillment Status: ${item.fulfillment_status || 'null'}`);
      console.log(`    Properties:`, JSON.stringify(item.properties || {}));
      console.log(`    Cancelled: ${item.cancelled || false}`);
      console.log(`    Fulfillable Quantity: ${item.fulfillable_quantity !== undefined ? item.fulfillable_quantity : 'N/A'}`);
      console.log(`    ⚠️  DETECTED AS REMOVED: ${isRemoved ? 'YES ✅' : 'NO ❌'}`);
      console.log(`    All Keys:`, Object.keys(item).join(', '));
    });

    // Analyze Database items
    console.log('\n\n📋 DATABASE ORDER ITEMS:');
    (dbItems || []).forEach((item, index) => {
      console.log(`\n  Item ${index + 1}: "${item.title}"`);
      console.log(`    DB ID: ${item.id}`);
      console.log(`    Shopify Line Item ID: ${item.shopify_line_item_id || 'N/A'}`);
      console.log(`    Quantity: ${item.quantity}`);
      console.log(`    Price: ${item.price}`);
      console.log(`    is_removed: ${item.is_removed}`);
      console.log(`    fulfillment_status: ${item.fulfillment_status || 'null'}`);
      console.log(`    properties:`, JSON.stringify(item.properties || {}));
      console.log(`    ⚠️  IS REMOVED IN DB: ${item.is_removed ? 'YES ✅' : 'NO ❌'}`);
    });

    // Compare
    console.log('\n\n🔍 COMPARISON:');
    const shopifyItemIds = new Set(shopifyOrder.line_items.map(li => String(li.id)));
    const dbItemIds = new Set((dbItems || []).map(item => item.shopify_line_item_id ? String(item.shopify_line_item_id) : null).filter(Boolean));

    console.log(`\n  Shopify Item IDs: ${Array.from(shopifyItemIds).join(', ')}`);
    console.log(`  Database Item IDs: ${Array.from(dbItemIds).join(', ')}`);

    // Find items in DB but not in Shopify
    const missingInShopify = (dbItems || []).filter(item => {
      const shopifyId = item.shopify_line_item_id ? String(item.shopify_line_item_id) : null;
      return shopifyId && !shopifyItemIds.has(shopifyId);
    });

    if (missingInShopify.length > 0) {
      console.log(`\n  🗑️  Items in DB but NOT in Shopify (should be marked as removed):`);
      missingInShopify.forEach(item => {
        console.log(`    - "${item.title}" (Shopify ID: ${item.shopify_line_item_id})`);
        console.log(`      is_removed in DB: ${item.is_removed}`);
      });
    }

    // Find items in Shopify that should be marked as removed
    const shouldBeRemoved = shopifyOrder.line_items.filter(item => {
      return item.quantity === 0 || 
             item.fulfillment_status === 'removed' ||
             (item.properties && item.properties._is_removed) ||
             item.cancelled === true;
    });

    if (shouldBeRemoved.length > 0) {
      console.log(`\n  🗑️  Items in Shopify that SHOULD be marked as removed:`);
      shouldBeRemoved.forEach(item => {
        const dbItem = (dbItems || []).find(db => String(db.shopify_line_item_id) === String(item.id));
        console.log(`    - "${item.title}" (Shopify ID: ${item.id})`);
        console.log(`      Quantity: ${item.quantity}`);
        console.log(`      is_removed in DB: ${dbItem?.is_removed || 'NOT FOUND'}`);
        if (dbItem && !dbItem.is_removed) {
          console.log(`      ❌ PROBLEM: Item should be marked as removed but isn't!`);
        }
      });
    }

  } catch (error) {
    console.error(`❌ Error:`, error);
  }
}

// Get order ID from command line
const orderId = process.argv[2];

if (!orderId) {
  console.error('Usage: node CHECK_REMOVED_ITEMS.js <shopify_order_id>');
  console.error('Example: node CHECK_REMOVED_ITEMS.js 1234567890');
  process.exit(1);
}

checkRemovedItems(orderId);

