/**
 * FORCE RESYNC ALL ORDERS FROM SHOPIFY
 * 
 * This script will re-sync ALL orders from Shopify to ensure items match exactly.
 * Run this when you need to ensure all orders are in sync with Shopify.
 * 
 * Usage:
 *   node FORCE_RESYNC_ALL_ORDERS.js
 * 
 * Or import and use in your sync server:
 *   import { forceResyncAllOrders } from './FORCE_RESYNC_ALL_ORDERS.js';
 *   await forceResyncAllOrders();
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Try multiple possible variable names for Supabase URL
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Check if required variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('\nRequired variables:');
  console.error('  - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
  console.error('\nPlease create a .env file with these values.');
  console.error('See ENV_SETUP_GUIDE.md for instructions.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

// Check if Shopify variables are set
if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
  console.error('❌ Missing Shopify environment variables!');
  console.error('\nRequired variables:');
  console.error('  - SHOPIFY_STORE_URL');
  console.error('  - SHOPIFY_ACCESS_TOKEN');
  console.error('\nPlease add these to your .env file.');
  console.error('See ENV_SETUP_GUIDE.md for instructions.');
  process.exit(1);
}

/**
 * Force re-sync all orders from Shopify
 * This will fetch all orders and update them to match Shopify exactly
 */
async function forceResyncAllOrders() {
  console.log('🔄 Starting FORCE RESYNC of all orders from Shopify...');
  console.log('⚠️  This will update ALL orders to match Shopify exactly\n');

  try {
    // 1. Get all orders that have shopify_order_id
    const { data: existingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, shopify_order_id, order_id')
      .not('shopify_order_id', 'is', null)
      .is('base_order_id', null); // Only base orders

    if (fetchError) {
      throw new Error(`Error fetching orders: ${fetchError.message}`);
    }

    console.log(`📦 Found ${existingOrders.length} orders with Shopify IDs to re-sync\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // 2. Fetch each order from Shopify and sync
    for (let i = 0; i < existingOrders.length; i++) {
      const order = existingOrders[i];
      const progress = `[${i + 1}/${existingOrders.length}]`;

      try {
        console.log(`${progress} Syncing order ${order.order_id} (Shopify ID: ${order.shopify_order_id})...`);

        // Fetch order from Shopify
        const storeUrl = SHOPIFY_STORE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const url = `https://${storeUrl}/admin/api/${SHOPIFY_API_VERSION}/orders/${order.shopify_order_id}.json`;

        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.status}`);
        }

        const data = await response.json();
        const shopifyOrder = data.order;

        if (!shopifyOrder) {
          throw new Error('Order not found in Shopify');
        }

        // Sync directly - call the sync server endpoint
        // First, try to start the sync server or use it if running
        const syncUrl = process.env.SYNC_SERVER_URL || 'http://localhost:3002';
        
        try {
          const syncResponse = await fetch(`${syncUrl}/api/shopify/sync-order/${order.shopify_order_id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 second timeout
          });

          if (syncResponse.ok) {
            successCount++;
            console.log(`  ✅ Synced successfully\n`);
          } else {
            const errorText = await syncResponse.text();
            throw new Error(`Sync failed: ${errorText}`);
          }
        } catch (fetchError) {
          // If server is not running, provide helpful error message
          if (fetchError.code === 'ECONNREFUSED' || fetchError.message.includes('ECONNREFUSED')) {
            throw new Error('Sync server is not running. Please start it with: npm run shopify-sync');
          }
          throw fetchError;
        }

        // Small delay to avoid rate limiting
        if (i < existingOrders.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        errorCount++;
        const errorMsg = `  ❌ Error syncing order ${order.order_id}: ${error.message}`;
        console.error(errorMsg);
        errors.push({ order_id: order.order_id, shopify_order_id: order.shopify_order_id, error: error.message });
      }
    }

    // 3. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully synced: ${successCount} orders`);
    console.log(`❌ Errors: ${errorCount} orders`);
    console.log(`📦 Total processed: ${existingOrders.length} orders`);

    if (errors.length > 0) {
      console.log('\n❌ Errors details:');
      errors.forEach(err => {
        console.log(`  - Order ${err.order_id} (Shopify ID: ${err.shopify_order_id}): ${err.error}`);
      });
    }

    console.log('\n✅ Force resync completed!\n');

    return {
      success: true,
      total: existingOrders.length,
      successful: successCount,
      errors: errorCount,
      errorDetails: errors
    };

  } catch (error) {
    console.error('❌ Fatal error during force resync:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('FORCE_RESYNC_ALL_ORDERS.js')) {
  forceResyncAllOrders()
    .then(result => {
      console.log('Result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { forceResyncAllOrders };

