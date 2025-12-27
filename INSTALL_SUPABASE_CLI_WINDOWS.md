# 🔧 Install Supabase CLI on Windows

## ❌ Problem

Supabase CLI doesn't support global npm installation. You need to use a different method.

## ✅ Solution: Use Scoop (Recommended for Windows)

### Step 1: Install Scoop (if not already installed)

Open **PowerShell as Administrator** and run:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### Step 2: Install Supabase CLI via Scoop

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Step 3: Verify Installation

```powershell
supabase --version
```

---

## ✅ Alternative: Standalone Binary

If you don't want to use Scoop:

### Step 1: Download Binary

1. Go to: https://github.com/supabase/cli/releases
2. Download: `supabase_X.X.X_windows_amd64.zip` (latest version)
3. Extract the zip file

### Step 2: Add to PATH

1. Copy `supabase.exe` to a folder (e.g., `C:\tools\supabase\`)
2. Add to PATH:
   - Press `Win + X` → **System** → **Advanced system settings**
   - Click **Environment Variables**
   - Under **User variables**, find **Path** → **Edit**
   - Click **New** → Add `C:\tools\supabase\`
   - Click **OK** on all dialogs

### Step 3: Verify

Open new PowerShell and run:
```powershell
supabase --version
```

---

## ✅ Alternative: Use npx (No Installation Needed)

You can use Supabase CLI without installing it globally:

```powershell
npx supabase@latest --version
npx supabase@latest init
npx supabase@latest link --project-ref YOUR_PROJECT_REF
```

**Note:** This works but is slower since it downloads each time.

---

## 🎯 Recommended: Use Scoop

Scoop is the easiest and most reliable method for Windows. After installing Scoop, you can easily update Supabase CLI:

```powershell
scoop update supabase
```

---

## 📝 Quick Start After Installation

Once Supabase CLI is installed:

```powershell
# Initialize Supabase in your project
supabase init

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Create a new Edge Function
supabase functions new shopify-webhook

# Deploy Edge Function
supabase functions deploy shopify-webhook
```

---

## 🆘 Troubleshooting

### "scoop: command not found"
- Scoop is not installed
- Install Scoop first (Step 1 above)

### "supabase: command not found" after adding to PATH
- Restart PowerShell/terminal
- Or restart your computer

### Permission errors
- Run PowerShell as Administrator
- Or use `npx supabase@latest` instead

