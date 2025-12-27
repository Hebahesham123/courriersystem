# 🚀 Quick Fix: Remove Secrets from Git History

## The Problem

Commit `2d56dd21dfba15d634afc73eae5f636f55440139` contains secrets that GitHub is blocking.

## ✅ Solution: Rewrite That Commit

### Step 1: Find the Commit Before the Problematic One

```bash
git log --oneline
```

Look for commit `2d56dd21` and note the commit hash **before** it.

### Step 2: Start Interactive Rebase

```bash
# Replace COMMIT_BEFORE with the hash from Step 1
git rebase -i COMMIT_BEFORE
```

**Example:** If `2d56dd21` is the 3rd commit, use:
```bash
git rebase -i HEAD~3
```

### Step 3: Edit the Commit

In the editor that opens:
1. Find the line with `2d56dd21`
2. Change `pick` to `edit` (or just `e`)
3. Save and close (in Notepad: Ctrl+S, then close)

### Step 4: The Files Are Already Fixed

The files are already fixed in your working directory, so just amend:

```bash
git add DEBUG_SECRETS_ISSUE.md VERIFY_SECRETS_SETUP.md supabase/functions/shopify-sync/index.ts
git commit --amend --no-edit
```

### Step 5: Continue Rebase

```bash
git rebase --continue
```

### Step 6: Force Push

```bash
git push --force
```

---

## ✅ Alternative: Allow Secret (Easier, but Less Secure)

If rewriting history is too complex:

1. **Visit this link:**
   ```
   https://github.com/Hebahesham123/courrier2026/security/secret-scanning/unblock-secret/36qP0XUZO7pRephMrwKjDijlS8x
   ```

2. **Click "Allow secret"**

3. **Push:**
   ```bash
   git push
   ```

4. **IMPORTANT:** Rotate your Shopify token:
   - Generate a new token in Shopify Admin
   - Update it in Supabase Dashboard → Edge Functions → Secrets
   - The old token in Git history will be invalid

---

## 🎯 Recommended: Use Alternative Method

Since rewriting history can be tricky, I recommend:
1. Allow the secret on GitHub (temporary)
2. Rotate your Shopify token immediately (security best practice)
3. The old token in history becomes useless

This is safer than trying to rewrite history if you're not comfortable with git rebase.

