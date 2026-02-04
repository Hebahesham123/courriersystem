// URGENT: Clean up all removed items from database
// Run this script to immediately delete all removed items

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupRemovedItems() {
  console.log('\n🧹 URGENT: Cleaning up ALL removed items from database...\n');
  
  try {
    // First, count removed items
    const { data: removedItems, error: countError } = await supabase
      .from('order_items')
      .select('id, title, order_id, is_removed, quantity, fulfillment_status, properties')
      .or('is_removed.eq.true,quantity.eq.0,fulfillment_status.eq.removed');
    
    if (countError) {
      console.error('❌ Error counting removed items:', countError);
      return;
    }
    
    console.log(`📊 Found ${removedItems?.length || 0} removed items to delete`);
    
    if (removedItems && removedItems.length > 0) {
      // Show some examples
      console.log('\n📋 Examples of items to be deleted:');
      removedItems.slice(0, 10).forEach((item, idx) => {
        console.log(`   ${idx + 1}. "${item.title}" (Order ID: ${item.order_id}, is_removed: ${item.is_removed}, quantity: ${item.quantity})`);
      });
      if (removedItems.length > 10) {
        console.log(`   ... and ${removedItems.length - 10} more`);
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
      console.log('✅ Database is now clean - removed items will not appear in the system');
    } else {
      console.log('✅ No removed items found - database is already clean!');
    }
    
    // Verify cleanup
    const { data: remainingRemoved, error: verifyError } = await supabase
      .from('order_items')
      .select('id')
      .or('is_removed.eq.true,quantity.eq.0,fulfillment_status.eq.removed')
      .limit(1);
    
    if (verifyError) {
      console.warn('⚠️ Could not verify cleanup:', verifyError);
    } else if (remainingRemoved && remainingRemoved.length > 0) {
      console.warn(`⚠️ WARNING: ${remainingRemoved.length} removed items still remain. Please check manually.`);
    } else {
      console.log('✅ Verification: No removed items remain in database');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

cleanupRemovedItems().catch(console.error);

