# 🔧 Fix Local Commits Before Pushing

## Current Situation

You have **2 commits** ahead of origin/main. One of them (likely `2d56dd21`) contains secrets.

## Step 1: Check Which Commit Has Secrets

Run this to see your commits:

```bash
git log origin/main..HEAD --oneline
```

Then check each commit for secrets:

```bash
# Check first commit
git show HEAD --stat

# Check second commit  
git show HEAD~1 --stat
```

Or search for the secret token:

```bash
git log origin/main..HEAD -S "shpat_04873fff" --oneline
```

This will show which commit contains the secret.

## Step 2: Rewrite the Commit with Secrets

Once you know which commit has secrets, rewrite it:

### If it's the most recent commit (HEAD):

```bash
# Amend the last commit (files are already fixed)
git add DEBUG_SECRETS_ISSUE.md VERIFY_SECRETS_SETUP.md supabase/functions/shopify-sync/index.ts
git commit --amend --no-edit
```

### If it's the second commit (HEAD~1):

```bash
# Start interactive rebase
git rebase -i HEAD~2

# In the editor:
# - Change 'pick' to 'edit' for the commit with secrets
# - Save and close

# Amend that commit
git add DEBUG_SECRETS_ISSUE.md VERIFY_SECRETS_SETUP.md supabase/functions/shopify-sync/index.ts
git commit --amend --no-edit

# Continue rebase
git rebase --continue
```

## Step 3: Push

```bash
git push
```

---

## ✅ Quick Method: Check and Fix

Run these commands one by one:

```bash
# 1. See your commits
git log origin/main..HEAD --oneline

# 2. Check if secrets are in the most recent commit
git show HEAD | findstr "shpat_04873fff"

# 3. If found, amend it:
git add DEBUG_SECRETS_ISSUE.md VERIFY_SECRETS_SETUP.md supabase/functions/shopify-sync/index.ts FIX_GITHUB_SECRETS_BLOCK.md
git commit --amend --no-edit

# 4. Push
git push
```

