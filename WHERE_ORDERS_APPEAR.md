# 📍 Where Shopify Orders Appear in Your System

## 🎯 Main Location: Admin Orders Page

Your Shopify orders will appear in the **Admin Orders Management** page:

### How to Access:

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Login as Admin:**
   - Go to: http://localhost:5173 (or your dev server URL)
   - Login with: `heba@gmail.com` / your password

3. **Navigate to Orders:**
   - Click on **"Orders"** or **"الطلبات"** in the sidebar
   - Or go directly to: http://localhost:5173/admin/orders

## 📊 What You'll See

### Orders Table View
- ✅ **Order ID** - Shopify order number (e.g., #1001, #1002)
- ✅ **Customer Name** - From Shopify
- ✅ **Phone Number** - Customer phone
- ✅ **Address** - Shipping address
- ✅ **Total Amount** - Order total
- ✅ **Payment Method** - Cash, Card, Paymob, ValU, etc.
- ✅ **Payment Status** - Paid, Pending, COD
- ✅ **Status** - Pending, Assigned, Delivered, etc.
- ✅ **Created Date** - When order was created in Shopify

### Order Details
When you click on an order or expand it, you'll see:
- ✅ Complete customer information
- ✅ Full address details
- ✅ All products/items in the order
- ✅ Product images
- ✅ Payment details
- ✅ Shipping information
- ✅ Order notes

## 🔄 Auto-Refresh

Orders appear **automatically** every 5 minutes as the sync runs. You can also:
- **Refresh the page** to see latest orders
- **Click refresh button** in the orders page

## 📱 Other Places Orders Appear

### 1. Admin Dashboard (Summary)
- **Route**: `/admin` or `/`
- Shows order statistics and summaries
- Quick overview of all orders

### 2. Admin Analytics
- **Route**: `/admin/analytics`
- Shows order analytics and reports
- Filter by date, courier, status, etc.

### 3. Courier View (for assigned orders)
- **Route**: `/courier/orders`
- Couriers only see orders assigned to them
- Shows their assigned orders from Shopify

## 🎨 Visual Guide

```
Your System Navigation:
├── Dashboard (/admin)
│   └── Summary of all orders
├── Orders (/admin/orders) ⭐ MAIN LOCATION
│   └── All Shopify orders appear here
│   └── Complete order management
├── Analytics (/admin/analytics)
│   └── Order reports and statistics
├── Upload Orders (/admin/upload)
│   └── Manual Excel upload (optional now)
└── Requests (/admin/requests)
    └── Customer requests (separate from orders)
```

## ✅ After Running Database Update

Once you run `UPDATE_ORDERS_TABLE_FOR_SHOPIFY.sql`:

1. **Restart your sync server:**
   ```bash
   npm run shopify-sync
   ```

2. **Wait for first sync** (runs automatically on startup)

3. **Go to Admin Orders page:**
   - http://localhost:5173/admin/orders

4. **You'll see:**
   - All Shopify orders
   - Complete product information
   - Customer data
   - Images
   - Payment details
   - Everything from Shopify!

## 🔍 Verify Orders Are Syncing

1. **Check sync server logs:**
   ```
   ✅ Success with API version 2024-10!
   📦 Found 250 orders in Shopify
   ✅ Sync complete: 250 imported, 0 updated
   ```

2. **Check database:**
   - Go to Supabase Dashboard → Database → Tables → `orders`
   - You should see orders with `shopify_order_id` populated

3. **Check admin panel:**
   - Go to `/admin/orders`
   - Orders should appear in the table

## 📝 Quick Access URLs

- **Admin Orders**: http://localhost:5173/admin/orders
- **Admin Dashboard**: http://localhost:5173/admin
- **Admin Analytics**: http://localhost:5173/admin/analytics

---

**Your Shopify orders will appear in `/admin/orders` automatically every 5 minutes! 🎉**

