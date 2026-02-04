import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrder42021() {
  console.log('\n🔍 Checking Order #42021...\n');

  // Find order in database
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_id, shopify_order_id, total_order_fees, subtotal_price')
    .or('order_id.eq.#42021,order_id.eq.42021')
    .is('base_order_id', null)
    .maybeSingle();

  if (error || !order) {
    console.error('❌ Order not found:', error);
    return;
  }

  console.log(`✅ Found order: ${order.order_id}`);
  console.log(`   Shopify ID: ${order.shopify_order_id}`);
  console.log(`   Total: ${order.total_order_fees}\n`);

  if (!order.shopify_order_id) {
    console.error('❌ Order has no Shopify ID');
    return;
  }

  // Fetch from Shopify
  const url = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/orders/${order.shopify_order_id}.json`;
  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`❌ Shopify API error: ${response.status}`);
    return;
  }

  const data = await response.json();
  const shopifyOrder = data.order;

  console.log(`✅ Fetched from Shopify: ${shopifyOrder.name}`);
  console.log(`   Shopify Total: ${shopifyOrder.current_total_price || shopifyOrder.total_price}`);
  console.log(`   Shopify Subtotal: ${shopifyOrder.current_subtotal_price || shopifyOrder.subtotal_price}`);
  console.log(`   Line Items: ${shopifyOrder.line_items?.length || 0}\n`);

  // Get items from database
  const { data: dbItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);

  console.log(`📋 SHOPIFY LINE ITEMS (${shopifyOrder.line_items?.length || 0}):`);
  (shopifyOrder.line_items || []).forEach((item, i) => {
    const isRemoved = item.quantity === 0 || 
                     item.fulfillment_status === 'removed' ||
                     (item.properties && item.properties._is_removed);
    console.log(`\n  ${i + 1}. "${item.title}"`);
    console.log(`     ID: ${item.id}`);
    console.log(`     Quantity: ${item.quantity}`);
    console.log(`     Price: ${item.price}`);
    console.log(`     Fulfillment: ${item.fulfillment_status || 'null'}`);
    console.log(`     Properties: ${JSON.stringify(item.properties || [])}`);
    console.log(`     ⚠️  Should be REMOVED: ${isRemoved ? 'YES ✅' : 'NO ❌'}`);
  });

  console.log(`\n📋 DATABASE ITEMS (${dbItems?.length || 0}):`);
  (dbItems || []).forEach((item, i) => {
    console.log(`\n  ${i + 1}. "${item.title}"`);
    console.log(`     DB ID: ${item.id}`);
    console.log(`     Shopify ID: ${item.shopify_line_item_id}`);
    console.log(`     Quantity: ${item.quantity}`);
    console.log(`     Price: ${item.price}`);
    console.log(`     is_removed: ${item.is_removed}`);
    console.log(`     fulfillment_status: ${item.fulfillment_status || 'null'}`);
    console.log(`     ⚠️  IS REMOVED: ${item.is_removed ? 'YES ✅' : 'NO ❌'}`);
  });

  // Compare
  console.log('\n🔍 COMPARISON:');
  const shopifyIds = new Set((shopifyOrder.line_items || []).map(li => String(li.id)));
  const dbIds = new Set((dbItems || []).map(item => item.shopify_line_item_id ? String(item.shopify_line_item_id) : null).filter(Boolean));

  console.log(`   Shopify has: ${shopifyIds.size} items`);
  console.log(`   Database has: ${dbIds.size} items`);

  // Items in DB but not in Shopify
  const missingInShopify = (dbItems || []).filter(item => {
    const id = item.shopify_line_item_id ? String(item.shopify_line_item_id) : null;
    return id && !shopifyIds.has(id);
  });

  if (missingInShopify.length > 0) {
    console.log(`\n   🗑️  Items in DB but NOT in Shopify (${missingInShopify.length}):`);
    missingInShopify.forEach(item => {
      console.log(`      - "${item.title}" (Shopify ID: ${item.shopify_line_item_id})`);
      console.log(`        is_removed: ${item.is_removed}`);
    });
  }

  // Items that should be marked as removed
  const shouldBeRemoved = (shopifyOrder.line_items || []).filter(item => {
    return item.quantity === 0 || item.fulfillment_status === 'removed';
  });

  if (shouldBeRemoved.length > 0) {
    console.log(`\n   🗑️  Items in Shopify that SHOULD be removed (${shouldBeRemoved.length}):`);
    shouldBeRemoved.forEach(item => {
      const dbItem = (dbItems || []).find(db => String(db.shopify_line_item_id) === String(item.id));
      console.log(`      - "${item.title}" (ID: ${item.id}, Qty: ${item.quantity})`);
      console.log(`        is_removed in DB: ${dbItem?.is_removed || 'NOT FOUND'}`);
      if (dbItem && !dbItem.is_removed) {
        console.log(`        ❌ PROBLEM: Should be marked as removed!`);
      }
    });
  }
}

checkOrder42021();

