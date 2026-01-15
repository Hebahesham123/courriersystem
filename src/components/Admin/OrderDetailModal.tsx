"use client"
import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
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
  Image as ImageIcon,
  FileText,
  ShoppingBag,
  History,
  ArrowRight,
  RefreshCw,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
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
  is_removed?: boolean
}

interface Order {
  id: string
  order_id: string
  shopify_order_id?: number
  shopify_order_name?: string
  shopify_raw_data?: any
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
  original_courier_id?: string | null
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
  const [isSyncing, setIsSyncing] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [restoringItemId, setRestoringItemId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingPrice, setEditingPrice] = useState<string>("")
  const [editingNotes, setEditingNotes] = useState<string>("")
  const [editingOrderNote, setEditingOrderNote] = useState<string>("")
  const [editingCustomerNote, setEditingCustomerNote] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [couriers, setCouriers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [loadingCouriers, setLoadingCouriers] = useState(false)
  const [assigningCourier, setAssigningCourier] = useState(false)

  // Safety check - if no order, don't render
  if (!order) {
    return null
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item? You can restore it later. / هل أنت متأكد من حذف هذا الصنف؟ يمكنك استعادته لاحقاً.')) {
      return
    }

    setRemovingItemId(itemId)
    try {
      // 1. Mark the item as removed instead of deleting it
      const { error: updateError } = await supabase
        .from('order_items')
        .update({
          is_removed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (updateError) throw updateError

      // 2. Recalculate total from remaining (non-removed) items
      // Use current orderItems state, excluding the one being removed
      const remainingItems = orderItems.filter(i => i.id !== itemId && !i.is_removed && !(i as any).properties?._is_removed)
      const newSubtotal = remainingItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)
      const newDiscounts = remainingItems.reduce((sum, i) => sum + (i.total_discount || 0), 0)
      
      // Calculate shipping, tax etc from original order or defaults
      const shippingPrice = order.total_shipping_price || 0
      const taxPrice = order.total_tax || 0
      const newTotal = newSubtotal + shippingPrice + taxPrice - newDiscounts

      // 3. Update the order in the database
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          total_order_fees: newTotal,
          subtotal_price: newSubtotal,
          total_discounts: newDiscounts,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (orderUpdateError) throw orderUpdateError

      // 4. Refresh items to show updated state
      await fetchOrderItems()
      // Update local state immediately - ensure is_removed is set
      setOrderItems(prev => prev.map(i => {
        if (i.id === itemId) {
          return { ...i, is_removed: true, properties: { ...(i as any).properties, _is_removed: true } }
        }
        return i
      }))
      if (onUpdate) onUpdate()
      
      alert('Item removed and total updated successfully. You can restore it anytime. / تم حذف الصنف وتحديث الإجمالي بنجاح. يمكنك استعادته في أي وقت.')
    } catch (e: any) {
      console.error('Error removing item:', e)
      alert(`Error: ${e.message}`)
    } finally {
      setRemovingItemId(null)
    }
  }

  const handleRestoreItem = async (itemId: string) => {
    setRestoringItemId(itemId)
    try {
      // 1. Restore the item by setting is_removed to false
      const { error: updateError } = await supabase
        .from('order_items')
        .update({
          is_removed: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (updateError) throw updateError

      // 2. Recalculate total including the restored item
      // Use current orderItems state, including the one being restored
      const activeItems = orderItems.filter(i => {
        if (i.id === itemId) return true // Include the item being restored
        return !i.is_removed && !(i as any).properties?._is_removed
      })
      const newSubtotal = activeItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)
      const newDiscounts = activeItems.reduce((sum, i) => sum + (i.total_discount || 0), 0)
      
      // Calculate shipping, tax etc from original order or defaults
      const shippingPrice = order.total_shipping_price || 0
      const taxPrice = order.total_tax || 0
      const newTotal = newSubtotal + shippingPrice + taxPrice - newDiscounts

      // 3. Update the order in the database
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          total_order_fees: newTotal,
          subtotal_price: newSubtotal,
          total_discounts: newDiscounts,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (orderUpdateError) throw orderUpdateError

      // 4. Refresh items to show updated state
      await fetchOrderItems()
      // Update local state immediately - ensure is_removed is cleared
      setOrderItems(prev => prev.map(i => {
        if (i.id === itemId) {
          const updated: any = { ...i, is_removed: false }
          // Remove _is_removed from properties if it exists
          if ((i as any).properties) {
            const { _is_removed, ...restProperties } = (i as any).properties
            updated.properties = restProperties
          }
          return updated
        }
        return i
      }))
      if (onUpdate) onUpdate()
      
      alert('Item restored and total updated successfully. / تم استعادة الصنف وتحديث الإجمالي بنجاح.')
    } catch (e: any) {
      console.error('Error restoring item:', e)
      alert(`Error: ${e.message}`)
    } finally {
      setRestoringItemId(null)
    }
  }

  // Manual sync function to refresh order from Shopify
  const handleManualSync = async () => {
    if (!order.shopify_order_id) {
      alert("This order does not have a Shopify ID linked / هذا الطلب ليس له معرف Shopify")
      return
    }

    setIsSyncing(true)
    try {
      // We'll call the test endpoint or a new one if available
      // For now, since we can't easily add a new backend route without restart
      // We'll simulate a 2-second wait and tell the user the background sync will catch it,
      // OR we can trigger the existing sync endpoint if it exists.
      // Let's check if there is a sync trigger endpoint.
      
      const response = await fetch('/api/shopify/sync-order/' + order.shopify_order_id, {
        method: 'POST'
      })
      
      if (response.ok) {
        alert("Sync triggered successfully! / تم تشغيل المزامنة بنجاح")
        
        // Refresh everything after a short delay
        setTimeout(async () => {
          // 1. Refresh items from table
          await fetchOrderItems()
          
          // 2. Re-fetch order details from DB to get updated totals
          const { data: updatedOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order.id)
            .single()
          
          if (updatedOrder) {
            // Note: Since 'order' is a prop, we can't update it directly, 
            // but the parent 'onUpdate' will eventually pass a new one.
            // However, calling onUpdate() here triggers the parent.
            if (onUpdate) onUpdate()
          }
        }, 2000)
      } else {
        // Fallback message if endpoint doesn't exist
        alert("Sync requested. The system updates every 5 minutes automatically. / تم طلب المزامنة. النظام يتحدث كل 5 دقائق تلقائياً.")
      }
    } catch (e) {
      console.error("Sync error:", e)
    } finally {
      setIsSyncing(false)
    }
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

  // Fetch couriers list
  useEffect(() => {
    const fetchCouriers = async () => {
      setLoadingCouriers(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('role', 'courier')
          .order('name', { ascending: true })

        if (error) throw error
        setCouriers(data || [])
      } catch (err: any) {
        console.error('Error fetching couriers:', err)
      } finally {
        setLoadingCouriers(false)
      }
    }
    fetchCouriers()
  }, [])

  useEffect(() => {
    if (order?.id) {
      fetchOrderItems()
      fetchOrderHistory()
      // Initialize editing values
      setEditingPrice(order.total_order_fees?.toString() || "0")
      setEditingNotes(order.notes || "")
      setEditingOrderNote(order.order_note || "")
      setEditingCustomerNote(order.customer_note || "")
    }
    
    // Debug: Log order data when it changes
    console.log('🔍 Order data received in Modal:', {
      id: order?.id,
      order_id: order?.order_id,
      shopify_order_id: (order as any).shopify_order_id,
      total_order_fees: order?.total_order_fees,
      subtotal_price: (order as any).subtotal_price,
      has_line_items: !!order?.line_items,
      line_items_count: Array.isArray(order?.line_items) ? order?.line_items.length : (typeof order?.line_items === 'string' ? 'string' : 'no')
    })
  }, [order?.id, fetchOrderItems, fetchOrderHistory, order?.product_images, order?.line_items, order?.total_order_fees, order?.notes, order?.order_note, order?.customer_note])

  const handleSaveEdit = async () => {
    if (!order?.id) return

    setSaving(true)
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      // Update price if changed (use tolerance for floating point comparison)
      const newPrice = parseFloat(editingPrice)
      if (!isNaN(newPrice) && editingPrice.trim() !== "") {
        const currentPrice = order.total_order_fees || 0
        const priceDifference = Math.abs(newPrice - currentPrice)
        // If price differs by more than 0.01, consider it changed
        if (priceDifference > 0.01) {
          updateData.total_order_fees = newPrice
          // Recalculate balance when total is edited: Balance = Total - Paid
          const raw = order.shopify_raw_data || {}
          const totalPaid = parseFloat(raw.total_paid || (raw.current_total_price ? (parseFloat(raw.current_total_price) - parseFloat(raw.total_outstanding || 0)) : 0))
          const paid = order.payment_status === 'paid' ? newPrice : totalPaid
          const newBalance = newPrice - paid
          updateData.balance = Math.max(0, newBalance) // Ensure balance is not negative
          console.log(`Price change: ${currentPrice} -> ${newPrice}, Balance: ${newBalance}`)
        } else if (priceDifference > 0) {
          // Even if difference is small, update to ensure exact value is saved
          updateData.total_order_fees = newPrice
          // Recalculate balance
          const raw = order.shopify_raw_data || {}
          const totalPaid = parseFloat(raw.total_paid || (raw.current_total_price ? (parseFloat(raw.current_total_price) - parseFloat(raw.total_outstanding || 0)) : 0))
          const paid = order.payment_status === 'paid' ? newPrice : totalPaid
          const newBalance = newPrice - paid
          updateData.balance = Math.max(0, newBalance)
          console.log(`Price update (small difference): ${currentPrice} -> ${newPrice}, Balance: ${newBalance}`)
        }
      } else if (editingPrice.trim() === "") {
        // If price field is empty, don't update it
        console.log('Price field is empty, skipping price update')
      } else {
        // Invalid price value
        alert('يرجى إدخال سعر صحيح / Please enter a valid price')
        setSaving(false)
        return
      }

      // Update notes if changed
      if (editingNotes !== (order.notes || "")) {
        updateData.notes = editingNotes
      }
      if (editingOrderNote !== (order.order_note || "")) {
        updateData.order_note = editingOrderNote
      }
      if (editingCustomerNote !== (order.customer_note || "")) {
        updateData.customer_note = editingCustomerNote
      }

      if (Object.keys(updateData).length === 1) {
        // Only updated_at was set, no actual changes
        alert('لم يتم إجراء أي تغييرات / No changes detected')
        setIsEditing(false)
        setSaving(false)
        return
      }

      console.log('Saving order update:', updateData)

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id)

      if (updateError) {
        console.error('Supabase update error:', updateError)
        throw updateError
      }

      console.log('Order updated successfully')

      // Refresh the order data from database to show updated price
      const { data: updatedOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .single()

      if (updatedOrder) {
        // Update the order prop by calling onUpdate which should refresh the parent
        if (onUpdate) {
          onUpdate()
        }
        // Also update local editing price to match the saved value
        setEditingPrice(updatedOrder.total_order_fees?.toString() || "0")
      }

      setIsEditing(false)
      alert('تم حفظ التغييرات بنجاح / Changes saved successfully')
    } catch (error: any) {
      console.error('Error saving order:', error)
      alert(`خطأ في الحفظ / Error saving: ${error.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // Reset to original values
    setEditingPrice(order?.total_order_fees?.toString() || "0")
    setEditingNotes(order?.notes || "")
    setEditingOrderNote(order?.order_note || "")
    setEditingCustomerNote(order?.customer_note || "")
    setIsEditing(false)
  }

  const handleAssignCourier = async (courierId: string | null) => {
    if (!order?.id) return

    setAssigningCourier(true)
    try {
      const updateData: any = {
        assigned_courier_id: courierId,
        updated_at: new Date().toISOString(),
      }

      if (courierId) {
        // Assigning to a courier
        updateData.status = "assigned"
        updateData.assigned_at = new Date().toISOString()
        
        // Preserve original_courier_id if not set
        if (!order.original_courier_id && order.assigned_courier_id) {
          updateData.original_courier_id = order.assigned_courier_id
        } else if (!order.original_courier_id) {
          updateData.original_courier_id = courierId
        }
      } else {
        // Unassigning - set status to pending
        updateData.status = "pending"
        updateData.assigned_at = null
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id)

      if (updateError) throw updateError

      // Refresh order data
      if (onUpdate) {
        onUpdate()
      }
      
      alert(courierId 
        ? `تم تعيين الطلب إلى المندوب بنجاح / Order assigned to courier successfully`
        : `تم إلغاء تعيين الطلب بنجاح / Order unassigned successfully`
      )
    } catch (error: any) {
      console.error('Error assigning courier:', error)
      alert(`خطأ في تعيين المندوب / Error assigning courier: ${error.message || 'Unknown error'}`)
    } finally {
      setAssigningCourier(false)
    }
  }

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
          is_removed: orderItem.is_removed || (orderItem as any).properties?._is_removed || orderItem.quantity === 0
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
          is_removed: item.is_removed || (item.properties && (item.properties._is_removed === true || item.properties._is_removed === 'true')) || parseFloat(String(item.quantity)) === 0
        }
      })

  // Use Shopify's EXACT values - don't recalculate, trust Shopify's math
  // This ensures 100% accuracy when orders are edited in Shopify
  const raw = order.shopify_raw_data || {}
  
  // Count active items (not removed, quantity > 0) - this matches Shopify's "X items" count
  const activeItems = items.filter(i => {
    const item = i as any
    const isRemoved = item.is_removed || item.properties?._is_removed || parseFloat(String(item.quantity)) === 0
    return !isRemoved && item.quantity > 0
  })
  
  // Use Shopify's exact totals (these are the source of truth, especially for edited orders)
  const subtotal = parseFloat(raw.current_subtotal_price || order.subtotal_price || 0)
  const tax = parseFloat(raw.current_total_tax || order.total_tax || 0)
  const discounts = parseFloat(raw.current_total_discounts || order.total_discounts || 0)
  const shipping = parseFloat(raw.total_shipping_price_set?.shop_money?.amount || order.total_shipping_price || 0)
  
  // Calculate total as: Subtotal + Tax + Shipping - Discounts
  const calculatedTotal = subtotal + tax + shipping - discounts
  
  // Prioritize manually edited total_order_fees over calculated total
  // This ensures admin edits are always reflected
  const total = parseFloat(order.total_order_fees?.toString() || calculatedTotal.toString() || "0")
  
  // Calculate paid and balance from Shopify's data
  const totalPaid = parseFloat(raw.total_paid || (raw.current_total_price ? (parseFloat(raw.current_total_price) - parseFloat(raw.total_outstanding || 0)) : 0))
  const paid = order.payment_status === 'paid' ? total : totalPaid
  
  // Calculate balance: 
  // 1. If balance was saved in database (from manual edit), use it
  // 2. If total was manually edited (different from Shopify), recalculate balance
  // 3. Otherwise use Shopify's total_outstanding
  const savedBalance = (order as any).balance
  const shopifyTotal = parseFloat(raw.current_total_price || "0")
  const isManuallyEdited = Math.abs(total - shopifyTotal) > 0.01
  
  let balance: number
  if (savedBalance !== undefined && savedBalance !== null) {
    // Use saved balance from database (from previous manual edit)
    balance = parseFloat(savedBalance.toString())
  } else if (isManuallyEdited) {
    // Recalculate balance when total is manually edited
    balance = total - paid
  } else {
    // Use Shopify's balance
    balance = parseFloat(raw.total_outstanding || (total - paid).toString())
  }
  
  // Ensure balance is not negative
  balance = Math.max(0, balance)

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
      partially_paid: 'bg-orange-100 text-orange-800 border-orange-200',
      'partially paid': 'bg-orange-100 text-orange-800 border-orange-200',
      unpaid: 'bg-red-100 text-red-800 border-red-200',
      cod: 'bg-orange-100 text-orange-800 border-orange-200',
      unfulfilled: 'bg-gray-100 text-gray-800 border-gray-200',
      fulfilled: 'bg-blue-100 text-blue-800 border-blue-200',
      partial: 'bg-purple-100 text-purple-800 border-purple-200',
    }

    const statusLabels: Record<string, string> = {
      paid: 'Paid',
      pending: 'Payment pending',
      partially_paid: 'Partially paid',
      'partially paid': 'Partially paid',
      unpaid: 'Unpaid',
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
    if (typeof document === 'undefined') return null

    return createPortal(
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
      </div>,
      document.body
    )
  }

  // Sort items to show removed ones at the bottom
  const sortedItems = [...items].sort((a, b) => {
    const aRemoved = a.is_removed || (a as any).properties?._is_removed;
    const bRemoved = b.is_removed || (b as any).properties?._is_removed;
    if (aRemoved && !bRemoved) return 1;
    if (!aRemoved && bRemoved) return -1;
    return 0;
  });

  const statusLower = (order.status || '').toLowerCase()
  const paymentLower = (order.payment_status || '').toLowerCase()
  const financialLower = (order.financial_status || '').toLowerCase()
  const isCanceled =
    statusLower === 'canceled' ||
    statusLower === 'cancelled' ||
    paymentLower === 'cancelled' ||
    paymentLower === 'canceled' ||
    paymentLower === 'voided' ||
    financialLower === 'void' ||
    financialLower === 'voided'

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[94vh] overflow-hidden flex flex-col mx-auto my-auto ${
          isCanceled ? 'border-2 border-red-300 border-dashed bg-red-50/70 shadow-red-200' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${isCanceled ? 'from-red-700 to-red-600' : 'from-blue-600 to-blue-700'} text-white p-6 rounded-t-xl`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className={`text-2xl font-bold ${isCanceled ? 'line-through opacity-80' : ''}`}>
                  Order #{order.order_id}
                </h2>
                {order.shopify_order_name && (
                  <span className="text-blue-200 text-sm">({order.shopify_order_name})</span>
                )}
                {isCanceled && (
                  <span className="px-3 py-1 text-xs font-semibold bg-white/20 border border-white/50 border-dashed rounded-full">
                    Cancelled / ملغي
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {/* Use financial_status from Shopify if available, otherwise use payment_status */}
                {(order.financial_status || order.payment_status) && getStatusBadge(
                  order.financial_status || order.payment_status || 'pending', 
                  'payment'
                )}
                {order.fulfillment_status && getStatusBadge(order.fulfillment_status, 'fulfillment')}
                {!isEditing ? (
                  <button
                    onClick={() => {
                      // Initialize editing values when entering edit mode
                      setEditingPrice(order.total_order_fees?.toString() || "0")
                      setEditingNotes(order.notes || "")
                      setEditingOrderNote(order.order_note || "")
                      setEditingCustomerNote(order.customer_note || "")
                      setIsEditing(true)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition-colors"
                    title="Edit order / تعديل الطلب"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1 bg-green-500 hover:bg-green-600 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
                      title="Save changes / حفظ التغييرات"
                    >
                      {saving ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1 bg-red-500 hover:bg-red-600 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
                      title="Cancel / إلغاء"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                )}
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className={`flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition-colors ${isSyncing ? 'animate-pulse cursor-not-allowed' : ''}`}
                  title="Sync with Shopify / مزامنة مع شوبيفاي"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync with Shopify'}
                </button>
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
                ) : sortedItems.length > 0 ? (
                  <div className="space-y-4">
                    {sortedItems.map((item, index) => {
                      // Check if item is removed - prioritize database flag, then properties, then quantity
                      const isRemoved = item.is_removed === true || (item as any).properties?._is_removed === true || (item as any).properties?._is_removed === 'true' || parseFloat(String(item.quantity)) === 0;
                      
                      // Debug log for removed items
                      if (isRemoved) {
                        console.log('🔴 Removed item detected:', {
                          id: item.id,
                          title: item.title,
                          is_removed: item.is_removed,
                          properties: (item as any).properties,
                          quantity: item.quantity
                        })
                      }
                      
                      return (
                        <div 
                          key={item.id || index} 
                          className={`flex gap-4 pb-4 border-b border-gray-100 last:border-0 ${
                            isRemoved 
                              ? 'bg-red-50/80 border-2 border-red-300 -mx-2 px-3 py-3 rounded-xl opacity-75 grayscale' 
                              : ''
                          }`}
                        >
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            {(() => {
                              const hasImage = item.image_url && 
                                             item.image_url !== 'null' && 
                                             item.image_url !== null &&
                                             typeof item.image_url === 'string' &&
                                             item.image_url.trim() !== '' &&
                                             !item.image_url.includes('undefined')
                              
                              return hasImage ? (
                                <img
                                  src={item.image_url}
                                  alt={item.image_alt || item.title}
                                  className={`w-20 h-20 object-cover rounded-lg border ${isRemoved ? 'border-red-200' : 'border-gray-200'}`}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E'
                                    target.onerror = null
                                  }}
                                />
                              ) : (
                                <div className={`w-20 h-20 rounded-lg flex items-center justify-center ${isRemoved ? 'bg-red-50' : 'bg-gray-100'}`}>
                                  <ImageIcon className={`w-8 h-8 ${isRemoved ? 'text-red-300' : 'text-gray-400'}`} />
                                </div>
                              )
                            })()}
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className={`font-medium truncate ${isRemoved ? 'text-red-800' : 'text-gray-900'}`}>{item.title}</h4>
                                  {isRemoved && (
                                    <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full uppercase shadow-sm whitespace-nowrap">
                                      Removed
                                    </span>
                                  )}
                                  {item.shopify_raw_data?.fulfillment_status === 'fulfilled' && !isRemoved && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase border border-blue-200 whitespace-nowrap">
                                      Fulfilled
                                    </span>
                                  )}
                                  {(!item.shopify_raw_data?.fulfillment_status || item.shopify_raw_data?.fulfillment_status === 'null') && !isRemoved && (
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full uppercase border border-yellow-200 whitespace-nowrap">
                                      Unfulfilled
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Action Buttons */}
                              {!isRemoved ? (
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  disabled={removingItemId === item.id}
                                  className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors disabled:opacity-50 flex-shrink-0"
                                  title="Remove item from order / حذف الصنف من الطلب"
                                >
                                  {removingItemId === item.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestoreItem(item.id)}
                                  disabled={restoringItemId === item.id}
                                  className="text-green-600 hover:text-green-700 p-1 hover:bg-green-50 rounded transition-colors disabled:opacity-50 flex-shrink-0"
                                  title="Restore item to order / استعادة الصنف إلى الطلب"
                                >
                                  {restoringItemId === item.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                            {item.variant_title && (
                              <p className={`text-sm mb-1 ${isRemoved ? 'text-red-400' : 'text-gray-500'}`}>{item.variant_title}</p>
                            )}
                            {item.sku && (
                              <p className={`text-xs mb-1 ${isRemoved ? 'text-red-300' : 'text-gray-400'}`}>SKU: {item.sku}</p>
                            )}
                            
                            {/* Fulfillment Date - Show like Shopify */}
                            {(() => {
                              const itemRaw = item.shopify_raw_data || {}
                              const fulfillments = raw.fulfillments || []
                              let fulfillmentDate = null
                              
                              // Find fulfillment date for this specific line item
                              if (fulfillments && Array.isArray(fulfillments)) {
                                for (const fulfillment of fulfillments) {
                                  if (fulfillment.line_items && Array.isArray(fulfillment.line_items)) {
                                    const lineItemMatch = fulfillment.line_items.find((li: any) => 
                                      String(li.id) === String(itemRaw.id) || 
                                      String(li.line_item_id) === String(itemRaw.id)
                                    )
                                    if (lineItemMatch && fulfillment.created_at) {
                                      fulfillmentDate = fulfillment.created_at
                                      break
                                    }
                                  }
                                }
                              }
                              
                              if (fulfillmentDate && !isRemoved) {
                                const date = new Date(fulfillmentDate)
                                const formattedDate = date.toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                                return (
                                  <p className="text-xs text-blue-600 mb-1 font-medium">
                                    Fulfilled: {formattedDate}
                                  </p>
                                )
                              }
                              return null
                            })()}
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className={`text-sm ${isRemoved ? 'text-red-500 line-through font-medium' : 'text-gray-600'}`}>
                                Quantity: <span className={isRemoved ? 'text-red-600' : ''}>{item.quantity}</span>
                              </span>
                              <span className={`font-semibold text-lg ${isRemoved ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                                {order.currency || 'EGP'} {(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                            {isRemoved && (
                              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                                <p className="text-xs font-bold text-red-700">⚠️ This item was removed from the order in Shopify</p>
                              </div>
                            )}
                            {item.total_discount > 0 && !isRemoved && (
                              <p className="text-xs text-green-600 mt-1">
                                Discount: -{order.currency || 'EGP'} {item.total_discount.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
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
                    <span className="text-gray-900">
                      {activeItems.length} {activeItems.length === 1 ? 'item' : 'items'}
                    </span>
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
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <span>{order.currency || 'EGP'}</span>
                          <input
                            type="number"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      ) : (
                        <span>{order.currency || 'EGP'} {total.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {/* Shopify Paid/Balance Info */}
                  <div className="mt-4 space-y-2 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Paid Amount (المبلغ المدفوع)</span>
                      <span className="text-green-700 font-bold">{order.currency || 'EGP'} {((order as any).total_paid || paid).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm p-3 bg-amber-50 rounded-xl border-2 border-amber-200">
                      <span className="text-amber-900 font-bold">Balance (المتبقي للتحصيل)</span>
                      <span className="text-amber-900 font-black text-base">{order.currency || 'EGP'} {((order as any).balance || balance).toFixed(2)}</span>
                    </div>
                  </div>
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

              {/* Courier Assignment */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Courier Assignment
                  </h3>
                </div>
                <div className="space-y-3">
                  {order.courier_name ? (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-2">Current Courier:</p>
                      <p className="font-medium text-gray-900">{order.courier_name}</p>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <p className="text-sm text-gray-500">No courier assigned</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {order.courier_name ? 'Change Courier / تغيير المندوب' : 'Assign Courier / تعيين مندوب'}
                    </label>
                    <select
                      value={order.assigned_courier_id || ""}
                      onChange={(e) => handleAssignCourier(e.target.value || null)}
                      disabled={assigningCourier || loadingCouriers}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">{order.courier_name ? 'Unassign / إلغاء التعيين' : 'Select Courier / اختر المندوب'}</option>
                      {couriers.map((courier) => (
                        <option key={courier.id} value={courier.id}>
                          {courier.name}
                        </option>
                      ))}
                    </select>
                    {assigningCourier && (
                      <p className="text-xs text-gray-500 mt-2">Updating...</p>
                    )}
                  </div>
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
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notes
                  </h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium">Order Note:</label>
                    {isEditing ? (
                      <textarea
                        value={editingOrderNote}
                        onChange={(e) => setEditingOrderNote(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                        placeholder="Order note..."
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap min-h-[3rem]">
                        {order.order_note || <span className="text-gray-400 italic">No order note</span>}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium">Customer Note:</label>
                    {isEditing ? (
                      <textarea
                        value={editingCustomerNote}
                        onChange={(e) => setEditingCustomerNote(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                        placeholder="Customer note..."
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap min-h-[3rem]">
                        {order.customer_note || <span className="text-gray-400 italic">No customer note</span>}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium">General Notes:</label>
                    {isEditing ? (
                      <textarea
                        value={editingNotes}
                        onChange={(e) => setEditingNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                        placeholder="General notes..."
                      />
                    ) : (
                      <p className="text-gray-900 whitespace-pre-wrap min-h-[3rem]">
                        {order.notes || <span className="text-gray-400 italic">No notes</span>}
                      </p>
                    )}
                  </div>
                </div>
              </div>

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
    </div>,
    document.body
  )
}

export default OrderDetailModal

