// Simple Split Payment Test
// Run this in your browser console on the courier orders page

console.log('=== TESTING SPLIT PAYMENT FUNCTIONALITY ===')

// Step 1: Check if split_payments table exists
async function testSplitPaymentsTable() {
  console.log('1. Testing split_payments table access...')
  
  try {
    const { data, error } = await supabase
      .from('split_payments')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ split_payments table error:', error)
      return false
    }
    
    console.log('✅ split_payments table exists and is accessible')
    return true
  } catch (error) {
    console.error('❌ Error accessing split_payments table:', error)
    return false
  }
}

// Step 2: Test creating a split payment
async function testCreateSplitPayment() {
  console.log('2. Testing split payment creation...')
  
  try {
    // First, get a sample order
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_id, total_order_fees')
      .eq('assigned_courier_id', supabase.auth.user()?.id)
      .limit(1)
    
    if (ordersError || !orders || orders.length === 0) {
      console.error('❌ No orders found for testing')
      return false
    }
    
    const testOrder = orders[0]
    console.log('✅ Found test order:', testOrder.order_id)
    
    // Create a test split payment
    const testSplitPayment = {
      order_id: testOrder.id,
      payment_method: 'cash',
      amount: 1000,
      created_by: supabase.auth.user()?.id,
      notes: 'Test split payment'
    }
    
    console.log('Creating test split payment:', testSplitPayment)
    
    const { data: newSplit, error: createError } = await supabase
      .from('split_payments')
      .insert([testSplitPayment])
      .select()
    
    if (createError) {
      console.error('❌ Error creating split payment:', createError)
      return false
    }
    
    console.log('✅ Test split payment created successfully:', newSplit)
    
    // Clean up - delete the test split payment
    const { error: deleteError } = await supabase
      .from('split_payments')
      .delete()
      .eq('id', newSplit[0].id)
    
    if (deleteError) {
      console.error('❌ Error deleting test split payment:', deleteError)
    } else {
      console.log('✅ Test split payment cleaned up')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error in split payment creation test:', error)
    return false
  }
}

// Step 3: Test dashboard query
async function testDashboardQuery() {
  console.log('3. Testing dashboard query...')
  
  try {
    const { data: ordersWithSplits, error: queryError } = await supabase
      .from('orders')
      .select(`
        id, 
        order_id, 
        payment_method, 
        total_order_fees,
        split_payments (id, payment_method, amount, created_at, created_by, notes)
      `)
      .not('split_payments', 'is', null)
    
    if (queryError) {
      console.error('❌ Error with dashboard query:', queryError)
      return false
    }
    
    console.log(`✅ Dashboard query successful. Found ${ordersWithSplits?.length || 0} orders with split payments`)
    
    if (ordersWithSplits && ordersWithSplits.length > 0) {
      console.log('Sample order with split payments:')
      console.log(ordersWithSplits[0])
    }
    
    return true
  } catch (error) {
    console.error('❌ Error in dashboard query test:', error)
    return false
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting split payment tests...')
  
  const tableTest = await testSplitPaymentsTable()
  const createTest = await testSplitPaymentsTable() && await testCreateSplitPayment()
  const dashboardTest = await testDashboardQuery()
  
  console.log('\n=== TEST RESULTS ===')
  console.log(`✅ Table access: ${tableTest ? 'PASS' : 'FAIL'}`)
  console.log(`✅ Split creation: ${createTest ? 'PASS' : 'FAIL'}`)
  console.log(`✅ Dashboard query: ${dashboardTest ? 'PASS' : 'FAIL'}`)
  
  if (tableTest && createTest && dashboardTest) {
    console.log('\n🎉 ALL TESTS PASSED! Split payment functionality is working correctly.')
  } else {
    console.log('\n❌ SOME TESTS FAILED. Check the errors above.')
  }
}

// Run the tests
runAllTests()
