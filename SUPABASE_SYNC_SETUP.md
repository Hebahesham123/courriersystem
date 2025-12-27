# 🚀 Supabase-Based Shopify Sync Setup (Recommended)

## ✅ Why This is Better Than VPS

- ✅ **100% Free** (Supabase free tier includes Edge Functions + pg_cron)
- ✅ **No server to manage** (fully managed by Supabase)
- ✅ **Instant updates** via webhooks
- ✅ **Automatic backup sync** every 5 minutes
- ✅ **More reliable** (Supabase infrastructure)
- ✅ **Simpler setup** (no SSH, no PM2, no VPS)

---

## 📋 Architecture Overview

```
Shopify → Webhook → Supabase Edge Function → Database (INSTANT)
                ↓
Shopify → pg_cron (every 5 min) → Edge Function → Database (BACKUP SYNC)
```

---

## 🛠️ Step 1: Create Database Tables

Run this SQL in **Supabase SQL Editor**:

```sql
-- Shopify orders table
CREATE TABLE IF NOT EXISTS shopify_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id bigint UNIQUE NOT NULL,
  order_id text NOT NULL,
  order_name text,
  order_number text,
  status text DEFAULT 'pending',
  financial_status text,
  fulfillment_status text,
  total_price numeric NOT NULL DEFAULT 0,
  subtotal_price numeric,
  total_tax numeric,
  total_discounts numeric,
  total_shipping_price numeric,
  currency text DEFAULT 'EGP',
  
  -- Customer info
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_id bigint,
  
  -- Addresses
  address text NOT NULL,
  shipping_address jsonb,
  billing_address jsonb,
  billing_city text,
  shipping_city text,
  
  -- Payment
  payment_method text,
  payment_status text,
  payment_gateway_names text[],
  
  -- Shipping
  shipping_method text,
  tracking_number text,
  tracking_url text,
  
  -- Products
  line_items jsonb,
  product_images jsonb,
  
  -- Metadata
  order_tags text[],
  order_note text,
  customer_note text,
  notes text,
  
  -- Timestamps
  shopify_created_at timestamptz,
  shopify_updated_at timestamptz,
  shopify_cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shopify order items table
CREATE TABLE IF NOT EXISTS shopify_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES shopify_orders(id) ON DELETE CASCADE,
  shopify_line_item_id bigint,
  shopify_order_id bigint,
  product_id bigint,
  variant_id bigint,
  title text NOT NULL,
  variant_title text,
  quantity integer DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  total_discount numeric DEFAULT 0,
  sku text,
  vendor text,
  product_type text,
  image_url text,
  shopify_raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sync state table (single row)
CREATE TABLE IF NOT EXISTS shopify_sync_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_synced_at timestamptz DEFAULT now(),
  last_sync_status text,
  last_sync_error text,
  updated_at timestamptz DEFAULT now()
);

-- Insert initial sync state
INSERT INTO shopify_sync_state (id, last_synced_at)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_orders_shopify_order_id ON shopify_orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_order_id ON shopify_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_created_at ON shopify_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_updated_at ON shopify_orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_shopify_order_items_order_id ON shopify_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_order_items_shopify_order_id ON shopify_order_items(shopify_order_id);

-- Enable Row Level Security
ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your needs)
-- Allow admins to read/write
CREATE POLICY "Admins can manage shopify_orders" ON shopify_orders
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow couriers to read assigned orders
CREATE POLICY "Couriers can read assigned shopify_orders" ON shopify_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.shopify_order_id = shopify_orders.shopify_order_id
      AND orders.assigned_courier_id = auth.uid()
    )
  );

-- Similar policies for order_items
CREATE POLICY "Admins can manage shopify_order_items" ON shopify_order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
```

---

## 🔧 Step 2: Create Supabase Edge Function for Webhook

### 2.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 2.2 Initialize Supabase (if not already)

```bash
supabase init
supabase link --project-ref YOUR_PROJECT_REF
```

### 2.3 Create Webhook Edge Function

