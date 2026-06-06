import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import readline from 'readline'

dotenv.config()

// Use configured project URL or default to the known one
const supabaseUrl =
  process.env.VITE_SUPABASE_URL || 'https://bdquuixqypkmbvvfymvm.supabase.co'
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Prompt for the service role key if it is not in the environment
function getServiceRoleKey() {
  return new Promise((resolve) => {
    if (serviceRoleKey) {
      resolve(serviceRoleKey)
      return
    }

    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not found in .env file')
    console.log(
      '📝 Get it from Supabase Dashboard → Settings → API → service_role key'
    )
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

// Requested users (all set to courier role by default)
const users = [
  { email: 'essam@gmail.com', password: 'essam123!', role: 'courier', name: 'Essam' }
]

async function createUsers() {
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

  console.log('🚀 Creating requested users...\n')

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
        if (
          authError.message.includes('already registered') ||
          authError.message.includes('User already registered')
        ) {
          console.log(`⚠️  ${user.email} already exists, linking to users table...`)

          // Find the existing auth user
          const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
          if (listError) {
            console.error(`❌ Error listing users:`, listError.message)
            errors++
            continue
          }

          const existingUser = existingUsers.users.find((u) => u.email === user.email)
          if (existingUser) {
            // Upsert into the users table
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

      // Upsert into the users table
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




