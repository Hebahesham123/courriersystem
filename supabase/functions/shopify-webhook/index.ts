/// <reference path="../deno.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const shopifyOrder = await req.json()
    const topic = req.headers.get('x-shopify-topic') || 'orders/create'

    console.log(`Received webhook: ${topic}`, shopifyOrder.id || shopifyOrder.order_id)

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
      // This includes: paymob, card, visa, mastercard, credit, debit, sohoola, sympl, tru, stripe, etc.
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
        gatewayLower.includes('razorpay')
      
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
      
      // Priority 1: Direct item.image
      if (item.image) {
        if (typeof item.image === 'string' && item.image.trim() !== '' && item.image !== 'null') {
          imageUrl = item.image
        } else if (typeof item.image === 'object' && item.image !== null) {
          imageUrl = item.image.src || item.image.url || item.image.original_src || null
        }
      }
      
      // Priority 2: item.variant.image
      if (!imageUrl && item.variant?.image) {
        if (typeof item.variant.image === 'string' && item.variant.image.trim() !== '' && item.variant.image !== 'null') {
          imageUrl = item.variant.image
        } else if (typeof item.variant.image === 'object' && item.variant.image !== null) {
          imageUrl = item.variant.image.src || item.variant.image.url || item.variant.image.original_src || null
        }
      }
      
      // Priority 3: item.variant.featured_image
      if (!imageUrl && item.variant?.featured_image) {
        if (typeof item.variant.featured_image === 'string') {
          imageUrl = item.variant.featured_image
        } else if (typeof item.variant.featured_image === 'object') {
          imageUrl = item.variant.featured_image.src || item.variant.featured_image.url || null
        }
      }
      
      // Priority 4: item.images array
      if (!imageUrl && item.images && Array.isArray(item.images) && item.images.length > 0) {
        const firstImg = item.images[0]
        if (typeof firstImg === 'string' && firstImg.trim() !== '' && firstImg !== 'null') {
          imageUrl = firstImg
        } else if (typeof firstImg === 'object' && firstImg !== null) {
          imageUrl = firstImg.src || firstImg.url || firstImg.original_src || null
        }
      }
      
      // Priority 5: item.product.images array
      if (!imageUrl && item.product?.images && Array.isArray(item.product.images) && item.product.images.length > 0) {
        const firstImg = item.product.images[0]
        if (typeof firstImg === 'string') {
          imageUrl = firstImg
        } else if (typeof firstImg === 'object' && firstImg !== null) {
          imageUrl = firstImg.src || firstImg.url || firstImg.original_src || null
        }
      }
      
      // Priority 6: item.product.image
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

    // Check if order already exists in main orders table
    // IMPORTANT: Only sync base orders (where base_order_id IS NULL) to avoid affecting date-suffixed assignment orders
    // Fetch ALL fields to check for courier edits
    const { data: existingMain } = await supabaseClient
      .from('orders')
      .select('id, status, assigned_courier_id, line_items, delivery_fee, partial_paid_amount, collected_by, payment_sub_type, internal_comment, payment_status, payment_method, base_order_id')
      .eq('shopify_order_id', shopifyOrder.id)
      .is('base_order_id', null) // Only sync base orders
      .maybeSingle()

    // PRESERVE REMOVED ITEMS in line_items JSON
    const currentLineItems = (shopifyOrder.line_items || []).map((item: any) => ({
      ...item,
      is_removed: item.quantity === 0 || item.fulfillment_status === 'removed' || (item.properties && item.properties._is_removed)
    }))

    let finalLineItems = [...currentLineItems]

    if (existingMain && existingMain.line_items) {
      let existingItems = []
      try {
        existingItems = typeof existingMain.line_items === 'string' 
          ? JSON.parse(existingMain.line_items) 
          : existingMain.line_items
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

    // Prepare order data (after processing line items)
    const isCanceled = !!shopifyOrder.cancelled_at
    const orderData = {
      shopify_order_id: shopifyOrder.id,
      order_id: shopifyOrder.name || shopifyOrder.order_number?.toString() || shopifyOrder.id?.toString(),
      order_name: shopifyOrder.name,
      order_number: shopifyOrder.order_number?.toString(),
      status: isCanceled ? 'canceled' : 'pending',
      financial_status: shopifyOrder.financial_status || paymentInfo.status,
      fulfillment_status: shopifyOrder.fulfillment_status,
      // Use current_total_price for edited orders, fallback to total_price
      total_price: parseFloat(shopifyOrder.current_total_price || shopifyOrder.total_price || 0),
      subtotal_price: parseFloat(shopifyOrder.current_subtotal_price || shopifyOrder.subtotal_price || 0),
      total_tax: parseFloat(shopifyOrder.current_total_tax || shopifyOrder.total_tax || 0),
      total_discounts: parseFloat(shopifyOrder.current_total_discounts || shopifyOrder.total_discounts || 0),
      total_shipping_price: parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount || shopifyOrder.total_shipping_price_set?.amount || 0),
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
      // IMPORTANT: Handle empty strings - if tags is empty string, return empty array
      // Also filter out any empty strings that might result from splitting
      order_tags: shopifyOrder.tags && shopifyOrder.tags.trim() 
        ? shopifyOrder.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0) 
        : [],
      order_note: shopifyOrder.note,
      customer_note: shopifyOrder.customer_note,
      notes: shopifyOrder.note || shopifyOrder.customer_note || '',
      shopify_created_at: shopifyOrder.created_at ? new Date(shopifyOrder.created_at).toISOString() : null,
      shopify_updated_at: shopifyOrder.updated_at ? new Date(shopifyOrder.updated_at).toISOString() : null,
      shopify_cancelled_at: shopifyOrder.cancelled_at ? new Date(shopifyOrder.cancelled_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    // Upsert order to shopify_orders table (raw Shopify data log)
    const { data: order, error: orderError } = await supabaseClient
      .from('shopify_orders')
      .upsert(orderData, {
        onConflict: 'shopify_order_id',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error upserting shopify_order:', orderError)
    }

    // ALSO upsert to the main orders table that the frontend uses
    const mainOrderData = {
      ...orderData,
      // Map shopify_orders fields to orders fields if they differ
      total_order_fees: orderData.total_price,
      mobile_number: orderData.customer_phone,
      // We don't want to overwrite manual courier assignments or statuses if it already exists
    }

    if (existingMain) {
      // Check if order has courier edits - protect ALL courier-edited fields
      const hasCourierEdits = existingMain.delivery_fee || 
                             existingMain.partial_paid_amount || 
                             existingMain.collected_by || 
                             existingMain.payment_sub_type ||
                             existingMain.internal_comment ||
                             (existingMain.status && existingMain.status !== 'pending' && existingMain.status !== 'assigned')
      
      // Update existing order - preserve ALL courier-edited fields
      const updateData: any = {
        shopify_updated_at: orderData.shopify_updated_at,
        shopify_cancelled_at: orderData.shopify_cancelled_at,
        financial_status: orderData.financial_status,
        fulfillment_status: orderData.fulfillment_status,
        // IMPORTANT: Preserve manually edited total_order_fees if it differs from Shopify
        total_order_fees: (() => {
          const existingTotal = existingMain.total_order_fees || 0
          const shopifyTotal = orderData.total_price || 0
          const difference = Math.abs(existingTotal - shopifyTotal)
          // If difference is significant (> 0.01), assume it was manually edited and preserve it
          if (difference > 0.01 && existingTotal > 0) {
            console.log(`🔒 Preserving manually edited total for order ${shopifyOrder.id}: ${existingTotal} (Shopify: ${shopifyTotal})`)
            return existingTotal
          }
          return orderData.total_price
        })(),
        subtotal_price: orderData.subtotal_price,
        total_tax: orderData.total_tax,
        total_discounts: orderData.total_discounts,
        line_items: orderData.line_items,
        product_images: orderData.product_images,
        // IMPORTANT: Always update order_tags from Shopify to reflect tag changes (additions/removals)
        order_tags: orderData.order_tags,
        order_note: orderData.order_note,
        customer_note: orderData.customer_note,
        notes: orderData.notes,
        updated_at: new Date().toISOString()
      }
      
      // Log tag update for debugging
      if (JSON.stringify(existingMain.order_tags || []) !== JSON.stringify(orderData.order_tags || [])) {
        console.log(`🏷️  Tags updated for order ${shopifyOrder.id}: ${JSON.stringify(existingMain.order_tags || [])} → ${JSON.stringify(orderData.order_tags || [])}`)
      }

      // CRITICAL: Protect ALL courier-edited fields
      // BUT: Always update fulfillment_status and respect Shopify cancellation
      if (hasCourierEdits) {
        // Protect status - never reset to pending if courier has processed the order
        // BUT: Always respect Shopify cancellation (cancellation is a Shopify action)
        const processedStatuses = ['delivered', 'partial', 'return', 'hand_to_hand', 'receiving_part']
        const isProcessed = existingMain.status && processedStatuses.includes(existingMain.status)
        
        // Check for both cancelled_at and financial_status voided (Shopify can void orders without cancelled_at)
        const isShopifyCanceled = orderData.shopify_cancelled_at || 
                                 (orderData.financial_status && orderData.financial_status.toLowerCase() === 'voided')
        if (isShopifyCanceled) {
          // ALWAYS respect Shopify cancellation - it's a Shopify action, not a courier action
          updateData.status = 'canceled'
          console.log(`✅ Shopify cancellation/void detected for order ${shopifyOrder.id} - updating status to canceled`)
        } else {
          // If not canceled, preserve courier-processed status
          if (isProcessed) {
            updateData.status = existingMain.status
          } else if (existingMain.status && existingMain.status !== 'pending' && existingMain.status !== 'assigned') {
            updateData.status = existingMain.status
          }
        }
        
        // Protect payment info (courier-edited fields)
        updateData.payment_method = existingMain.payment_method || orderData.payment_method
        updateData.payment_status = existingMain.payment_status || orderData.payment_status
        updateData.collected_by = existingMain.collected_by
        updateData.payment_sub_type = existingMain.payment_sub_type
        updateData.delivery_fee = existingMain.delivery_fee
        updateData.partial_paid_amount = existingMain.partial_paid_amount
        updateData.internal_comment = existingMain.internal_comment
        updateData.payment_gateway_names = existingMain.payment_gateway_names || orderData.payment_gateway_names
        
        // fulfillment_status is Shopify metadata - ALWAYS update from Shopify
        // (already set in updateData above, but ensure it's not overwritten)
        
        console.log(`🔒 PROTECTING courier edits for order ${shopifyOrder.id}: status=${updateData.status}, fulfillment_status=${updateData.fulfillment_status}, collected_by=${existingMain.collected_by}`)
      } else {
        // No courier edits yet - allow Shopify to set payment info
        updateData.payment_status = orderData.payment_status
        updateData.payment_method = orderData.payment_method
        updateData.payment_gateway_names = orderData.payment_gateway_names
        
        // Always respect Shopify cancellation
        if (orderData.shopify_cancelled_at) {
          updateData.status = 'canceled'
          console.log(`✅ Shopify cancellation detected for order ${shopifyOrder.id} - updating status to canceled`)
        } else {
          // If not canceled in Shopify, preserve existing status if order has been assigned
          if (existingMain.assigned_courier_id || (existingMain.status && existingMain.status !== 'pending')) {
            updateData.status = existingMain.status
          }
        }
      }

      await supabaseClient
        .from('orders')
        .update(updateData)
        .eq('id', existingMain.id)
    } else {
      // Insert new order - only if it doesn't exist
      // Use upsert but check if order exists first to avoid overwriting courier edits
      const { data: checkExisting } = await supabaseClient
        .from('orders')
        .select('id, status, delivery_fee, partial_paid_amount, collected_by, payment_sub_type, internal_comment')
        .eq('shopify_order_id', shopifyOrder.id)
        .maybeSingle()
      
      if (checkExisting) {
        // Order exists but wasn't found in first query - protect courier edits
        const hasCourierEdits = checkExisting.delivery_fee || 
                               checkExisting.partial_paid_amount || 
                               checkExisting.collected_by || 
                               checkExisting.payment_sub_type ||
                               checkExisting.internal_comment ||
                               (checkExisting.status && checkExisting.status !== 'pending' && checkExisting.status !== 'assigned')
        
        if (hasCourierEdits) {
          // Protect courier edits - only update Shopify metadata
          const protectedUpdate: any = {
            shopify_updated_at: orderData.shopify_updated_at,
            shopify_cancelled_at: orderData.shopify_cancelled_at,
            financial_status: orderData.financial_status,
            fulfillment_status: orderData.fulfillment_status,
            total_order_fees: orderData.total_price,
            subtotal_price: orderData.subtotal_price,
            total_tax: orderData.total_tax,
            total_discounts: orderData.total_discounts,
            line_items: orderData.line_items,
            product_images: orderData.product_images,
            // IMPORTANT: Always update order_tags from Shopify to reflect tag changes (additions/removals)
            order_tags: orderData.order_tags,
            order_note: orderData.order_note,
            customer_note: orderData.customer_note,
            notes: orderData.notes,
            updated_at: new Date().toISOString()
          }
          
          // Log tag update for debugging
          if (JSON.stringify(checkExisting.order_tags || []) !== JSON.stringify(orderData.order_tags || [])) {
            console.log(`🏷️  Tags updated for order ${shopifyOrder.id}: ${JSON.stringify(checkExisting.order_tags || [])} → ${JSON.stringify(orderData.order_tags || [])}`)
          }
          
          // Don't update status or courier-edited fields
          await supabaseClient
            .from('orders')
            .update(protectedUpdate)
            .eq('id', checkExisting.id)
        } else {
          // No courier edits - safe to upsert
          await supabaseClient
            .from('orders')
            .upsert(mainOrderData, { onConflict: 'shopify_order_id' })
        }
      } else {
        // Truly new order - safe to insert
        await supabaseClient
          .from('orders')
          .upsert(mainOrderData, { onConflict: 'shopify_order_id' })
      }
    }

    // Sync order items to BOTH tables
    // IMPORTANT: Always sync items when line_items are present, regardless of shopify_orders table status
    // This ensures new items added in Shopify are properly synced
    // Note: We check for line_items array existence, not length, to handle empty arrays (all items removed)
    if (shopifyOrder.line_items && Array.isArray(shopifyOrder.line_items)) {
      // Sync shopify_order_items if order exists in shopify_orders table
      if (order) {
        const shopifyItems = shopifyOrder.line_items.map((item: any) => ({
          shopify_line_item_id: item.id,
          shopify_order_id: shopifyOrder.id,
          order_id: order.id, // Reference to shopify_orders table
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
          image_url: extractImageUrl(item),
          shopify_raw_data: item,
        }))

        // Sync shopify_order_items
        await supabaseClient
          .from('shopify_order_items')
          .delete()
          .eq('shopify_order_id', shopifyOrder.id)

        await supabaseClient
          .from('shopify_order_items')
          .insert(shopifyItems)
      }

      // ALWAYS sync to order_items table for the main system (even if shopify_orders table has issues)
      // This ensures items added/removed in Shopify are properly reflected in the system
      const { data: mainOrder } = await supabaseClient
        .from('orders')
        .select('id')
        .eq('shopify_order_id', shopifyOrder.id)
        .single()

      if (mainOrder) {
        console.log(`🔄 Syncing ${shopifyOrder.line_items.length} items for order ${shopifyOrder.id} (main order ID: ${mainOrder.id})`)
        // 1. Fetch current items in DB for this order
        const { data: existingItemsDB } = await supabaseClient
          .from('order_items')
          .select('*')
          .eq('order_id', mainOrder.id)

        const existingItemsMap = new Map()
        if (existingItemsDB) {
          existingItemsDB.forEach((item: any) => {
            const key = item.shopify_line_item_id ? String(item.shopify_line_item_id) : `db-${item.id}`
            existingItemsMap.set(key, item)
          })
        }

        // 2. Prepare items from Shopify payload
        const itemsFromShopify = shopifyOrder.line_items.map((item: any) => ({
          shopify_line_item_id: item.id,
          order_id: mainOrder.id, // Reference to main orders table
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
          shopify_raw_data: item,
          is_removed: item.quantity === 0 || item.fulfillment_status === 'removed' || (item.properties && item.properties._is_removed),
        }))

        // 3. Find items that were in DB but are now GONE from Shopify line_items
        const removedItems: any[] = []
        existingItemsMap.forEach((dbItem, key) => {
          const stillExistsInShopify = shopifyOrder.line_items.some((li: any) => String(li.id) === String(dbItem.shopify_line_item_id))
          
          if (dbItem.is_removed) {
            removedItems.push({
              ...dbItem,
              quantity: 0
            })
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
          .eq('order_id', mainOrder.id)

        if (allItems.length > 0) {
          await supabaseClient
            .from('order_items')
            .insert(allItems.map((i: any) => {
              const { id, created_at, ...rest } = i
              return rest
            }))
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, order_id: order?.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Webhook error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
