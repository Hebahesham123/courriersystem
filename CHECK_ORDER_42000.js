// Diagnostic script to check order #42000 removed items
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

async function checkOrder42000() {
  console.log(`\n🔍 Checking order #42000 removed items\n`);
  
  // 1. Fetch from Shopify
  const storeUrl = SHOPIFY_STORE_URL.replace(/\/$/, '');
  const url = `https://${storeUrl}/admin/api/${SHOPIFY_API_VERSION}/orders.json?name=42000&limit=1`;
  
  const shopifyResponse = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
  });
  
  if (!shopifyResponse.ok) {
    console.error(`❌ Error fetching from Shopify: ${shopifyResponse.statusText}`);
    return;
  }
  
  const shopifyData = await shopifyResponse.json();
  const shopifyOrder = shopifyData.orders?.[0];
  
  if (!shopifyOrder) {
    console.error(`❌ Order #42000 not found in Shopify`);
    return;
  }
  
  // 2. Fetch from database
  const { data: dbOrder, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_id', '42000')
    .single();
  
  if (error) {
    console.error(`❌ Error fetching from database:`, error);
    return;
  }
  
  // 3. Fetch order_items from database
  const { data: dbItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', dbOrder.id);
  
  if (itemsError) {
    console.error(`❌ Error fetching order items:`, itemsError);
    return;
  }
  
  console.log('📊 SHOPIFY DATA:');
  console.log(`   Order ID: ${shopifyOrder.id}`);
  console.log(`   Order Name: ${shopifyOrder.name}`);
  console.log(`   Subtotal: ${shopifyOrder.subtotal_price || shopifyOrder.current_subtotal_price}`);
  console.log(`   Total: ${shopifyOrder.total_price || shopifyOrder.current_total_price}`);
  console.log(`   Line Items Count: ${shopifyOrder.line_items?.length || 0}`);
  
  console.log('\n📦 SHOPIFY LINE ITEMS:');
  shopifyOrder.line_items?.forEach((item, idx) => {
    const itemTotal = (parseFloat(item.price || 0) * (item.quantity || 0)) - parseFloat(item.total_discount || 0);
    const isRemoved = item.quantity === 0 || 
                     item.fulfillment_status === 'removed' ||
                     (item.properties && (item.properties._is_removed === true || item.properties._is_removed === 'true')) ||
                     item.cancelled === true;
    
    console.log(`   ${idx + 1}. "${item.title}"`);
    console.log(`      ID: ${item.id}`);
    console.log(`      Quantity: ${item.quantity}`);
    console.log(`      Price: ${item.price}`);
    console.log(`      Total: ${itemTotal}`);
    console.log(`      Fulfillment Status: ${item.fulfillment_status || 'null'}`);
    console.log(`      Cancelled: ${item.cancelled || false}`);
    console.log(`      Properties: ${JSON.stringify(item.properties || {})}`);
    console.log(`      Is Removed (by indicators): ${isRemoved}`);
    console.log('');
  });
  
  console.log('\n📊 DATABASE ORDER ITEMS:');
  console.log(`   Total Items: ${dbItems?.length || 0}`);
  
  const removedInDB = dbItems?.filter(i => i.is_removed === true) || [];
  console.log(`   Removed Items Count: ${removedInDB.length}`);
  
  console.log('\n🗑️  REMOVED ITEMS IN DATABASE:');
  removedInDB.forEach((item, idx) => {
    console.log(`   ${idx + 1}. "${item.title}"`);
    console.log(`      Shopify ID: ${item.shopify_line_item_id}`);
    console.log(`      Quantity: ${item.quantity}`);
    console.log(`      Price: ${item.price}`);
    console.log(`      is_removed: ${item.is_removed}`);
    console.log(`      Fulfillment Status: ${item.fulfillment_status || 'null'}`);
    console.log(`      Properties: ${JSON.stringify(item.properties || {})}`);
    console.log('');
  });
  
  // 4. Compare
  const shopifyRemoved = shopifyOrder.line_items?.filter(item => {
    return item.quantity === 0 || 
           item.fulfillment_status === 'removed' ||
           (item.properties && (item.properties._is_removed === true || item.properties._is_removed === 'true')) ||
           item.cancelled === true;
  }) || [];
  
  console.log('\n🔍 COMPARISON:');
  console.log(`   Shopify Removed Count: ${shopifyRemoved.length}`);
  console.log(`   Database Removed Count: ${removedInDB.length}`);
  console.log(`   Match: ${shopifyRemoved.length === removedInDB.length ? '✅' : '❌'}`);
  
  if (shopifyRemoved.length !== removedInDB.length) {
    console.log('\n⚠️  MISMATCH DETECTED!');
    console.log(`   Expected: ${shopifyRemoved.length} removed items`);
    console.log(`   Found in DB: ${removedInDB.length} removed items`);
    
    // Check which items are incorrectly marked as removed
    const shopifyRemovedIds = new Set(shopifyRemoved.map(i => String(i.id)));
    const incorrectlyRemoved = removedInDB.filter(item => {
      return !shopifyRemovedIds.has(String(item.shopify_line_item_id));
    });
    
    if (incorrectlyRemoved.length > 0) {
      console.log(`\n❌ Items incorrectly marked as removed (${incorrectlyRemoved.length}):`);
      incorrectlyRemoved.forEach(item => {
        console.log(`   - "${item.title}" (Shopify ID: ${item.shopify_line_item_id})`);
      });
    }
  }
}

checkOrder42000().catch(console.error);

