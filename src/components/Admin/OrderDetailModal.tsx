"use client"
import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  X,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Truck,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  DollarSign,
  FileText,
  ShoppingBag,
  History,
  ArrowRight,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

interface OrderItem {
  id: string
  title: string
  variant_title: string | null
  quantity: number
  price: number
  total_discount: number
  sku: string | null
  vendor: string | null
  image_url: string | null
  image_alt: string | null
  shopify_raw_data: any
}

interface Order {
  id: string
  order_id: string
  shopify_order_id?: number
  shopify_order_name?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  mobile_number: string
  address: string
  billing_address?: any
  shipping_address?: any
  billing_city?: string
  shipping_city?: string
  total_order_fees: number
  subtotal_price?: number
  total_tax?: number
  total_discounts?: number
  total_shipping_price?: number
  currency?: string
  payment_method: string
  payment_status?: string
  financial_status?: string
  payment_gateway_names?: string[]
  status: string
  fulfillment_status?: string
  shipping_method?: string
  tracking_number?: string
  tracking_url?: string
  line_items?: any[]
  product_images?: any[]
  order_note?: string
  customer_note?: string
  notes?: string
  order_tags?: string[]
  shopify_created_at?: string
  created_at?: string
  updated_at?: string
  assigned_courier_id?: string | null
  courier_name?: string
}

interface OrderDetailModalProps {
  order: Order | null
  onClose: () => void
  onUpdate?: () => void
}

