import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import readline from 'readline'

dotenv.config()

// Get credentials from env or prompt user
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bdquuixqypkmbvvfymvm.supabase.co'
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Function to prompt for service role key
function getServiceRoleKey() {
  return new Promise((resolve) => {
    if (serviceRoleKey) {
      resolve(serviceRoleKey)
      return
    }
    
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not found in .env file')
    console.log('📝 You can get it from: Supabase Dashboard → Settings → API → service_role key')
    console.log('')
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    rl.question('Enter your Supabase Service Role Key (or press Enter to exit): ', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

const users = [
  // Admins
  { email: 'marina@gmail.com', password: 'marina123!', role: 'admin', name: 'Marina' },
  { email: 'mariam@gmail.com', password: 'mariam123!', role: 'admin', name: 'Mariam' },
  { email: 'toka@gmail.com', password: 'toka123!', role: 'admin', name: 'Toka' },
  { email: 'shrouq@gmail.com', password: 'shrouq123!', role: 'admin', name: 'Shrouq' },
  { email: 'hagar@gmail.com', password: 'hagar123!', role: 'admin', name: 'Hagar' },
  // Couriers
  { email: 'ahmed@gmail.com', password: 'ahmed123!', role: 'courier', name: 'Ahmed' },
  { email: 'mohamed@gmail.com', password: 'mohamed123!', role: 'courier', name: 'Mohamed' },
  { email: 'salah@gmail.com', password: 'salah123!', role: 'courier', name: 'Salah' },
  { email: 'emad@gmail.com', password: 'emad123!', role: 'courier', name: 'Emad' },
  { email: 'test1@gmail.com', password: 'test1123!', role: 'courier', name: 'Test1' },
  { email: 'test2@gmail.com', password: 'test2123!', role: 'courier', name: 'Test2' },
]

async function createUsers() {
  // Get service role key if not in env
  const key = await getServiceRoleKey()
  if (!key) {
    console.error('❌ Service role key is required')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  console.log('🚀 Creating users...\n')
  
  let created = 0
  let skipped = 0
  let errors = 0
  
  for (const user of users) {
    try {
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      })

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          console.log(`⚠️  ${user.email} already exists, linking to users table...`)
          // Get existing user
          const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
          if (listError) {
            console.error(`❌ Error listing users:`, listError.message)
            errors++
            continue
          }
          
          const existingUser = existingUsers.users.find(u => u.email === user.email)
          if (existingUser) {
            // Insert into users table
            const { error: insertError } = await supabase
              .from('users')
              .upsert({
                id: existingUser.id,
                email: user.email,
                role: user.role,
                name: user.name
              })
            
            if (insertError) {
              console.error(`❌ Error inserting ${user.email}:`, insertError.message)
              errors++
            } else {
              console.log(`✅ ${user.name} (${user.role}) - linked to existing auth user`)
              skipped++
            }
          } else {
            console.error(`❌ Could not find existing user for ${user.email}`)
            errors++
          }
          continue
        }
        throw authError
      }

      if (!authUser.user) {
        throw new Error('No user returned from auth')
      }

      // Insert into users table
      const { error: insertError } = await supabase
        .from('users')
        .upsert({
          id: authUser.user.id,
          email: user.email,
          role: user.role,
          name: user.name
        })

      if (insertError) {
        console.error(`❌ Error inserting ${user.email} into users table:`, insertError.message)
        errors++
      } else {
        console.log(`✅ Created ${user.name} (${user.role}) - ${user.email}`)
        created++
      }
    } catch (error) {
      console.error(`❌ Error creating ${user.email}:`, error.message)
      errors++
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log(`✅ Created: ${created}`)
  console.log(`⚠️  Skipped (already exists): ${skipped}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('='.repeat(50))
  console.log('\n✅ Done!')
}

createUsers().catch(console.error)

