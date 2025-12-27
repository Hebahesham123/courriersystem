# 🛒 Complete Shopify Order Sync Setup

## ✅ What's Included Now

Your Shopify sync now imports **COMPLETE order data** including:

### 📦 Order Information
- ✅ Order ID, Number, Name
- ✅ Shopify Order ID (for tracking)
- ✅ Order status and fulfillment status
- ✅ Order tags and notes
- ✅ Created/Updated/Cancelled dates

### 👤 Customer Information
- ✅ Full customer name
- ✅ Customer email
- ✅ Customer phone
- ✅ Customer ID (Shopify)

### 📍 Address Information
- ✅ Complete billing address (JSON)
- ✅ Complete shipping address (JSON)
- ✅ City, Country, ZIP for both
- ✅ Formatted address string

### 💰 Financial Information
- ✅ Total price
- ✅ Subtotal
- ✅ Tax amount
- ✅ Discounts
- ✅ Shipping cost
- ✅ Currency
- ✅ Payment method
- ✅ Payment status
- ✅ Financial status
- ✅ Payment gateway names

### 📦 Products/Items
- ✅ All line items (products) stored in `order_items` table
- ✅ Product images
- ✅ Product details (SKU, vendor, type)
- ✅ Quantity, price, discounts
- ✅ Product properties

### 🚚 Shipping Information
- ✅ Shipping method
- ✅ Fulfillment status
- ✅ Tracking number
- ✅ Tracking URL

### 🖼️ Images
- ✅ Product images from line items
- ✅ Stored in `product_images` JSON field
- ✅ Also in `order_items` table with `image_url`

### 📊 Raw Data
- ✅ Complete Shopify order data stored as JSON
- ✅ For reference and future use

## 🗄️ Database Setup

### Step 1: Update Orders Table

Run this SQL in Supabase SQL Editor:

**File**: `UPDATE_ORDERS_TABLE_FOR_SHOPIFY.sql`

This adds:
- All missing columns (payment_status, customer_email, etc.)
- Complete address fields
- Product/images fields
- Financial fields
- Shipping fields
- Raw Shopify data field

### Step 2: Create Order Items Table

The SQL script also creates the `order_items` table for detailed product information.

## 🚀 How to Use

### 1. Run Database Update

1. Go to Supabase Dashboard → SQL Editor
2. Open `UPDATE_ORDERS_TABLE_FOR_SHOPIFY.sql`
3. Copy and paste entire file
4. Click "Run"

### 2. Restart Sync Server

```bash
# Stop current server (Ctrl+C)
npm run shopify-sync
```

### 3. Verify Sync

The sync will now:
- ✅ Import complete order data
- ✅ Store all products in `order_items` table
- ✅ Include all images
- ✅ Store complete customer data
- ✅ Include all payment information

## 📊 Data Structure

### Orders Table
Contains all order-level data:
- Order info
- Customer info
- Addresses
- Financial data
- Shipping info
- Product summary (line_items JSON)
- Images summary (product_images JSON)

### Order Items Table
Contains detailed product information:
- One row per product/item
- Product details
- Images
- Prices
- Quantities
- Properties

## 🔍 Querying Data

### Get Order with Products

```sql
SELECT 
  o.*,
  json_agg(oi.*) as items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.order_id = 'ORDER_NUMBER'
GROUP BY o.id;
```

### Get Orders with Images

```sql
SELECT 
  order_id,
  customer_name,
  product_images,
  line_items
FROM orders
WHERE product_images IS NOT NULL;
```

## 🎯 What You Get

Every order now includes:
- ✅ **Everything from Shopify** - Complete order data
- ✅ **Product details** - All items with images
- ✅ **Customer data** - Full customer information
- ✅ **Payment info** - Complete payment details
- ✅ **Shipping info** - Tracking, fulfillment status
- ✅ **Images** - Product images stored
- ✅ **Raw data** - Original Shopify JSON for reference

## 🔄 Auto-Sync

The sync runs **every 5 minutes** and:
- ✅ Imports new orders with complete data
- ✅ Updates existing orders with latest data
- ✅ Syncs all products/items
- ✅ Updates images
- ✅ Keeps everything in sync with Shopify

---

**Your orders are now complete Shopify replicas! 🎉**

