/**
 * Create the 6 warehouse ("المخزن") accounts.
 *
 * RUN WAREHOUSE_SETUP.sql FIRST (it widens the users.role constraint), then:
 *   node create-warehouse-users.mjs
 *
 * Reads Supabase URL + service-role key from .env. Idempotent: re-running
 * updates existing accounts instead of erroring.
 */
import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

const env = readFileSync(".env", "utf8")
const get = (k) => (env.match(new RegExp(k + "=([^\\r\\n]+)")) || [])[1]?.trim()
const sb = createClient(get("VITE_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
})

const NAMES = ["enas", "fatma", "nermine", "merna", "helena", "janet"]
const accounts = NAMES.map((n) => ({
  name: n.charAt(0).toUpperCase() + n.slice(1),
  email: `${n}@gmail.com`,
  password: `${n}123!`,
  role: "warehouse",
}))

// Find an existing auth user by email (paging through the admin list).
async function findAuthUser(email) {
  for (let page = 1; page <= 40; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const u = (data.users || []).find((x) => (x.email || "").toLowerCase() === email.toLowerCase())
    if (u) return u
    if (!data.users || data.users.length < 200) return null
  }
  return null
}

for (const acc of accounts) {
  try {
    let authUser = await findAuthUser(acc.email)
    if (authUser) {
      await sb.auth.admin.updateUserById(authUser.id, { password: acc.password, email_confirm: true })
      console.log(`~ updated auth user ${acc.email}`)
    } else {
      const { data, error } = await sb.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
      })
      if (error) throw error
      authUser = data.user
      console.log(`+ created auth user ${acc.email}`)
    }

    const { error: upErr } = await sb
      .from("users")
      .upsert({ id: authUser.id, email: acc.email, role: acc.role, name: acc.name }, { onConflict: "id" })
    if (upErr) throw upErr
    console.log(`  ✓ users row: ${acc.name} (${acc.role})`)
  } catch (e) {
    console.error(`  ✗ ${acc.email}: ${e.message}`)
  }
}
console.log("\nDone. Warehouse logins: <name>@gmail.com / <name>123!")
