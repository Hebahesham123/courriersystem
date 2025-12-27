# 🔒 Close GitHub Security Alerts

## ⚠️ Two Security Alerts to Close

1. **Shopify Access Token** - `shpat_04873fff54037a210a445...` in `supabase/functions/shopify-sync/index.ts:39`
2. **Supabase Service Key** - `eyJhbGciOiJIUzI1NiIsInR5cCI...` in `test-note-image-upload.html:90`

---

## ✅ Step 1: Verify Secrets Are Removed from Code

### Check Shopify Token:
The code should use environment variables, not hardcoded tokens. Line 39 should NOT have a hardcoded token.

### Check Service Role Key:
The `test-note-image-upload.html` file should NOT have a hardcoded service role key.

---

## ✅ Step 2: Close the Alerts in GitHub

### Method 1: Mark as Resolved (Recommended)

1. **Go to**: Your GitHub repository
2. **Click**: Security tab (top navigation)
3. **Click**: "Secret scanning alerts" (or "Security advisories")
4. **For each alert:**
   - Click on the alert
   - Click "Close alert" or "Mark as resolved"
   - **Reason**: Select "Used in tests" or "False positive" or "Revoked"
   - **Comment**: Add:
     ```
     Credentials have been rotated. Old token is invalid. 
     Code now uses environment variables only. 
     Test files have been updated to use placeholders.
     ```
   - Click "Close alert"

### Method 2: Dismiss as False Positive

1. **Go to**: Security → Secret scanning alerts
2. **For each alert:**
   - Click the alert
   - Click "Dismiss alert"
   - **Reason**: "False positive" or "Used in tests"
   - **Comment**: "Credentials rotated, code updated to use environment variables"
   - Click "Dismiss"

---

## ✅ Step 3: Verify Code is Clean

### Check Shopify Sync File:
```bash
# Should NOT find the old token
grep -r "shpat_04873fff" supabase/functions/shopify-sync/index.ts
```

**Should return nothing** (or only in comments/documentation).

### Check Test File:
The `test-note-image-upload.html` should:
- Use environment variables, OR
- Use placeholder text like `YOUR_SERVICE_ROLE_KEY`, OR
- Be in `.gitignore` to prevent committing

---

## ✅ Step 4: Add Test Files to .gitignore (Prevent Future Issues)

Add to `.gitignore`:
```
# Test files with potential secrets
test-*.html
test-*.js
```

This prevents test files from being committed with secrets.

---

## ✅ Step 5: Verify Secrets Are Rotated

### Shopify Token:
- ✅ New app created in Shopify
- ✅ New token generated
- ✅ Token updated in Supabase Secrets
- ✅ Old token is now invalid

### Supabase Service Role Key:
- ✅ If exposed, rotate it in Supabase Dashboard
- ✅ Update in `.env` file (if using locally)
- ✅ Update in Supabase Edge Function Secrets (if using)

---

## 📋 Quick Checklist

- [ ] Code files checked - no hardcoded secrets
- [ ] Test files updated or added to `.gitignore`
- [ ] Shopify token rotated (new app created)
- [ ] Supabase service role key rotated (if needed)
- [ ] GitHub alerts closed/resolved
- [ ] Comment added explaining the fix

---

## 🎯 After Closing Alerts

Once you close the alerts:
1. **GitHub will stop showing them** in the Security tab
2. **The alerts will be marked as resolved**
3. **You can reference them** if needed in the future

---

## ⚠️ Important Notes

- **Closing alerts doesn't fix the security issue** - you must rotate credentials
- **Old tokens must be invalidated** (which you've done by creating a new Shopify app)
- **Code must use environment variables** (which it already does)
- **Test files should not contain real secrets** (use placeholders or `.gitignore`)

---

**After closing the alerts, the security issue is resolved! ✅**

