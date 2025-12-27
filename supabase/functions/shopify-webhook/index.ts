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
      shipping_method: shopifyOrder.shipping_lines?.[0]?.title,
      tracking_number: shopifyOrder.fulfillments?.[0]?.tracking_number,
      tracking_url: shopifyOrder.fulfillments?.[0]?.tracking_url,
      line_items: shopifyOrder.line_items || [],
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
        image_url: extractImageUrl(item),
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

    return new Response(
      JSON.stringify({ success: true, order_id: order.id }),
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
