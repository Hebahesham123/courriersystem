# 🔒 Remove Secrets from Git History

## ❌ Problem

GitHub is blocking your push because secrets exist in commit history, even after fixing the files.

## ✅ Solution: Rewrite Git History

You need to remove the secrets from the old commit `2d56dd21dfba15d634afc73eae5f636f55440139`.

### Step 1: Interactive Rebase

```bash
# Start interactive rebase from before the commit with secrets
git rebase -i 2d56dd21dfba15d634afc73eae5f636f55440139^
```

Or if that commit is not the first one, find it:

```bash
# View commit history
git log --oneline

# Rebase from before the problematic commit
git rebase -i <commit-before-2d56dd21>
```

### Step 2: Edit the Commit

In the rebase editor:
1. Change `pick` to `edit` for commit `2d56dd21`
2. Save and close

### Step 3: Fix the Files in That Commit

The files will be checked out. Make sure they don't have secrets:

```bash
# Verify files are fixed (they should already be)
cat DEBUG_SECRETS_ISSUE.md | grep -i "shpat_"
cat VERIFY_SECRETS_SETUP.md | grep -i "shpat_"
cat supabase/functions/shopify-sync/index.ts | grep -i "shpat_"
```

If they still have secrets, the files should already be fixed. If not, fix them now.

### Step 4: Amend the Commit

```bash
git add DEBUG_SECRETS_ISSUE.md VERIFY_SECRETS_SETUP.md supabase/functions/shopify-sync/index.ts FIX_GITHUB_SECRETS_BLOCK.md
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

## ✅ Alternative: Simpler Method (If You Can)

If the problematic commit is recent, you can use `git filter-branch` or `git filter-repo`:

### Using git filter-branch:

```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch DEBUG_SECRETS_ISSUE.md VERIFY_SECRETS_SETUP.md supabase/functions/shopify-sync/index.ts" \
  --prune-empty --tag-name-filter cat -- --all
```

Then re-add the fixed files:

```bash
git add DEBUG_SECRETS_ISSUE.md VERIFY_SECRETS_SETUP.md supabase/functions/shopify-sync/index.ts FIX_GITHUB_SECRETS_BLOCK.md
git commit -m "Fix: Remove hardcoded secrets, use environment variables"
git push --force
```

---

## ✅ Easiest Method: Allow Secret (Not Recommended)

If rewriting history is too complex, you can temporarily allow the secret:

1. **Click the link from the error:**
   ```
   https://github.com/Hebahesham123/courrier2026/security/secret-scanning/unblock-secret/36qP0XUZO7pRephMrwKjDijlS8x
   ```

2. **Click "Allow secret"**

3. **Push again:**
   ```bash
   git push
   ```

⚠️ **Warning:** This keeps the secret in your repository history forever. Anyone with access can see it.

---

## 🔐 Best Practice Going Forward

1. **Never commit secrets** - Use environment variables
2. **Add `.env` to `.gitignore`**
3. **Use Supabase Secrets** for Edge Functions
4. **Rotate the secret** if it was exposed (generate a new Shopify token)

---

## 🆘 Still Having Issues?

If you can't rewrite history, consider:

1. **Create a new branch** without the problematic commits
2. **Delete the old branch** and push the new one
3. **Or use GitHub's secret scanning** to allow it temporarily

