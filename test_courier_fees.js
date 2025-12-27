// Test script for Courier Fees functionality
// Run this in your browser console or Node.js environment with Supabase client

const { createClient } = require('@supabase/supabase-js')

// Replace with your Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCourierFees() {
  console.log('🧪 Testing Courier Fees System...\n')

  try {
    // Test 1: Check if courier_fees table exists
    console.log('1️⃣ Testing table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'courier_fees')

    if (tableError) {
      console.error('❌ Error checking table:', tableError)
      return
    }

    if (tableInfo && tableInfo.length > 0) {
      console.log('✅ courier_fees table exists')
    } else {
      console.log('❌ courier_fees table not found - run the schema first!')
      return
    }

    // Test 2: Check if there are any couriers
    console.log('\n2️⃣ Testing courier users...')
    const { data: couriers, error: courierError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('role', 'courier')

    if (courierError) {
      console.error('❌ Error fetching couriers:', courierError)
      return
    }

    if (couriers && couriers.length > 0) {
      console.log(`✅ Found ${couriers.length} couriers:`)
      couriers.forEach(c => console.log(`   - ${c.name} (${c.email})`))
    } else {
      console.log('⚠️  No couriers found - create some courier users first')
      return
    }

    // Test 3: Check existing fees
    console.log('\n3️⃣ Testing existing fees...')
    const { data: fees, error: feesError } = await supabase
      .from('courier_fees')
      .select('*')
      .order('fee_date', { ascending: false })

    if (feesError) {
      console.error('❌ Error fetching fees:', feesError)
      return
    }

    if (fees && fees.length > 0) {
      console.log(`✅ Found ${fees.length} existing fees`)
      fees.forEach(f => {
        const courier = couriers.find(c => c.id === f.courier_id)
        console.log(`   - ${courier?.name || 'Unknown'}: ${f.fee_amount} د.ك on ${f.fee_date}`)
      })
    } else {
      console.log('ℹ️  No existing fees found - this is normal for new setup')
    }

    // Test 4: Test creating a new fee (if we have couriers)
    if (couriers.length > 0) {
      console.log('\n4️⃣ Testing fee creation...')
      const testCourier = couriers[0]
      const today = new Date().toISOString().split('T')[0]
      
      // Check if fee already exists for today
      const { data: existingFee } = await supabase
        .from('courier_fees')
        .select('*')
        .eq('courier_id', testCourier.id)
        .eq('fee_date', today)
        .eq('is_active', true)
        .single()

      if (existingFee) {
        console.log(`ℹ️  Fee already exists for ${testCourier.name} today: ${existingFee.fee_amount} د.ك`)
      } else {
        // Create test fee
        const { data: newFee, error: createError } = await supabase
          .from('courier_fees')
          .insert([{
            courier_id: testCourier.id,
            fee_amount: 5.50,
            fee_date: today,
            created_by: 'test-script'
          }])
          .select()

        if (createError) {
          console.error('❌ Error creating test fee:', createError)
        } else {
          console.log(`✅ Created test fee for ${testCourier.name}: ${newFee[0].fee_amount} د.ك`)
          
          // Clean up test fee
          const { error: deleteError } = await supabase
            .from('courier_fees')
            .delete()
            .eq('id', newFee[0].id)

          if (deleteError) {
            console.log('⚠️  Could not clean up test fee:', deleteError.message)
          } else {
            console.log('🧹 Cleaned up test fee')
          }
        }
      }
    }

    // Test 5: Test fee queries
    console.log('\n5️⃣ Testing fee queries...')
    
    // Get today's fees
    const { data: todayFees, error: todayError } = await supabase
      .from('courier_fees')
      .select(`
        *,
        users!inner(name, email)
      `)
      .eq('fee_date', today)
      .eq('is_active', true)

    if (todayError) {
      console.error('❌ Error fetching today\'s fees:', todayError)
    } else {
      console.log(`✅ Today's active fees: ${todayFees?.length || 0}`)
      if (todayFees && todayFees.length > 0) {
        todayFees.forEach(f => {
          console.log(`   - ${f.users.name}: ${f.fee_amount} د.ك`)
        })
      }
    }

    // Test 6: Check RLS policies
    console.log('\n6️⃣ Testing RLS policies...')
    
    // This would require authenticated user context
    console.log('ℹ️  RLS testing requires authenticated user context')
    console.log('   - Admin users should have full access')
    console.log('   - Courier users should only see their own fees')

    console.log('\n🎉 Courier Fees System Test Complete!')
    console.log('\n📋 Summary:')
    console.log(`   - Table exists: ${tableInfo && tableInfo.length > 0 ? '✅' : '❌'}`)
    console.log(`   - Couriers found: ${couriers?.length || 0}`)
    console.log(`   - Existing fees: ${fees?.length || 0}`)
    console.log(`   - Today's active fees: ${todayFees?.length || 0}`)

  } catch (error) {
    console.error('💥 Test failed with error:', error)
  }
}

// Run the test
testCourierFees()

// Export for use in other environments
module.exports = { testCourierFees }
