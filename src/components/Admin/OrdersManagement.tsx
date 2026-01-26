"use client"
import React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  Trash2,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  Edit3,
  Save,
  X,
  Package,
  Phone,
  CreditCard,
  Hash,
  User,
  FileText,
  RefreshCw,
  MapPin,
  Maximize2,
  Settings,
  Upload,
  TrendingUp,
  Activity,
  Archive,
  ArchiveRestore,
  UserCheck,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Truck,
  Check,
  Eye,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Copy,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../contexts/LanguageContext"
import { useAuth } from "../../contexts/AuthContext"
import OrderDetailModal from "./OrderDetailModal"
import ReceivePieceOrExchange from "./ReceivePieceOrExchange"

interface Order {
  id: string
  order_id: string
  shopify_order_id?: number
  shopify_order_name?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  address: string
  billing_address?: any
  shipping_address?: any
  billing_city?: string
  shipping_city?: string
  billing_country?: string
  shipping_country?: string
  mobile_number: string
  total_order_fees: number
  subtotal_price?: number
  total_tax?: number
  total_discounts?: number
  total_shipping_price?: number
  currency?: string
  payment_method: string
  payment_status?: "paid" | "pending" | "cod"
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
  assigned_courier_id: string | null
  original_courier_id?: string | null
  courier_name?: string
  created_at?: string
  updated_at?: string
  archived?: boolean
  archived_at?: string
  collected_by?: string | null
  payment_sub_type?: string | null
  delivery_fee?: number | null
  partial_paid_amount?: number | null
  internal_comment?: string | null
  receive_piece_or_exchange?: string | null
}

interface Courier {
  id: string
  name: string
  email: string
  role: string
}

