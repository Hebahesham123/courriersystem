# 🚨 URGENT: Shopify API Credentials Security Fix

## ⚠️ CRITICAL ISSUE

Shopify has detected **exposed API credentials** in your repository. You must fix this **immediately** to prevent API access revocation.

**Deadline: December 25, 2025**

---

## ✅ IMMEDIATE ACTIONS REQUIRED

### Step 1: Rotate Your Shopify Access Token (DO THIS FIRST!)

1. **Go to Shopify Admin**: https://admin.shopify.com
2. **Settings** → **Apps and sales channels**
3. **Find your app** (likely named "Courier Pro" or similar)
4. **Click on the app** → **API credentials**
5. **Click "Regenerate Admin API access token"**
6. **Copy the NEW token immediately** (you can only see it once!)

### Step 2: Update Supabase Edge Function Secrets

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/bdquuixqypkmbvvfymvm
2. **Project Settings** → **Edge Functions** → **Secrets**
3. **Find `SHOPIFY_ACCESS_TOKEN`**
4. **Click "Edit"** → **Paste your NEW token** → **Save**

### Step 3: Update Local .env File (if using local sync)

If you have a `.env` file locally:

1. **Open `.env` file**
2. **Find `SHOPIFY_ACCESS_TOKEN=`**
3. **Replace with new token**:
   ```env
   SHOPIFY_ACCESS_TOKEN=shpat_YOUR_NEW_TOKEN_HERE
   ```
4. **Save the file**

### Step 4: Verify No Tokens in Code

✅ **Already Fixed:**
- ✅ `.env` is in `.gitignore` (line 25)
- ✅ All code uses `Deno.env.get('SHOPIFY_ACCESS_TOKEN')` (no hardcoded tokens)
- ✅ `check-commits.ps1` updated to use generic pattern

### Step 5: Clean Git History (If Token Was Committed)

If the token was ever committed to git:

```bash
# Check if token exists in git history
git log --all --full-history -S "shpat_" --source -- "*"

# If found, you need to rewrite history (use BFG Repo-Cleaner or git filter-branch)
# WARNING: This rewrites history - coordinate with team first!
```

**For now, rotating the token is the priority** - this invalidates the old exposed token.

---

## 🔒 Security Best Practices (Going Forward)

### ✅ DO:
- ✅ Store tokens in Supabase Edge Function Secrets
- ✅ Use environment variables (`.env` file)
- ✅ Keep `.env` in `.gitignore`
- ✅ Rotate tokens if exposed
- ✅ Use different tokens for dev/staging/production

### ❌ DON'T:
- ❌ Commit tokens to git
- ❌ Hardcode tokens in code
- ❌ Share tokens in screenshots/docs
- ❌ Use the same token everywhere
- ❌ Store tokens in client-side code

---

## 📋 Verification Checklist

After completing the steps above:

- [ ] New Shopify token generated
- [ ] Supabase Edge Function secret updated
- [ ] Local `.env` updated (if applicable)
- [ ] Old token is now invalid (can't access API with it)
- [ ] New token works (test sync function)
- [ ] No tokens visible in code files
- [ ] `.gitignore` includes `.env`

---

## 🧪 Test the Fix

1. **Trigger the sync function**:
   ```bash
   # Via Supabase Dashboard → Edge Functions → shopify-sync → Invoke
   ```

2. **Check logs** - should see:
   ```
   ✅ Shopify connection successful!
   ✅ Fetched orders successfully
   ```

3. **If you see 401 errors**, the token is wrong - repeat Step 1-2.

---

## 📧 Response to Shopify

After completing the fix, reply to Shopify's email:

**Subject:** Re: Action required: Rotate your Shopify app's API credentials

**Message:**
```
Hello,

I have completed the following actions:

1. ✅ Regenerated the Admin API access token
2. ✅ Updated all environment variables and secrets
3. ✅ Verified no credentials are exposed in code
4. ✅ Confirmed .env files are in .gitignore
5. ✅ Tested the new token - API access is working

The security vulnerability has been resolved.

Ticket ID: 65f73fcc-adc0-4a65-92e2-f4a98040af77

Thank you,
[Your Name]
```

---

## 🆘 If You Need Help

If you encounter issues:

1. **Check Supabase logs**: Dashboard → Edge Functions → shopify-sync → Logs
2. **Verify token format**: Should start with `shpat_` and be 70+ characters
3. **Test API access**: Use Shopify Admin → Apps → Your App → API credentials

---

## ⏰ TIMELINE

- **Now**: Rotate token immediately
- **Today**: Update all secrets/environment variables
- **Before Dec 25, 2025**: Reply to Shopify confirming fix
- **Ongoing**: Monitor for any new exposures

---

**This is URGENT - Shopify may revoke API access if not fixed by the deadline!**

