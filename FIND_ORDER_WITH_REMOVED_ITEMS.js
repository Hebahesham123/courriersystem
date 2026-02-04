import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findOrdersWithRemovedItems() {
  console.log('\n🔍 Finding orders with removed items...\n');

  try {
    // Get all orders that have Shopify IDs
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_id, shopify_order_id')
      .not('shopify_order_id', 'is', null)
      .is('base_order_id', null)
      .limit(10);

    if (error) {
      console.error('❌ Error fetching orders:', error);
      return;
    }

    console.log(`✅ Found ${orders?.length || 0} orders with Shopify IDs\n`);

    // Check each order for removed items
    for (const order of orders || []) {
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      if (itemsError) continue;

      const removedItems = (items || []).filter(item => item.is_removed === true);
      const totalItems = (items || []).length;

      if (removedItems.length > 0 || totalItems > 0) {
        console.log(`📦 Order: ${order.order_id} (Shopify ID: ${order.shopify_order_id})`);
        console.log(`   Total items: ${totalItems}`);
        console.log(`   Removed items: ${removedItems.length}`);
        
        if (removedItems.length > 0) {
          console.log(`   🗑️  Removed items:`);
          removedItems.forEach(item => {
            console.log(`      - "${item.title}" (is_removed: ${item.is_removed}, quantity: ${item.quantity})`);
          });
        }
        
        if (totalItems > 0 && removedItems.length === 0) {
          console.log(`   ⚠️  Has items but none marked as removed`);
          console.log(`   Items:`);
          (items || []).forEach(item => {
            console.log(`      - "${item.title}" (is_removed: ${item.is_removed}, quantity: ${item.quantity}, shopify_id: ${item.shopify_line_item_id})`);
          });
        }
        console.log('');
      }
    }

    // Show first order with Shopify ID for testing
    if (orders && orders.length > 0) {
      const firstOrder = orders[0];
      console.log(`\n💡 To check a specific order, run:`);
      console.log(`   node CHECK_REMOVED_ITEMS.js ${firstOrder.shopify_order_id}`);
      console.log(`\n   Or use any of these Shopify Order IDs:`);
      orders.slice(0, 5).forEach(order => {
        console.log(`   - ${order.shopify_order_id} (Order: ${order.order_id})`);
      });
    }

  } catch (error) {
    console.error(`❌ Error:`, error);
  }
}

findOrdersWithRemovedItems();