```bash
supabase functions new shopify-webhook
```

### 2.4 Edit `supabase/functions/shopify-webhook/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const shopifyOrder = await req.json()
    const topic = req.headers.get('x-shopify-topic') || 'orders/create'

    console.log(`Received webhook: ${topic}`, shopifyOrder.id || shopifyOrder.order_id)

    // Normalize payment method
    const normalizePayment = (gateway: string, financialStatus: string) => {
      const gatewayLower = (gateway || '').toLowerCase()
      const statusLower = (financialStatus || '').toLowerCase()

      if (gatewayLower.includes('paymob') || gatewayLower.includes('pay mob')) {
        return { method: 'paymob', status: 'paid' }
      }
      if (gatewayLower.includes('valu')) {
        return { method: 'valu', status: 'paid' }
      }
      if (gatewayLower.includes('card') || gatewayLower.includes('stripe')) {
        return { method: 'paid', status: 'paid' }
      }
      if (statusLower.includes('paid')) {
        return { method: 'paid', status: 'paid' }
      }
      return { method: 'cash', status: 'cod' }
    }

    const paymentInfo = normalizePayment(
      shopifyOrder.gateway || shopifyOrder.payment_gateway_names?.[0],
      shopifyOrder.financial_status
    )

    const shippingAddress = shopifyOrder.shipping_address || {}
    const billingAddress = shopifyOrder.billing_address || {}
    const customer = shopifyOrder.customer || {}

    // Prepare order data
    const orderData = {
      shopify_order_id: shopifyOrder.id,
      order_id: shopifyOrder.name || shopifyOrder.order_number?.toString() || shopifyOrder.id?.toString(),
      order_name: shopifyOrder.name,
      order_number: shopifyOrder.order_number?.toString(),
      status: 'pending',
      financial_status: shopifyOrder.financial_status || paymentInfo.status,
      fulfillment_status: shopifyOrder.fulfillment_status,
      total_price: parseFloat(shopifyOrder.total_price || 0),
      subtotal_price: parseFloat(shopifyOrder.subtotal_price || 0),
      total_tax: parseFloat(shopifyOrder.total_tax || 0),
      total_discounts: parseFloat(shopifyOrder.total_discounts || 0),
      total_shipping_price: parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount || 0),
      currency: shopifyOrder.currency || 'EGP',
      customer_name: shippingAddress.name || billingAddress.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
      customer_email: customer.email || shopifyOrder.email,
      customer_phone: shippingAddress.phone || billingAddress.phone || customer.phone || 'N/A',
      customer_id: customer.id,
      address: shippingAddress.address1 || shippingAddress.address2 || billingAddress.address1 || 'N/A',
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      billing_city: billingAddress.city,
      shipping_city: shippingAddress.city,
      payment_method: paymentInfo.method,
      payment_status: paymentInfo.status,
      payment_gateway_names: shopifyOrder.payment_gateway_names || [],
      shipping_method: shopifyOrder.shipping_lines?.[0]?.title,
      tracking_number: shopifyOrder.fulfillments?.[0]?.tracking_number,
      tracking_url: shopifyOrder.fulfillments?.[0]?.tracking_url,
      line_items: shopifyOrder.line_items || [],
      product_images: (shopifyOrder.line_items || []).map((item: any) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        image: item.image || item.variant?.image || null,
        title: item.title,
      })),
      order_tags: shopifyOrder.tags ? shopifyOrder.tags.split(',').map((t: string) => t.trim()) : [],
      order_note: shopifyOrder.note,
      customer_note: shopifyOrder.customer_note,
      notes: shopifyOrder.note || shopifyOrder.customer_note || '',
      shopify_created_at: shopifyOrder.created_at ? new Date(shopifyOrder.created_at).toISOString() : null,
      shopify_updated_at: shopifyOrder.updated_at ? new Date(shopifyOrder.updated_at).toISOString() : null,
      shopify_cancelled_at: shopifyOrder.cancelled_at ? new Date(shopifyOrder.cancelled_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    // Upsert order
    const { data: order, error: orderError } = await supabaseClient
      .from('shopify_orders')
      .upsert(orderData, {
        onConflict: 'shopify_order_id',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error upserting order:', orderError)
      throw orderError
    }

    // Sync order items
    if (shopifyOrder.line_items && shopifyOrder.line_items.length > 0 && order) {
      const items = shopifyOrder.line_items.map((item: any) => ({
        shopify_line_item_id: item.id,
        shopify_order_id: shopifyOrder.id,
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        title: item.title || '',
        variant_title: item.variant_title,
        quantity: item.quantity || 1,
        price: parseFloat(item.price || 0),
        total_discount: parseFloat(item.total_discount || 0),
        sku: item.sku,
        vendor: item.vendor,
        product_type: item.product_type,
        image_url: item.image || item.variant?.image,
        shopify_raw_data: item,
      }))

      // Delete existing items and insert new ones
      await supabaseClient
        .from('shopify_order_items')
        .delete()
        .eq('shopify_order_id', shopifyOrder.id)

      const { error: itemsError } = await supabaseClient
        .from('shopify_order_items')
        .insert(items)

      if (itemsError) {
        console.error('Error inserting order items:', itemsError)
      }
    }

    // Also sync to your main orders table if needed
    // (You can create a mapping or use shopify_orders directly)

    return new Response(
      JSON.stringify({ success: true, order_id: order.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
```

### 2.5 Deploy Webhook Function

```bash
supabase functions deploy shopify-webhook
```

### 2.6 Get Function URL

After deployment, you'll get a URL like:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-webhook
```

---

## ⏰ Step 3: Create Scheduled Sync Edge Function

### 3.1 Create Sync Function

```bash
supabase functions new shopify-sync
```

### 3.2 Edit `supabase/functions/shopify-sync/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const shopifyStoreUrl = Deno.env.get('SHOPIFY_STORE_URL') ?? ''
    const shopifyAccessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN') ?? ''
    const shopifyApiVersion = Deno.env.get('SHOPIFY_API_VERSION') || '2024-10'

    // Get last sync time
    const { data: syncState } = await supabaseClient
      .from('shopify_sync_state')
      .select('last_synced_at')
      .eq('id', 1)
      .single()

    const lastSyncedAt = syncState?.last_synced_at 
      ? new Date(syncState.last_synced_at).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago

    // Fetch orders from Shopify
    const url = `https://${shopifyStoreUrl}/admin/api/${shopifyApiVersion}/orders.json?limit=250&status=any&created_at_min=${lastSyncedAt}`
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': shopifyAccessToken,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`)
    }

    const data = await response.json()
    const orders = data.orders || []

    console.log(`Syncing ${orders.length} orders from Shopify`)

    // Process each order (similar to webhook logic)
    let imported = 0
    let updated = 0

    for (const shopifyOrder of orders) {
      // Use same normalization logic as webhook
      // ... (copy the webhook processing logic here)
      
      // Upsert order
      const { error } = await supabaseClient
        .from('shopify_orders')
        .upsert(orderData, { onConflict: 'shopify_order_id' })

      if (error) {
        console.error(`Error syncing order ${shopifyOrder.id}:`, error)
      } else {
        // Check if it was new or update
        const { data: existing } = await supabaseClient
          .from('shopify_orders')
          .select('id')
          .eq('shopify_order_id', shopifyOrder.id)
          .single()

        if (existing) {
          updated++
        } else {
          imported++
        }
      }
    }

    // Update sync state
    await supabaseClient
      .from('shopify_sync_state')
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported, 
        updated,
        total: orders.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Sync error:', error)
    
    // Update sync state with error
    await supabaseClient
      .from('shopify_sync_state')
      .update({
        last_sync_status: 'error',
        last_sync_error: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
```

### 3.3 Deploy Sync Function

```bash
supabase functions deploy shopify-sync
```

---

## ⏰ Step 4: Set Up pg_cron (5-minute schedule)

Run this SQL in **Supabase SQL Editor**:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension (for HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Get your function URL (replace YOUR_PROJECT_REF)
-- Format: https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-sync

-- Schedule cron job to run every 5 minutes
SELECT cron.schedule(
  'shopify-sync-every-5-min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_ANON_KEY'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Verify cron job is scheduled
SELECT * FROM cron.job WHERE jobname = 'shopify-sync-every-5-min';
```

**Important:** Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon key (or create a service role key for this)

---

## 🔗 Step 5: Configure Shopify Webhooks

1. **Go to Shopify Admin** → **Settings** → **Notifications**
2. **Scroll to "Webhooks"** section
3. **Create webhook** for each event:
   - **Event:** `Order creation`
   - **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-webhook`
   - **Format:** JSON
   
   Repeat for:
   - Order paid
   - Order cancelled
   - Order fulfilled
   - Order updated

4. **Add HTTP header:**
   - **Header name:** `x-shopify-topic`
   - **Header value:** `orders/create` (or appropriate topic)

---

## 🔐 Step 6: Set Environment Variables

In **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**:

Add:
```
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_token
SHOPIFY_API_VERSION=2024-10
```

---

## ✅ Step 7: Link Shopify Orders to Your Orders Table

You can either:
1. **Use shopify_orders directly** in your courier system
2. **Create a mapping table** to link shopify_orders to your orders table
3. **Auto-create orders** in your orders table when shopify_orders are created

Example mapping:

```sql
-- Add shopify_order_id to your existing orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_order_id bigint REFERENCES shopify_orders(shopify_order_id);

-- Create trigger to auto-create order when shopify_order is created
CREATE OR REPLACE FUNCTION sync_shopify_to_orders()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO orders (
    order_id,
    customer_name,
    address,
    mobile_number,
    total_order_fees,
    payment_method,
    status,
    shopify_order_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.order_id,
    NEW.customer_name,
    NEW.address,
    NEW.customer_phone,
    NEW.total_price,
    NEW.payment_method,
    'pending',
    NEW.shopify_order_id,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (shopify_order_id) DO UPDATE
  SET
    customer_name = EXCLUDED.customer_name,
    address = EXCLUDED.address,
    mobile_number = EXCLUDED.customer_phone,
    total_order_fees = EXCLUDED.total_price,
    payment_method = EXCLUDED.payment_method,
    updated_at = EXCLUDED.updated_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_shopify_order_created
  AFTER INSERT OR UPDATE ON shopify_orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_shopify_to_orders();
```

---

## 🧪 Testing

### Test Webhook:
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-webhook \
  -H "Content-Type: application/json" \
  -H "x-shopify-topic: orders/create" \
  -d '{"id": 123, "name": "#1001", ...}'
```

### Test Sync Function:
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/shopify-sync \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Check Sync State:
```sql
SELECT * FROM shopify_sync_state;
```

---

## 📊 Monitoring

View sync status:
```sql
SELECT 
  last_synced_at,
  last_sync_status,
  last_sync_error,
  updated_at
FROM shopify_sync_state;
```

View recent orders:
```sql
SELECT 
  order_id,
  customer_name,
  total_price,
  status,
  created_at
FROM shopify_orders
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ Benefits

- ✅ **100% Free** (Supabase free tier)
- ✅ **No VPS needed**
- ✅ **Instant updates** via webhooks
- ✅ **Automatic backup sync** every 5 minutes
- ✅ **Fully managed** by Supabase
- ✅ **Scalable** and reliable

---

## 🎯 Summary

1. ✅ Create database tables
2. ✅ Deploy webhook Edge Function
3. ✅ Deploy sync Edge Function
4. ✅ Set up pg_cron (5-minute schedule)
5. ✅ Configure Shopify webhooks
6. ✅ Set environment variables
7. ✅ Link to your orders table (optional)

**Result:** Orders sync instantly via webhooks + backup sync every 5 minutes! 🎉

