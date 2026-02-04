// Diagnostic script to check payment sync from Shopify
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

async function checkPaymentSync(shopifyOrderId) {
  console.log(`\n🔍 Checking payment sync for Shopify order: ${shopifyOrderId}\n`);
  
  // 1. Fetch from Shopify
  const storeUrl = SHOPIFY_STORE_URL.replace(/\/$/, '');
  const url = `https://${storeUrl}/admin/api/${SHOPIFY_API_VERSION}/orders/${shopifyOrderId}.json`;
  
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
  const shopifyOrder = shopifyData.order;
  
  // 2. Fetch from database
  const { data: dbOrder, error } = await supabase
    .from('orders')
    .select('*')
    .eq('shopify_order_id', shopifyOrderId)
    .single();
  
  if (error) {
    console.error(`❌ Error fetching from database:`, error);
    return;
  }
  
  // 3. Calculate expected values
  const shopifyTotalPrice = parseFloat(shopifyOrder.current_total_price || shopifyOrder.total_price || 0);
  const shopifyOutstanding = parseFloat(shopifyOrder.total_outstanding || 0);
  const shopifyPaid = shopifyTotalPrice - shopifyOutstanding;
  const hasPartialPayment = shopifyPaid > 0 && shopifyOutstanding > 0;
  
  console.log('📊 SHOPIFY DATA:');
  console.log(`   Total Price: ${shopifyTotalPrice}`);
  console.log(`   Total Outstanding: ${shopifyOutstanding}`);
  console.log(`   Calculated Paid: ${shopifyPaid}`);
  console.log(`   Financial Status: ${shopifyOrder.financial_status}`);
  console.log(`   Has Partial Payment: ${hasPartialPayment}`);
  
  console.log('\n📊 DATABASE DATA:');
  console.log(`   total_order_fees: ${dbOrder.total_order_fees}`);
  console.log(`   total_price: ${dbOrder.total_price}`);
  console.log(`   balance: ${dbOrder.balance}`);
  console.log(`   total_paid: ${dbOrder.total_paid}`);
  console.log(`   partial_paid_amount: ${dbOrder.partial_paid_amount}`);
  console.log(`   payment_status: ${dbOrder.payment_status}`);
  console.log(`   financial_status: ${dbOrder.financial_status}`);
  
  console.log('\n🔍 COMPARISON:');
  console.log(`   Paid Amount Match: ${Math.abs((dbOrder.total_paid || 0) - shopifyPaid) < 0.01 ? '✅' : '❌'} (DB: ${dbOrder.total_paid}, Shopify: ${shopifyPaid})`);
  console.log(`   Balance Match: ${Math.abs((dbOrder.balance || 0) - shopifyOutstanding) < 0.01 ? '✅' : '❌'} (DB: ${dbOrder.balance}, Shopify: ${shopifyOutstanding})`);
  console.log(`   Partial Paid Amount: ${hasPartialPayment ? (dbOrder.partial_paid_amount === shopifyPaid ? '✅' : '❌') : 'N/A'} (DB: ${dbOrder.partial_paid_amount}, Expected: ${hasPartialPayment ? shopifyPaid : 'null'})`);
  
  if (hasPartialPayment && !dbOrder.partial_paid_amount) {
    console.log('\n⚠️  ISSUE DETECTED: Shopify shows partial payment but DB does not have partial_paid_amount set!');
  }
}

// Get order ID from command line or use a test order
const orderId = process.argv[2];
if (!orderId) {
  console.log('Usage: node CHECK_PAYMENT_SYNC.js <shopify_order_id>');
  console.log('Example: node CHECK_PAYMENT_SYNC.js 123456789');
  process.exit(1);
}

checkPaymentSync(orderId).catch(console.error);

