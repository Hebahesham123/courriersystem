// Simple Split Payments Test
// Run this in your browser console on the dashboard page

async function testSplitPaymentsSimple() {
  console.log('=== SIMPLE SPLIT PAYMENTS TEST ===')
  
  try {
    // Test 1: Check if split_payments table exists and has data
    console.log('1. Checking split_payments table...')
    const { data: splitPayments, error: splitError } = await supabase
      .from('split_payments')
      .select('*')
    
    if (splitError) {
      console.error('❌ split_payments table error:', splitError)
      return
    }
    
    console.log(`✅ Found ${splitPayments?.length || 0} split payments in database:`, splitPayments)
    
    // Test 2: Check orders with split_payments
    console.log('2. Checking orders with split_payments...')
    const { data: ordersWithSplits, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id, 
        order_id, 
        payment_method, 
        total_order_fees,
        split_payments (id, payment_method, amount, created_at, created_by, notes)
      `)
      .not('split_payments', 'is', null)
    
    if (ordersError) {
      console.error('❌ Error fetching orders with splits:', ordersError)
      return
    }
    
    console.log(`✅ Found ${ordersWithSplits?.length || 0} orders with split_payments:`, ordersWithSplits)
    
    // Test 3: Check specific order from your example
    console.log('3. Checking specific order (yasmine abo...)...')
    const { data: specificOrder, error: specificError } = await supabase
      .from('orders')
      .select(`
        id, 
        order_id, 
        payment_method, 
        total_order_fees,
        split_payments (id, payment_method, amount, created_at, created_by, notes)
      `)
      .ilike('customer_name', '%yasmine%')
      .limit(1)
    
    if (specificError) {
      console.error('❌ Error fetching specific order:', specificError)
      return
    }
    
    if (specificOrder && specificOrder.length > 0) {
      const order = specificOrder[0]
      console.log('✅ Specific order found:', order)
      console.log('Payment method:', order.payment_method)
      console.log('Split payments:', order.split_payments)
      
      if (order.split_payments && order.split_payments.length > 0) {
        console.log('Split payment breakdown:')
        order.split_payments.forEach((split, index) => {
          console.log(`  ${index + 1}. ${split.payment_method}: ${split.amount} EGP`)
        })
      }
    } else {
      console.log('❌ Specific order not found')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
  
  console.log('=== TEST COMPLETE ===')
}

// Run the test
testSplitPaymentsSimple()
