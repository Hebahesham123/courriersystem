# 🔒 Disable GitHub Security Advisories

## ⚠️ Important Note

**Disabling security advisories does NOT fix the security issue.** It only hides the alert. You still need to:
- ✅ Rotate your Shopify API token (which you're doing)
- ✅ Update Supabase secrets with new credentials
- ✅ Remove exposed credentials from git history (if needed)

---

## How to Disable Security Advisories on GitHub

### Option 1: Disable for This Repository (Recommended)

1. **Go to your GitHub repository**
2. **Click**: Settings (top right, gear icon)
3. **Scroll down** to "Security" section (left sidebar)
4. **Click**: "Security" → "Code security and analysis"
5. **Find**: "Security advisories" section
6. **Toggle OFF**: "Security advisories" (or "View or disclose security advisories")
7. **Click**: "Save" or "Disable"

### Option 2: Disable via Repository Settings

1. **Go to**: Repository → Settings
2. **Click**: "Security" (in left sidebar)
3. **Under "Security advisories"**:
   - Click "Disable" or toggle it off
   - Confirm if prompted

### Option 3: If You See a Security Advisory Alert

If GitHub already created a security advisory:

1. **Go to**: Repository → Security tab
2. **Click**: "Security advisories" (or "View advisories")
3. **Find the advisory** about exposed credentials
4. **Options**:
   - **Close the advisory** (if credentials are rotated)
   - **Mark as resolved** (after you've fixed it)
   - **Delete** (if it's a false positive)

---

## ✅ After Disabling

After you:
1. ✅ Rotate credentials (new Shopify app)
2. ✅ Update Supabase secrets
3. ✅ Test that it works
4. ✅ Reply to Shopify

Then you can safely disable the security advisories, as the issue is resolved.

---

## 🔍 Alternative: Keep Advisories Enabled (Recommended)

**Better approach**: Keep security advisories enabled, but:
1. **Close/resolve the advisory** after fixing the issue
2. This shows you've addressed the security concern
3. GitHub will track that you've resolved it

**To resolve an advisory:**
1. Go to: Security → Security advisories
2. Click on the advisory
3. Click "Close advisory" or "Mark as resolved"
4. Add a comment: "Credentials rotated, new app created, secrets updated"

---

## 📋 Quick Steps Summary

**To disable:**
```
Repository → Settings → Security → Code security and analysis
→ Toggle OFF "Security advisories" → Save
```

**To resolve (better):**
```
Repository → Security → Security advisories → Open advisory
→ Close/Resolve → Add comment → Confirm
```

---

## ⚠️ Remember

- Disabling advisories = Hiding the alert (doesn't fix the issue)
- Rotating credentials = Actually fixes the security issue ✅
- You should do BOTH: Fix the issue AND then disable/resolve the advisory