interface OrderHistoryEntry {
  id: string
  status: string
  assigned_courier_id: string | null
  original_courier_id: string | null
  assigned_courier_name?: string | null
  original_courier_name?: string | null
  updated_at: string
  created_at: string
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, onUpdate }) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Safety check - if no order, don't render
  if (!order) {
    return null
  }

  const fetchOrderItems = useCallback(async () => {
    if (!order?.id) return

    setLoadingItems(true)
    setError(null)
    try {
      // Try to fetch from order_items table (if it exists)
      const { data, error: fetchError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true })

      // If table doesn't exist or no items found, that's okay - we'll use line_items
      if (fetchError) {
        // PGRST116 = relation does not exist (table doesn't exist)
        // 42P01 = relation does not exist (PostgreSQL error)
        if (fetchError.code !== 'PGRST116' && fetchError.code !== '42P01') {
          console.warn('Error fetching order items:', fetchError)
        }
      } else if (data && data.length > 0) {
        setOrderItems(data)
      }
    } catch (err: any) {
      // Table might not exist, that's fine - we'll use line_items from order
      if (err?.code !== 'PGRST116' && err?.code !== '42P01') {
        console.warn('Error fetching order items:', err)
      }
    } finally {
      setLoadingItems(false)
    }
  }, [order?.id])

  const fetchOrderHistory = useCallback(async () => {
    if (!order?.order_id) return

    setLoadingHistory(true)
    try {
      // Fetch all versions of this order by order_id
      // Include both assigned_courier and original_courier to show all assignments
      const { data, error: historyError } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          assigned_courier_id,
          original_courier_id,
          updated_at,
          created_at,
          assigned_courier:users!orders_assigned_courier_id_fkey(id, name),
          original_courier:users!orders_original_courier_id_fkey(id, name)
        `)
        .eq("order_id", order.order_id)
        .order("updated_at", { ascending: true })

      if (historyError) throw historyError

      // Map the data to include courier names for both assigned and original
      const historyWithCouriers = (data || []).map((entry: any) => ({
        id: entry.id,
        status: entry.status,
        assigned_courier_id: entry.assigned_courier_id,
        original_courier_id: entry.original_courier_id,
        assigned_courier_name: entry.assigned_courier?.name || null,
        original_courier_name: entry.original_courier?.name || null,
        updated_at: entry.updated_at,
        created_at: entry.created_at,
      }))

      setOrderHistory(historyWithCouriers)
    } catch (err: any) {
      console.error("Error fetching order history:", err)
    } finally {
      setLoadingHistory(false)
    }
  }, [order?.order_id])

  useEffect(() => {
    if (order?.id) {
      fetchOrderItems()
      fetchOrderHistory()
    }
    
    // Debug: Log order data when it changes
    console.log('🔍 Order data received:', {
      id: order?.id,
      order_id: order?.order_id,
      has_product_images: !!order?.product_images,
      has_line_items: !!order?.line_items,
      product_images_type: typeof order?.product_images,
      product_images_value: order?.product_images
    })
  }, [order?.id, fetchOrderItems, fetchOrderHistory, order?.product_images, order?.line_items])

  // Parse line items from JSON if order_items table is empty
  let parsedLineItems: any[] = []
  if (order.line_items) {
    try {
      // Handle both string and array formats
      parsedLineItems = typeof order.line_items === 'string' 
        ? JSON.parse(order.line_items) 
        : order.line_items
      
      console.log('📦 Parsed line_items:', {
        count: parsedLineItems.length,
        first_item: parsedLineItems[0] ? {
          title: parsedLineItems[0].title,
          variant_id: parsedLineItems[0].variant_id,
          product_id: parsedLineItems[0].product_id,
          variant_id_type: typeof parsedLineItems[0].variant_id,
          product_id_type: typeof parsedLineItems[0].product_id
        } : null
      })
    } catch (e) {
      console.error('Error parsing line_items:', e)
      parsedLineItems = []
    }
  } else {
    console.warn('⚠️ No line_items in order')
  }

  // Get product images map from order.product_images
  // This maps variant_id or product_id to image URLs
  let productImagesMap: Record<string | number, string> = {}
  if (order.product_images) {
    try {
      const productImages = typeof order.product_images === 'string' 
        ? JSON.parse(order.product_images) 
        : order.product_images
      
      console.log('📸 Parsing product_images:', productImages)
      console.log('📸 product_images type:', typeof productImages, 'isArray:', Array.isArray(productImages))
      
      if (Array.isArray(productImages)) {
        productImages.forEach((img: any, idx: number) => {
          console.log(`📸 Processing image entry ${idx}:`, {
            variant_id: img.variant_id,
            product_id: img.product_id,
            image: img.image,
            image_type: typeof img.image,
            title: img.title
          })
          
          // Extract image URL (could be string or object with src property)
          let imageUrl = null
          if (img.image) {
            imageUrl = typeof img.image === 'string' 
              ? img.image 
              : (img.image.src || img.image.url || img.image)
          }
          
          // Only map if we have a valid image URL
          if (imageUrl && imageUrl !== 'null' && imageUrl !== null && imageUrl.trim() !== '' && imageUrl !== 'undefined') {
            // Map by variant_id (preferred) - store as BOTH string and number for compatibility
            if (img.variant_id != null) {
              const variantKeyStr = String(img.variant_id)
              const variantKeyNum = Number(img.variant_id)
              productImagesMap[variantKeyStr] = imageUrl
              productImagesMap[variantKeyNum] = imageUrl
              console.log(`✅ Mapped variant_id ${img.variant_id} (str: "${variantKeyStr}", num: ${variantKeyNum}) to image:`, imageUrl.substring(0, 60))
            }
            // Map by product_id - store as BOTH string and number for compatibility
            if (img.product_id != null) {
              const productKeyStr = String(img.product_id)
              const productKeyNum = Number(img.product_id)
              if (!productImagesMap[productKeyStr]) {
                productImagesMap[productKeyStr] = imageUrl
              }
              if (!productImagesMap[productKeyNum]) {
                productImagesMap[productKeyNum] = imageUrl
              }
              console.log(`✅ Mapped product_id ${img.product_id} (str: "${productKeyStr}", num: ${productKeyNum}) to image:`, imageUrl.substring(0, 60))
            }
          } else {
            console.warn(`⚠️ Skipping invalid image for entry ${idx}:`, { imageUrl, variant_id: img.variant_id, product_id: img.product_id })
          }
        })
      }
      
      console.log('📸 Final productImagesMap keys:', Object.keys(productImagesMap))
      console.log('📸 Final productImagesMap sample:', Object.fromEntries(Object.entries(productImagesMap).slice(0, 3)))
    } catch (e) {
      console.warn('Error parsing product_images:', e)
    }
  } else {
    console.warn('⚠️ No product_images field in order')
  }

  // If we have orderItems from database, enhance them with images from product_images
  const items = orderItems.length > 0 
    ? orderItems.map((orderItem: OrderItem, index: number) => {
        // If orderItem already has image_url, use it
        if (orderItem.image_url && orderItem.image_url !== 'null' && orderItem.image_url !== null) {
          return orderItem;
        }
        
        // Otherwise, try to find image from product_images
        let imageUrl = null;
        
        if (order.product_images) {
          try {
            const productImages = typeof order.product_images === 'string' 
              ? JSON.parse(order.product_images) 
              : order.product_images;
            
            if (Array.isArray(productImages)) {
              // Try to find by variant_id or product_id from orderItem's shopify_raw_data
              const rawData = orderItem.shopify_raw_data || {};
              const variantId = rawData.variant_id || rawData.variant?.id;
              const productId = rawData.product_id || rawData.product?.id;
              
              if (variantId) {
                const match = productImages.find((img: any) => 
                  img.variant_id == variantId || 
                  String(img.variant_id) === String(variantId) ||
                  Number(img.variant_id) === Number(variantId)
                );
                if (match && match.image && match.image !== null && match.image !== 'null') {
                  imageUrl = typeof match.image === 'string' ? match.image : (match.image.src || match.image.url);
                }
              }
              
              if (!imageUrl && productId) {
                const match = productImages.find((img: any) => 
                  img.product_id == productId || 
                  String(img.product_id) === String(productId) ||
                  Number(img.product_id) === Number(productId)
                );
                if (match && match.image && match.image !== null && match.image !== 'null') {
                  imageUrl = typeof match.image === 'string' ? match.image : (match.image.src || match.image.url);
                }
              }
            }
          } catch (e) {
            console.warn('Error matching image for orderItem:', e);
          }
        }
        
        // Clean and validate image URL
        if (imageUrl) {
          imageUrl = imageUrl.trim();
          if (!imageUrl.startsWith('http')) {
            imageUrl = `https://cdn.shopify.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
          }
          if (imageUrl === 'null' || imageUrl === 'undefined' || imageUrl === '') {
            imageUrl = null;
          }
        }
        
        return {
          ...orderItem,
          image_url: imageUrl || orderItem.image_url,
        };
      })
    : parsedLineItems.map((item: any, index: number) => {
        // Try to get image from various possible locations
        // Priority: product_images map > item.image > variant.image > product.images
        let imageUrl = null
        
        // DIRECT MATCH: Try to find image in product_images array by matching variant_id or product_id
        if (order.product_images) {
          try {
            const productImages = typeof order.product_images === 'string' 
              ? JSON.parse(order.product_images) 
              : order.product_images
            
            if (Array.isArray(productImages)) {
              // Try to find exact match by variant_id first
              if (item.variant_id) {
                const match = productImages.find((img: any) => 
                  img.variant_id == item.variant_id || 
                  String(img.variant_id) === String(item.variant_id) ||
                  Number(img.variant_id) === Number(item.variant_id)
                )
                if (match && match.image && match.image !== null && match.image !== 'null') {
                  imageUrl = typeof match.image === 'string' ? match.image : (match.image.src || match.image.url)
                }
              }
              
              // If no variant match, try product_id
              if (!imageUrl && item.product_id) {
                const match = productImages.find((img: any) => 
                  img.product_id == item.product_id || 
                  String(img.product_id) === String(item.product_id) ||
                  Number(img.product_id) === Number(item.product_id)
                )
                if (match && match.image && match.image !== null && match.image !== 'null') {
                  imageUrl = typeof match.image === 'string' ? match.image : (match.image.src || match.image.url)
                }
              }
            }
          } catch (e) {
            console.warn('Error in direct product_images match:', e)
          }
        }
        
        // Fallback: Try product_images map (most reliable)
        // Convert IDs to string for consistent matching
        if (!imageUrl && item.variant_id) {
          const variantKey = String(item.variant_id)
          const variantKeyNum = Number(item.variant_id)
          // Try both string and number keys
          if (productImagesMap[variantKey]) {
            imageUrl = productImagesMap[variantKey]
          } else if (productImagesMap[variantKeyNum]) {
            imageUrl = productImagesMap[variantKeyNum]
          }
        }
        
        if (!imageUrl && item.product_id) {
          const productKey = String(item.product_id)
          const productKeyNum = Number(item.product_id)
          // Try both string and number keys
          if (productImagesMap[productKey]) {
            imageUrl = productImagesMap[productKey]
          } else if (productImagesMap[productKeyNum]) {
            imageUrl = productImagesMap[productKeyNum]
          }
        }
        
        // Fallback to direct image properties
        if (!imageUrl) {
          // Try item.image (could be string or object)
          if (item.image) {
            imageUrl = typeof item.image === 'string' ? item.image : (item.image.src || item.image.url);
          }
          
          // Try variant.image
          if (!imageUrl && item.variant?.image) {
            imageUrl = typeof item.variant.image === 'string' 
              ? item.variant.image 
              : (item.variant.image.src || item.variant.image.url);
          }
          
          // Try variant.featured_image
          if (!imageUrl && item.variant?.featured_image) {
            imageUrl = typeof item.variant.featured_image === 'string'
              ? item.variant.featured_image
              : (item.variant.featured_image.src || item.variant.featured_image.url);
          }
          
          // Try variant.image_url
          if (!imageUrl && item.variant?.image_url) {
            imageUrl = item.variant.image_url;
          }
          
          // Try item.images array
          if (!imageUrl && item.images && item.images.length > 0) {
            const firstImage = item.images[0];
            imageUrl = typeof firstImage === 'string' 
              ? firstImage 
              : (firstImage.src || firstImage.url);
          }
          
          // Try product.images
          if (!imageUrl && item.product?.images?.[0]) {
            const firstImage = item.product.images[0];
            imageUrl = typeof firstImage === 'string'
              ? firstImage
              : (firstImage.src || firstImage.url);
          }
        }

        // Clean and validate image URL
        if (imageUrl) {
          // Remove any whitespace
          imageUrl = imageUrl.trim()
          
          // If image URL is relative, make it absolute (Shopify CDN)
          if (!imageUrl.startsWith('http')) {
            // Shopify images are usually on cdn.shopify.com or the store domain
            imageUrl = `https://cdn.shopify.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
          }
          
          // Ensure it's a valid URL
          if (imageUrl === 'null' || imageUrl === 'undefined' || imageUrl === '') {
            imageUrl = null
          }
        } else {
          imageUrl = null
        }

        // Debug log for images - ALWAYS log to help debug
        console.log(`🖼️ Item "${item.title || item.name}":`, {
          variant_id: item.variant_id,
          product_id: item.product_id,
          variant_id_type: typeof item.variant_id,
          product_id_type: typeof item.product_id,
          has_image: !!imageUrl,
          image_url: imageUrl ? imageUrl.substring(0, 80) : 'null',
          in_map_variant_str: item.variant_id ? !!productImagesMap[String(item.variant_id)] : false,
          in_map_variant_num: item.variant_id ? !!productImagesMap[Number(item.variant_id)] : false,
          in_map_product_str: item.product_id ? !!productImagesMap[String(item.product_id)] : false,
          in_map_product_num: item.product_id ? !!productImagesMap[Number(item.product_id)] : false,
          map_keys_sample: Object.keys(productImagesMap).slice(0, 5),
          product_images_array_length: order.product_images 
            ? (Array.isArray(typeof order.product_images === 'string' ? JSON.parse(order.product_images) : order.product_images) 
                ? (typeof order.product_images === 'string' ? JSON.parse(order.product_images) : order.product_images).length 
                : 0)
            : 0
        })

        return {
          id: `item-${index}`,
          title: item.title || item.name || 'Unknown Product',
          variant_title: item.variant_title || item.variant?.title || null,
          quantity: item.quantity || 1,
          price: parseFloat(item.price || item.variant?.price || 0),
          total_discount: parseFloat(item.total_discount || 0),
          sku: item.sku || item.variant?.sku || null,
          vendor: item.vendor || null,
          image_url: imageUrl,
          image_alt: item.title || item.name || null,
          shopify_raw_data: item,
        }
      })

  // Calculate totals
  const subtotal = order.subtotal_price || order.total_order_fees || 0
  const tax = order.total_tax || 0
  const discounts = order.total_discounts || 0
  const shipping = order.total_shipping_price || 0
  const total = order.total_order_fees || subtotal + tax - discounts + shipping
  const paid = order.payment_status === 'paid' ? total : 0
  const balance = total - paid

  // Parse addresses (they might be JSON strings)
  let shippingAddr: any = {}
  let billingAddr: any = {}
  
  try {
    shippingAddr = typeof order.shipping_address === 'string' 
      ? JSON.parse(order.shipping_address) 
      : (order.shipping_address || {})
  } catch (e) {
    shippingAddr = order.shipping_address || {}
  }

  try {
    billingAddr = typeof order.billing_address === 'string' 
      ? JSON.parse(order.billing_address) 
      : (order.billing_address || {})
  } catch (e) {
    billingAddr = order.billing_address || {}
  }

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (e) {
      return dateString
    }
  }

  // Get status badge
  const getStatusBadge = (status: string, type: 'payment' | 'fulfillment' = 'payment') => {
    const statusColors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cod: 'bg-orange-100 text-orange-800 border-orange-200',
      unfulfilled: 'bg-gray-100 text-gray-800 border-gray-200',
      fulfilled: 'bg-blue-100 text-blue-800 border-blue-200',
      partial: 'bg-purple-100 text-purple-800 border-purple-200',
    }

    const statusLabels: Record<string, string> = {
      paid: 'Paid',
      pending: 'Payment pending',
      cod: 'Cash on Delivery',
      unfulfilled: 'Unfulfilled',
      fulfilled: 'Fulfilled',
      partial: 'Partially Fulfilled',
    }

    const color = statusColors[status] || statusColors.pending
    const label = statusLabels[status] || status

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${color}`}>
        {label}
      </span>
    )
  }

  // Error boundary - show error if something goes wrong
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-600">Error Loading Order</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full my-8 max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">Order #{order.order_id}</h2>
                {order.shopify_order_name && (
                  <span className="text-blue-200 text-sm">({order.shopify_order_name})</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                {order.payment_status && getStatusBadge(order.payment_status, 'payment')}
                {order.fulfillment_status && getStatusBadge(order.fulfillment_status, 'fulfillment')}
              </div>
              <div className="flex items-center gap-4 mt-3 text-blue-100 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(order.shopify_created_at || order.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Online Store</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white transition-colors p-2 rounded-lg hover:bg-blue-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Fulfillment Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Fulfillment</h3>
                  {order.fulfillment_status && getStatusBadge(order.fulfillment_status, 'fulfillment')}
                </div>
                {order.shipping_method && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Truck className="w-4 h-4" />
                    <span>{order.shipping_method}</span>
                  </div>
                )}
                {order.tracking_number && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600">Tracking: </span>
                    {order.tracking_url ? (
                      <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {order.tracking_number}
                      </a>
                    ) : (
                      <span className="text-gray-900">{order.tracking_number}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Products */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Products</h3>
                {loadingItems ? (
                  <div className="text-center py-8 text-gray-500">Loading products...</div>
                ) : items.length > 0 ? (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={item.id || index} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          {(() => {
                            const hasImage = item.image_url && 
                                           item.image_url !== 'null' && 
                                           item.image_url !== null &&
                                           typeof item.image_url === 'string' &&
                                           item.image_url.trim() !== '' &&
                                           !item.image_url.includes('undefined')
                            
                            console.log(`🖼️ Rendering image for "${item.title}":`, {
                              image_url: item.image_url,
                              hasImage: hasImage,
                              image_url_type: typeof item.image_url,
                              image_url_length: item.image_url ? item.image_url.length : 0
                            })
                            
                            return hasImage ? (
                              <img
                                src={item.image_url}
                                alt={item.image_alt || item.title}
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  console.error(`❌ Image failed to load for "${item.title}":`, {
                                    url: item.image_url,
                                    error: e,
                                    target: (e.target as HTMLImageElement).src
                                  })
                                  const target = e.target as HTMLImageElement
                                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E'
                                  target.onerror = null // Prevent infinite loop
                                }}
                                onLoad={() => {
                                  console.log(`✅ Image loaded successfully: "${item.title}"`, item.image_url?.substring(0, 60))
                                }}
                              />
                            ) : (
                              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center" title={`No image: ${item.image_url || 'null'}`}>
                                <ImageIcon className="w-8 h-8 text-gray-400" />
                              </div>
                            )
                          })()}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                          {item.variant_title && (
                            <p className="text-sm text-gray-500 mb-1">{item.variant_title}</p>
                          )}
                          {item.sku && (
                            <p className="text-xs text-gray-400 mb-2">SKU: {item.sku}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Quantity: {item.quantity}</span>
                            <span className="font-semibold text-gray-900">
                              {order.currency || 'EGP'} {(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          {item.total_discount > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              Discount: -{order.currency || 'EGP'} {item.total_discount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No products found</p>
                  </div>
                )}
              </div>

              {/* Payment Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Payment</h3>
                  {order.payment_status && getStatusBadge(order.payment_status, 'payment')}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                    <span className="font-medium text-gray-900">{order.currency || 'EGP'} {subtotal.toFixed(2)}</span>
                  </div>
                  {shipping > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      <span className="text-gray-600">{order.shipping_method || 'Standard'}</span>
                      <span className="text-gray-900">{order.currency || 'EGP'} {shipping.toFixed(2)}</span>
                    </div>
                  )}
                  {tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="text-gray-900">{order.currency || 'EGP'} {tax.toFixed(2)}</span>
                    </div>
                  )}
                  {discounts > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discounts</span>
                      <span>-{order.currency || 'EGP'} {discounts.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>{order.currency || 'EGP'} {total.toFixed(2)}</span>
                    </div>
                  </div>
                  {order.payment_status !== 'paid' && (
                    <>
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                        <span className="text-gray-600">Paid</span>
                        <span className="text-gray-900">{order.currency || 'EGP'} {paid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-900">Balance</span>
                        <span className="text-gray-900">{order.currency || 'EGP'} {balance.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
                {order.payment_gateway_names && order.payment_gateway_names.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Payment Gateway: {order.payment_gateway_names.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Customer
                  </h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">{order.customer_name}</p>
                    {order.customer_email && (
                      <a href={`mailto:${order.customer_email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" />
                        {order.customer_email}
                      </a>
                    )}
                  </div>
                  {(order.mobile_number || order.customer_phone) && (
                    <a href={`tel:${order.mobile_number || order.customer_phone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {order.mobile_number || order.customer_phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </h3>
                <div className="space-y-1 text-sm">
                  {shippingAddr.name && <p className="font-medium text-gray-900">{shippingAddr.name}</p>}
                  {shippingAddr.address1 && <p className="text-gray-700">{shippingAddr.address1}</p>}
                  {shippingAddr.address2 && <p className="text-gray-700">{shippingAddr.address2}</p>}
                  <p className="text-gray-700">
                    {[shippingAddr.city, shippingAddr.province, shippingAddr.zip]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {shippingAddr.country && <p className="text-gray-700">{shippingAddr.country}</p>}
                  {shippingAddr.phone && (
                    <p className="text-gray-700 mt-2">
                      <Phone className="w-3 h-3 inline mr-1" />
                      {shippingAddr.phone}
                    </p>
                  )}
                  {!shippingAddr.name && !shippingAddr.address1 && (
                    <p className="text-gray-500">{order.address || 'No address provided'}</p>
                  )}
                </div>
              </div>

              {/* Billing Address */}
              {(billingAddr.address1 || billingAddr.name) && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Billing Address
                  </h3>
                  <div className="space-y-1 text-sm">
                    {billingAddr.name && <p className="font-medium text-gray-900">{billingAddr.name}</p>}
                    {billingAddr.address1 && <p className="text-gray-700">{billingAddr.address1}</p>}
                    {billingAddr.address2 && <p className="text-gray-700">{billingAddr.address2}</p>}
                    <p className="text-gray-700">
                      {[billingAddr.city, billingAddr.province, billingAddr.zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    {billingAddr.country && <p className="text-gray-700">{billingAddr.country}</p>}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(order.notes || order.order_note || order.customer_note) && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notes
                  </h3>
                  <div className="space-y-3 text-sm">
                    {order.order_note && (
                      <div>
                        <p className="text-gray-600 mb-1">Order Note:</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{order.order_note}</p>
                      </div>
                    )}
                    {order.customer_note && (
                      <div>
                        <p className="text-gray-600 mb-1">Customer Note:</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{order.customer_note}</p>
                      </div>
                    )}
                    {order.notes && !order.order_note && !order.customer_note && (
                      <p className="text-gray-900 whitespace-pre-wrap">{order.notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Tags */}
              {order.order_tags && order.order_tags.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {order.order_tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Order History */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Order History
                </h3>
                {loadingHistory ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-2">Loading history...</p>
                  </div>
                ) : orderHistory.length > 0 ? (
                  <div className="space-y-3">
                    {orderHistory.map((entry, index) => {
                      const prevEntry = index > 0 ? orderHistory[index - 1] : null
                      const statusChanged = prevEntry && prevEntry.status !== entry.status
                      const courierChanged = prevEntry && prevEntry.assigned_courier_id !== entry.assigned_courier_id
                      const date = new Date(entry.updated_at)
                      const createdDate = new Date(entry.created_at)
                      const isFirst = index === 0
                      const isLast = index === orderHistory.length - 1
                      const isCreated = isFirst && entry.created_at === entry.updated_at
                      
                      return (
                        <div key={entry.id} className="relative pl-6 border-l-2 border-gray-200">
                          {!isLast && (
                            <div className="absolute left-[-5px] top-6 w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <div className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    {date.toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                
                                {/* Order Created - Show on first entry */}
                                {isFirst && (
                                  <div className="mt-1">
                                    <span className="text-xs font-medium text-gray-600">📦 Order Created</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      {createdDate.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Courier Assignment - Show every time it changes */}
                                {entry.assigned_courier_id && (
                                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                                    <Truck className="w-3 h-3 text-gray-400" />
                                    {courierChanged && prevEntry ? (
                                      <>
                                        <span className="text-xs text-gray-600">Reassigned from:</span>
                                        <span className="text-xs text-gray-500">
                                          {prevEntry.assigned_courier_name || 'Unassigned'}
                                        </span>
                                        <ArrowRight className="w-3 h-3 text-gray-400" />
                                        <span className="text-xs text-gray-600">to:</span>
                                        <span className="text-xs font-medium text-blue-600">
                                          {entry.assigned_courier_name || 'Unknown Courier'}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-xs text-gray-600">Assigned to:</span>
                                        <span className="text-xs font-medium text-blue-600">
                                          {entry.assigned_courier_name || 'Unknown Courier'}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}
                                
                                {/* Status Change - Show every status transition */}
                                {statusChanged && (
                                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-gray-600">Status changed:</span>
                                    {prevEntry && (
                                      <>
                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                          prevEntry.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                          prevEntry.status === 'return' ? 'bg-orange-100 text-orange-700' :
                                          prevEntry.status === 'canceled' ? 'bg-red-100 text-red-700' :
                                          prevEntry.status === 'partial' ? 'bg-blue-100 text-blue-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                          {prevEntry.status}
                                        </span>
                                        <ArrowRight className="w-3 h-3 text-gray-400" />
                                      </>
                                    )}
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                      entry.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                      entry.status === 'return' ? 'bg-orange-100 text-orange-700' :
                                      entry.status === 'canceled' ? 'bg-red-100 text-red-700' :
                                      entry.status === 'partial' ? 'bg-blue-100 text-blue-700' :
                                      entry.status === 'assigned' ? 'bg-purple-100 text-purple-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {entry.status}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Show if order was updated but no visible change */}
                                {!statusChanged && !isFirst && !courierChanged && !isCreated && (
                                  <div className="mt-1">
                                    <span className="text-xs text-gray-500">Order updated</span>
                                    {entry.status && (
                                      <span className={`text-xs px-2 py-0.5 rounded ml-2 ${
                                        entry.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                        entry.status === 'return' ? 'bg-orange-100 text-orange-700' :
                                        entry.status === 'canceled' ? 'bg-red-100 text-red-700' :
                                        entry.status === 'partial' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {entry.status}
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {/* Current Status Indicator */}
                                {isLast && (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <span className="text-xs font-medium text-gray-700">✓ Current Status: </span>
                                    <span className="text-xs text-gray-600">{entry.status}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <History className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No history available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderDetailModal
