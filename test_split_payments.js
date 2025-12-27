// Test Split Payments Functionality
// Run this in your browser console on the dashboard page

async function testSplitPayments() {
  console.log('=== TESTING SPLIT PAYMENTS ===')
  
  try {
    // Test 1: Check if split_payments table exists
    console.log('1. Testing split_payments table...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('split_payments')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('❌ split_payments table error:', tableError)
      return
    }
    console.log('✅ split_payments table accessible')
    
    // Test 2: Check if any orders have payment_method = 'split'
    console.log('2. Testing orders with split payment method...')
    const { data: splitOrders, error: splitError } = await supabase
      .from('orders')
      .select('id, order_id, payment_method, total_order_fees')
      .eq('payment_method', 'split')
    
    if (splitError) {
      console.error('❌ Error fetching split orders:', splitError)
      return
    }
    
    console.log(`✅ Found ${splitOrders?.length || 0} orders with split payment method:`, splitOrders)
    
    // Test 3: Check split payments for these orders
    if (splitOrders && splitOrders.length > 0) {
      console.log('3. Testing split payments data...')
      const orderId = splitOrders[0].id
      
      const { data: splitPayments, error: paymentsError } = await supabase
        .from('split_payments')
        .select('*')
        .eq('order_id', orderId)
      
      if (paymentsError) {
        console.error('❌ Error fetching split payments:', paymentsError)
        return
      }
      
      console.log(`✅ Found ${splitPayments?.length || 0} split payments for order ${orderId}:`, splitPayments)
      
      // Test 4: Calculate totals
      if (splitPayments && splitPayments.length > 0) {
        const orderTotal = splitOrders[0].total_order_fees
        const splitTotal = splitPayments.reduce((sum, sp) => sum + Number(sp.amount), 0)
        
        console.log('4. Testing totals calculation...')
        console.log(`Order total: ${orderTotal}`)
        console.log(`Split payments total: ${splitTotal}`)
        console.log(`Match: ${Math.abs(orderTotal - splitTotal) < 0.01 ? '✅' : '❌'}`)
        
        // Test 5: Group by payment method
        const paymentMethodTotals = {}
        splitPayments.forEach(sp => {
          const method = sp.payment_method
          paymentMethodTotals[method] = (paymentMethodTotals[method] || 0) + Number(sp.amount)
        })
        
        console.log('5. Payment method breakdown:', paymentMethodTotals)
      }
    }
    
    // Test 6: Check if orders are being fetched with split_payments
    console.log('6. Testing orders fetch with split_payments...')
    const { data: ordersWithSplits, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id, 
        order_id, 
        payment_method, 
        total_order_fees,
        split_payments (id, payment_method, amount, created_at, created_by, notes)
      `)
      .limit(5)
    
    if (fetchError) {
      console.error('❌ Error fetching orders with splits:', fetchError)
      return
    }
    
    console.log('✅ Orders fetched with split_payments:', ordersWithSplits)
    
    // Test 7: Check for orders that should have split payments but don't
    const ordersNeedingSplits = ordersWithSplits.filter(o => 
      o.payment_method === 'split' && (!o.split_payments || o.split_payments.length === 0)
    )
    
    if (ordersNeedingSplits.length > 0) {
      console.warn('⚠️ Orders marked as split but have no split payments:', ordersNeedingSplits)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
  
  console.log('=== TEST COMPLETE ===')
}

// Run the test
testSplitPayments()
