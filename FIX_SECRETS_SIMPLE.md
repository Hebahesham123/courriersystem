# 🔧 Simple Fix for Git Secrets Issue

## The Problem

PowerShell doesn't handle `^` the same way. Let's use a simpler approach.

## ✅ Easiest Solution: Allow Secret on GitHub

1. **Visit this link:**
   ```
   https://github.com/Hebahesham123/courrier2026/security/secret-scanning/unblock-secret/36qP0XUZO7pRephMrwKjDijlS8x
   ```

2. **Click "Allow secret"**

3. **Then push:**
   ```bash
   git push
   ```

4. **Rotate your Shopify token** (important for security):
   - Generate new token in Shopify
   - Update in Supabase Secrets
   - Old token becomes invalid

---

## ✅ Alternative: Fix Git History (If You Want)

### Step 1: Find How Many Commits Back

```bash
git log --oneline
```

Count how many commits back `2d56dd21` is from the top.

### Step 2: Rebase Using HEAD~N

If `2d56dd21` is the 3rd commit from top, use:

```bash
git rebase -i HEAD~3
```

If it's the 2nd commit:
```bash
git rebase -i HEAD~2
```

### Step 3: In the Editor

1. Find the line with `2d56dd21`
2. Change `pick` to `edit`
3. Save and close

### Step 4: Amend the Commit

```bash
git add DEBUG_SECRETS_ISSUE.md VERIFY_SECRETS_SETUP.md supabase/functions/shopify-sync/index.ts
git commit --amend --no-edit
```

### Step 5: Continue

```bash
git rebase --continue
```

### Step 6: Force Push

```bash
git push --force
```

---

## 🎯 My Recommendation

**Just allow the secret on GitHub** - it's much easier and you can rotate the token afterward. Rewriting git history is complex and risky if you're not comfortable with it.

