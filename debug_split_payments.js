// Comprehensive Split Payments Debug Script
// Run this in your browser console on the courier orders page

async function debugSplitPayments() {
  console.log('=== COMPREHENSIVE SPLIT PAYMENTS DEBUG ===')
  
  try {
    // Step 1: Check if we can create split payments
    console.log('1. Testing split payment creation...')
    
    // Get a sample order that can be edited
    const { data: sampleOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_id, status, total_order_fees, payment_method')
      .eq('assigned_courier_id', 'YOUR_COURIER_ID_HERE') // Replace with your actual courier ID
      .in('status', ['assigned', 'partial', 'delivered', 'hand_to_hand', 'return', 'canceled'])
      .limit(1)
    
    if (ordersError) {
      console.error('❌ Error fetching sample orders:', ordersError)
      return
    }
    
    if (!sampleOrders || sampleOrders.length === 0) {
      console.log('❌ No editable orders found')
      return
    }
    
    const sampleOrder = sampleOrders[0]
    console.log('✅ Sample order found:', sampleOrder)
    
    // Step 2: Check if split_payments table exists and has correct structure
    console.log('2. Checking split_payments table...')
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('split_payments')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('❌ split_payments table error:', tableError)
      console.log('This means the table does not exist or has permission issues')
      return
    }
    
    console.log('✅ split_payments table exists and is accessible')
    
    // Step 3: Check current split payments for this order
    console.log('3. Checking current split payments for sample order...')
    
    const { data: currentSplits, error: splitsError } = await supabase
      .from('split_payments')
      .select('*')
      .eq('order_id', sampleOrder.id)
    
    if (splitsError) {
      console.error('❌ Error fetching current splits:', splitsError)
    } else {
      console.log(`✅ Current split payments: ${currentSplits?.length || 0}`)
      if (currentSplits && currentSplits.length > 0) {
        console.log('Split details:', currentSplits)
      }
    }
    
    // Step 4: Test creating a split payment
    console.log('4. Testing split payment creation...')
    
    const testSplitPayment = {
      order_id: sampleOrder.id,
      payment_method: 'cash',
      amount: 1000,
      created_by: 'YOUR_USER_ID_HERE', // Replace with your actual user ID
      notes: 'Test split payment'
    }
    
    console.log('Attempting to create test split payment:', testSplitPayment)
    
    const { data: newSplit, error: createError } = await supabase
      .from('split_payments')
      .insert([testSplitPayment])
      .select()
    
    if (createError) {
      console.error('❌ Error creating split payment:', createError)
      console.log('This means there is a database constraint or permission issue')
      return
    }
    
    console.log('✅ Test split payment created successfully:', newSplit)
    
    // Step 5: Update the order to have payment_method = 'split'
    console.log('5. Updating order payment_method to "split"...')
    
    const { error: updateError } = await supabase
      .from('orders')
      .update({ payment_method: 'split' })
      .eq('id', sampleOrder.id)
    
    if (updateError) {
      console.error('❌ Error updating order payment_method:', updateError)
      console.log('This means the orders table does not allow payment_method = "split"')
      return
    }
    
    console.log('✅ Order payment_method updated to "split"')
    
    // Step 6: Verify the data can be fetched with the dashboard query
    console.log('6. Testing dashboard query...')
    
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('orders')
      .select(`
        id, 
        order_id, 
        payment_method, 
        total_order_fees,
        split_payments (id, payment_method, amount, created_at, created_by, notes)
      `)
      .eq('id', sampleOrder.id)
    
    if (dashboardError) {
      console.error('❌ Error with dashboard query:', dashboardError)
      return
    }
    
    if (dashboardData && dashboardData.length > 0) {
      const order = dashboardData[0]
      console.log('✅ Dashboard query successful:', order)
      console.log('Payment method:', order.payment_method)
      console.log('Split payments:', order.split_payments)
      
      if (order.split_payments && order.split_payments.length > 0) {
        console.log('Split payment breakdown:')
        order.split_payments.forEach((split, index) => {
          console.log(`  ${index + 1}. ${split.payment_method}: ${split.amount} EGP`)
        })
      }
    }
    
    // Step 7: Clean up test data
    console.log('7. Cleaning up test data...')
    
    const { error: deleteSplitError } = await supabase
      .from('split_payments')
      .delete()
      .eq('id', newSplit[0].id)
    
    if (deleteSplitError) {
      console.error('❌ Error deleting test split payment:', deleteSplitError)
    } else {
      console.log('✅ Test split payment deleted')
    }
    
    const { error: resetOrderError } = await supabase
      .from('orders')
      .update({ payment_method: sampleOrder.payment_method })
      .eq('id', sampleOrder.id)
    
    if (resetOrderError) {
      console.error('❌ Error resetting order payment_method:', resetOrderError)
    } else {
      console.log('✅ Order payment_method reset to original value')
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error)
  }
  
  console.log('=== DEBUG COMPLETE ===')
}

// Instructions for use:
console.log('To use this debug script:')
console.log('1. Replace "YOUR_COURIER_ID_HERE" with your actual courier ID')
console.log('2. Replace "YOUR_USER_ID_HERE" with your actual user ID')
console.log('3. Run: debugSplitPayments()')

// You can find your IDs by running:
// console.log('Your user ID:', supabase.auth.user()?.id)
// console.log('Your courier ID:', supabase.auth.user()?.id) // Usually the same as user ID
