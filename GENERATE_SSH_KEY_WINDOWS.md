# 🔑 Generate SSH Key on Windows for Hostinger VPS

## Quick Method: Using PowerShell (Windows 10/11)

### Step 1: Open PowerShell

1. Press `Win + X`
2. Select **"Windows PowerShell"** or **"Terminal"**

### Step 2: Generate SSH Key

Run this command in PowerShell:

```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
```

**Replace `your_email@example.com` with your actual email.**

**Example:**
```powershell
ssh-keygen -t ed25519 -C "admin@yourdomain.com"
```

### Step 3: Follow Prompts

1. **"Enter file in which to save the key"**
   - Press `Enter` to use default: `C:\Users\g8\.ssh\id_ed25519`

2. **"Enter passphrase"** (optional but recommended)
   - Press `Enter` for no passphrase (easier)
   - Or type a password and press `Enter` (more secure)

3. **"Enter same passphrase again"**
   - Press `Enter` (or type password again if you set one)

### Step 4: Get Your Public Key

After generation, display your public key:

```powershell
cat ~/.ssh/id_ed25519.pub
```

**Or:**
```powershell
type C:\Users\g8\.ssh\id_ed25519.pub
```

### Step 5: Copy the Public Key

You'll see something like:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... your_email@example.com
```

**Select and copy the ENTIRE line** (from `ssh-ed25519` to the end)

### Step 6: Add to Hostinger

1. **Go back to Hostinger modal**
2. **Paste the public key** in the "SSH key content" text area
3. **Enter a name** (e.g., "My Windows PC" or "Laptop")
4. **Click "Save"**

---

## Alternative Method: Using PuTTY (If PowerShell Doesn't Work)

### Step 1: Download PuTTYgen

1. Download: https://www.putty.org/
2. Or download PuTTYgen directly: https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html

### Step 2: Generate Key

1. **Open PuTTYgen**
2. **Click "Generate"**
3. **Move your mouse** over the blank area (to generate randomness)
4. **Wait for key generation**

### Step 3: Save Keys

1. **Enter a comment** (your email or name)
2. **Optional:** Enter a passphrase
3. **Click "Save private key"** → Save as `id_rsa.ppk` (keep this safe!)
4. **Copy the public key** from the text box at the top

### Step 4: Add to Hostinger

1. **Paste the public key** in Hostinger modal
2. **Enter a name**
3. **Click "Save"**

---

## After Adding SSH Key

### Connect to Your VPS

**Using PowerShell:**
```powershell
ssh root@YOUR_VPS_IP
```

**Using PuTTY:**
1. Open PuTTY
2. Enter your VPS IP
3. Go to **Connection → SSH → Auth → Credentials**
4. Browse and select your `id_rsa.ppk` file
5. Click "Open"

---

## Quick Commands Summary

```powershell
# Generate key
ssh-keygen -t ed25519 -C "your_email@example.com"

# View public key
cat ~/.ssh/id_ed25519.pub

# Connect to VPS
ssh root@YOUR_VPS_IP
```

---

## ✅ Checklist

- [ ] SSH key generated
- [ ] Public key copied
- [ ] Key added to Hostinger
- [ ] Can connect to VPS via SSH

---

## 🆘 Troubleshooting

### "ssh-keygen: command not found"
- You're using an older Windows version
- Use PuTTY method instead

### "Permission denied" when connecting
- Make sure you added the **public key** (not private key) to Hostinger
- Check if you're using the correct username (`root`)

### "Host key verification failed"
- Run: `ssh-keygen -R YOUR_VPS_IP` to remove old host key
- Then try connecting again

---

## 📝 Notes

- **Public key** (`id_ed25519.pub`) → Safe to share, add to Hostinger
- **Private key** (`id_ed25519`) → Keep secret, never share!

Once you add the SSH key to Hostinger, you can connect without entering a password each time! 🎉

