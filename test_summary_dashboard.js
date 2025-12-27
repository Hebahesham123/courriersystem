// Test script to debug summary dashboard issues
// Run this in your browser console on the admin dashboard page

async function testSummaryDashboard() {
  console.log('=== TESTING SUMMARY DASHBOARD ===')
  
  try {
    // Test 1: Check if supabase is available
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase client not available')
      return
    }
    console.log('✅ Supabase client available')
    
    // Test 2: Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('❌ User auth error:', userError)
      return
    }
    if (!user) {
      console.error('❌ No authenticated user')
      return
    }
    console.log('✅ User authenticated:', { id: user.id, email: user.email })
    
    // Test 3: Check total orders count
    const { data: totalOrders, error: totalError } = await supabase
      .from('orders')
      .select('id, order_id, created_at, status, assigned_courier_id')
      .limit(5)
    
    if (totalError) {
      console.error('❌ Error fetching total orders:', totalError)
      return
    }
    console.log(`✅ Total orders in database: ${totalOrders?.length || 0}`)
    if (totalOrders && totalOrders.length > 0) {
      console.log('Sample orders:', totalOrders)
    }
    
    // Test 4: Check orders for today
    const today = new Date().toISOString().split('T')[0]
    console.log('Today date:', today)
    
    const { data: todayOrders, error: todayError } = await supabase
      .from('orders')
      .select('id, order_id, created_at, status, assigned_courier_id')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
    
    if (todayError) {
      console.error('❌ Error fetching today orders:', todayError)
      return
    }
    console.log(`✅ Orders for today (${today}): ${todayOrders?.length || 0}`)
    if (todayOrders && todayOrders.length > 0) {
      console.log('Today orders:', todayOrders)
    } else {
      console.log('⚠️ No orders found for today')
    }
    
    // Test 5: Check couriers
    const { data: couriers, error: courierError } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('role', 'courier')
    
    if (courierError) {
      console.error('❌ Error fetching couriers:', courierError)
      return
    }
    console.log(`✅ Couriers found: ${couriers?.length || 0}`)
    if (couriers && couriers.length > 0) {
      console.log('Couriers:', couriers)
    }
    
    // Test 6: Check if orders table has the right structure
    const { data: sampleOrder, error: sampleError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
    
    if (sampleError) {
      console.error('❌ Error fetching sample order:', sampleError)
      return
    }
    
    if (sampleOrder && sampleOrder.length > 0) {
      const order = sampleOrder[0]
      console.log('✅ Sample order structure:', {
        hasId: !!order.id,
        hasOrderId: !!order.order_id,
        hasCreatedAt: !!order.created_at,
        hasStatus: !!order.status,
        hasAssignedCourierId: !!order.assigned_courier_id,
        hasHoldFee: 'hold_fee' in order,
        hasHoldFeeComment: 'hold_fee_comment' in order,
        hasHoldFeeCreatedBy: 'hold_fee_created_by' in order,
        hasHoldFeeCreatedAt: 'hold_fee_created_at' in order,
        hasHoldFeeAddedAt: 'hold_fee_added_at' in order,
        hasHoldFeeRemovedAt: 'hold_fee_removed_at' in order
      })
    }
    
    console.log('=== TEST COMPLETE ===')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testSummaryDashboard()
