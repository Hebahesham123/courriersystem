// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get environment variables
    let shopifyStoreUrl = Deno.env.get('SHOPIFY_STORE_URL') ?? ''
    let shopifyAccessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN') ?? ''
    const shopifyApiVersion = Deno.env.get('SHOPIFY_API_VERSION') || '2024-10'

    // Debug: Log all environment variable names (not values for security)
    const envKeys = Object.keys(Deno.env.toObject())
    const shopifyKeys = envKeys.filter(key => key.includes('SHOPIFY'))
    console.log('Available SHOPIFY env vars:', shopifyKeys)
    console.log('SHOPIFY_STORE_URL exists:', Deno.env.get('SHOPIFY_STORE_URL') !== null)
    console.log('SHOPIFY_STORE_URL value:', shopifyStoreUrl ? `${shopifyStoreUrl.substring(0, 20)}...` : 'EMPTY')
    console.log('SHOPIFY_STORE_URL value length:', (Deno.env.get('SHOPIFY_STORE_URL') || '').length)
    console.log('SHOPIFY_ACCESS_TOKEN exists:', Deno.env.get('SHOPIFY_ACCESS_TOKEN') !== null)
    console.log('SHOPIFY_ACCESS_TOKEN starts with:', shopifyAccessToken ? shopifyAccessToken.substring(0, 10) : 'EMPTY')
    console.log('SHOPIFY_ACCESS_TOKEN length:', (Deno.env.get('SHOPIFY_ACCESS_TOKEN') || '').length)

    // Validate that secrets are set (don't use fallbacks - fail fast if secrets are missing)
    if (!shopifyStoreUrl || shopifyStoreUrl.trim() === '' || shopifyStoreUrl === 'your-store.myshopify.com') {
      throw new Error('SHOPIFY_STORE_URL secret is not set or is using placeholder value. Please set it in Supabase Dashboard → Edge Functions → Secrets')
    }
    if (!shopifyAccessToken || shopifyAccessToken.trim() === '' || shopifyAccessToken === 'shpat_YOUR_ACCESS_TOKEN_HERE') {
      throw new Error('SHOPIFY_ACCESS_TOKEN secret is not set or is using placeholder value. Please set it in Supabase Dashboard → Edge Functions → Secrets')
    }
    
    // Validate token format (should start with shpat_ and be at least 30 characters)
    if (!shopifyAccessToken.startsWith('shpat_') || shopifyAccessToken.length < 30) {
      throw new Error(`SHOPIFY_ACCESS_TOKEN appears to be invalid. Token should start with 'shpat_' and be at least 30 characters. Current length: ${shopifyAccessToken.length}`)
    }

    // Validate environment variables
    if (!shopifyStoreUrl || shopifyStoreUrl.trim() === '') {
      throw new Error('SHOPIFY_STORE_URL environment variable is not set. Please add it in Supabase Dashboard → Edge Functions → Secrets')
    }
    if (!shopifyAccessToken || shopifyAccessToken.trim() === '') {
      throw new Error('SHOPIFY_ACCESS_TOKEN environment variable is not set. Please add it in Supabase Dashboard → Edge Functions → Secrets')
    }

    console.log('Shopify config:', {
      storeUrl: shopifyStoreUrl,
      storeUrlLength: shopifyStoreUrl.length,
      apiVersion: shopifyApiVersion,
      hasToken: !!shopifyAccessToken,
      tokenLength: shopifyAccessToken.length
    })

    // Ensure store URL doesn't have https:// or trailing slashes
    const cleanStoreUrl = shopifyStoreUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    
    // Normalize payment method (enhanced to handle gift cards and partial payments)
    const normalizePayment = (gateway: string, financialStatus: string, transactions: any[] = []) => {
      const gatewayLower = (gateway || '').toLowerCase()
      const statusLower = (financialStatus || '').toLowerCase()

      // Check for gift card payments in transactions
      const giftCardTransactions = transactions.filter((t: any) => 
        (t.gateway && t.gateway.toLowerCase().includes('gift')) ||
        t.kind === 'gift_card' ||
        (t.payment_details && t.payment_details.credit_card_company === 'gift_card')
      )

      // Check for partial payments
      const isPartiallyPaid = statusLower.includes('partially') || statusLower === 'partially_paid'
      
      // Collect all payment methods used
      const paymentMethods: string[] = []
      if (giftCardTransactions.length > 0) {
        paymentMethods.push('gift_card')
      }
      
      // Check for ValU (separate from Paymob)
      if (gatewayLower.includes('valu')) {
        if (!paymentMethods.includes('valu')) paymentMethods.push('valu')
      }
      
      // All card and online payment methods should be normalized to 'paymob'
      // This includes: paymob, card, visa, mastercard, credit, debit, sohoola, sympl, tru, stripe, fawry, instapay, etc.
      const isOnlinePayment = 
        gatewayLower.includes('paymob') || 
        gatewayLower.includes('pay mob') ||
        gatewayLower.includes('card') ||
        gatewayLower.includes('visa') ||
        gatewayLower.includes('mastercard') ||
        gatewayLower.includes('master card') ||
        gatewayLower.includes('credit') ||
        gatewayLower.includes('debit') ||
        gatewayLower.includes('sohoola') ||
        gatewayLower.includes('sympl') ||
        gatewayLower.includes('tru') ||
        gatewayLower.includes('stripe') ||
        gatewayLower.includes('paypal') ||
        gatewayLower.includes('square') ||
        gatewayLower.includes('razorpay') ||
        gatewayLower.includes('fawry') ||
        gatewayLower.includes('instapay') ||
        gatewayLower.includes('vodafone cash') ||
        gatewayLower.includes('vodafonecash') ||
        gatewayLower.includes('orange cash') ||
        gatewayLower.includes('orangecash') ||
        gatewayLower.includes('we pay') ||
        gatewayLower.includes('wepay')
      
      if (isOnlinePayment) {
        if (!paymentMethods.includes('paymob')) paymentMethods.push('paymob')
      }

      // Determine payment status
      // Paymob, Valu, and all online payment methods are always paid, regardless of financial_status
      let paymentStatus = 'cod'
      if (gatewayLower.includes('valu')) {
        paymentStatus = 'paid'
      } else if (isOnlinePayment) {
        paymentStatus = 'paid'
      } else if (statusLower.includes('paid') && !isPartiallyPaid) {
        paymentStatus = 'paid'
      } else if (isPartiallyPaid) {
        paymentStatus = 'partially_paid'
      } else if (statusLower.includes('pending') || statusLower.includes('authorized')) {
        paymentStatus = 'pending'
      }

      // Determine primary payment method
      let primaryMethod = 'cash'
      if (paymentMethods.length > 0) {
        primaryMethod = paymentMethods[0]
      } else if (statusLower.includes('paid') && !isPartiallyPaid) {
        primaryMethod = 'paid'
      }

      return { 
        method: primaryMethod, 
        status: paymentStatus,
        paymentMethods: paymentMethods,
        hasGiftCard: giftCardTransactions.length > 0,
        isPartiallyPaid: isPartiallyPaid
      }
    }

    // Function to process a single order
    const processOrder = async (shopifyOrder: any, imageMap: Record<string, string> = {}): Promise<{ imported: boolean, updated: boolean }> => {
      // Get payment transactions (for gift cards and partial payments)
      const transactions = shopifyOrder.payment_transactions || []
      
      // Check both gateway and payment_gateway_names for payment method detection
      const gatewayString = shopifyOrder.gateway || 
                           shopifyOrder.payment_gateway_names?.[0] || 
                           (Array.isArray(shopifyOrder.payment_gateway_names) ? shopifyOrder.payment_gateway_names.join(' ') : '') ||
                           ''
      
      const paymentInfo = normalizePayment(
        gatewayString,
        shopifyOrder.financial_status,
        transactions
      )

      const shippingAddress = shopifyOrder.shipping_address || {}
      const billingAddress = shopifyOrder.billing_address || {}
      const customer = shopifyOrder.customer || {}

      // Helper function to extract image URL from various formats
      const extractImageUrl = (item: any): string | null => {
        let imageUrl: string | null = null
        
        // Priority 1: Try from imageMap (fetched from Products API) - most reliable!
        if (item.variant_id) {
          imageUrl = imageMap[String(item.variant_id)] || imageMap[Number(item.variant_id)] || null
        }
        if (!imageUrl && item.product_id) {
          imageUrl = imageMap[String(item.product_id)] || imageMap[Number(item.product_id)] || null
        }
        
        // Priority 2: Direct item.image (sometimes included by Shopify)
        if (!imageUrl && item.image) {
          if (typeof item.image === 'string' && item.image.trim() !== '' && item.image !== 'null') {
            imageUrl = item.image
          } else if (typeof item.image === 'object' && item.image !== null) {
            imageUrl = item.image.src || item.image.url || item.image.original_src || null
          }
        }
        
        // Priority 3: item.variant.image
        if (!imageUrl && item.variant?.image) {
          if (typeof item.variant.image === 'string' && item.variant.image.trim() !== '' && item.variant.image !== 'null') {
            imageUrl = item.variant.image
          } else if (typeof item.variant.image === 'object' && item.variant.image !== null) {
            imageUrl = item.variant.image.src || item.variant.image.url || item.variant.image.original_src || null
          }
        }
        
        // Priority 4: item.variant.featured_image
        if (!imageUrl && item.variant?.featured_image) {
          if (typeof item.variant.featured_image === 'string') {
            imageUrl = item.variant.featured_image
          } else if (typeof item.variant.featured_image === 'object') {
            imageUrl = item.variant.featured_image.src || item.variant.featured_image.url || null
          }
        }
        
        // Priority 5: item.images array
        if (!imageUrl && item.images && Array.isArray(item.images) && item.images.length > 0) {
          const firstImg = item.images[0]
          if (typeof firstImg === 'string' && firstImg.trim() !== '' && firstImg !== 'null') {
            imageUrl = firstImg
          } else if (typeof firstImg === 'object' && firstImg !== null) {
            imageUrl = firstImg.src || firstImg.url || firstImg.original_src || null
          }
        }
        
        // Priority 6: item.product.images array
        if (!imageUrl && item.product?.images && Array.isArray(item.product.images) && item.product.images.length > 0) {
          const firstImg = item.product.images[0]
          if (typeof firstImg === 'string') {
            imageUrl = firstImg
          } else if (typeof firstImg === 'object' && firstImg !== null) {
            imageUrl = firstImg.src || firstImg.url || firstImg.original_src || null
          }
        }
        
        // Priority 7: item.product.image
        if (!imageUrl && item.product?.image) {
          if (typeof item.product.image === 'string') {
            imageUrl = item.product.image
          } else if (typeof item.product.image === 'object') {
            imageUrl = item.product.image.src || item.product.image.url || null
          }
        }
        
        // Normalize URL - ensure it's absolute
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
          imageUrl = `https://cdn.shopify.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
        }
        
        // Clean invalid values
        if (imageUrl === 'null' || imageUrl === 'undefined' || imageUrl?.trim() === '') {
          imageUrl = null
        }
        
        return imageUrl
      }

      // Check if order exists in orders table (where frontend reads from)
      const { data: existing } = await supabaseClient
        .from('orders')
        .select('id, assigned_courier_id, updated_at, status, payment_method, payment_status, financial_status, line_items')
        .eq('shopify_order_id', shopifyOrder.id)
        .maybeSingle()

      // PRESERVE REMOVED ITEMS in line_items JSON
      const currentLineItems = (shopifyOrder.line_items || []).map((item: any) => ({
        ...item,
        is_removed: item.quantity === 0 || item.fulfillment_status === 'removed' || (item.properties && item.properties._is_removed)
      }))

      let finalLineItems = [...currentLineItems]

      if (existing && existing.line_items) {
        let existingItems = []
        try {
          existingItems = typeof existing.line_items === 'string' 
            ? JSON.parse(existing.line_items) 
            : existing.line_items
        } catch (e) {
          existingItems = []
        }

        if (Array.isArray(existingItems)) {
          existingItems.forEach((oldItem: any) => {
            const stillExists = currentLineItems.some((newItem: any) => String(newItem.id) === String(oldItem.id))
            if (!stillExists) {
              finalLineItems.push({
                ...oldItem,
                quantity: 0,
                is_removed: true,
                fulfillment_status: 'removed',
                properties: { ...(oldItem.properties || {}), _is_removed: true }
              })
            }
          })
        }
      }

      // Prepare order data for orders table (frontend reads from here)
      // Determine initial status - preserve existing status if order was already processed
      let initialStatus = shopifyOrder.cancelled_at ? 'canceled' : 'pending'
      let initialPaymentMethod = paymentInfo.method
      let initialPaymentStatus = paymentInfo.status
      let initialCollectedBy = null
      let initialPaymentSubType = null
      
      if (existing) {
        // Preserve existing status if it's not pending (e.g., delivered, assigned, partial, etc.)
        // Processed statuses should never be reset to pending by Shopify sync
        const processedStatuses = ['delivered', 'partial', 'canceled', 'return', 'hand_to_hand', 'receiving_part', 'assigned']
        if (existing.status && processedStatuses.includes(existing.status)) {
          initialStatus = existing.status
          // For delivered orders with online payment methods, preserve payment info
          if (existing.status === 'delivered' && existing.payment_method && existing.payment_status === 'paid') {
            initialPaymentMethod = existing.payment_method
            initialPaymentStatus = existing.payment_status
            initialCollectedBy = existing.collected_by
            initialPaymentSubType = existing.payment_sub_type
          }
        }
        // Only override to canceled if Shopify says canceled AND order wasn't already processed
        if (shopifyOrder.cancelled_at && !processedStatuses.includes(existing.status || '')) {
          initialStatus = 'canceled'
        }
      }
      
      const orderData: any = {
        shopify_order_id: shopifyOrder.id,
        shopify_order_name: shopifyOrder.name,
        shopify_order_number: shopifyOrder.order_number?.toString(),
        order_id: shopifyOrder.name || shopifyOrder.order_number?.toString() || shopifyOrder.id?.toString(),
        status: initialStatus,
        financial_status: shopifyOrder.financial_status || paymentInfo.status,
        payment_status: initialPaymentStatus,
        payment_method: initialPaymentMethod,
        collected_by: initialCollectedBy,
        payment_sub_type: initialPaymentSubType,
        payment_gateway_names: shopifyOrder.payment_gateway_names || [],
        fulfillment_status: shopifyOrder.fulfillment_status,
        // Use current_total_price for edited orders, fallback to total_price
        total_order_fees: parseFloat(shopifyOrder.current_total_price || shopifyOrder.total_price || 0),
        subtotal_price: parseFloat(shopifyOrder.current_subtotal_price || shopifyOrder.subtotal_price || 0),
        total_tax: parseFloat(shopifyOrder.current_total_tax || shopifyOrder.total_tax || 0),
        total_discounts: parseFloat(shopifyOrder.current_total_discounts || shopifyOrder.total_discounts || 0),
        total_shipping_price: parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount || shopifyOrder.total_shipping_price_set?.amount || 0),
        currency: shopifyOrder.currency || 'EGP',
        customer_name: shippingAddress.name || billingAddress.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
        customer_email: customer.email || shopifyOrder.email,
        customer_phone: shippingAddress.phone || billingAddress.phone || customer.phone || 'N/A',
        mobile_number: shippingAddress.phone || billingAddress.phone || customer.phone || 'N/A',
        customer_id: customer.id,
        address: shippingAddress.address1 || shippingAddress.address2 || billingAddress.address1 || 'N/A',
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        billing_city: billingAddress.city,
        shipping_city: shippingAddress.city,
        billing_country: billingAddress.country,
        shipping_country: shippingAddress.country,
        payment_gateway_names: shopifyOrder.payment_gateway_names || [],
        // Store payment transactions for gift cards and partial payments
        payment_transactions: transactions.length > 0 ? JSON.stringify(transactions) : null,
        shipping_method: shopifyOrder.shipping_lines?.[0]?.title,
        tracking_number: shopifyOrder.fulfillments?.[0]?.tracking_number,
        tracking_url: shopifyOrder.fulfillments?.[0]?.tracking_url,
        line_items: finalLineItems,
        product_images: (shopifyOrder.line_items || []).map((item: any) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          image: extractImageUrl(item),
          title: item.title,
        })),
        order_tags: shopifyOrder.tags ? shopifyOrder.tags.split(',').map((t: string) => t.trim()) : [],
        order_note: shopifyOrder.note,
        customer_note: shopifyOrder.customer_note,
        notes: shopifyOrder.note || shopifyOrder.customer_note || '',
        shopify_created_at: shopifyOrder.created_at ? new Date(shopifyOrder.created_at).toISOString() : null,
        shopify_updated_at: shopifyOrder.updated_at ? new Date(shopifyOrder.updated_at).toISOString() : null,
        shopify_cancelled_at: shopifyOrder.cancelled_at ? new Date(shopifyOrder.cancelled_at).toISOString() : null,
        shopify_closed_at: shopifyOrder.closed_at ? new Date(shopifyOrder.closed_at).toISOString() : null,
        archived: shopifyOrder.closed_at ? true : false,
        created_at: shopifyOrder.created_at ? new Date(shopifyOrder.created_at).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      // If order already exists AND has a courier assigned, don't update certain fields
      // to preserve the assignment date and status
      if (existing && existing.assigned_courier_id) {
        const hasRemovedItems = (finalLineItems || []).some((i: any) => {
          const qtyZero = Number(i?.quantity) === 0
          const propRemoved = i?.properties?._is_removed === true || i?.properties?._is_removed === 'true'
          return i?.is_removed === true || qtyZero || propRemoved
        })

        // For orders with courier assignments, only update Shopify metadata, not the management fields
        // CRITICAL: Protect ALL courier edits - never overwrite what courier has set
        const hasCourierEdits = existing.delivery_fee || 
                                existing.partial_paid_amount || 
                                existing.collected_by || 
                                existing.payment_sub_type ||
                                existing.internal_comment ||
                                (existing.status && existing.status !== 'pending' && existing.status !== 'assigned')
        
        const updateData: any = {
          shopify_updated_at: orderData.shopify_updated_at,
          shopify_cancelled_at: orderData.shopify_cancelled_at,
          shopify_closed_at: orderData.shopify_closed_at,
          financial_status: orderData.financial_status,
          fulfillment_status: orderData.fulfillment_status,
          tracking_number: orderData.tracking_number,
          tracking_url: orderData.tracking_url,
          // Preserve any admin-edited totals over Shopify, even if unfulfilled
          total_order_fees: (() => {
            const existingTotal = existing.total_order_fees || 0
            const shopifyTotal = orderData.total_order_fees || 0
            const difference = Math.abs(existingTotal - shopifyTotal)
            if (difference > 0.01 && existingTotal > 0) {
              console.log(`🔒 Preserving manually edited total for order ${shopifyOrder.id}: ${existingTotal} (Shopify: ${shopifyTotal})`)
              return existingTotal
            }
            return orderData.total_order_fees
          })(),
          subtotal_price: orderData.subtotal_price,
          total_tax: orderData.total_tax,
          total_discounts: orderData.total_discounts,
          line_items: orderData.line_items,
          product_images: orderData.product_images,
          // Protect ALL courier-edited fields if order has courier edits
          payment_method: (hasCourierEdits && existing.payment_method)
            ? existing.payment_method
            : orderData.payment_method,
          payment_status: (hasCourierEdits && existing.payment_status)
            ? existing.payment_status
            : orderData.payment_status,
          collected_by: (hasCourierEdits && existing.collected_by)
            ? existing.collected_by
            : (existing.collected_by || orderData.collected_by),
          payment_sub_type: (hasCourierEdits && existing.payment_sub_type)
            ? existing.payment_sub_type
            : (existing.payment_sub_type || orderData.payment_sub_type),
          delivery_fee: (hasCourierEdits && existing.delivery_fee)
            ? existing.delivery_fee
            : (existing.delivery_fee || orderData.delivery_fee),
          partial_paid_amount: (hasCourierEdits && existing.partial_paid_amount)
            ? existing.partial_paid_amount
            : (existing.partial_paid_amount || orderData.partial_paid_amount),
          internal_comment: (hasCourierEdits && existing.internal_comment)
            ? existing.internal_comment
            : (existing.internal_comment || orderData.internal_comment),
          // DON'T update: status, assigned_courier_id, updated_at - these are managed by the courier system
        }
        
        const { error } = await supabaseClient
          .from('orders')
          .update(updateData)
          .eq('shopify_order_id', shopifyOrder.id)
        
        if (error) {
          console.error(`Error updating order ${shopifyOrder.id}:`, error)
          return { imported: false, updated: false }
        }
        
        // Sync items separately
        await syncOrderItems(existing.id, shopifyOrder.line_items, shopifyOrder.refunds)
        
        return { imported: false, updated: true }
      }

      // Upsert order to orders table (frontend reads from here) - for new orders or unassigned orders
      // IMPORTANT: Status and payment info are already set correctly above based on existing order
      // Just preserve assigned_courier_id if it exists
      if (existing && existing.assigned_courier_id) {
        orderData.assigned_courier_id = existing.assigned_courier_id
      }
      
      // Use upsert but with conflict resolution to preserve status and payment info
      const { error } = await supabaseClient
        .from('orders')
        .upsert(orderData, { 
          onConflict: 'shopify_order_id',
          // Don't overwrite status, payment_method, payment_status, collected_by if they were set by courier/admin
          ignoreDuplicates: false
        })

      if (error) {
        console.error(`Error syncing order ${shopifyOrder.id}:`, error)
        return { imported: false, updated: false }
      }

      const wasImported = !existing
      const wasUpdated = !!existing

      // Sync order items to order_items table
      if (shopifyOrder.line_items) {
        const { data: order } = await supabaseClient
          .from('orders')
          .select('id')
          .eq('shopify_order_id', shopifyOrder.id)
          .single()

        if (order) {
          await syncOrderItems(order.id, shopifyOrder.line_items, shopifyOrder.refunds)
        }
      }

      return { imported: wasImported, updated: wasUpdated }
    }

  // Helper: extract first useful image URL from a Shopify line item
  const extractImageUrl = (item: any): string | null => {
    if (!item) return null
    if (typeof item.image === 'string') return item.image
    if (item.image?.src) return item.image.src
    if (item.image?.url) return item.image.url
    if (item.images && item.images.length > 0) {
      const img = item.images[0]
      if (typeof img === 'string') return img
      return img?.src || img?.url || null
    }
    if (item.variant?.image?.src) return item.variant.image.src
    if (item.variant?.image?.url) return item.variant.image.url
    return item.image_url || null
  }

  // Helper function to sync order items
    const syncOrderItems = async (orderId: string, lineItems: any[], refunds: any[] = []) => {
      if (!lineItems) return;

      // 1. Fetch current items in DB for this order
      const { data: existingItemsDB } = await supabaseClient
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

      const existingItemsMap = new Map()
      if (existingItemsDB) {
        existingItemsDB.forEach((item: any) => {
          const key = item.shopify_line_item_id ? String(item.shopify_line_item_id) : `db-${item.id}`
          existingItemsMap.set(key, item)
        })
      }

      // 2. Prepare items from Shopify
      const itemsFromShopify = lineItems.map((item: any) => ({
        shopify_line_item_id: item.id,
        order_id: orderId,
        product_id: item.product_id,
        variant_id: item.variant_id,
        title: item.title || '',
        variant_title: item.variant_title,
        quantity: item.quantity || 0,
        price: parseFloat(item.price || 0),
        total_discount: parseFloat(item.total_discount || 0),
        sku: item.sku,
        vendor: item.vendor,
        product_type: item.product_type,
        image_url: extractImageUrl(item),
        image_alt: item.title || null,
        properties: item.properties || null,
        shopify_raw_data: item,
        is_removed: item.quantity === 0 || item.fulfillment_status === 'removed' || (item.properties && item.properties._is_removed)
      }))

      // 3. Find removed items
      const removedItems: any[] = []
      existingItemsMap.forEach((dbItem, key) => {
        const stillExistsInShopify = lineItems.some((li: any) => String(li.id) === String(dbItem.shopify_line_item_id))
        
        if (dbItem.is_removed) {
          removedItems.push({ ...dbItem, quantity: 0 })
        } else if (dbItem.shopify_line_item_id && !stillExistsInShopify) {
          removedItems.push({
            ...dbItem,
            is_removed: true,
            quantity: 0,
            fulfillment_status: 'removed',
            properties: { ...(dbItem.properties || {}), _is_removed: true }
          })
        }
      })

      // 4. Combine items
      const finalItemsMap = new Map()
      itemsFromShopify.forEach((item: any) => {
        const key = String(item.shopify_line_item_id)
        const dbItem = existingItemsMap.get(key)
        
        // IMPORTANT: Preserve manually removed items (items that exist in Shopify but were manually marked as removed)
        if (dbItem && dbItem.is_removed === true && item.quantity > 0 && !item.is_removed) {
          // Item exists in Shopify but was manually removed in DB - preserve the removal
          console.log(`🔒 Preserving manually removed item: ${dbItem.title} (Shopify ID: ${key})`)
          finalItemsMap.set(key, {
            ...item,
            is_removed: true,
            quantity: 0,
            fulfillment_status: 'removed',
            properties: { ...(item.properties || {}), _is_removed: true },
            updated_at: new Date().toISOString()
          })
        } else {
          finalItemsMap.set(key, item)
        }
      })
      removedItems.forEach((item: any) => {
        if (!finalItemsMap.has(String(item.shopify_line_item_id))) {
          finalItemsMap.set(String(item.shopify_line_item_id), item)
        }
      })

      const allItems = Array.from(finalItemsMap.values())

      // 5. Delete and re-insert
      await supabaseClient
        .from('order_items')
        .delete()
        .eq('order_id', orderId)

      if (allItems.length > 0) {
        await supabaseClient
          .from('order_items')
          .insert(allItems.map((i: any) => {
            const { id, created_at, updated_at, ...rest } = i
            return rest
          }))
      }
    }

    // Function to fetch product images from Shopify Products API
    const fetchProductImages = async (productIds: number[]): Promise<Record<string, string>> => {
      const imageMap: Record<string, string> = {}
      
      if (productIds.length === 0) return imageMap
      
      // Get unique product IDs
      const uniqueProductIds = [...new Set(productIds.filter(id => id))]
      console.log(`📸 Fetching images for ${uniqueProductIds.length} products...`)
      
      // Fetch products in batches of 50 (Shopify limit for ids parameter)
      const batchSize = 50
      
      for (let i = 0; i < uniqueProductIds.length; i += batchSize) {
        const batch = uniqueProductIds.slice(i, i + batchSize)
        const idsParam = batch.join(',')
        
        try {
          const url = `https://${cleanStoreUrl}/admin/api/${shopifyApiVersion}/products.json?ids=${idsParam}&fields=id,title,images,variants`
          
          const response = await fetch(url, {
            headers: {
              'X-Shopify-Access-Token': shopifyAccessToken,
              'Content-Type': 'application/json',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            
            if (data.products && data.products.length > 0) {
              data.products.forEach((product: any) => {
                let productImageUrl: string | null = null
                
                // Get product image
                if (product.images && product.images.length > 0) {
                  const img = product.images[0]
                  productImageUrl = typeof img === 'string' ? img : (img.src || img.url || null)
                }
                
                if (productImageUrl) {
                  // Map to product ID (both number and string)
                  imageMap[String(product.id)] = productImageUrl
                  imageMap[Number(product.id)] = productImageUrl
                  
                  // Also map to variant IDs
                  if (product.variants && product.variants.length > 0) {
                    product.variants.forEach((variant: any) => {
                      if (variant.id) {
                        // Check if variant has specific image
                        let variantImageUrl = productImageUrl
                        
                        if (variant.image_id && product.images) {
                          const variantImage = product.images.find((img: any) => img.id === variant.image_id)
                          if (variantImage) {
                            variantImageUrl = typeof variantImage === 'string' ? variantImage : (variantImage.src || variantImage.url || productImageUrl)
                          }
                        }
                        
                        imageMap[String(variant.id)] = variantImageUrl!
                        imageMap[Number(variant.id)] = variantImageUrl!
                      }
                    })
                  }
                }
              })
            }
          } else {
            console.warn(`⚠️ Failed to fetch products batch: ${response.status}`)
          }
        } catch (error) {
          console.warn(`⚠️ Error fetching products batch:`, error)
        }
        
        // Small delay to avoid rate limiting
        if (i + batchSize < uniqueProductIds.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
      console.log(`📸 Fetched ${Object.keys(imageMap).length / 2} product images`)
      return imageMap
    }

    // Function to fetch a single page of orders
    const fetchOrdersPage = async (sinceId: number | null = null): Promise<{ orders: any[], hasMore: boolean }> => {
      // Explicitly include current_* fields to handle edited orders correctly
      let url = `https://${cleanStoreUrl}/admin/api/${shopifyApiVersion}/orders.json?limit=250&status=any&fields=id,order_number,name,email,created_at,updated_at,cancelled_at,closed_at,cancel_reason,financial_status,fulfillment_status,gateway,payment_gateway_names,total_price,subtotal_price,total_tax,total_discounts,total_shipping_price_set,currency,tags,note,customer_note,line_items,shipping_address,billing_address,customer,fulfillments,shipping_lines,refunds,total_outstanding,current_total_price,current_subtotal_price,current_total_tax,current_total_discounts,current_total_duties,payment_transactions`
      
      if (sinceId) {
        url += `&since_id=${sinceId}`
      }
      
      console.log(`Fetching orders page${sinceId ? ` (since_id: ${sinceId})` : ' (first page)'}...`)
      
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
      const hasMore = orders.length === 250 // If we got exactly 250, there might be more
      
      return { orders, hasMore }
    }
    
    // Fetch and process orders page by page to avoid timeout
    console.log('📦 Starting to fetch and sync ALL orders from Shopify...')
    let sinceId: number | null = null
    let pageCount = 0
    const maxPages = 10000 // Safety limit
    let consecutiveEmptyPages = 0
    const maxConsecutiveEmpty = 3
    let totalImported = 0
    let totalUpdated = 0
    let totalProcessed = 0
    const allOrderIds = new Set<number>() // Track all order IDs to detect duplicates
    
    while (pageCount < maxPages) {
      pageCount++
      try {
        const { orders, hasMore } = await fetchOrdersPage(sinceId)
        
        if (orders.length === 0) {
          consecutiveEmptyPages++
          console.log(`⚠️ Page ${pageCount}: No orders returned (empty page ${consecutiveEmptyPages}/${maxConsecutiveEmpty})`)
          
          if (consecutiveEmptyPages >= maxConsecutiveEmpty) {
            console.log(`✅ Stopping after ${consecutiveEmptyPages} consecutive empty pages. Total pages: ${pageCount - consecutiveEmptyPages}`)
            break
          }
          
          // Try to continue - might be a temporary issue
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue
        }
        
        // Reset consecutive empty counter on success
        consecutiveEmptyPages = 0
        
        // Track order IDs to detect duplicates (optional - for debugging)
        try {
          const pageOrderIds = orders.map((o: any) => o.id)
          pageOrderIds.forEach((id: number) => allOrderIds.add(id))
        } catch (e) {
          // Ignore tracking errors - not critical
          console.warn('Warning: Could not track order IDs:', e)
        }
        
        console.log(`✅ Page ${pageCount}: Fetched ${orders.length} orders, processing...`)
        
        // Collect all product IDs from this page for image fetching
        const pageProductIds: number[] = []
        orders.forEach((order: any) => {
          (order.line_items || []).forEach((item: any) => {
            if (item.product_id) pageProductIds.push(item.product_id)
          })
        })
        
        // Fetch product images for this page
        let pageImageMap: Record<string, string> = {}
        if (pageProductIds.length > 0) {
          try {
            pageImageMap = await fetchProductImages(pageProductIds)
          } catch (imgError) {
            console.warn(`⚠️ Error fetching images for page ${pageCount}:`, imgError)
          }
        }
        
        // Process orders from this page immediately
        let pageImported = 0
        let pageUpdated = 0
        
        for (let i = 0; i < orders.length; i++) {
          const shopifyOrder = orders[i]
          totalProcessed++
          
          // Log progress every 50 orders
          if (totalProcessed % 50 === 0) {
            console.log(`📊 Progress: ${totalProcessed} orders processed (${pageImported} imported, ${pageUpdated} updated on this page)`)
          }
          
          const result = await processOrder(shopifyOrder, pageImageMap)
          if (result.imported) pageImported++
          if (result.updated) pageUpdated++
        }
        
        totalImported += pageImported
        totalUpdated += pageUpdated
        
        console.log(`✅ Page ${pageCount} complete: ${pageImported} imported, ${pageUpdated} updated (Total: ${totalImported} imported, ${totalUpdated} updated)`)
        
        // Get the last order's ID for next page
        // Shopify returns orders in descending order (newest first)
        // Using since_id gets orders with ID < since_id (older orders)
        const lastOrder = orders[orders.length - 1]
        const previousSinceId = sinceId
        const newSinceId = lastOrder.id
        
        // Log order ID range for debugging
        if (orders.length > 0) {
          const firstOrderId = orders[0].id
          const lastOrderId = orders[orders.length - 1].id
          console.log(`   📋 Order ID range: ${firstOrderId} (newest) to ${lastOrderId} (oldest)`)
          console.log(`   🔄 Previous since_id: ${previousSinceId || 'none'}, Next since_id: ${newSinceId}`)
        }
        
        // If we got fewer than 250, we've reached the end
        if (orders.length < 250) {
          console.log(`✅ Reached end of orders (got ${orders.length} < 250)`)
          break
        }
        
        // Safety check: if since_id didn't change or increased, we might be stuck
        // Note: since_id should DECREASE because we're going backwards (newest to oldest)
        if (previousSinceId && newSinceId >= previousSinceId) {
          console.warn(`⚠️ Warning: since_id didn't decrease (${previousSinceId} -> ${newSinceId}). This might indicate an issue.`)
          console.warn(`⚠️ This could mean: 1) All orders fetched, 2) Pagination issue, or 3) Duplicate orders`)
          // Check if we're getting duplicate orders
          const orderIds = orders.map((o: any) => o.id)
          const uniqueIds = new Set(orderIds)
          if (orderIds.length !== uniqueIds.size) {
            console.warn(`⚠️ Found ${orderIds.length - uniqueIds.size} duplicate order IDs in this page!`)
          }
          // Force break to avoid infinite loop
          break
        }
        
        // Update since_id for next iteration
        sinceId = newSinceId
        
        // Log that we're continuing to next page
        console.log(`➡️ Continuing to next page...`)
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`❌ Error fetching/processing page ${pageCount}:`, error)
        // If we've processed some orders, continue; otherwise throw
        if (totalProcessed === 0) {
          throw error
        }
        // If we have processed orders, log error but continue
        console.warn(`⚠️ Continuing despite error. Total orders processed so far: ${totalProcessed}`)
        break
      }
    }
    
    if (pageCount >= maxPages) {
      console.warn(`⚠️ Reached maximum page limit (${maxPages}). There may be more orders.`)
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

    const skipped = totalProcessed - totalImported - totalUpdated
    console.log(`\n✅ ========================================`)
    console.log(`✅ SYNC COMPLETE SUMMARY`)
    console.log(`✅ ========================================`)
    console.log(`✅ Total orders processed: ${totalProcessed}`)
    console.log(`✅ New orders imported: ${totalImported}`)
    console.log(`✅ Existing orders updated: ${totalUpdated}`)
    console.log(`✅ Total pages processed: ${pageCount}`)
    console.log(`✅ Unique order IDs seen: ${allOrderIds.size}`)
    if (skipped > 0) {
      console.log(`⚠️  Orders skipped (duplicates/errors): ${skipped}`)
    }
    try {
      if (allOrderIds && allOrderIds.size > 0) {
        console.log(`✅ Unique order IDs seen: ${allOrderIds.size}`)
        const sortedIds = Array.from(allOrderIds).sort((a, b) => a - b)
        console.log(`📊 Order ID range: ${sortedIds[0]} (oldest) to ${sortedIds[sortedIds.length - 1]} (newest)`)
      }
    } catch (e) {
      // Ignore if tracking failed - not critical
    }
    if (pageCount === 1 && totalProcessed === 250) {
      console.log(`\n⚠️  WARNING: Only 1 page processed with exactly 250 orders!`)
      console.log(`⚠️  This suggests pagination might have stopped early.`)
      console.log(`⚠️  Check if there are more orders in Shopify that weren't fetched.`)
    }
    console.log(`✅ ========================================\n`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: totalImported, 
        updated: totalUpdated,
        skipped,
        total: totalProcessed,
        pages: pageCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Sync error:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    
    // Update sync state with error
    await supabaseClient
      .from('shopify_sync_state')
      .update({
        last_sync_status: 'error',
        last_sync_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
