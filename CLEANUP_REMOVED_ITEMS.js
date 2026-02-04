// Script to delete all removed items from order_items table
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupRemovedItems() {
  console.log('\n🧹 Cleaning up removed items from order_items table...\n');
  
  // First, count removed items
  const { data: removedItems, error: countError } = await supabase
    .from('order_items')
    .select('id, title, order_id, is_removed, quantity, fulfillment_status')
    .or('is_removed.eq.true,quantity.eq.0,fulfillment_status.eq.removed');
  
  if (countError) {
    console.error('❌ Error counting removed items:', countError);
    return;
  }
  
  console.log(`📊 Found ${removedItems?.length || 0} removed items to delete`);
  
  if (removedItems && removedItems.length > 0) {
    // Show some examples
    console.log('\n📋 Examples of items to be deleted:');
    removedItems.slice(0, 5).forEach((item, idx) => {
      console.log(`   ${idx + 1}. "${item.title}" (Order ID: ${item.order_id}, is_removed: ${item.is_removed}, quantity: ${item.quantity})`);
    });
    if (removedItems.length > 5) {
      console.log(`   ... and ${removedItems.length - 5} more`);
    }
    
    // Delete all removed items
    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .or('is_removed.eq.true,quantity.eq.0,fulfillment_status.eq.removed');
    
    if (deleteError) {
      console.error('❌ Error deleting removed items:', deleteError);
      return;
    }
    
    console.log(`\n✅ Successfully deleted ${removedItems.length} removed items`);
  } else {
    console.log('✅ No removed items found - database is clean!');
  }
}

cleanupRemovedItems().catch(console.error);

