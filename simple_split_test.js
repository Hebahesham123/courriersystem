// Simple Split Payment Test
// Run this in your browser console on the courier orders page

async function testSplitPayment() {
  console.log('=== SIMPLE SPLIT PAYMENT TEST ===')
  
  try {
    // Step 1: Check if split_payments table exists
    console.log('1. Checking split_payments table...')
    const { data, error } = await supabase
      .from('split_payments')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ split_payments table error:', error)
      console.log('The split_payments table does not exist or has permission issues')
      return
    }
    
    console.log('✅ split_payments table exists and is accessible')
    
    // Step 2: Check if any orders have split payments
    console.log('2. Checking for existing split payments...')
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
    
    console.log(`✅ Found ${ordersWithSplits?.length || 0} orders with split payments`)
    
    if (ordersWithSplits && ordersWithSplits.length > 0) {
      console.log('Split payment details:')
      ordersWithSplits.forEach(order => {
        console.log(`Order ${order.order_id}:`)
        order.split_payments?.forEach((split, index) => {
          console.log(`  Split ${index + 1}: ${split.payment_method} - ${split.amount} EGP`)
        })
      })
    } else {
      console.log('No orders with split payments found')
    }
    
    // Step 3: Check payment method totals calculation
    console.log('3. Testing payment method calculation...')
    
    // Simulate the dashboard calculation
    let cashTotal = 0
    let instapayTotal = 0
    
    if (ordersWithSplits && ordersWithSplits.length > 0) {
      ordersWithSplits.forEach(order => {
        if (order.split_payments) {
          order.split_payments.forEach(split => {
            if (split.payment_method === 'cash' || split.payment_method === 'on_hand') {
              cashTotal += Number(split.amount || 0)
            }
            if (split.payment_method === 'instapay') {
              instapayTotal += Number(split.amount || 0)
            }
          })
        }
      })
    }
    
    console.log(`Cash total from split payments: ${cashTotal} EGP`)
    console.log(`Instapay total from split payments: ${instapayTotal} EGP`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
  
  console.log('=== TEST COMPLETE ===')
}

// Run the test
console.log('Running split payment test...')
testSplitPayment()