// Utility function to render notes with clickable links
const renderNotesWithLinks = (notes: string) => {
  // Regular expression to detect URLs (including Google Maps links)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Split the text by URLs and map each part
  const parts = notes.split(urlRegex);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (urlRegex.test(part)) {
      // Determine if it's a Google Maps link
      const isGoogleMaps = part.includes('maps.google.com') || part.includes('goo.gl/maps') || part.includes('maps.app.goo.gl');
      
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline hover:no-underline transition-all duration-200 ${
            isGoogleMaps 
              ? 'text-blue-600 hover:text-blue-800 font-medium' 
              : 'text-blue-500 hover:text-blue-700'
          }`}
          title={isGoogleMaps ? "فتح في خرائط جوجل" : "فتح الرابط"}
        >
          {isGoogleMaps ? "📍 " + part : part}
        </a>
      );
    }
    
    // Return regular text
    return part;
  });
};

// Shared helpers for item parsing and unfulfilled calculations
const parseLineItemsSafe = (raw: any) => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const getAllOrderItems = (order: Order) => {
  const orderItems = (order as any).order_items || []
  const lineItems = parseLineItemsSafe(order.line_items)
  // Prefer Shopify line items (carry fulfillment status); fall back to order_items
  if (lineItems.length > 0) return lineItems
  return orderItems
}

const isOrderItemRemoved = (i: any) =>
  i?.is_removed === true ||
  Number(i?.quantity) === 0 ||
  i?.properties?._is_removed === true ||
  i?.properties?._is_removed === "true"

const isOrderItemFulfilled = (i: any) => {
  const statusCandidates = [
    i?.fulfillment_status,
    i?.shopify_raw_data?.fulfillment_status,
    i?.properties?._fulfillment_status,
  ]
    .map((s) => (typeof s === "string" ? s.toLowerCase().trim() : ""))
    .filter(Boolean)

  const fulfilledValues = new Set(["fulfilled", "success", "complete", "completed"])
  const unfulfilledValues = new Set(["unfulfilled", "pending", "partial", "open", "not_fulfilled"])

  if (statusCandidates.some((s) => fulfilledValues.has(s))) return true
  if (statusCandidates.some((s) => unfulfilledValues.has(s))) return false

  // No signal => treat as unfulfilled so we don't collect it
  return false
}

const isOrderItemUnfulfilled = (i: any) => !isOrderItemFulfilled(i)

const getUnfulfilledSummary = (order: Order) => {
  const allItems = getAllOrderItems(order)
  const fulfilledItems = allItems.filter((i: any) => !isOrderItemRemoved(i) && isOrderItemFulfilled(i))
  const fulfilledTotal = fulfilledItems.reduce((sum: number, i: any) => {
    const price = Number.parseFloat(i?.price ?? 0) || 0
    const qty = Number.parseInt(i?.quantity ?? 1) || 1
    const discount = Number.parseFloat(i?.total_discount ?? i?.discount ?? 0) || 0
    const lineTotal = Math.max(0, price * qty - discount)
    return sum + lineTotal
  }, 0)
  const unfulfilledItems = allItems.filter((i: any) => !isOrderItemRemoved(i) && isOrderItemUnfulfilled(i))
  const unfulfilledTotal = unfulfilledItems.reduce((sum: number, i: any) => {
    const price = Number.parseFloat(i?.price ?? 0) || 0
    const qty = Number.parseInt(i?.quantity ?? 1) || 1
    const discount = Number.parseFloat(i?.total_discount ?? i?.discount ?? 0) || 0
    const lineTotal = Math.max(0, price * qty - discount)
    return sum + lineTotal
  }, 0)
  const collectibleAmount = Math.max(0, fulfilledTotal)
  return { unfulfilledItems, unfulfilledTotal, collectibleAmount }
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<any> }> =
  {
    assigned: {
      label: "مكلف",
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-200",
      icon: Activity,
    },
    delivered: {
      label: "تم التوصيل",
      color: "text-green-700",
      bgColor: "bg-green-50 border-green-200",
      icon: CheckCircle,
    },
    canceled: {
      label: "ملغي",
      color: "text-red-700",
      bgColor: "bg-red-50 border-red-200",
      icon: X,
    },
    partial: {
      label: "جزئي",
      color: "text-yellow-700",
      bgColor: "bg-yellow-50 border-yellow-200",
      icon: Activity,
    },
    hand_to_hand: {
      label: "استبدال",
      color: "text-purple-700",
      bgColor: "bg-purple-50 border-purple-200",
      icon: RefreshCw,
    },
    return: {
      label: "مرتجع",
      color: "text-orange-700",
      bgColor: "bg-orange-50 border-orange-200",
      icon: Upload,
    },
  }

const OrdersManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [selectedCourier, setSelectedCourier] = useState("")
  const [assignLoading, setAssignLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [orderEdits, setOrderEdits] = useState<{ [id: string]: Partial<Order> }>({})
  const [editingOrder, setEditingOrder] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedField, setExpandedField] = useState<{ orderId: string; field: string } | null>(null)
  const [expandedValue, setExpandedValue] = useState("")
  const [viewMode, setViewMode] = useState<"active" | "archived">("active")
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null)
  const [notesPopupOrderId, setNotesPopupOrderId] = useState<string | null>(null)
  const [notesPopupPosition, setNotesPopupPosition] = useState<{ top: number; left: number } | null>(null)
  const [showReceivePieceOrExchange, setShowReceivePieceOrExchange] = useState(false)
  const [duplicatingOrderId, setDuplicatingOrderId] = useState<string | null>(null)

  // Date range state - default to last 3 months
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    // Default to "all" - no date filter (empty strings)
    // This will show all orders by default
    return { from: '', to: '' }
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Search state with debouncing
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  
  // Sorting state
  const [sortField, setSortField] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'created_at',
    direction: 'desc'
  })
  
  // Filter tabs (Shopify-style)
  const [activeFilterTab, setActiveFilterTab] = useState<string>('all')
  
  // Advanced filter dropdown state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filterSearchQuery, setFilterSearchQuery] = useState("")
  
  // Tag filter dropdown state
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [tagSearchQuery, setTagSearchQuery] = useState("")
  const [tagFilterPosition, setTagFilterPosition] = useState<{ top: number; left: number } | null>(null)
  
  // Generic filter dropdown state
  const [openFilterDropdown, setOpenFilterDropdown] = useState<{ filterId: string; position: { top: number; left: number } } | null>(null)
  const [filterDropdownSearch, setFilterDropdownSearch] = useState("")
  const [filterOptions, setFilterOptions] = useState<{ [key: string]: string[] }>({})
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false)
  const addFilterButtonRef = useRef<HTMLDivElement>(null)

  const [filters, setFilters] = useState({
    couriers: [] as string[],
    statuses: [] as string[],
    paymentStatuses: [] as string[], // New filter for payment status
    fulfillmentStatuses: [] as string[],
    deliveryStatuses: [] as string[],
    tags: [] as string[], // Filter by tags
    orderTotalMin: "" as string | number,
    orderTotalMax: "" as string | number,
    deliveryMethod: "" as string,
    mobile: "",
    payment: "",
    orderId: "",
  })
  
  // Get all unique tags from orders for filtering
  const [availableTags, setAvailableTags] = useState<string[]>([])

  // Separate state for text input filters that don't auto-apply
  const [textFilters, setTextFilters] = useState({
    mobile: "",
    payment: "",
    orderId: "",
  })
  
  // Debounce search query - increased delay to prevent too frequent updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500) // 500ms delay to prevent too frequent reloads
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { t } = useLanguage()
  const { user } = useAuth()

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Track if this is the initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  // Debounce filter changes to prevent excessive API calls
  const filterDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [debouncedFilters, setDebouncedFilters] = useState(filters)
  
  useEffect(() => {
    // Clear previous timer
    if (filterDebounceTimerRef.current) {
      clearTimeout(filterDebounceTimerRef.current)
    }
    
    // Set new timer - debounce filter changes by 300ms
    filterDebounceTimerRef.current = setTimeout(() => {
      setDebouncedFilters(filters)
    }, 300)
    
    return () => {
      if (filterDebounceTimerRef.current) {
        clearTimeout(filterDebounceTimerRef.current)
      }
    }
  }, [filters])
  
  // Debounce date range changes
  const dateDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [debouncedDateRange, setDebouncedDateRange] = useState(dateRange)
  
  useEffect(() => {
    if (dateDebounceTimerRef.current) {
      clearTimeout(dateDebounceTimerRef.current)
    }
    
    dateDebounceTimerRef.current = setTimeout(() => {
      setDebouncedDateRange(dateRange)
    }, 300)
    
    return () => {
      if (dateDebounceTimerRef.current) {
        clearTimeout(dateDebounceTimerRef.current)
      }
    }
  }, [dateRange])
  
  // Fetch orders and couriers when dependencies change (using debounced values)
  useEffect(() => {
    // Only show full loading on initial load, otherwise use subtle refresh indicator
    fetchOrders(false, isInitialLoad)
    if (isInitialLoad) {
      setIsInitialLoad(false)
    }
    fetchCouriers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, debouncedDateRange.from, debouncedDateRange.to, debouncedFilters.couriers, debouncedFilters.statuses, debouncedFilters.paymentStatuses, debouncedFilters.fulfillmentStatuses, debouncedFilters.tags, debouncedSearch, sortField])

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  const fetchOrders = useCallback(async (showRefreshing = false, showFullLoading = true) => {
    // Only show full loading screen on initial load or explicit refresh
    // Filter/date changes should show subtle loading indicator
    if (showRefreshing) {
      setRefreshing(true)
    } else if (showFullLoading) {
      setLoading(true)
    }
    setError(null)
    try {
      // Use debounced date range for consistency
      const activeDateRange = debouncedDateRange || dateRange
      
      // Only apply date filter if user has explicitly selected a date range
      // Default is to show all orders from all days
      let startOfDay: string | null = null
      let endOfDay: string | null = null
      
      if (activeDateRange && activeDateRange.from && activeDateRange.to) {
        // Create date range from dateRange state - properly handle timezone conversion
        // Supabase stores timestamps in UTC, so we need to convert local date range to UTC
        // Parse the date string (YYYY-MM-DD) and set to local midnight
        const [startYear, startMonth, startDay] = activeDateRange.from.split('-').map(Number)
        // Create date in local timezone (this represents midnight local time on the start date)
        const startDateLocal = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0)
        
        const [endYear, endMonth, endDay] = activeDateRange.to.split('-').map(Number)
        // Create date in local timezone (this represents 23:59:59.999 local time on the end date)
        const endDateLocal = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999)
        
        // Expand the query range to include previous day and next day in UTC
        // This ensures we catch all orders regardless of timezone
        const previousDayLocal = new Date(startDateLocal)
        previousDayLocal.setDate(previousDayLocal.getDate() - 1)
        previousDayLocal.setHours(20, 0, 0, 0) // Start from 8pm previous day local (covers most timezones)
        
        const nextDayLocal = new Date(endDateLocal)
        nextDayLocal.setDate(nextDayLocal.getDate() + 1)
        nextDayLocal.setHours(4, 0, 0, 0) // End at 4am next day local
        
        startOfDay = previousDayLocal.toISOString()
        endOfDay = nextDayLocal.toISOString()
        
      }

      // Optimized query - exclude large JSON fields that slow down loading
      // Only fetch essential fields for list view, load details on demand
      let query = supabase
        .from("orders")
        .select(
          `
          id, order_id, shopify_order_id, shopify_order_name, customer_name, customer_email, customer_phone,
          address, billing_address, shipping_address, billing_city, shipping_city, billing_country, shipping_country, mobile_number,
          total_order_fees, subtotal_price, total_tax, total_discounts, total_shipping_price, currency,
          payment_method, payment_status, financial_status, payment_gateway_names,
          status, fulfillment_status, shipping_method, tracking_number, tracking_url,
          order_note, customer_note, notes, order_tags,
          shopify_created_at, shopify_cancelled_at, assigned_courier_id, original_courier_id, assigned_at, created_at, updated_at,
          archived, archived_at, collected_by, payment_sub_type, delivery_fee, partial_paid_amount, internal_comment, receive_piece_or_exchange,
          users!orders_assigned_courier_id_fkey(name)
        `,
        )
        .limit(1000) // Limit results to prevent loading too many orders at once
      
      // Use debounced filters for consistency
      const activeFilters = debouncedFilters || filters
      
      // Apply archived filter based on viewMode and filters
      // If filtering by "Canceled", we need to fetch canceled orders regardless of archived status (like Shopify)
      // If filtering by "Archived", we need to fetch archived orders
      const isFilteringByCanceled = activeFilters.statuses.some(s => s.toLowerCase().trim() === 'canceled')
      const isFilteringByArchived = activeFilters.statuses.some(s => s.toLowerCase().trim() === 'archived')
      
      const isFilteringByOpen = activeFilters.statuses.some(s => s.toLowerCase().trim() === 'open')
      
      if (isFilteringByCanceled) {
        // When filtering by "Canceled", fetch all canceled orders (archived or not, like Shopify)
        // Don't apply archived filter - we want all canceled orders
        // Check for status = 'canceled' OR shopify_cancelled_at is not null (for Shopify canceled orders)
        query = query.or("status.eq.canceled,status.eq.Canceled,shopify_cancelled_at.not.is.null")
      } else if (isFilteringByArchived) {
        // When filtering by "Archived", fetch all archived orders
        // Check for archived = true (shopify_closed_at check will be done in memory to avoid column errors)
        query = query.eq("archived", true)
      } else if (isFilteringByOpen) {
        // When filtering by "Open", fetch only non-archived AND non-canceled orders
        // Open = not archived AND not canceled
        query = query.eq("archived", false)
        // We'll filter out canceled orders in memory after fetching
      } else {
        // Normal viewMode filtering
        if (viewMode === "archived") {
          query = query.eq("archived", true)
        } else {
          // Active view: show non-archived orders (including canceled ones, like Shopify)
          // Canceled orders are part of "Open" orders in Shopify if not archived
          // BUT: When searching, show ALL orders (archived and non-archived) to find the order
          if (!debouncedSearch) {
            query = query.eq("archived", false)
          }
          // If debouncedSearch exists, don't filter by archived - show all orders
        }
      }
      
      // Note: We apply date filtering in-memory using both shopify_created_at and created_at
      // to avoid missing orders due to timezone shifts. Do not constrain the DB query here.
      // This ensures the date picker always matches the UI filter results.
      
      // Apply sorting
      const ascending = sortField.direction === 'asc'
      query = query.order(sortField.field, { ascending })

      // Apply multi-select courier filter
      // Date filtering by assigned_at is handled in-memory below when both courier and date filters are applied
      if (activeFilters.couriers.length > 0) {
        if (viewMode === "archived") {
          query = query.in("original_courier_id", activeFilters.couriers)
        } else {
          query = query.in("assigned_courier_id", activeFilters.couriers)
        }
      }

      // Note: Shopify order status filter (Open, Archived, Canceled) is applied in memory after fetching
      // This allows complex logic: Open = not archived AND not canceled

      // Apply payment status filter
      if (activeFilters.paymentStatuses.length > 0) {
        query = query.in("payment_status", activeFilters.paymentStatuses)
      }

      // Note: Fulfillment status filter is applied in memory after fetching (see below)
      // This allows case-insensitive matching like Shopify

      if (activeFilters.mobile) query = query.ilike("mobile_number", `%${activeFilters.mobile}%`)
      if (activeFilters.payment) query = query.ilike("payment_method", `%${activeFilters.payment}%`)
      if (activeFilters.orderId) query = query.ilike("order_id", `%${activeFilters.orderId}%`)
      
      // Apply search query (searches in multiple fields including Shopify fields)
      if (debouncedSearch) {
        // Search in: customer_name, order_id, shopify_order_name, mobile_number, address
        let searchConditions = `customer_name.ilike.%${debouncedSearch}%,order_id.ilike.%${debouncedSearch}%,shopify_order_name.ilike.%${debouncedSearch}%,mobile_number.ilike.%${debouncedSearch}%,address.ilike.%${debouncedSearch}%`
        
        // Also search in shopify_order_id (numeric field) if search term is a number
        const searchAsNumber = parseInt(debouncedSearch)
        if (!isNaN(searchAsNumber)) {
          searchConditions = `shopify_order_id.eq.${searchAsNumber},${searchConditions}`
        }
        
        query = query.or(searchConditions)
      }

      const { data, error } = await query

      if (error) throw error
      
      // Apply tag filter (filter in memory since tags are JSONB array)
      // STRICT: When filtering by tag(s), ONLY show orders that have at least one of the selected tags
      // Orders without the selected tag(s) will be excluded
      let filteredData = data || []
      if (filters.tags.length > 0 && filters.tags.some(tag => tag)) {
        // Normalize selected tags once for efficiency - remove empty/whitespace tags
        const normalizedSelectedTags = activeFilters.tags
          .map(tag => String(tag).toLowerCase().trim())
          .filter(tag => tag.length > 0) // Only keep non-empty tags
        
        if (normalizedSelectedTags.length > 0) {
          filteredData = filteredData.filter((order: any) => {
            // Get order tags - handle various formats (array, null, undefined, string)
            let orderTags = order.order_tags
            
            // STRICT: Orders without tags should be excluded
            if (!orderTags) return false
            
            // Handle string format (shouldn't happen but be safe)
            if (typeof orderTags === 'string') {
              try {
                orderTags = JSON.parse(orderTags)
              } catch {
                // If parsing fails, try splitting by comma
                orderTags = orderTags.split(',').map((t: string) => t.trim()).filter(Boolean)
              }
            }
            
            // STRICT: Ensure it's an array with at least one tag
            if (!Array.isArray(orderTags) || orderTags.length === 0) return false
            
            // Normalize all order tags for comparison - remove empty/whitespace tags
            const normalizedOrderTags = orderTags
              .map((tag: any) => String(tag).toLowerCase().trim())
              .filter(tag => tag.length > 0) // Only keep non-empty tags
            
            // STRICT: Order must have at least one tag that matches one of the selected tags
            // If you select tag "A", only orders with tag "A" will appear
            // Orders with only other tags (but not "A") will be excluded
            const hasMatchingTag = normalizedSelectedTags.some(selectedTag => 
              normalizedOrderTags.includes(selectedTag)
            )
            
            // Return false if no matching tag found
            return hasMatchingTag
          })
        }
      }

      // Apply Shopify order status filter (Open, Archived, Canceled)
      if (activeFilters.statuses.length > 0) {
        filteredData = filteredData.filter((order: any) => {
          return activeFilters.statuses.some(filterStatus => {
            const normalizedFilterStatus = filterStatus.toLowerCase().trim()
            const orderStatus = (order.status || '').toLowerCase().trim()
            
            // Map Shopify order statuses to database values
            if (normalizedFilterStatus === 'open') {
              // Open: not archived AND not canceled (check both status and shopify fields)
              const isCanceled = orderStatus === 'canceled' || 
                                (order.shopify_cancelled_at !== null && order.shopify_cancelled_at !== undefined)
              const isArchived = order.archived === true || 
                               (order.shopify_closed_at !== null && order.shopify_closed_at !== undefined)
              return !isArchived && !isCanceled
            } else if (normalizedFilterStatus === 'archived') {
              // Archived: archived = true OR shopify_closed_at is set (for Shopify archived orders)
              return order.archived === true || 
                     (order.shopify_closed_at !== null && order.shopify_closed_at !== undefined)
            } else if (normalizedFilterStatus === 'canceled') {
              // Canceled: status = 'canceled' OR shopify_cancelled_at is set (for Shopify canceled orders)
              return orderStatus === 'canceled' || 
                     (order.shopify_cancelled_at !== null && order.shopify_cancelled_at !== undefined)
            }
            
            // Fallback: exact match for delivery statuses (for backward compatibility)
            // Use normalized values for consistent comparison
            return orderStatus === normalizedFilterStatus
          })
        })
      }

      // Apply fulfillment status filter (filter in memory for case-insensitive matching like Shopify)
      if (activeFilters.fulfillmentStatuses.length > 0) {
        filteredData = filteredData.filter((order: any) => {
          // Check if order is canceled - use same logic as status filter
          const orderStatus = (order.status || '').toLowerCase().trim()
          const isCanceled = orderStatus === 'canceled' || 
                           (order.shopify_cancelled_at !== null && order.shopify_cancelled_at !== undefined)
          
          // Get the order's fulfillment status, normalize it
          const rawFulfillmentStatus = order.fulfillment_status || ''
          const orderFulfillmentStatus = rawFulfillmentStatus.toLowerCase().trim()
          
          // Check if we're filtering by "unfulfilled"
          const isFilteringUnfulfilled = activeFilters.fulfillmentStatuses.some(fs => fs.toLowerCase().trim() === 'unfulfilled')
          
          // If filtering by "unfulfilled", ALWAYS exclude canceled orders first
          if (isFilteringUnfulfilled && isCanceled) {
            return false
          }
          
          // Check if order matches any of the selected fulfillment statuses
          return activeFilters.fulfillmentStatuses.some(filterStatus => {
            const normalizedFilterStatus = filterStatus.toLowerCase().trim()
            
            // Handle "unfulfilled" filter explicitly - must NOT be fulfilled AND NOT canceled
            if (normalizedFilterStatus === 'unfulfilled') {
              // Canceled orders already excluded above, but double-check for safety
              if (isCanceled) return false
              
              // Define fulfilled values
              const fulfilledValues = ['fulfilled', 'success', 'complete', 'completed']
              const isFulfilled = fulfilledValues.includes(orderFulfillmentStatus)
              
              // Exclude fulfilled orders
              if (isFulfilled) return false
              
              // Include only if:
              // 1. fulfillment_status is explicitly "unfulfilled" (case-insensitive)
              // 2. OR fulfillment_status is empty/null/undefined (treat as unfulfilled)
              return orderFulfillmentStatus === 'unfulfilled' || !rawFulfillmentStatus
            }
            
            // Handle "fulfilled" filter explicitly - must be fulfilled AND NOT canceled
            if (normalizedFilterStatus === 'fulfilled') {
              // Exclude canceled orders
              if (isCanceled) return false
              
              const fulfilledValues = ['fulfilled', 'success', 'complete', 'completed']
              return fulfilledValues.includes(orderFulfillmentStatus)
            }
            
            // For other statuses, do exact match (case-insensitive)
            // Also exclude canceled orders from other fulfillment status filters
            if (isCanceled) return false
            return orderFulfillmentStatus === normalizedFilterStatus
          })
        })
      }

      // Filter orders by local date to match Shopify-style display logic
      // Only apply date filter if user has explicitly selected a date range
      // Default is to show all orders from all days
      if (activeDateRange && activeDateRange.from && activeDateRange.to && !debouncedSearch) {
        filteredData = filteredData.filter((order: any) => {
          // When courier filter is applied, use assigned_at to show orders assigned on that date
          // Otherwise, use shopify_created_at or created_at
          let timestamp: string | null = null
          
          if (activeFilters.couriers.length > 0 && viewMode !== "archived") {
            // When filtering by courier, use assigned_at (when order was assigned to this courier)
            // Fallback to created_at for legacy orders without assigned_at
            timestamp = order.assigned_at || order.created_at
          } else {
            // For general date filtering, use shopify_created_at if available, otherwise created_at
            timestamp = order.shopify_created_at || order.created_at
          }
          
          if (!timestamp) return false
          
          const utcDate = new Date(timestamp)
          
          if (isNaN(utcDate.getTime())) return false
          
          // Convert to Egypt timezone (Africa/Cairo) to get the calendar date there
          const egyptTimezone = 'Africa/Cairo'
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: egyptTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
          
          const formatted = formatter.format(utcDate) // YYYY-MM-DD in Cairo time
          const [orderYear, orderMonth, orderDay] = formatted.split('-').map(Number)
          
          // Get selected date range
          const [startYear, startMonth, startDay] = activeDateRange.from.split('-').map(Number)
          const [endYear, endMonth, endDay] = activeDateRange.to.split('-').map(Number)
          
          const orderDateOnly = new Date(orderYear, orderMonth - 1, orderDay)
          const startDateOnly = new Date(startYear, startMonth - 1, startDay)
          const endDateOnly = new Date(endYear, endMonth - 1, endDay)
          
          // Normalize times
          orderDateOnly.setHours(0, 0, 0, 0)
          startDateOnly.setHours(0, 0, 0, 0)
          endDateOnly.setHours(0, 0, 0, 0)
          
          return orderDateOnly >= startDateOnly && orderDateOnly <= endDateOnly
        })
      }

      const ordersWithCourierNames =
        filteredData?.map((order: any) => ({
          ...order,
          courier_name: order.users?.name || null,
        })) || []

      setOrders(ordersWithCourierNames)
      
      // Extract unique tags from all orders (use original data, not filtered)
      const allTags = new Set<string>()
      data?.forEach((order: any) => {
        const orderTags = order.order_tags || []
        if (Array.isArray(orderTags)) {
          orderTags.forEach((tag: string) => allTags.add(tag))
        }
      })
      setAvailableTags(Array.from(allTags).sort())
    } catch (error: any) {
      setError("Failed to fetch orders / فشل تحميل الطلبات: " + error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [viewMode, dateRange.from, dateRange.to, filters.couriers, filters.statuses, filters.paymentStatuses, filters.fulfillmentStatuses, filters.tags, debouncedSearch, sortField])

  // Keep a ref to the latest fetchOrders to use inside real-time subscription without re-subscribing
  const fetchOrdersRef = useRef(fetchOrders)
  useEffect(() => {
    fetchOrdersRef.current = fetchOrders
  }, [fetchOrders])

  // Real-time subscription to reflect courier status updates immediately on admin dashboard
  useEffect(() => {
    const channel = supabase
      .channel("orders_management_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        // Lightweight refresh (no full-screen loader) so courier status changes replace "pending" right away
        fetchOrdersRef.current?.(false, false)
      })
      .subscribe()

    return () => {
      channel.unsubscribe().catch(console.error)
    }
  }, [])

  const fetchCouriers = async () => {
    try {
      const { data: allUsers, error } = await supabase.from("users").select("id, name, email, role")

      if (error) throw error

      const courierUsers = allUsers?.filter((user: any) => user.role?.toLowerCase() === "courier") || []
      setCouriers(courierUsers)
    } catch (error: any) {
      setError("Failed to fetch couriers / فشل تحميل المندوبين: " + error.message)
    }
  }

  // Fetch ALL tags from ALL orders (not just filtered ones) - like Shopify
  // This ensures tags always appear in the filter even if current day's orders don't have them
  const fetchAllTags = useCallback(async () => {
    try {
      const { data: allOrders, error } = await supabase
        .from("orders")
        .select("order_tags")
        .eq("archived", viewMode === "archived")
      
      if (error) throw error
      
      const allTags = new Set<string>()
      allOrders?.forEach((order: any) => {
        const orderTags = order.order_tags || []
        if (Array.isArray(orderTags)) {
          orderTags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              allTags.add(tag.trim())
            }
          })
        }
      })
      setAvailableTags(Array.from(allTags).sort())
    } catch (error: any) {
      console.error("Failed to fetch all tags:", error)
      // Don't show error to user, just log it
    }
  }, [viewMode])

  // Fetch filter options from all orders (like Shopify)
  const fetchFilterOptions = useCallback(async (filterId: string) => {
    if (filterOptions[filterId] && filterOptions[filterId].length > 0) {
      // Already loaded, skip
      return
    }
    
    setLoadingFilterOptions(true)
    try {
      if (filterId === 'order_status') {
        // Shopify order statuses: Open, Archived, Canceled
        // Always show these options regardless of current orders
        const shopifyOrderStatuses = ['open', 'archived', 'canceled']
        setFilterOptions(prev => ({ ...prev, order_status: shopifyOrderStatuses }))
      } else if (filterId === 'payment_status') {
        const { data: allOrdersData } = await supabase
          .from("orders")
          .select("payment_status")
          .eq("archived", viewMode === "archived")
        const options = Array.from(new Set(
          (allOrdersData || []).map((o: any) => String(o.payment_status || '')).filter(s => s !== '')
        )).sort()
        setFilterOptions(prev => ({ ...prev, payment_status: options }))
      } else if (filterId === 'fulfillment_status') {
        const { data: allOrdersData } = await supabase
          .from("orders")
          .select("fulfillment_status")
          .eq("archived", viewMode === "archived")
        const fetchedStatuses = Array.from(new Set(
          (allOrdersData || []).map((o: any) => o.fulfillment_status).filter((s): s is string => Boolean(s))
        ))
        // Include all Shopify fulfillment statuses even if not in current orders
        const shopifyStatuses = ['fulfilled', 'unfulfilled', 'partial', 'scheduled', 'on_hold', 'request_fulfillment']
        const options = Array.from(new Set([...shopifyStatuses, ...fetchedStatuses])).sort()
        setFilterOptions(prev => ({ ...prev, fulfillment_status: options }))
      } else if (filterId === 'courier') {
        const { data: allOrdersData } = await supabase
          .from("orders")
          .select("assigned_courier_id, users!orders_assigned_courier_id_fkey(name)")
          .eq("archived", viewMode === "archived")
        const courierNames = (allOrdersData || [])
          .map((o: any) => o.users?.name)
          .filter((s): s is string => Boolean(s))
        const options = Array.from(new Set(courierNames)).sort()
        setFilterOptions(prev => ({ ...prev, courier: options }))
      }
    } catch (error: any) {
      console.error("Failed to fetch filter options:", error)
    } finally {
      setLoadingFilterOptions(false)
    }
  }, [viewMode, filterOptions])

  // Fetch filter options when dropdown opens
  useEffect(() => {
    if (openFilterDropdown?.filterId) {
      fetchFilterOptions(openFilterDropdown.filterId)
    }
  }, [openFilterDropdown?.filterId, fetchFilterOptions])

  // Fetch all tags when component mounts or viewMode changes
  useEffect(() => {
    fetchAllTags()
  }, [fetchAllTags])

  // Payment status badge
  const getPaymentMethodBadge = (method: string) => {
    const colors = {
      cash: "bg-orange-100 text-orange-800 border-orange-200",
      card: "bg-blue-100 text-blue-800 border-blue-200",
      valu: "bg-purple-100 text-purple-800 border-purple-200",
      partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
      paid: "bg-green-100 text-green-800 border-green-200",
      paymob: "bg-green-100 text-green-800 border-green-200",
      fawry: "bg-green-100 text-green-800 border-green-200",
    }
    const displayMethod = method === "paid" ? "Paid Online" : method === "paymob" ? "Paymob" : method
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[method as keyof typeof colors] || colors.paid}`}
      >
        {displayMethod}
      </span>
    )
  }

  // Date range navigation functions
  const goToPreviousDay = () => {
    if (!dateRange || !dateRange.from) return
    
    const currentDate = new Date(dateRange.from)
    currentDate.setDate(currentDate.getDate() - 1)
    const newDate = currentDate.toISOString().split("T")[0]
    setDateRange({ from: newDate, to: dateRange.to })
  }

  const goToNextDay = () => {
    if (!dateRange || !dateRange.to) return
    
    const currentDate = new Date(dateRange.to)
    currentDate.setDate(currentDate.getDate() + 1)
    const newDate = currentDate.toISOString().split("T")[0]
    setDateRange({ from: dateRange.from, to: newDate })
  }

  const goToToday = () => {
    // Get today's date in Egypt timezone to match Shopify
    const now = new Date()
    const egyptTimezone = 'Africa/Cairo'
    const formatter = new Intl.DateTimeFormat('en-CA', { // 'en-CA' gives YYYY-MM-DD format
      timeZone: egyptTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const todayStr = formatter.format(now)
    setDateRange({ from: todayStr, to: todayStr })
  }
  
  const setDateRangePreset = (preset: 'all' | 'today' | 'yesterday' | 'week' | 'month') => {
    // Get today's date in Egypt timezone to match Shopify
    const now = new Date()
    const egyptTimezone = 'Africa/Cairo'
    const formatter = new Intl.DateTimeFormat('en-CA', { // 'en-CA' gives YYYY-MM-DD format
      timeZone: egyptTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    
    switch (preset) {
      case 'all':
        // Clear date filter to show all orders - update debounced value immediately
        const allRange = { from: '', to: '' }
        setDateRange(allRange)
        setDebouncedDateRange(allRange) // Update immediately without debounce
        break
      case 'today':
        const todayStr = formatter.format(now)
        const todayRange = { from: todayStr, to: todayStr }
        setDateRange(todayRange)
        setDebouncedDateRange(todayRange) // Update immediately without debounce
        break
      case 'yesterday':
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = formatter.format(yesterday)
        setDateRange({ from: yesterdayStr, to: yesterdayStr })
        break
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        setDateRange({ 
          from: weekAgo.toISOString().split("T")[0], 
          to: today.toISOString().split("T")[0] 
        })
        break
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        setDateRange({ 
          from: monthAgo.toISOString().split("T")[0], 
          to: today.toISOString().split("T")[0] 
        })
        break
    }
  }

  const formatSelectedDate = () => {
    // Show "All" when no date filter is applied
    if (!dateRange || !dateRange.from || !dateRange.to) {
      return "الكل"
    }
    
    const fromDate = new Date(dateRange.from + "T12:00:00")
    const toDate = new Date(dateRange.to + "T12:00:00")
    
    // Get today's date in Egypt timezone to match the date format used in setDateRangePreset
    const now = new Date()
    const egyptTimezone = 'Africa/Cairo'
    const formatter = new Intl.DateTimeFormat('en-CA', { // 'en-CA' gives YYYY-MM-DD format
      timeZone: egyptTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const todayStr = formatter.format(now)
    
    const isSameDay = dateRange.from === dateRange.to
    const isToday = dateRange.from === todayStr && isSameDay
    
    if (isToday) {
      return "اليوم"
    }
    
    if (isSameDay) {
      const arabicDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
      const arabicMonths = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
      ]
      const dayName = arabicDays[fromDate.getDay()]
      const day = fromDate.getDate()
      const month = arabicMonths[fromDate.getMonth()]
      const year = fromDate.getFullYear()
      return `${dayName}، ${day} ${month} ${year}`
    }
    
    // Date range
    const formatDateShort = (d: Date) => {
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
    }
    return `من ${formatDateShort(fromDate)} إلى ${formatDateShort(toDate)}`
  }

  // Shopify-style date formatting function
  // Uses shopify_created_at if available (for Shopify orders) to match Shopify's exact time
  // Shopify stores timestamps in UTC but displays them in the store's timezone (typically Africa/Cairo for EGP)
  const formatShopifyDate = (dateString: string): string => {
    if (!dateString) return "-"
    
    // Parse the date string - Shopify timestamps are in UTC/ISO format
    const utcDate = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(utcDate.getTime())) return "-"
    
    // Convert UTC to Egypt/Cairo timezone (Shopify store timezone for EGP)
    // Use Intl.DateTimeFormat to get date components in Egypt timezone
    const egyptTimezone = 'Africa/Cairo' // UTC+2 (or UTC+3 during DST)
    
    // Get date components in Egypt timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: egyptTimezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    
    const parts = formatter.formatToParts(utcDate)
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0')
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1 // 0-indexed
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0')
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || 'AM'
    
    // Get current date in Egypt timezone for comparison
    const nowFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: egyptTimezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
    const nowParts = nowFormatter.formatToParts(new Date())
    const nowYear = parseInt(nowParts.find(p => p.type === 'year')?.value || '0')
    const nowMonth = parseInt(nowParts.find(p => p.type === 'month')?.value || '0') - 1
    const nowDay = parseInt(nowParts.find(p => p.type === 'day')?.value || '0')
    
    const today = new Date(nowYear, nowMonth, nowDay)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Get order date components in Egypt timezone
    const orderDate = new Date(year, month, day)
    
    // Format time in Shopify style: "1:49 AM" (uppercase AM/PM, no leading zero on hour)
    const displayHours = hour % 12 || 12 // Convert to 12-hour format (0 becomes 12)
    const displayMinutes = minute.toString().padStart(2, '0')
    const ampm = dayPeriod.toUpperCase()
    const time = `${displayHours}:${displayMinutes} ${ampm}`
    
    // Check if it's today (comparing dates in Egypt timezone)
    if (orderDate.getTime() === today.getTime()) {
      return `Today at ${time}`
    }
    
    // Check if it's yesterday (comparing dates in Egypt timezone)
    if (orderDate.getTime() === yesterday.getTime()) {
      return `Yesterday at ${time}`
    }
    
    // For older dates, show full date like "Dec 17, 2024 at 3:23 PM"
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const monthName = monthNames[month]
    
    return `${monthName} ${day}, ${year} at ${time}`
  }

  const formatOrderTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const toggleRowExpansion = (orderId: string) => {
    setExpandedRows((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]))
  }

  const handleEditChange = (orderId: string, field: keyof Order, value: any) => {
    setOrderEdits((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value },
    }))
  }

  const openExpandedEdit = (orderId: string, field: string, currentValue: string) => {
    setExpandedField({ orderId, field })
    setExpandedValue(currentValue)
  }

  const closeExpandedEdit = () => {
    if (expandedField) {
      handleEditChange(expandedField.orderId, expandedField.field as keyof Order, expandedValue)
    }
    setExpandedField(null)
    setExpandedValue("")
  }

  const startEdit = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (order) {
      // Automatically expand the row when editing starts
      if (!expandedRows.includes(orderId)) {
        setExpandedRows((prev) => [...prev, orderId])
      }
      
      // Initialize with an empty object to only track ACTUAL changes
      setOrderEdits((prev) => ({
        ...prev,
        [orderId]: {},
      }))
      setEditingOrder(orderId)
    }
  }

  const cancelEdit = (orderId: string) => {
    setOrderEdits((prev) => {
      const copy = { ...prev }
      delete copy[orderId]
      return copy
    })
    setEditingOrder(null)
  }

  const saveOrderEdit = async (orderId: string) => {
    const changes = orderEdits[orderId]
    if (!changes || Object.keys(changes).length === 0) {
      setEditingOrder(null)
      return
    }

    setSavingOrderId(orderId)
    const originalOrder = orders.find((o) => o.id === orderId)
    
    try {
      // Create update payload with ONLY the changed fields
      const updateData: any = {
        ...changes,
        updated_at: new Date().toISOString(),
      }

      // Logic for original courier
      if (updateData.assigned_courier_id && !originalOrder?.original_courier_id) {
        updateData.original_courier_id = updateData.assigned_courier_id
      }
      
      // Convert empty strings to null for UUID fields
      if (updateData.assigned_courier_id === "") {
        updateData.assigned_courier_id = null
        updateData.status = "pending" // Reset status when unassigning
      }
      if (updateData.original_courier_id === "") {
        updateData.original_courier_id = null
      }
      
      // If reassigning to a new courier, update assigned_at
      if (updateData.assigned_courier_id && updateData.assigned_courier_id !== originalOrder?.assigned_courier_id) {
        updateData.assigned_at = new Date().toISOString()
      }
      
      // Handle payment method mapping if relevant fields changed
      const currentCollectedBy = updateData.collected_by !== undefined ? updateData.collected_by : originalOrder?.collected_by
      const currentSubType = updateData.payment_sub_type !== undefined ? updateData.payment_sub_type : originalOrder?.payment_sub_type

      if (currentCollectedBy === "courier" && currentSubType) {
        const paymentMethodMap: Record<string, string> = {
          "on_hand": "cash",
          "instapay": "instapay",
          "wallet": "wallet",
          "visa_machine": "card",
          "paymob": "paymob",
        }
        const newMethod = paymentMethodMap[currentSubType]
        if (newMethod && newMethod !== originalOrder?.payment_method) {
          updateData.payment_method = newMethod
        }
      } else if (currentCollectedBy && currentCollectedBy !== "courier") {
        const collectionMethodMap: Record<string, string> = {
          "paymob": "paymob",
          "valu": "valu",
          "fawry": "paid",
          "instapay": "instapay",
          "vodafone_cash": "paid",
          "orange_cash": "paid",
          "we_pay": "paid",
        }
        const newMethod = collectionMethodMap[currentCollectedBy]
        if (newMethod && newMethod !== originalOrder?.payment_method) {
          updateData.payment_method = newMethod
        }
      }

      // Optimistically update the UI immediately
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? { ...order, ...updateData }
            : order
        )
      )

      // Then update the database with ONLY the changed fields
      const { error } = await supabase.from("orders").update(updateData).eq("id", orderId)

      if (error) {
        // Rollback on error
        if (originalOrder) {
          setOrders((prevOrders) =>
            prevOrders.map((order) =>
              order.id === orderId ? originalOrder : order
            )
          )
        }
        throw error
      }

      setSuccessMessage("Changes saved successfully / تم حفظ التغييرات بنجاح")
      setOrderEdits((prev) => {
        const copy = { ...prev }
        delete copy[orderId]
        return copy
      })
      setEditingOrder(null)
    } catch (error: any) {
      setError("Failed to save changes / فشل حفظ التغييرات: " + error.message)
    } finally {
      setSavingOrderId(null)
    }
  }

  const handleOpenReceivePieceOrExchange = () => {
    // If orders are selected, mark them as receive_piece first, then open the page
    if (selectedOrders.length > 0) {
      supabase
        .from("orders")
        .update({ receive_piece_or_exchange: "receive_piece" })
        .in("id", selectedOrders)
        .then(() => {
          setShowReceivePieceOrExchange(true)
          setSelectedOrders([]) // Clear selection
        })
        .catch((error: any) => {
          setError("خطأ في تحديد الطلبات: " + error.message)
        })
    } else {
      // Just open the page to view/manage existing orders
      setShowReceivePieceOrExchange(true)
    }
  }

  const handleDuplicateOrder = async (orderId: string) => {
    if (!orderId) return

    setDuplicatingOrderId(orderId)
    setError(null)

    try {
      // Fetch the original order with all its data
      const { data: originalOrder, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single()

      if (fetchError) throw fetchError
      if (!originalOrder) throw new Error("Order not found")

      // Fetch order items
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId)

      if (itemsError) throw itemsError

      // Create new order data (duplicate)
      const newOrderData: any = {
        ...originalOrder,
        id: undefined, // Let database generate new ID
        order_id: `${originalOrder.order_id}-COPY-${Date.now()}`, // Unique order_id
        shopify_order_id: null, // Don't duplicate Shopify ID
        assigned_courier_id: null,
        original_courier_id: null,
        assigned_at: null,
        status: "pending",
        archived: false,
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        receive_piece_or_exchange: null, // Reset special status
      }

      // Remove fields that shouldn't be duplicated
      delete newOrderData.id

      // Insert the new order
      const { data: newOrder, error: insertError } = await supabase
        .from("orders")
        .insert(newOrderData)
        .select()
        .single()

      if (insertError) throw insertError

      // Duplicate order items if they exist
      if (orderItems && orderItems.length > 0) {
        const newItems = orderItems.map((item: any) => {
          const { id, ...itemWithoutId } = item
          return {
            ...itemWithoutId,
            order_id: newOrder.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        })

        const { error: itemsInsertError } = await supabase
          .from("order_items")
          .insert(newItems)

        if (itemsInsertError) throw itemsInsertError
      }

      setSuccessMessage(`تم نسخ الطلب #${originalOrder.order_id} بنجاح`)
      await fetchOrders()
    } catch (error: any) {
      console.error("Error duplicating order:", error)
      setError("خطأ في نسخ الطلب: " + error.message)
    } finally {
      setDuplicatingOrderId(null)
    }
  }

  const handleAssignOrders = async () => {
    if (!selectedCourier || selectedOrders.length === 0) {
      setError("Please select courier and orders / يرجى اختيار المندوب والطلبات")
      return
    }

    setAssignLoading(true)
    setError(null)

    try {
      const { data: currentOrders } = await supabase
        .from("orders")
        .select("id, assigned_courier_id, original_courier_id")
        .in("id", selectedOrders)

      const nowIso = new Date().toISOString()
      for (const order of currentOrders || []) {
        const updateData: any = {
          assigned_courier_id: selectedCourier,
          status: "assigned",
          updated_at: nowIso, // Explicitly update updated_at so order appears on assignment date
          assigned_at: nowIso, // Track the actual assignment date (never overwritten by sync)
        }

        if (!order.original_courier_id && order.assigned_courier_id) {
          updateData.original_courier_id = order.assigned_courier_id
        } else if (!order.original_courier_id) {
          updateData.original_courier_id = selectedCourier
        }

        const { error } = await supabase.from("orders").update(updateData).eq("id", order.id)

        if (error) throw error
      }

      // Update local state instead of refetching all orders
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          selectedOrders.includes(order.id)
            ? {
                ...order,
                assigned_courier_id: selectedCourier,
                status: "assigned",
                courier_name: couriers.find((c) => c.id === selectedCourier)?.name || undefined,
                updated_at: nowIso, // Include updated_at so order appears in today's view
                assigned_at: nowIso, // Track assignment date
              }
            : order
        )
      )

      setSelectedOrders([])
      setSelectedCourier("")
      setSuccessMessage(
        `Successfully assigned ${selectedOrders.length} orders / تم تعيين ${selectedOrders.length} طلبات بنجاح`,
      )
    } catch (error: any) {
      setError("Failed to assign orders / فشل تعيين الطلبات: " + error.message)
    } finally {
      setAssignLoading(false)
    }
  }

  const handleArchiveOrders = async () => {
    if (selectedOrders.length === 0) {
      setError("Please select orders to archive / يرجى اختيار طلبات للأرشفة")
      return
    }

    setArchiveLoading(true)
    setError(null)

    try {
      const { data: ordersToArchive, error: fetchError } = await supabase
        .from("orders")
        .select("id, assigned_courier_id, original_courier_id")
        .in("id", selectedOrders)

      if (fetchError) throw fetchError

      for (const order of ordersToArchive || []) {
        const updateData: any = {
          archived: true,
          archived_at: new Date().toISOString(),
          assigned_courier_id: null,
        }

        if (!order.original_courier_id && order.assigned_courier_id) {
          updateData.original_courier_id = order.assigned_courier_id
        }

        const { error } = await supabase.from("orders").update(updateData).eq("id", order.id)

        if (error) throw error
      }

      // Update local state instead of refetching all orders
      setOrders((prevOrders) =>
        prevOrders.filter((order) => !selectedOrders.includes(order.id))
      )

      setSelectedOrders([])
      setShowArchiveConfirm(false)
      setSuccessMessage(
        `Successfully archived ${selectedOrders.length} orders / تم أرشفة ${selectedOrders.length} طلبات بنجاح`,
      )
    } catch (error: any) {
      setError("Failed to archive orders / فشل أرشفة الطلبات: " + error.message)
    } finally {
      setArchiveLoading(false)
    }
  }

  const handleRestoreOrders = async () => {
    if (selectedOrders.length === 0) {
      setError("Please select orders to restore / يرجى اختيار طلبات للاستعادة")
      return
    }

    setArchiveLoading(true)
    setError(null)

    try {
      const { data: ordersToRestore, error: fetchError } = await supabase
        .from("orders")
        .select("id, original_courier_id")
        .in("id", selectedOrders)

      if (fetchError) throw fetchError

      for (const order of ordersToRestore || []) {
        const { error } = await supabase
          .from("orders")
          .update({
            archived: false,
            archived_at: null,
            assigned_courier_id: order.original_courier_id,
          })
          .eq("id", order.id)

        if (error) throw error
      }

      // Update local state instead of refetching all orders
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          selectedOrders.includes(order.id)
            ? {
                ...order,
                archived: false,
                archived_at: undefined,
                assigned_courier_id: order.original_courier_id || null,
                courier_name: couriers.find((c) => c.id === order.original_courier_id)?.name || undefined,
              }
            : order
        )
      )

      setSelectedOrders([])
      setSuccessMessage(
        `Successfully restored ${selectedOrders.length} orders / تم استعادة ${selectedOrders.length} طلبات بنجاح`,
      )
    } catch (error: any) {
      setError("Failed to restore orders / فشل استعادة الطلبات: " + error.message)
    } finally {
      setArchiveLoading(false)
    }
  }

  const handleDeleteOrders = async () => {
    if (selectedOrders.length === 0) {
      setError("Please select orders to delete / يرجى اختيار طلبات للحذف")
      return
    }

    setDeleteLoading(true)
    setError(null)

    try {
      const { error } = await supabase.from("orders").delete().in("id", selectedOrders)

      if (error) throw error

      // Update local state instead of refetching all orders
      setOrders((prevOrders) =>
        prevOrders.filter((order) => !selectedOrders.includes(order.id))
      )

      setSelectedOrders([])
      setShowDeleteConfirm(false)
      setSuccessMessage(
        `Successfully deleted ${selectedOrders.length} orders / تم حذف ${selectedOrders.length} طلبات بنجاح`,
      )
    } catch (error: any) {
      setError("Failed to delete orders / فشل حذف الطلبات: " + error.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const toggleOrderSelection = (id: string) => {
    setSelectedOrders((prev) => (prev.includes(id) ? prev.filter((orderId) => orderId !== id) : [...prev, id]))
  }
  
  // Handle column sorting
  const handleSort = (field: string) => {
    setSortField(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }
  
  // Get sort icon for column
  const getSortIcon = (field: string) => {
    if (sortField.field !== field) {
      return <ChevronUp className="w-3 h-3 text-gray-400 opacity-50" />
    }
    return sortField.direction === 'asc' 
      ? <ChevronUp className="w-3 h-3 text-gray-600" />
      : <ChevronDown className="w-3 h-3 text-gray-600" />
  }

  const toggleAllOrders = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map((order) => order.id))
    }
  }

  const clearFilters = () => {
    setFilters({
      couriers: [],
      statuses: [],
      paymentStatuses: [],
      fulfillmentStatuses: [],
      deliveryStatuses: [],
      tags: [],
      orderTotalMin: "",
      orderTotalMax: "",
      deliveryMethod: "",
      mobile: "",
      payment: "",
      orderId: "",
    })
    setActiveFilterTab('all')
    setTextFilters({
      mobile: "",
      payment: "",
      orderId: "",
    })
  }

  const applyTextFilters = () => {
    setFilters((prev) => ({
      ...prev,
      mobile: textFilters.mobile,
      payment: textFilters.payment,
      orderId: textFilters.orderId,
    }))
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || {
      label: status,
      color: "text-gray-700",
      bgColor: "bg-gray-50 border-gray-200",
      icon: Activity,
    }
    const StatusIcon = config.icon
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.color}`}
      >
        <StatusIcon className="w-3 h-3" />
        <span>{config.label}</span>
      </div>
    )
  }

  // Helper function to determine if an order is assigned
  const isOrderAssigned = (order: Order) => {
    return order.assigned_courier_id !== null && order.assigned_courier_id !== undefined
  }

  // Hide status badges on admin cards per request; keep logic centralized
  const showStatusBadgeInCard = false

  // Prefer a meaningful status for display: if a courier is assigned but the row is still "pending",
  // show it as "assigned" so admins see the courier-updated state instead of the default pending tag.
  const getDisplayStatus = (order: Order) => {
    const statusLower = (order.status || "").toLowerCase()
    if (statusLower === "pending" && isOrderAssigned(order)) {
      return "assigned"
    }
    return order.status
  }

  // Payment status badge
  const getPaymentStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-200">
          غير محدد
        </span>
      )
    }
    const colors = {
      paid: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      cod: "bg-orange-100 text-orange-800 border-orange-200",
    }
    const displayStatus = status === "cod" ? "عند التسليم" : status === "paid" ? "مدفوع" : "معلق"
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.pending}`}
      >
        {displayStatus}
      </span>
    )
  }

  // Financial status badge
  const getFinancialStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-200">
          غير محدد
        </span>
      )
    }
    
    const colors = {
      paid: "bg-green-100 text-green-800 border-green-200",
      partial: "bg-blue-100 text-blue-800 border-blue-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      overdue: "bg-red-100 text-red-800 border-red-200",
      refunded: "bg-purple-100 text-purple-800 border-purple-200",
      disputed: "bg-orange-100 text-orange-800 border-orange-200",
    }
    
    const displayStatus = {
      paid: "مدفوع بالكامل",
      partial: "مدفوع جزئياً",
      pending: "معلق",
      overdue: "متأخر",
      refunded: "مسترد",
      disputed: "متنازع عليه",
    }
    
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.pending}`}
      >
        {displayStatus[status as keyof typeof displayStatus] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">جاري تحميل الطلبات</h2>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        </div>
      </div>
    )
  }

  // Mobile Card Layout
  const MobileOrderCard = ({ order }: { order: Order }) => {
    const edited = orderEdits[order.id] || {}
    const isEditing = editingOrder === order.id
    const isExpanded = expandedRows.includes(order.id)
    const assigned = isOrderAssigned(order)
    const { unfulfilledItems, unfulfilledTotal, collectibleAmount } = getUnfulfilledSummary(order)

    return (
      <div
        className={`rounded-lg border p-4 space-y-4 ${
          assigned ? "bg-green-50 border-green-200 shadow-sm" : "bg-white border-gray-200"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedOrders.includes(order.id)}
              onChange={() => toggleOrderSelection(order.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {(() => {
              // Get first product image from order
              let firstImageUrl = null;
              
              try {
                if (order.product_images) {
                  const productImages = typeof order.product_images === 'string' 
                    ? JSON.parse(order.product_images) 
                    : order.product_images;
                  
                  if (Array.isArray(productImages) && productImages.length > 0) {
                    const firstImage = productImages.find((img: any) => 
                      img.image && img.image !== null && img.image !== 'null'
                    );
                    
                    if (firstImage) {
                      firstImageUrl = typeof firstImage.image === 'string' 
                        ? firstImage.image 
                        : (firstImage.image.src || firstImage.image.url);
                    }
                  }
                }
                
                // Fallback to line_items if product_images not available
                if (!firstImageUrl && order.line_items) {
                  const lineItems = typeof order.line_items === 'string' 
                    ? JSON.parse(order.line_items) 
                    : order.line_items;
                  
                  if (Array.isArray(lineItems) && lineItems.length > 0) {
                    const firstItem = lineItems.find((item: any) => 
                      item.image || item.variant?.image || item.images?.[0]
                    );
                    
                    if (firstItem) {
                      if (firstItem.image) {
                        firstImageUrl = typeof firstItem.image === 'string' 
                          ? firstItem.image 
                          : (firstItem.image.src || firstItem.image.url);
                      } else if (firstItem.variant?.image) {
                        firstImageUrl = typeof firstItem.variant.image === 'string' 
                          ? firstItem.variant.image 
                          : (firstItem.variant.image.src || firstItem.variant.image.url);
                      } else if (firstItem.images?.[0]) {
                        firstImageUrl = typeof firstItem.images[0] === 'string' 
                          ? firstItem.images[0] 
                          : (firstItem.images[0].src || firstItem.images[0].url);
                      }
                    }
                  }
                }
                
                // Clean URL
                if (firstImageUrl && !firstImageUrl.startsWith('http')) {
                  firstImageUrl = `https://cdn.shopify.com${firstImageUrl.startsWith('/') ? '' : '/'}${firstImageUrl}`;
                }
              } catch (e) {
                // Silently handle errors
              }
              
              return firstImageUrl ? (
                <img
                  src={firstImageUrl}
                  alt="Product"
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex-shrink-0">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
              );
            })()}
            <div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">#{order.order_id}</span>
                {/* Notes Icon */}
                {(() => {
                  // Check all note fields
                  const hasNotes = (order.notes && order.notes.trim() !== "") ||
                                 (order.order_note && order.order_note.trim() !== "") ||
                                 (order.customer_note && order.customer_note.trim() !== "")
                  const notesContent = order.notes || order.order_note || order.customer_note || ""
                  
                  return hasNotes ? (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setNotesPopupPosition({
                            top: rect.bottom + 4,
                            left: rect.left
                          })
                          setNotesPopupOrderId(notesPopupOrderId === order.id ? null : order.id)
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="View notes"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      
                      {/* Notes Popup */}
                      {notesPopupOrderId === order.id && notesPopupPosition && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => {
                              setNotesPopupOrderId(null)
                              setNotesPopupPosition(null)
                            }}
                          ></div>
                          <div 
                            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 max-w-xs"
                            style={{
                              top: `${notesPopupPosition.top}px`,
                              left: `${notesPopupPosition.left}px`,
                              minWidth: '250px'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Tail */}
                            <div className="absolute -top-2 left-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                            
                            {/* Notes Content */}
                            <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                              {renderNotesWithLinks(notesContent)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : null
                })()}
                {assigned && <div className="w-2 h-2 bg-green-500 rounded-full" title="مخصص لمندوب"></div>}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">{order.customer_name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showStatusBadgeInCard ? getStatusBadge(getDisplayStatus(order)) : null}
            {unfulfilledItems.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5" />
                غير منفذ
              </span>
            )}
            <button
              onClick={() => toggleRowExpansion(order.id)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <a href={`tel:${order.mobile_number || ''}`} className="text-blue-600 hover:text-blue-800">
              {order.mobile_number || 'N/A'}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">{collectibleAmount.toFixed(2)} ج.م</span>
          </div>
          {unfulfilledTotal > 0 && (
            <div className="col-span-2 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>تم طرح {unfulfilledTotal.toFixed(2)} ج.م لمنتجات غير منفذة</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-gray-400" />
            <span className={`${assigned ? "text-green-700 font-medium" : "text-gray-900"}`}>
              {order.courier_name || "غير مخصص"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{order.created_at ? formatOrderTime(order.created_at) : "-"}</span>
          </div>
        </div>

        {/* Payment Status */}
        <div className="flex items-center gap-2">{getPaymentMethodBadge(order.payment_method)}</div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Customer Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">اسم العميل</label>
              {isEditing ? (
                <input
                  type="text"
                  value={edited.customer_name ?? order.customer_name}
                  onChange={(e) => handleEditChange(order.id, "customer_name", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <span className="text-sm text-gray-900">{order.customer_name}</span>
              )}
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">رقم الهاتف</label>
              {isEditing ? (
                <input
                  type="text"
                  value={edited.mobile_number ?? order.mobile_number}
                  onChange={(e) => handleEditChange(order.id, "mobile_number", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <a href={`tel:${order.mobile_number || ''}`} className="text-sm text-blue-600 hover:text-blue-800">
                  {order.mobile_number || 'N/A'}
                </a>
              )}
            </div>

            {/* Total Order Fees */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">إجمالي الرسوم</label>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  value={edited.total_order_fees ?? order.total_order_fees}
                  onChange={(e) => handleEditChange(order.id, "total_order_fees", parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-900">
                    {collectibleAmount.toFixed(2)} ج.م
                  </span>
                  {unfulfilledTotal > 0 && (
                    <p className="text-xs text-amber-700 font-semibold">
                      طرح {unfulfilledTotal.toFixed(2)} ج.م لمنتجات غير منفذة
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Payment Status Edit */}
            {isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">حالة الدفع</label>
                <select
                  value={edited.payment_status ?? order.payment_status}
                  onChange={(e) => handleEditChange(order.id, "payment_status", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="paid">مدفوع</option>
                  <option value="pending">معلق</option>
                  <option value="cod">عند التسليم</option>
                </select>
              </div>
            )}

            {/* Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">العنوان</label>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <textarea
                    value={edited.address ?? order.address}
                    onChange={(e) => handleEditChange(order.id, "address", e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                  <button
                    onClick={() => openExpandedEdit(order.id, "address", edited.address ?? order.address)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-900 break-words">{order.address}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">الملاحظات</label>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <textarea
                    value={edited.notes ?? order.notes ?? ""}
                    onChange={(e) => handleEditChange(order.id, "notes", e.target.value)}
                    placeholder="أضف ملاحظات"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                  <button
                    onClick={() => openExpandedEdit(order.id, "notes", edited.notes ?? order.notes ?? "")}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-900 break-words">
                    {order.notes ? renderNotesWithLinks(order.notes) : "لا توجد ملاحظات"}
                  </div>
                </div>
              )}
            </div>

            {/* City */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">المدينة</label>
              {isEditing ? (
                <input
                  type="text"
                  value={edited.billing_city ?? order.billing_city}
                  onChange={(e) => handleEditChange(order.id, "billing_city", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <span className="text-sm text-gray-900">{order.billing_city}</span>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">طريقة الدفع</label>
              {isEditing ? (
                <div className="space-y-2">
                  <select
                    value={edited.payment_method ?? order.payment_method}
                    onChange={(e) => handleEditChange(order.id, "payment_method", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="valu">Valu</option>
                    <option value="partial">Partial</option>
                    <option value="paymob">Paymob</option>
                    <option value="instapay">Instapay</option>
                    <option value="wallet">Wallet</option>
                    <option value="visa_machine">Visa Machine</option>
                    <option value="on_hand">On Hand</option>
                  </select>
                  
                  {/* Payment Status */}
                  <select
                    value={edited.payment_status ?? order.payment_status ?? ""}
                    onChange={(e) => handleEditChange(order.id, "payment_status", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">غير محدد</option>
                    <option value="paid">مدفوع</option>
                    <option value="pending">معلق</option>
                    <option value="cod">عند التسليم</option>
                  </select>

                  {/* Collected By */}
                  <select
                    value={edited.collected_by ?? order.collected_by ?? ""}
                    onChange={(e) => handleEditChange(order.id, "collected_by", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">غير محدد</option>
                    <option value="courier">المندوب</option>
                    <option value="paymob">باي موب</option>
                    <option value="valu">فاليو</option>
                    <option value="fawry">فوري</option>
                    <option value="instapay">إنستاباي</option>
                    <option value="vodafone_cash">فودافون كاش</option>
                    <option value="orange_cash">أورانج كاش</option>
                    <option value="we_pay">وي باي</option>
                  </select>

                  {/* Payment Sub Type */}
                  {(edited.collected_by ?? order.collected_by) === "courier" && (
                    <select
                      value={edited.payment_sub_type ?? order.payment_sub_type ?? ""}
                      onChange={(e) => handleEditChange(order.id, "payment_sub_type", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">اختر نوع الدفع</option>
                      <option value="on_hand">نقداً</option>
                      <option value="instapay">إنستاباي</option>
                      <option value="wallet">المحفظة</option>
                      <option value="visa_machine">ماكينة فيزا</option>
                      <option value="paymob">باي موب</option>
                    </select>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-900">{order.payment_method}</span>
              )}
            </div>

            {/* Status */}
            {isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">الحالة</label>
                <select
                  value={edited.status ?? order.status}
                  onChange={(e) => handleEditChange(order.id, "status", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.keys(statusConfig).map((statusKey) => (
                    <option key={statusKey} value={statusKey}>
                      {statusConfig[statusKey].label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Courier */}
            {isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">المندوب</label>
                <select
                  value={edited.assigned_courier_id ?? order.assigned_courier_id ?? ""}
                  onChange={(e) => handleEditChange(order.id, "assigned_courier_id", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">غير مخصص</option>
                  {couriers.map((courier) => (
                    <option key={courier.id} value={courier.id}>
                      {courier.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Courier-Specific Fields */}
            {isEditing && (
              <div className="space-y-3 pt-3 border-t border-gray-200">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                  <p className="text-xs font-semibold text-blue-800">حقول المندوب (يمكن تعديلها)</p>
                </div>

                {/* Delivery Fee */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">رسوم التوصيل</label>
                  <input
                    type="number"
                    step="0.01"
                    value={edited.delivery_fee ?? order.delivery_fee ?? ""}
                    onChange={(e) => handleEditChange(order.id, "delivery_fee", e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                {/* Partial Paid Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">المبلغ المدفوع جزئياً</label>
                  <input
                    type="number"
                    step="0.01"
                    value={edited.partial_paid_amount ?? order.partial_paid_amount ?? ""}
                    onChange={(e) => handleEditChange(order.id, "partial_paid_amount", e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                {/* Internal Comment (Courier Comment) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">تعليق المندوب</label>
                  <textarea
                    value={edited.internal_comment ?? order.internal_comment ?? ""}
                    onChange={(e) => handleEditChange(order.id, "internal_comment", e.target.value)}
                    placeholder="تعليق المندوب الداخلي"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Display Courier Fields (Read-only when not editing) */}
            {!isEditing && (order.delivery_fee || order.partial_paid_amount || order.internal_comment) && (
              <div className="space-y-2 pt-3 border-t border-gray-200">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">معلومات المندوب:</p>
                  {order.delivery_fee && (
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">رسوم التوصيل:</span> {order.delivery_fee.toFixed(2)} ج.م
                    </div>
                  )}
                  {order.partial_paid_amount && (
                    <div className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">المبلغ الجزئي:</span> {order.partial_paid_amount.toFixed(2)} ج.م
                    </div>
                  )}
                  {order.internal_comment && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">تعليق المندوب:</span> {order.internal_comment}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              {isEditing ? (
                <>
                  <button
                    onClick={() => saveOrderEdit(order.id)}
                    disabled={savingOrderId === order.id}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingOrderId === order.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3" />
                        حفظ
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => cancelEdit(order.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
                  >
                    <X className="w-3 h-3" />
                    إلغاء
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedOrderForDetail(order)}
                    className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    title="View Full Details"
                  >
                    <Eye className="w-3 h-3" />
                    تفاصيل
                  </button>
                  <button
                    onClick={() => handleDuplicateOrder(order.id)}
                    disabled={duplicatingOrderId === order.id}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="نسخ/تقسيم الطلب"
                  >
                    {duplicatingOrderId === order.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    نسخ
                  </button>
                  {viewMode === "active" && (
                    <button
                      onClick={() => startEdit(order.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Edit3 className="w-3 h-3" />
                      تعديل
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedOrders([order.id])
                      setShowDeleteConfirm(true)
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                    حذف
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Show ReceivePieceOrExchange page if requested
  if (showReceivePieceOrExchange) {
    return (
      <ReceivePieceOrExchange
        onBack={() => {
          setShowReceivePieceOrExchange(false)
          fetchOrders()
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom CSS for always visible scrollbars */}
      <style>{`
        .scrollbar-always {
          scrollbar-width: thin;
          scrollbar-color: #CBD5E0 #F7FAFC;
        }
        .scrollbar-always::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .scrollbar-always::-webkit-scrollbar-track {
          background: #F7FAFC;
          border-radius: 6px;
        }
        .scrollbar-always::-webkit-scrollbar-thumb {
          background: #CBD5E0;
          border-radius: 6px;
          border: 2px solid #F7FAFC;
        }
        .scrollbar-always::-webkit-scrollbar-thumb:hover {
          background: #A0AEC0;
        }
        .scrollbar-always::-webkit-scrollbar-corner {
          background: #F7FAFC;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">إدارة الطلبات</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* استلام قطعه او تبديل Button */}
              <button
                onClick={handleOpenReceivePieceOrExchange}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                title="استلام قطعه او تبديل"
              >
                <Package className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">استلام قطعه او تبديل</span>
                {selectedOrders.length > 0 && (
                  <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-bold">
                    {selectedOrders.length}
                  </span>
                )}
              </button>
              {/* Subtle loading indicator for filter/date changes */}
              {refreshing && !loading && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">جاري التحديث...</span>
                </div>
              )}
              <button
                onClick={() => fetchOrders(true)}
                disabled={refreshing || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{refreshing ? 'جاري التحديث...' : 'تحديث'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Shopify-style Filter Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-2">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveFilterTab('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  activeFilterTab === 'all'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => {
                  setActiveFilterTab('unpaid')
                  setFilters(prev => ({ ...prev, paymentStatuses: ['pending'] }))
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  activeFilterTab === 'unpaid'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                غير مدفوع
              </button>
              <button
                onClick={() => {
                  setActiveFilterTab('open')
                  setFilters(prev => ({ ...prev, statuses: ['pending', 'assigned'] }))
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  activeFilterTab === 'open'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                مفتوح
              </button>
              <button
                onClick={() => {
                  setActiveFilterTab('archived')
                  setViewMode('archived')
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  activeFilterTab === 'archived' || viewMode === 'archived'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                الأرشيف
              </button>
              <button
                onClick={() => {
                  setActiveFilterTab('paid')
                  setFilters(prev => ({ ...prev, paymentStatuses: ['paid'] }))
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  activeFilterTab === 'paid'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                مدفوع
              </button>
              <button
                onClick={() => {
                  setActiveFilterTab('cod')
                  setFilters(prev => ({ ...prev, paymentStatuses: ['cod'] }))
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  activeFilterTab === 'cod'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                عند التسليم
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar with Advanced Filters - Shopify Style */}
        <div className="bg-white rounded-lg border border-gray-200 p-2 mb-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  e.preventDefault()
                  setSearchQuery(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                  }
                }}
                autoComplete="off"
                placeholder="Searching all orders"
                className="w-full pr-8 pl-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            {/* Add Filter Button - Shopify Style */}
            <div className="relative" ref={addFilterButtonRef}>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-xs font-medium text-gray-700"
              >
                <span>Add filter</span>
                <span className="text-gray-400">+</span>
              </button>
              
              {/* Advanced Filter Dropdown */}
              {showAdvancedFilters && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowAdvancedFilters(false)}
                  ></div>
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-xl z-50">
                    {/* Search inside filter dropdown */}
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={filterSearchQuery}
                          onChange={(e) => setFilterSearchQuery(e.target.value)}
                          placeholder="Search filters..."
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    {/* Filter Options List */}
                    <div className="max-h-80 overflow-y-auto">
                      {[
                        { id: 'order_status', label: 'Order status', key: 'statuses' },
                        { id: 'payment_status', label: 'Payment status', key: 'paymentStatuses' },
                        { id: 'fulfillment_status', label: 'Fulfillment status', key: 'fulfillmentStatuses' },
                        { id: 'courier', label: 'Courier', key: 'couriers' },
                        { id: 'tags', label: 'Tags', key: 'tags' },
                      ]
                        .filter(filter => 
                          filter.label.toLowerCase().includes(filterSearchQuery.toLowerCase()) ||
                          filter.id.toLowerCase().includes(filterSearchQuery.toLowerCase())
                        )
                        .map((filter) => (
                          <button
                            key={filter.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              // Get the position of the Add filter button to position sub-filter dropdown in the same place
                              const addFilterButton = addFilterButtonRef.current?.querySelector('button')
                              const position = addFilterButton 
                                ? (() => {
                                    const rect = addFilterButton.getBoundingClientRect()
                                    return { top: rect.bottom + 8, left: rect.left }
                                  })()
                                : { top: 0, left: 0 }
                              
                              if (filter.id === 'tags') {
                                // Open tag filter dropdown in the same position as Add filter menu
                                setTagFilterPosition(position)
                                setShowTagFilter(true)
                                setShowAdvancedFilters(false)
                              } else {
                                // Open generic filter dropdown with checklist in the same position
                                setOpenFilterDropdown({
                                  filterId: filter.id,
                                  position: position
                                })
                                setFilterDropdownSearch("")
                                setShowAdvancedFilters(false)
                              }
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm text-gray-700 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                          >
                            <span>{filter.label}</span>
                            <ChevronLeft className="w-4 h-4 text-gray-400" />
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {debouncedSearch && (
              <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                {orders.length} نتيجة
              </div>
            )}
          </div>
          
          {/* Active Filters Display - Shopify Style */}
          {(filters.tags.length > 0 || filters.statuses.length > 0 || filters.paymentStatuses.length > 0 || filters.fulfillmentStatuses.length > 0 || filters.couriers.length > 0) && (
            <div className="mt-1.5 pt-1.5 border-t border-gray-200 flex flex-wrap items-center gap-1.5">
              {/* Order Status Filter Button */}
              {filters.statuses.length > 0 && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setOpenFilterDropdown({
                        filterId: 'order_status',
                        position: { top: rect.bottom + 4, left: rect.left }
                      })
                      setFilterDropdownSearch("")
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span>Order status</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFilters(prev => ({ ...prev, statuses: [] }))
                      }}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </button>
                </div>
              )}
              
              {/* Payment Status Filter Button */}
              {filters.paymentStatuses.length > 0 && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setOpenFilterDropdown({
                        filterId: 'payment_status',
                        position: { top: rect.bottom + 4, left: rect.left }
                      })
                      setFilterDropdownSearch("")
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span>Payment status</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFilters(prev => ({ ...prev, paymentStatuses: [] }))
                      }}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </button>
                </div>
              )}
              
              {/* Fulfillment Status Filter Button */}
              {filters.fulfillmentStatuses.length > 0 && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setOpenFilterDropdown({
                        filterId: 'fulfillment_status',
                        position: { top: rect.bottom + 4, left: rect.left }
                      })
                      setFilterDropdownSearch("")
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span>Fulfillment status</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFilters(prev => ({ ...prev, fulfillmentStatuses: [] }))
                      }}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </button>
                </div>
              )}
              
              {/* Courier Filter Button */}
              {filters.couriers.length > 0 && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setOpenFilterDropdown({
                        filterId: 'courier',
                        position: { top: rect.bottom + 4, left: rect.left }
                      })
                      setFilterDropdownSearch("")
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span>Courier</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFilters(prev => ({ ...prev, couriers: [] }))
                      }}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </button>
                </div>
              )}
              
              {/* Tags Filter Button */}
              {filters.tags.length > 0 && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTagFilterPosition({ top: rect.bottom + 4, left: rect.left })
                      setShowTagFilter(true)
                      setTagSearchQuery("")
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span>Tags</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFilters(prev => ({ ...prev, tags: [] }))
                      }}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </button>
                </div>
              )}
              
              {/* Clear All Button */}
              {(filters.tags.length > 0 || filters.statuses.length > 0 || filters.paymentStatuses.length > 0 || filters.fulfillmentStatuses.length > 0 || filters.couriers.length > 0) && (
                <button
                  onClick={clearFilters}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:underline transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
          
          {/* Tag Filter Dropdown - Shopify Style */}
          {showTagFilter && tagFilterPosition && (
            <>
              <div 
                className="fixed inset-0 z-[9998]" 
                onClick={() => {
                  setShowTagFilter(false)
                  setTagFilterPosition(null)
                }}
              ></div>
              <div 
                className="fixed bg-white border border-gray-300 rounded-lg shadow-xl z-[9999]"
                style={{
                  top: `${tagFilterPosition.top}px`,
                  left: `${Math.max(8, Math.min(tagFilterPosition.left, window.innerWidth - 288))}px`,
                  width: '280px',
                  minWidth: '280px',
                  maxHeight: `${Math.min(400, window.innerHeight - tagFilterPosition.top - 20)}px`
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Tagged with</h3>
                    <button
                      onClick={() => {
                        setShowTagFilter(false)
                        setTagFilterPosition(null)
                        setTagSearchQuery("")
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={tagSearchQuery}
                      onChange={(e) => setTagSearchQuery(e.target.value)}
                      placeholder="Search tags..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                    {tagSearchQuery && (
                      <button
                        onClick={() => setTagSearchQuery("")}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  {tagSearchQuery && (
                    <button
                      onClick={() => setTagSearchQuery("")}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                {/* Tag List */}
                <div className="max-h-64 overflow-y-auto">
                  {availableTags
                    .filter(tag => 
                      tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
                    )
                    .map((tag) => (
                      <label
                        key={tag}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                          filters.tags.includes(tag) ? 'bg-blue-50 hover:bg-blue-100' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={filters.tags.includes(tag)}
                          onChange={(e) => {
                            e.stopPropagation()
                            if (e.target.checked) {
                              setFilters(prev => ({
                                ...prev,
                                tags: [...prev.tags, tag]
                              }))
                            } else {
                              setFilters(prev => ({
                                ...prev,
                                tags: prev.tags.filter(t => t !== tag)
                              }))
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                        />
                        <span className={`text-sm flex-1 text-left ${filters.tags.includes(tag) ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                          {tag}
                        </span>
                      </label>
                    ))}
                  {availableTags.filter(tag => 
                    tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No tags found
                    </div>
                  )}
                </div>
                {filters.tags.length > 0 && (
                  <div className="p-3 border-t border-gray-200 bg-white">
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, tags: [] }))
                        setShowTagFilter(false)
                        setTagFilterPosition(null)
                      }}
                      className="w-full text-sm text-gray-600 hover:text-gray-900 text-left"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Generic Filter Dropdown with Checklist */}
          {openFilterDropdown && (
            <>
              <div 
                className="fixed inset-0 z-[9998]" 
                onClick={() => {
                  setOpenFilterDropdown(null)
                  setFilterDropdownSearch("")
                }}
              ></div>
              <div 
                className="fixed bg-white border border-gray-300 rounded-lg shadow-xl z-[9999]"
                style={{
                  top: `${openFilterDropdown.position.top}px`,
                  left: `${Math.max(8, Math.min(openFilterDropdown.position.left, window.innerWidth - 328))}px`,
                  width: '320px',
                  minWidth: '320px',
                  maxHeight: `${Math.min(450, window.innerHeight - openFilterDropdown.position.top - 20)}px`
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const filterId = openFilterDropdown.filterId
                  const filterLabels: Record<string, string> = {
                    order_status: 'Order status',
                    payment_status: 'Payment status',
                    fulfillment_status: 'Fulfillment status',
                    delivery_status: 'Delivery status',
                    courier: 'Courier',
                  }
                  
                  // Get available options based on filter type
                  // Use pre-fetched options (from all orders, like Shopify)
                  let availableOptions: string[] = filterOptions[filterId] || []
                  let selectedOptions: string[] = []
                  let filterKey = ''
                  
                  if (filterId === 'order_status') {
                    selectedOptions = filters.statuses
                    filterKey = 'statuses'
                  } else if (filterId === 'payment_status') {
                    selectedOptions = filters.paymentStatuses
                    filterKey = 'paymentStatuses'
                  } else if (filterId === 'fulfillment_status') {
                    selectedOptions = filters.fulfillmentStatuses
                    filterKey = 'fulfillmentStatuses'
                  } else if (filterId === 'courier') {
                    selectedOptions = filters.couriers.map(id => couriers.find(c => c.id === id)?.name || '').filter(Boolean)
                    filterKey = 'couriers'
                  }
                  
                  // If options not loaded yet, show loading or use current orders as fallback
                  if (availableOptions.length === 0 && !loadingFilterOptions) {
                    // Fallback to current orders if options not loaded
                    if (filterId === 'order_status') {
                      // Shopify order statuses: always show Open, Archived, Canceled
                      availableOptions = ['open', 'archived', 'canceled']
                    } else if (filterId === 'payment_status') {
                      availableOptions = Array.from(new Set(orders.map(o => String(o.payment_status || '')).filter(s => s !== ''))).sort()
                    } else if (filterId === 'fulfillment_status') {
                      const fetchedStatuses = Array.from(new Set(orders.map(o => o.fulfillment_status).filter((s): s is string => Boolean(s))))
                      const shopifyStatuses = ['fulfilled', 'unfulfilled', 'partial', 'scheduled', 'on_hold', 'request_fulfillment']
                      availableOptions = Array.from(new Set([...shopifyStatuses, ...fetchedStatuses])).sort()
                    } else if (filterId === 'courier') {
                      availableOptions = Array.from(new Set(orders.map(o => o.courier_name).filter((s): s is string => Boolean(s)))).sort()
                    }
                  }
                  
                  // Filter options by search query
                  const filteredOptions = availableOptions.filter(opt => 
                    opt.toLowerCase().includes(filterDropdownSearch.toLowerCase())
                  )
                  
                  return (
                    <>
                      <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                          {filterLabels[filterId] || filterId}
                        </h3>
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={filterDropdownSearch}
                            onChange={(e) => setFilterDropdownSearch(e.target.value)}
                            placeholder="Search options..."
                            className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                          filteredOptions.map((option) => {
                            const isSelected = filterKey === 'couriers' 
                              ? couriers.find(c => c.name === option && filters.couriers.includes(c.id)) !== undefined
                              : selectedOptions.includes(option)
                            return (
                              <label
                                key={option}
                                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                                  isSelected ? 'bg-blue-50 hover:bg-blue-100' : ''
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    if (filterKey === 'statuses') {
                                      setFilters(prev => ({
                                        ...prev,
                                        statuses: e.target.checked
                                          ? [...prev.statuses, option]
                                          : prev.statuses.filter(s => s !== option)
                                      }))
                                    } else if (filterKey === 'paymentStatuses') {
                                      setFilters(prev => ({
                                        ...prev,
                                        paymentStatuses: e.target.checked
                                          ? [...prev.paymentStatuses, option]
                                          : prev.paymentStatuses.filter(s => s !== option)
                                      }))
                                    } else if (filterKey === 'fulfillmentStatuses') {
                                      setFilters(prev => ({
                                        ...prev,
                                        fulfillmentStatuses: e.target.checked
                                          ? [...prev.fulfillmentStatuses, option]
                                          : prev.fulfillmentStatuses.filter(s => s !== option)
                                      }))
                                    } else if (filterKey === 'couriers') {
                                      // For couriers, we need to find the courier ID by name
                                      const courier = couriers.find(c => c.name === option)
                                      if (courier) {
                                        setFilters(prev => ({
                                          ...prev,
                                          couriers: e.target.checked
                                            ? [...prev.couriers, courier.id]
                                            : prev.couriers.filter(id => id !== courier.id)
                                        }))
                                      }
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                                />
                                <span className={`text-sm flex-1 text-left ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                                  {(() => {
                                    // Format order status labels to match Shopify
                                    if (filterKey === 'statuses') {
                                      const statusMap: Record<string, string> = {
                                        'open': 'Open',
                                        'archived': 'Archived',
                                        'canceled': 'Canceled',
                                      }
                                      return statusMap[option.toLowerCase()] || option
                                    }
                                    // Format fulfillment status labels to match Shopify
                                    if (filterKey === 'fulfillmentStatuses') {
                                      const statusMap: Record<string, string> = {
                                        'fulfilled': 'Fulfilled',
                                        'unfulfilled': 'Unfulfilled',
                                        'partial': 'Partially fulfilled',
                                        'scheduled': 'Scheduled',
                                        'on_hold': 'On hold',
                                        'request_fulfillment': 'Request declined',
                                      }
                                      return statusMap[option.toLowerCase()] || option
                                    }
                                    return option || '(Empty)'
                                  })()}
                                </span>
                              </label>
                            )
                          })
                        ) : (
                          <div className="px-4 py-8 text-sm text-gray-500 text-center">
                            No options found
                          </div>
                        )}
                      </div>
                      {filteredOptions.length > 0 && selectedOptions.length > 0 && (
                        <div className="p-3 border-t border-gray-200 bg-white">
                          <button
                            onClick={() => {
                              if (filterKey === 'statuses') {
                                setFilters(prev => ({ ...prev, statuses: [] }))
                              } else if (filterKey === 'paymentStatuses') {
                                setFilters(prev => ({ ...prev, paymentStatuses: [] }))
                              } else if (filterKey === 'fulfillmentStatuses') {
                                setFilters(prev => ({ ...prev, fulfillmentStatuses: [] }))
                              } else if (filterKey === 'couriers') {
                                setFilters(prev => ({ ...prev, couriers: [] }))
                              }
                              setOpenFilterDropdown(null)
                            }}
                            className="w-full text-sm text-gray-600 hover:text-gray-900 text-left"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </>
          )}
        </div>

        {/* Date Range Navigation - Compact */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">{formatSelectedDate()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Quick Presets - Compact */}
              <button
                onClick={() => setDateRangePreset('all')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  (!dateRange || !dateRange.from || !dateRange.to) 
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-blue-50'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setDateRangePreset('today')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  (() => {
                    if (!dateRange?.from || !dateRange?.to) return false
                    const now = new Date()
                    const egyptTimezone = 'Africa/Cairo'
                    const formatter = new Intl.DateTimeFormat('en-CA', {
                      timeZone: egyptTimezone,
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })
                    const todayStr = formatter.format(now)
                    return dateRange.from === todayStr && dateRange.from === dateRange.to
                  })()
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-blue-50'
                }`}
              >
                اليوم
              </button>
              
              {/* Date Navigation - Compact */}
              <button
                onClick={goToPreviousDay}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="السابق"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={goToNextDay}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="التالي"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              
              {/* Date Range Picker - Compact */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="نطاق مخصص"
                >
                  <Calendar className="w-4 h-4 text-gray-600" />
                </button>
                {showDatePicker && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 min-w-[280px]">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900">اختر نطاق التاريخ</h3>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">من تاريخ</label>
                          <input
                            type="date"
                            value={dateRange?.from || ''}
                            onChange={(e) => setDateRange(prev => prev ? ({ ...prev, from: e.target.value }) : ({ from: e.target.value, to: e.target.value }))}
                            max={dateRange?.to}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">إلى تاريخ</label>
                          <input
                            type="date"
                            value={dateRange?.to || ''}
                            onChange={(e) => setDateRange(prev => prev ? ({ ...prev, to: e.target.value }) : ({ from: e.target.value, to: e.target.value }))}
                            min={dateRange?.from}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setShowDatePicker(false)}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-xs font-medium"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={() => setShowDatePicker(false)}
                          className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          تطبيق
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section - Enhanced with Smooth Animation */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          showFilters ? 'max-h-[2000px] opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0'
        }`}>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Filter className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">المرشحات المتقدمة</h3>
                  <p className="text-sm text-gray-500">Advanced Filters</p>
                </div>
              </div>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <X className="w-4 h-4" />
                مسح الكل
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* Couriers as checkboxes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">اختر المندوبين</label>
                <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pl-2 border border-gray-200 rounded-lg">
                  {couriers.map((courier) => (
                    <label key={courier.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.couriers.includes(courier.id)}
                        onChange={() => {
                          setFilters((prev) => {
                            const alreadySelected = prev.couriers.includes(courier.id)
                            return {
                              ...prev,
                              couriers: alreadySelected
                                ? prev.couriers.filter((id) => id !== courier.id)
                                : [...prev.couriers, courier.id],
                            }
                          })
                        }}
                      />
                      <span>{courier.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Statuses as checkboxes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">اختر الحالات</label>
                <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pl-2 border border-gray-200 rounded-lg">
                  {Object.keys(statusConfig).map((statusKey) => (
                    <label key={statusKey} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.statuses.includes(statusKey)}
                        onChange={() => {
                          setFilters((prev) => {
                            const alreadySelected = prev.statuses.includes(statusKey)
                            return {
                              ...prev,
                              statuses: alreadySelected
                                ? prev.statuses.filter((s) => s !== statusKey)
                                : [...prev.statuses, statusKey],
                            }
                          })
                        }}
                      />
                      <span>{statusConfig[statusKey].label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Status Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">حالة الدفع</label>
                <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pl-2 border border-gray-200 rounded-lg">
                  {[
                    { key: "paid", label: "مدفوع" },
                    { key: "pending", label: "معلق" },
                    { key: "cod", label: "عند التسليم" },
                  ].map((status) => (
                    <label key={status.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.paymentStatuses.includes(status.key)}
                        onChange={() => {
                          setFilters((prev) => {
                            const alreadySelected = prev.paymentStatuses.includes(status.key)
                            return {
                              ...prev,
                              paymentStatuses: alreadySelected
                                ? prev.paymentStatuses.filter((s) => s !== status.key)
                                : [...prev.paymentStatuses, status.key],
                            }
                          })
                        }}
                      />
                      <span>{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Phone filter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="رقم الهاتف"
                    value={textFilters.mobile}
                    onChange={(e) => setTextFilters((prev) => ({ ...prev, mobile: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      textFilters.mobile !== filters.mobile ? "border-orange-300 bg-orange-50" : "border-gray-300"
                    }`}
                  />
                </div>
              </div>

              {/* Order ID filter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">رقم الطلب</label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="رقم الطلب"
                    value={textFilters.orderId}
                    onChange={(e) => setTextFilters((prev) => ({ ...prev, orderId: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      textFilters.orderId !== filters.orderId ? "border-orange-300 bg-orange-50" : "border-gray-300"
                    }`}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  applyTextFilters()
                  fetchOrders()
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Search className="w-4 h-4" />
                تطبيق المرشحات
              </button>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
                مسح المرشحات
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="font-semibold text-gray-900">{selectedOrders.length} طلب محدد</span>
              </div>
              <div className="flex items-center gap-3">
                {viewMode === "active" && (
                  <>
                    <select
                      value={selectedCourier}
                      onChange={(e) => setSelectedCourier(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">اختر المندوب</option>
                      {couriers.map((courier) => (
                        <option key={courier.id} value={courier.id}>
                          {courier.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignOrders}
                      disabled={assignLoading || !selectedCourier}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {assignLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      تعيين المحدد
                    </button>
                    <button
                      onClick={() => setShowArchiveConfirm(true)}
                      disabled={archiveLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                      أرشفة المحدد
                    </button>
                  </>
                )}
                {viewMode === "archived" && (
                  <button
                    onClick={handleRestoreOrders}
                    disabled={archiveLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {archiveLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ArchiveRestore className="w-4 h-4" />
                    )}
                    استعادة المحدد
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف المحدد
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3 text-green-800">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Orders Display */}
        {isMobile ? (
          /* Mobile Card Layout */
          <div className="space-y-4">
            {orders.map((order) => (
              <MobileOrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          /* Desktop Table Layout with Sticky Columns and Always Visible Scrollbars */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="relative overflow-x-scroll overflow-y-auto max-h-[60vh] scrollbar-always">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="sticky left-0 z-20 bg-gray-50 px-3 py-2 text-right border-r border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === orders.length && orders.length > 0}
                        onChange={toggleAllOrders}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                    </th>
                    <th 
                      className="sticky left-8 z-20 bg-gray-50 px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 min-w-[100px] cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('order_id')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Order</span>
                        {getSortIcon('order_id')}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[80px]">
                      Notes
                    </th>
                    <th 
                      className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[150px] cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('customer_name')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Customer</span>
                        {getSortIcon('customer_name')}
                      </div>
                    </th>
                    <th 
                      className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[180px] cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Date</span>
                        {getSortIcon('created_at')}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                      <div className="flex items-center justify-end gap-1">
                        <span>Address</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                      <div className="flex items-center justify-end gap-1">
                        <span>Total</span>
                        {getSortIcon('total_order_fees')}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      Payment status
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      Fulfillment status
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[80px]">
                      Items
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                      Tags
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => {
                    const edited = orderEdits[order.id] || {}
                    const isEditing = editingOrder === order.id
                    const assigned = isOrderAssigned(order)
                    const displayStatus = getDisplayStatus(order)
                    const statusLower = (displayStatus || '').toLowerCase()
                    const paymentLower = (order.payment_status || '').toLowerCase()
                    const financialLower = (order.financial_status || '').toLowerCase()
                    const { unfulfilledItems, unfulfilledTotal, collectibleAmount } = getUnfulfilledSummary(order)
                    const isCanceled =
                      statusLower === 'canceled' ||
                      statusLower === 'cancelled' ||
                      paymentLower === 'cancelled' ||
                      paymentLower === 'canceled' ||
                      paymentLower === 'voided' ||
                      financialLower === 'void' ||
                      financialLower === 'voided' ||
                      !!order.shopify_cancelled_at

                    return (
                      <React.Fragment key={`${order.id}-fragment`}>
                      <tr
                        key={order.id}
                        className={`transition-colors border-b ${
                          isCanceled
                            ? "bg-red-50/70 hover:bg-red-50 border-red-200 border-dashed"
                            : "border-gray-100"
                        } ${assigned && !isCanceled ? "bg-green-50/50 hover:bg-green-50" : !isCanceled ? "bg-white hover:bg-gray-50" : ""}`}
                      >
                        <td
                          className={`sticky left-0 z-10 px-3 py-2.5 border-r border-gray-200 ${
                            isCanceled ? "bg-red-50/70" : assigned ? "bg-green-50/50" : "bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                        </td>
                        <td
                          className={`sticky left-8 z-10 px-3 py-2.5 border-r border-gray-200 ${
                            isCanceled ? "bg-red-50/70" : assigned ? "bg-green-50/50" : "bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${isCanceled ? "text-red-700 line-through" : "text-gray-900"}`}>
                              #{order.order_id}
                            </span>
                            {isCanceled && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold text-red-700 bg-red-100 border border-red-300 border-dashed rounded-full">
                                ملغي
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {/* Notes Icon - Only show icon, never show notes text in table */}
                          {(() => {
                            // Check all note fields
                            const hasNotes = (order.notes && order.notes.trim() !== "") ||
                                           (order.order_note && order.order_note.trim() !== "") ||
                                           (order.customer_note && order.customer_note.trim() !== "")
                            const notesContent = order.notes || order.order_note || order.customer_note || ""
                            
                            return hasNotes ? (
                              <div className="relative flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    setNotesPopupPosition({
                                      top: rect.bottom + window.scrollY + 4,
                                      left: rect.left + window.scrollX
                                    })
                                    setNotesPopupOrderId(notesPopupOrderId === order.id ? null : order.id)
                                  }}
                                  className="text-gray-400 hover:text-blue-600 transition-colors p-0.5"
                                  title="View notes"
                                  type="button"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                                
                                {/* Notes Popup */}
                                {notesPopupOrderId === order.id && notesPopupPosition && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-[9998]" 
                                      onClick={() => {
                                        setNotesPopupOrderId(null)
                                        setNotesPopupPosition(null)
                                      }}
                                    ></div>
                                    <div 
                                      className="fixed bg-white border border-gray-300 rounded-lg shadow-xl z-[9999] p-4 max-w-sm"
                                      style={{
                                        top: `${notesPopupPosition.top}px`,
                                        left: `${notesPopupPosition.left}px`,
                                        minWidth: '280px',
                                        maxWidth: '400px'
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {/* Tail */}
                                      <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-l border-t border-gray-300 transform rotate-45"></div>
                                      
                                      {/* Notes Content */}
                                      <div className="text-sm text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
                                        {renderNotesWithLinks(notesContent)}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )
                          })()}
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={edited.customer_name ?? order.customer_name}
                                onChange={(e) => handleEditChange(order.id, "customer_name", e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <button
                                onClick={() =>
                                  openExpandedEdit(
                                    order.id,
                                    "customer_name",
                                    edited.customer_name ?? order.customer_name,
                                  )
                                }
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className={`text-sm ${isCanceled ? "text-red-700 line-through" : "text-gray-900"}`}>
                                {order.customer_name}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-sm ${isCanceled ? "text-red-700 line-through" : "text-gray-900"}`}>
                            {formatShopifyDate(order.shopify_created_at || order.created_at || '')}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className={`text-sm ${isCanceled ? "text-red-700 line-through" : "text-gray-900"} truncate max-w-[200px]`} title={order.address}>
                              {order.address || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={edited.total_order_fees ?? order.total_order_fees}
                              onChange={(e) => handleEditChange(order.id, "total_order_fees", parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <div className="flex flex-col">
                              <span className={`text-sm font-semibold ${isCanceled ? "text-red-700 line-through" : "text-gray-900"}`}>
                                {order.currency || 'EGP'} {collectibleAmount.toFixed(2)}
                              </span>
                              {unfulfilledTotal > 0 && (
                                <span className="text-[11px] text-amber-700 font-semibold">
                                  طرح {unfulfilledTotal.toFixed(2)} ج.م لمنتجات غير منفذة
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditing ? (
                            <select
                              value={edited.payment_status ?? order.payment_status ?? ""}
                              onChange={(e) => handleEditChange(order.id, "payment_status", e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">غير محدد</option>
                              <option value="paid">مدفوع</option>
                              <option value="pending">معلق</option>
                              <option value="cod">عند التسليم</option>
                            </select>
                          ) : (
                            (() => {
                              // Payment status badge (Shopify-style with dot)
                              const paymentStatus = order.payment_status || 'pending'
                              const isPaid = paymentStatus === 'paid'
                              const isPaymentCanceled =
                                paymentStatus === 'cancelled' ||
                                paymentStatus === 'canceled' ||
                                paymentStatus === 'voided' ||
                                financialLower === 'void' ||
                                financialLower === 'voided'
                              return (
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-2 h-2 rounded-full ${
                                    isPaymentCanceled ? 'bg-red-500' : isPaid ? 'bg-gray-500' : 'bg-orange-500'
                                  }`}></div>
                                  <span className={`text-sm ${isCanceled || isPaymentCanceled ? 'text-red-700' : 'text-gray-900'}`}>
                                    {isPaymentCanceled ? 'Cancelled' : isPaid ? 'Paid' : 'Payment pending'}
                                  </span>
                                </div>
                              )
                            })()
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {(() => {
                            // Fulfillment status badge (Shopify-style with dot)
                            const fulfillmentStatus = order.fulfillment_status || 'unfulfilled'
                            const isFulfilled = fulfillmentStatus === 'fulfilled'
                            return (
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${isFulfilled ? 'bg-gray-500' : 'bg-yellow-500'}`}></div>
                                <span className="text-sm text-gray-900">
                                  {isFulfilled ? 'Fulfilled' : 'Unfulfilled'}
                                </span>
                              </div>
                            )
                          })()}
                        </td>
                        <td className="px-3 py-2.5">
                          {(() => {
                            // Count items from line_items
                            let itemCount = 0
                            try {
                              if (order.line_items) {
                                const lineItems = typeof order.line_items === 'string' 
                                  ? JSON.parse(order.line_items) 
                                  : order.line_items
                                if (Array.isArray(lineItems)) {
                                  itemCount = lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
                                }
                              }
                            } catch (e) {
                              // Silently handle errors
                            }
                            return (
                              <span className="text-sm text-gray-900">
                                {itemCount > 0 ? `${itemCount} item${itemCount > 1 ? 's' : ''}` : '0 items'}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-3 py-2.5">
                          {(() => {
                            // Display order tags (Shopify-style)
                            const tags = order.order_tags || []
                            if (tags.length === 0) {
                              return <span className="text-sm text-gray-400">-</span>
                            }
                            return (
                              <div className="flex flex-wrap gap-1">
                                {tags.map((tag: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveOrderEdit(order.id)}
                                  disabled={savingOrderId === order.id}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {savingOrderId === order.id ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      جاري الحفظ...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3 h-3" />
                                      حفظ
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => cancelEdit(order.id)}
                                  className="flex items-center gap-1 px-3 py-1 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
                                >
                                  <X className="w-2.5 h-2.5" />
                                  إلغاء
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setSelectedOrderForDetail(order)}
                                  className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                  title="View Full Details"
                                >
                                  <Eye className="w-3 h-3" />
                                  تفاصيل
                                </button>
                                <button
                                  onClick={() => handleDuplicateOrder(order.id)}
                                  disabled={duplicatingOrderId === order.id}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="نسخ/تقسيم الطلب"
                                >
                                  {duplicatingOrderId === order.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  نسخ
                                </button>
                                {viewMode === "active" && (
                                  <button
                                    onClick={() => startEdit(order.id)}
                                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    تعديل
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedOrders([order.id])
                                    setShowDeleteConfirm(true)
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  حذف
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Edit Row for Desktop */}
                      {isEditing && (
                        <tr className="bg-blue-50/30 border-b border-gray-200">
                          <td colSpan={9} className="px-4 py-4">
                            <div className="bg-white rounded-lg border border-blue-200 p-4 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                {/* Mobile Number */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">رقم الهاتف</label>
                                  <input
                                    type="text"
                                    value={edited.mobile_number ?? order.mobile_number}
                                    onChange={(e) => handleEditChange(order.id, "mobile_number", e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>

                                {/* City */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">المدينة</label>
                                  <input
                                    type="text"
                                    value={edited.billing_city ?? order.billing_city}
                                    onChange={(e) => handleEditChange(order.id, "billing_city", e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>

                                {/* Address */}
                                <div className="space-y-2 col-span-2">
                                  <label className="text-sm font-medium text-gray-700">العنوان</label>
                                  <textarea
                                    value={edited.address ?? order.address}
                                    onChange={(e) => handleEditChange(order.id, "address", e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    rows={2}
                                  />
                                </div>

                                {/* Payment Method */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">طريقة الدفع</label>
                                  <select
                                    value={edited.payment_method ?? order.payment_method}
                                    onChange={(e) => handleEditChange(order.id, "payment_method", e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="valu">Valu</option>
                                    <option value="partial">Partial</option>
                                    <option value="paymob">Paymob</option>
                                    <option value="instapay">Instapay</option>
                                    <option value="wallet">Wallet</option>
                                    <option value="visa_machine">Visa Machine</option>
                                    <option value="on_hand">On Hand</option>
                                  </select>
                                </div>

                                {/* Collected By */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">طريقة التحصيل</label>
                                  <select
                                    value={edited.collected_by ?? order.collected_by ?? ""}
                                    onChange={(e) => handleEditChange(order.id, "collected_by", e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  >
                                    <option value="">غير محدد</option>
                                    <option value="courier">المندوب</option>
                                    <option value="paymob">باي موب</option>
                                    <option value="valu">فاليو</option>
                                    <option value="fawry">فوري</option>
                                    <option value="instapay">إنستاباي</option>
                                    <option value="vodafone_cash">فودافون كاش</option>
                                    <option value="orange_cash">أورانج كاش</option>
                                    <option value="we_pay">وي باي</option>
                                  </select>
                                </div>

                                {/* Payment Sub Type */}
                                {(edited.collected_by ?? order.collected_by) === "courier" && (
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">نوع الدفع الفرعي</label>
                                    <select
                                      value={edited.payment_sub_type ?? order.payment_sub_type ?? ""}
                                      onChange={(e) => handleEditChange(order.id, "payment_sub_type", e.target.value)}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                      <option value="">اختر نوع الدفع</option>
                                      <option value="on_hand">نقداً</option>
                                      <option value="instapay">إنستاباي</option>
                                      <option value="wallet">المحفظة</option>
                                      <option value="visa_machine">ماكينة فيزا</option>
                                      <option value="paymob">باي موب</option>
                                    </select>
                                  </div>
                                )}

                                {/* Status */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">الحالة</label>
                                  <select
                                    value={edited.status ?? order.status}
                                    onChange={(e) => handleEditChange(order.id, "status", e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  >
                                    {Object.keys(statusConfig).map((statusKey) => (
                                      <option key={statusKey} value={statusKey}>
                                        {statusConfig[statusKey].label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Courier */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">المندوب</label>
                                  <select
                                    value={edited.assigned_courier_id ?? order.assigned_courier_id ?? ""}
                                    onChange={(e) => handleEditChange(order.id, "assigned_courier_id", e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  >
                                    <option value="">غير مخصص</option>
                                    {couriers.map((courier) => (
                                      <option key={courier.id} value={courier.id}>
                                        {courier.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2 col-span-2">
                                  <label className="text-sm font-medium text-gray-700">الملاحظات</label>
                                  <textarea
                                    value={edited.notes ?? order.notes ?? ""}
                                    onChange={(e) => handleEditChange(order.id, "notes", e.target.value)}
                                    placeholder="أضف ملاحظات"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    rows={2}
                                  />
                                </div>
                              </div>

                              {/* Courier-Specific Fields */}
                              <div className="pt-4 border-t border-gray-200 space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                                  <p className="text-xs font-semibold text-blue-800">حقول المندوب (يمكن تعديلها)</p>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                  {/* Delivery Fee */}
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">رسوم التوصيل</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={edited.delivery_fee ?? order.delivery_fee ?? ""}
                                      onChange={(e) => handleEditChange(order.id, "delivery_fee", e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="0.00"
                                    />
                                  </div>

                                  {/* Partial Paid Amount */}
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">المبلغ المدفوع جزئياً</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={edited.partial_paid_amount ?? order.partial_paid_amount ?? ""}
                                      onChange={(e) => handleEditChange(order.id, "partial_paid_amount", e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="0.00"
                                    />
                                  </div>

                                  {/* Internal Comment */}
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">تعليق المندوب</label>
                                    <textarea
                                      value={edited.internal_comment ?? order.internal_comment ?? ""}
                                      onChange={(e) => handleEditChange(order.id, "internal_comment", e.target.value)}
                                      placeholder="تعليق المندوب الداخلي"
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                      rows={2}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {orders.length === 0 && (
              <div className="text-center py-16">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    {viewMode === "active" ? (
                      <Package className="w-8 h-8 text-gray-400" />
                    ) : (
                      <Archive className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {viewMode === "active" ? "لا توجد طلبات لهذا اليوم" : "لا توجد طلبات مؤرشفة لهذا اليوم"}
                    </h3>
                    <p className="text-gray-600">جرب اختيار تاريخ آخر أو تعديل مرشحات البحث</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expanded Edit Modal */}
        {expandedField && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Edit3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    تعديل{" "}
                    {expandedField.field === "address"
                      ? "العنوان"
                      : expandedField.field === "customer_name"
                        ? "اسم العميل"
                        : expandedField.field === "billing_city"
                          ? "المدينة"
                          : expandedField.field === "notes"
                            ? "الملاحظات"
                            : expandedField.field}
                  </h3>
                </div>
                <button
                  onClick={() => setExpandedField(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <textarea
                  value={expandedValue}
                  onChange={(e) => setExpandedValue(e.target.value)}
                  placeholder={`أدخل ${
                    expandedField.field === "address"
                      ? "العنوان"
                      : expandedField.field === "customer_name"
                        ? "اسم العميل"
                        : expandedField.field === "billing_city"
                          ? "المدينة"
                          : expandedField.field === "notes"
                            ? "الملاحظات"
                            : expandedField.field
                  }`}
                  className="w-full h-40 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end p-6 border-t border-gray-200">
                <button
                  onClick={() => setExpandedField(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={closeExpandedEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  تم
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Archive Confirmation Modal */}
        {showArchiveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Archive className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">تأكيد الأرشفة</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  هل أنت متأكد من أرشفة {selectedOrders.length} طلب؟ سيتم إزالة الطلبات من المندوبين المعينين لها.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowArchiveConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleArchiveOrders}
                    disabled={archiveLoading}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {archiveLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        جاري الأرشفة...
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4" />
                        أرشفة
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">تأكيد الحذف</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  هل أنت متأكد من حذف {selectedOrders.length} طلب؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleDeleteOrders}
                    disabled={deleteLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        جاري الحذف...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Detail Modal */}
        {selectedOrderForDetail && (
          <OrderDetailModal
            order={selectedOrderForDetail}
            onClose={() => setSelectedOrderForDetail(null)}
            onUpdate={async () => {
              // Re-fetch orders from database to get updated data
              await fetchOrders()
              
              // Find the updated order in the new list and update the modal
              // Note: fetchOrders updates the 'orders' state, but we need to wait for it
              // Actually, since fetchOrders is async, we can just fetch the single order here too
              const { data: updatedOrder } = await supabase
                .from('orders')
                .select(`
                  id, order_id, shopify_order_id, shopify_order_name, customer_name, customer_email, customer_phone,
                  address, billing_address, shipping_address, billing_city, shipping_city, billing_country, shipping_country, mobile_number,
                  total_order_fees, subtotal_price, total_tax, total_discounts, total_shipping_price, currency,
                  payment_method, payment_status, financial_status, payment_gateway_names,
                  status, fulfillment_status, shipping_method, tracking_number, tracking_url,
                  line_items, product_images, order_note, customer_note, notes, order_tags,
                  shopify_created_at, shopify_cancelled_at, assigned_courier_id, original_courier_id, created_at, updated_at,
                  archived, archived_at, collected_by, payment_sub_type, delivery_fee, partial_paid_amount, internal_comment, shopify_raw_data
                `)
                .eq('id', selectedOrderForDetail.id)
                .single()
              
              if (updatedOrder) {
                setSelectedOrderForDetail(updatedOrder as any)
              }
            }}
          />
        )}

      </div>
    </div>
  )
}

export default OrdersManagement

