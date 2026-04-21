# 🏷️ Instant Tag Sync Setup Guide

## Problem
Tags changed in Shopify don't appear immediately in your system.

## Solution
Your system is now configured to sync tags **ON THE SPOT** when they change in Shopify via webhooks.

---

## ✅ Required: Configure Shopify Webhooks

**IMPORTANT:** You MUST configure these webhooks in Shopify for tags to sync instantly:

### Step 1: Go to Shopify Admin
1. **Shopify Admin** → **Settings** → **Notifications** → **Webhooks**

### Step 2: Create These Webhooks

#### ✅ Webhook 1: Orders Updated (CRITICAL FOR TAGS)
- **Event:** `Order updated`
- **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-webhook`
- **Format:** JSON
- **Click:** Add header
  - **Header name:** `x-shopify-topic`
  - **Header value:** `orders/updated`

#### ✅ Webhook 2: Orders Created
- **Event:** `Order created`
- **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-webhook`
- **Format:** JSON
- **Click:** Add header
  - **Header name:** `x-shopify-topic`
  - **Header value:** `orders/create`

#### ✅ Webhook 3: Orders Cancelled (Optional)
- **Event:** `Order cancelled`
- **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-webhook`
- **Format:** JSON
- **Click:** Add header
  - **Header name:** `x-shopify-topic`
  - **Header value:** `orders/cancelled`

---

## 🚀 Instant Tag Sync Endpoints

### Option 1: Automatic Webhooks (RECOMMENDED)
Once webhooks are configured above, tags will sync **instantly** when:
- ✅ You add a tag in Shopify
- ✅ You remove a tag in Shopify  
- ✅ You edit any order data (tags included)

**Response time:** < 1 second

---

### Option 2: Manual Force Sync (If Webhook Fails)

**Sync all recent orders' tags immediately:**
```bash
curl -X POST http://localhost:3002/api/shopify/sync-tags
```

**Response example:**
```json
{
  "success": true,
  "message": "Tag sync complete",
  "ordersProcessed": 50,
  "tagsMismatch": 3,
  "tagsUpdated": 3
}
```

---

## 🔍 How to Verify Tags Are Syncing

### Test 1: Check Webhook Delivery
1. Go to **Shopify Admin** → **Settings** → **Notifications** → **Webhooks**
2. Click on the webhook URL you created
3. Scroll to **Recent deliveries**
4. You should see successful deliveries (200 status)

### Test 2: Manual Tag Test
1. **In Shopify:** Add a tag to any order (e.g., "TEST-TAG-123")
2. **Check your system:** Tag should appear within **1 second**
3. **Remove the tag in Shopify:** It should disappear from your system **immediately**

### Test 3: Check Server Logs
Watch for these logs when webhooks are received:
```
🏷️  Tags updated for order #12345: ["old-tag"] → ["new-tag"]
```

---

## 📊 Real-Time Updates Without Webhooks

If webhooks aren't working, you can:

**Option A:** Use the on-demand endpoint
```bash
POST /api/shopify/sync-tags
```
Compares all recent Shopify orders with your database and updates any mismatches.

**Option B:** Manual single order sync
```bash
POST /api/shopify/sync-order/:shopifyId
```

---

## ⚠️ Troubleshooting

### Tags Not Syncing?

**Check 1: Webhook Configured?**
```bash
# In Shopify Admin → Settings → Notifications
# Verify "Order updated" webhook is ACTIVE (green checkmark)
```

**Check 2: Webhook URL Correct?**
- Should be: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-webhook`
- NOT: `http://localhost:3002/...` (local URLs won't work from Shopify)

**Check 3: Test Webhook Manually**
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-webhook \
  -H "Content-Type: application/json" \
  -H "x-shopify-topic: orders/updated" \
  -d '{
    "id": 12345,
    "name": "#1001",
    "tags": "new-tag, test-tag",
    "order_number": 1001
  }'
```

**Check 4: Force Sync Now**
```bash
curl -X POST http://localhost:3002/api/shopify/sync-tags
```
If tags update with this, webhooks aren't being received properly.

---

## 📝 Summary

| Action | Where Configured | How Long |
|--------|------------------|----------|
| **Add tag in Shopify** | Done automatically via webhook | < 1 second |
| **Remove tag in Shopify** | Done automatically via webhook | < 1 second |
| **Manual force sync** | `POST /api/shopify/sync-tags` | 5-10 seconds |
| **Check webhook status** | Shopify → Settings → Notifications | Real-time |

---

## 🎯 Quick Setup Checklist

- [ ] Go to Shopify Admin → Settings → Notifications → Webhooks
- [ ] Create "Order updated" webhook with `orders/updated` header
- [ ] Create "Order created" webhook with `orders/create` header  
- [ ] Test by adding/removing a tag in Shopify
- [ ] Monitor webhook deliveries in Shopify admin
- [ ] If issues, run `POST /api/shopify/sync-tags` to force sync

**Done!** Tags will now sync instantly when changed in Shopify. 🚀
