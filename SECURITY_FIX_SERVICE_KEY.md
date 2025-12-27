# 🚨 CRITICAL SECURITY FIX: Service Role Key Exposed

## ⚠️ IMMEDIATE ACTION REQUIRED

Your Supabase **Service Role Key** has been exposed in client-side HTML files. This key has **FULL DATABASE ACCESS** and must be rotated immediately.

## 🔴 What Was Wrong

The service role key was hardcoded in these test files:
- `test-note-image-upload.html`
- `test-image-upload.html`
- `test-flexible-notes.html`
- `test-delete-requests.html`

**Service role keys should NEVER be in client-side code!**

## ✅ Step 1: Rotate the Service Role Key (DO THIS FIRST!)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `uxqeabqinastxukekqin`
3. **Go to**: Settings → API
4. **Find**: "service_role" key section
5. **Click**: "Reset service_role key" or "Rotate key"
6. **Copy the NEW key** (you'll need it for server-side code)

## ✅ Step 2: Update Server-Side Code

Update these files with the NEW service role key:

1. **`.env` file** (local development):
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_NEW_service_role_key_here
   ```

2. **Supabase Edge Functions** (if using):
   - Go to: Supabase Dashboard → Edge Functions → Secrets
   - Update: `SUPABASE_SERVICE_ROLE_KEY` with the new key

3. **Vercel/Deployment Environment Variables**:
   - Go to your deployment platform
   - Update: `SUPABASE_SERVICE_ROLE_KEY` with the new key

## ✅ Step 3: Fix Test Files (Already Done)

The test files have been updated to:
- Use environment variables or placeholder text
- Be added to `.gitignore` to prevent future commits

## ✅ Step 4: Verify No Other Exposures

Run this search to make sure the old key is gone:
```bash
grep -r "zLhgbsJDpwl9CxTO4FVGroVuLtN1C2r5MPn-kIm91Ts" .
```

If found, remove it immediately.

## ✅ Step 5: Check Security Logs

1. **Go to Supabase Dashboard** → Logs → Auth Logs
2. **Check for suspicious activity** since the key was exposed
3. **Review database access logs** for unauthorized queries

## 🔐 Best Practices Going Forward

1. **Never commit service role keys** to Git
2. **Use environment variables** for all secrets
3. **Add `.env` to `.gitignore`** (already done)
4. **Use anon key** for client-side code
5. **Use service role key** ONLY in server-side code (Node.js, Edge Functions)

## 📝 Key Differences

- **Anon Key**: Safe for client-side, respects RLS policies
- **Service Role Key**: Server-side only, bypasses RLS, full access

## 🆘 If You See Unauthorized Activity

1. **Rotate the key immediately** (Step 1)
2. **Review database logs** for suspicious queries
3. **Check for unauthorized data access**
4. **Consider resetting user passwords** if accounts were compromised
5. **Contact Supabase support** if you see major breaches

---

## ✅ After Fixing

1. ✅ Rotate service role key in Supabase
2. ✅ Update all server-side code with new key
3. ✅ Remove test files or add to .gitignore
4. ✅ Verify no keys in Git history
5. ✅ Check security logs

**This is a critical security issue - fix it immediately!**

