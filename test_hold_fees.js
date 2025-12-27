// Test script to verify hold fee functionality
// Run this in your browser console on the admin dashboard page

async function testHoldFeeFields() {
  console.log('Testing hold fee fields...')
  
  try {
    // Test 1: Check if hold fee fields exist
    const { data: fields, error: fieldsError } = await supabase
      .from('orders')
      .select('id, hold_fee, hold_fee_comment, hold_fee_created_by, hold_fee_created_at, hold_fee_added_at, hold_fee_removed_at')
      .limit(1)
    
    if (fieldsError) {
      console.error('❌ Error checking hold fee fields:', fieldsError)
      return
    }
    
    console.log('✅ Hold fee fields check:', fields)
    
    // Test 2: Try to update a hold fee on the first order
    if (fields && fields.length > 0) {
      const orderId = fields[0].id
      console.log('Testing update on order:', orderId)
      
      const { data: updateResult, error: updateError } = await supabase
        .from('orders')
        .update({
          hold_fee: 50.00,
          hold_fee_comment: 'Test hold fee',
          hold_fee_created_by: 'test-user-id',
          hold_fee_created_at: new Date().toISOString(),
          hold_fee_added_at: new Date().toISOString(),
          hold_fee_removed_at: null
        })
        .eq('id', orderId)
        .select()
      
      if (updateError) {
        console.error('❌ Error updating hold fee:', updateError)
        console.log('Error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        })
      } else {
        console.log('✅ Hold fee update successful:', updateResult)
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testHoldFeeFields()
