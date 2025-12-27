# 🔧 Fix Commit 2d56dd21 with Secrets

## The Problem

Commit `2d56dd21dfba15d634afc73eae5f636f55440139` contains secrets and is blocking your push.

## ✅ Solution: Rewrite That Commit

### Step 1: Find the Commit Position

```bash
git log --oneline | findstr 2d56dd21
```

This will show you where it is in your history.

### Step 2: Count How Many Commits Back

```bash
git log --oneline
```

Count how many commits `2d56dd21` is from the top (HEAD).

### Step 3: Start Interactive Rebase

If it's the 3rd commit from top:
```bash
git rebase -i HEAD~3
```

If it's the 4th commit:
```bash
git rebase -i HEAD~4
```

If it's the 5th commit:
```bash
git rebase -i HEAD~5
```

### Step 4: Edit the Commit

In the editor that opens (usually Notepad or vim):
1. Find the line with `2d56dd21`
2. Change `pick` to `edit` (or just `e`)
3. Save and close

**In Notepad:**
- Press Ctrl+S to save
- Close the window

**In vim:**
- Press `i` to enter insert mode
- Change `pick` to `edit`
- Press Esc
- Type `:wq` and press Enter

### Step 5: Amend That Commit

The files are already fixed in your working directory, so:

```bash
git add DEBUG_SECRETS_ISSUE.md VERIFY_SECRETS_SETUP.md supabase/functions/shopify-sync/index.ts
git commit --amend --no-edit
```

### Step 6: Continue Rebase

```bash
git rebase --continue
```

If there are conflicts, resolve them, then:
```bash
git add .
git rebase --continue
```

### Step 7: Force Push

```bash
git push --force
```

---

## ✅ Alternative: Allow Secret (Much Easier)

If rebase is too complicated:

1. **Visit:** https://github.com/Hebahesham123/courrier2026/security/secret-scanning/unblock-secret/36qP0XUZO7pRephMrwKjDijlS8x

2. **Click "Allow secret"**

3. **Push:**
   ```bash
   git push
   ```

4. **Rotate your Shopify token** (important!):
   - Generate new token in Shopify
   - Update in Supabase Secrets
   - Old token becomes invalid

---

## 🎯 Recommendation

**Just allow the secret on GitHub** - it's much simpler. Then rotate your token for security.

