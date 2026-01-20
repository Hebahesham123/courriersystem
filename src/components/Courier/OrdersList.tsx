"use client"
import type React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Edit,
  Phone,
  MapPin,
  Package,
  Camera,
  Check,
  X,
  Clock,
  RefreshCw,
  Truck,
  MessageCircle,
  Eye,
  AlertCircle,
  Loader2,
  CreditCard,
  FileText,
  Upload,
  Save,
  XCircle,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  HandMetal,
  Star,
  CheckCircle,
  DollarSign,
  Trash2,
  UserCheck,
  Copy,
  Percent,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"
import { useModalScrollPreserve } from "../../lib/useModalScrollPreserve"


interface OrderProof {
  id: string
  image_data: string
}

interface OrderItem {
  id?: string
  title: string
  variant_title?: string | null
  quantity: number
  price: number
  sku?: string | null
  image_url?: string | null
  vendor?: string | null
  product_type?: string | null
  is_removed?: boolean
  properties?: any
}

interface Order {
  id: string
  order_id: string
  customer_name: string
  address: string
  mobile_number: string
  total_order_fees: number
  delivery_fee: number | null
  payment_method: string
  payment_status?: string
  payment_sub_type: string | null
  financial_status?: string
  status: string
  partial_paid_amount: number | null
  internal_comment: string | null
  collected_by: string | null
  assigned_courier_id: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  order_proofs?: OrderProof[]
  // Shopify/Extended fields
  customer_email?: string | null
  customer_phone?: string | null
  billing_address?: any
  shipping_address?: any
  line_items?: any[] | string
  product_images?: any[] | string
  subtotal_price?: number
  total_tax?: number
  total_discounts?: number
  payment_gateway_names?: string[]
  order_items?: OrderItem[]
  order_note?: string | null
  customer_note?: string | null
}

const statusLabels: Record<string, { label: string; icon: React.ComponentType<any>; color: string; bgColor: string }> =
  {
    assigned: {
      label: "مكلف",
      icon: Clock,
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-200",
    },
    delivered: {
      label: "تم التوصيل",
      icon: Check,
      color: "text-green-700",
      bgColor: "bg-green-50 border-green-200",
    },
    canceled: {
      label: "ملغي",
      icon: X,
      color: "text-red-700",
      bgColor: "bg-red-50 border-red-200",
    },
    partial: {
      label: "جزئي",
      icon: Clock,
      color: "text-yellow-700",
      bgColor: "bg-yellow-50 border-yellow-200",
    },
    hand_to_hand: {
      label: "استبدال",
      icon: RefreshCw,
      color: "text-purple-700",
      bgColor: "bg-purple-50 border-purple-200",
    },
    return: {
      label: "مؤجل",
      icon: Truck,
      color: "text-orange-700",
      bgColor: "bg-orange-50 border-orange-200",
    },
    receiving_part: {
      label: "استلام قطعه",
      icon: HandMetal,
      color: "text-indigo-700",
      bgColor: "bg-indigo-50 border-indigo-200",
    },
  }

// Collection methods for courier's choice in modal (disabled per request)
const collectionMethodsForCourier: Record<string, string> = {}

// Modified payment sub-types for courier's choice in modal
const paymentSubTypesForCourier: Record<string, string> = {
  on_hand: "نقداً",
  instapay: "إنستاباي",
  wallet: "المحفظة",
  visa_machine: "ماكينة فيزا",
  paymob: "باي موب",
}

// Full collection methods for display purposes
const allCollectionMethods: Record<string, string> = {
  paymob: "باي موب",
  valu: "فاليو",
  courier: "المندوب",
  fawry: "فوري",
  instapay: "إنستاباي",
  vodafone_cash: "فودافون كاش",
  orange_cash: "أورانج كاش",
  we_pay: "وي باي",
}

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = "dclsvvfu2"
const CLOUDINARY_UPLOAD_PRESET = "hebaaa"
const SUPABASE_BUCKET = "order-proofs"

// Utility function to render notes with clickable links
const renderNotesWithLinks = (notes: string, isInModal: boolean = false) => {
  // Regular expression to detect URLs (including Google Maps links)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Split the text by URLs and map each part
  const parts = notes.split(urlRegex);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (urlRegex.test(part)) {
      // Determine if it's a Google Maps link
      const isGoogleMaps = part.includes('maps.google.com') || part.includes('goo.gl/maps') || part.includes('maps.app.goo.gl');
      
      // Different styling for modal vs regular display
      const linkClasses = isInModal 
        ? `underline hover:no-underline transition-all duration-200 break-all ${
            isGoogleMaps 
              ? 'text-blue-200 hover:text-blue-50 font-medium' 
              : 'text-blue-100 hover:text-blue-50'
          }`
        : `underline hover:no-underline transition-all duration-200 break-all ${
            isGoogleMaps 
              ? 'text-blue-600 hover:text-blue-800 font-medium' 
              : 'text-blue-500 hover:text-blue-700'
          }`;
      
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClasses}
          title={isGoogleMaps ? "فتح في خرائط جوجل" : "فتح الرابط"}
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click
            // Don't prevent default - allow link to open
          }}
          onFocus={(e) => {
            // Prevent scroll when link gets focus
            e.currentTarget.scrollIntoView = () => {}; // Override scrollIntoView
          }}
        >
          {isGoogleMaps ? "📍 " + part : part}
        </a>
      );
    }
    
    // Return regular text
    return part;
  });
};

const OrdersList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [phoneOptionsOpen, setPhoneOptionsOpen] = useState(false)
  const [phonePosition, setPhonePosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  // Initialize isMobile based on window width (check if window is available for SSR)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640
    }
    return false
  })
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const cardPositionRef = useRef<{ top: number; left: number; width: number; height: number } | null>(null)
  const modalContainerRef = useRef<HTMLDivElement | null>(null)
  const windowScrollRef = useRef<number>(0)
  const touchStartYRef = useRef<number | null>(null)
  // Track orders we just updated to prevent real-time subscription from causing double updates
  const recentlyUpdatedOrderIds = useRef<Set<string>>(new Set())
  // Track orders modified by courier (persisted in localStorage)
  const storedModifiedOrderIds = useRef<Set<string>>(new Set())
  // Track which order cards have already been animated to prevent re-animation on updates
  const animatedOrderIds = useRef<Set<string>>(new Set())

  // Routing helpers
  const navigate = useNavigate()
  const { orderId: routeOrderId } = useParams()

  // Track window size for responsive positioning
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load persisted modified orders
  useEffect(() => {
    try {
      const raw = localStorage.getItem("courierModifiedOrders")
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          storedModifiedOrderIds.current = new Set(arr.map(String))
        }
      }
    } catch (e) {
      console.warn("Failed to load courierModifiedOrders from localStorage", e)
    }
  }, [])

  // Body scroll lock disabled for stability on mobile


  // Helper function to get today's date in YYYY-MM-DD format (local timezone)
  const getTodayDateString = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = (today.getMonth() + 1).toString().padStart(2, "0")
    const day = today.getDate().toString().padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString())
  const [updateData, setUpdateData] = useState({
    status: "",
    delivery_fee: "",
    partial_paid_amount: "",
    internal_comment: "",
    payment_sub_type: "",
    collected_by: "",
  })
  const [imageUploading, setImageUploading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState<string[]>([]) // Track which images are uploading
  const [saving, setSaving] = useState(false)
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null)
  const [duplicatingOrderId, setDuplicatingOrderId] = useState<string | null>(null)
  const [imageUploadSuccess, setImageUploadSuccess] = useState(false)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const { user } = useAuth()

  // Scroll preservation disabled for mobile stability
  const modalScroll = useMemo(() => ({
    restoreScroll: () => {},
    saveScroll: () => {},
    hasSavedPosition: () => false,
    containerRef: { current: null } as any,
  }), [])

  // Compute a top padding for the modal so it appears close to the clicked card
  const modalTopOffset = useMemo(() => {
    if (!cardPosition || typeof window === 'undefined') return 24
    const viewportTop = cardPosition.top - window.scrollY
    const viewportHeight = window.innerHeight || 0
    // Keep the modal within viewport while staying near the card
    const minOffset = 16
    const maxOffset = Math.max(viewportHeight - 360, 24)
    return Math.min(Math.max(viewportTop - 12, minOffset), maxOffset)
  }, [cardPosition])

  // Close image modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && imageModalOpen) {
        setImageModalOpen(false)
        setSelectedImage(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [imageModalOpen])

  // Close order modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) {
        setModalOpen(false)
        setSelectedOrder(null)
        setCardPosition(null)
        if (cardPositionRef.current) {
          cardPositionRef.current = null
        }
        // Restore body scroll
        const scrollY = document.body.style.top
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
        if (scrollY) {
          const savedScrollY = parseInt(scrollY.replace('px', '') || '0') * -1
          window.scrollTo(0, savedScrollY)
        }
      }
    }
    if (modalOpen) {
      window.addEventListener('keydown', handleEscape)
    }
    return () => window.removeEventListener('keydown', handleEscape)
  }, [modalOpen])

  // Helper: initialize selected order and form data
  const initializeOrderState = (order: Order) => {
    const method = normalizeMethod(order.payment_method)
    const isOrderOriginallyPaidOnline = isOrderPaid(order)

    let initialDeliveryFee = order.delivery_fee?.toString() || ""
    let initialPartialPaidAmount = order.partial_paid_amount?.toString() || ""
    let initialCollectedBy = order.collected_by || ""
    let initialPaymentSubType = order.payment_sub_type || ""

    if (
      order.status === "return" ||
      (order.status === "receiving_part" && !order.delivery_fee && !order.partial_paid_amount)
    ) {
      initialDeliveryFee = "0"
      initialPartialPaidAmount = "0"
      initialCollectedBy = ""
      initialPaymentSubType = ""
    } else if (isOrderOriginallyPaidOnline && !order.delivery_fee && !order.partial_paid_amount) {
      initialCollectedBy = method
      initialPaymentSubType = ""
    } else if (!isOrderOriginallyPaidOnline && !isOrderPaid(order) && order.status !== "canceled") {
      initialCollectedBy = "courier"
    } else if (order.status === "canceled" && (order.delivery_fee || order.partial_paid_amount)) {
      initialCollectedBy = "courier"
    } else if (order.status === "canceled" && !order.delivery_fee && !order.partial_paid_amount) {
      initialCollectedBy = ""
      initialPaymentSubType = ""
    }

    setSelectedOrder(order)
    setUpdateData({
      status: order.status,
      delivery_fee: initialDeliveryFee,
      partial_paid_amount: initialPartialPaidAmount,
      internal_comment: order.internal_comment || "",
      collected_by: initialCollectedBy,
      payment_sub_type: initialPaymentSubType,
    })
  }

  // When modal opens, position it EXACTLY at card location
  useEffect(() => {
    if (modalOpen && (cardPositionRef.current || cardPosition)) {
      // Use multiple RAFs to ensure DOM is fully ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = modalContainerRef.current || document.querySelector('[data-modal-container]') as HTMLElement | null
          if (container) {
            container.scrollTop = 0
            
            const pos = cardPositionRef.current || cardPosition
            if (pos && typeof window !== 'undefined') {
              // Use absolute coordinates (relative to page scroll) and place container absolutely inside backdrop
              const finalTop = pos.top
              container.style.top = `${finalTop}px`
              container.style.left = '50%'
              container.style.transform = 'translateX(-50%)'
              container.style.position = 'absolute'
              container.style.maxHeight = '90vh'
              container.style.width = 'calc(100% - 16px)'
              container.style.maxWidth = '768px'
              container.style.zIndex = '1000'
              container.style.marginBottom = '24px'
              container.style.backgroundColor = 'white'
              container.style.borderRadius = '1rem'
              container.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              container.style.border = '1px solid #e5e7eb'
              container.style.overflow = 'hidden'
              container.style.display = 'flex'
              container.style.flexDirection = 'column'
              // Auto-scroll the backdrop so the modal is in view
              const backdrop = container.parentElement
              if (backdrop) {
                const targetScroll = Math.max(0, finalTop - 24)
                backdrop.scrollTop = targetScroll
              }
              console.log('🎯 Modal positioned:', {
                cardTop: pos.top,
                finalTop: finalTop
              })
            }
          }
          const content = document.querySelector('[data-modal-content]') as HTMLElement | null
          if (content) content.scrollTop = 0
        })
      })
    }
  }, [modalOpen, cardPosition])

  // COMPLETELY DISABLED - Do not scroll modal to top at all
  // This was causing the modal to scroll up when interacting with form elements
  // const hasScrolledToTopRef = useRef<string | null>(null)
  // useEffect(() => {
  //   ... disabled scroll to top
  // }, [modalOpen, selectedOrder?.id])


  // Fetch orders when user or date changes
  useEffect(() => {
    if (user?.id) {
      // Clear animated orders when date changes so new orders can animate
      animatedOrderIds.current.clear()
      // Only show full loading on initial load, date changes use subtle refresh
      fetchOrders(false, isInitialLoad)
      if (isInitialLoad) {
        setIsInitialLoad(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedDate])

  // If we land on /courier/orders/:orderId, auto-open that order (fallback position near top)
  useEffect(() => {
    if (!routeOrderId || orders.length === 0) return
    const target = orders.find((o) => o.id === routeOrderId)
    if (target) {
      cardPositionRef.current = { top: 16, left: 0, width: 0, height: 0 }
      setCardPosition(cardPositionRef.current)
      initializeOrderState(target)
      setModalOpen(true)
    }
  }, [routeOrderId, orders])

  // Mark orders as animated after they render (prevent re-animation on updates)
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    orders.forEach(order => {
      if (!animatedOrderIds.current.has(order.id)) {
        // Mark as animated after a short delay (allows animation to start)
        const timer = setTimeout(() => {
          animatedOrderIds.current.add(order.id)
        }, 400) // Slightly longer than animation duration (300ms)
        timers.push(timer)
      }
    })
    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [orders])

  // Real-time subscription for order assignments - optimized to update specific orders
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('courier-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `assigned_courier_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Order change detected:', payload)
          
          // Ignore updates for orders we just updated ourselves (prevent double updates)
          if (payload.eventType === 'UPDATE' && payload.new) {
            const orderId = payload.new.id
            if (recentlyUpdatedOrderIds.current.has(orderId)) {
              console.log('Ignoring subscription update for order we just updated:', orderId)
              // Remove from set after a short delay to allow future updates
              setTimeout(() => {
                recentlyUpdatedOrderIds.current.delete(orderId)
              }, 2000)
              return
            }
            
            setOrders(prevOrders => {
              const orderIndex = prevOrders.findIndex(o => o.id === payload.new.id)
              if (orderIndex >= 0) {
                const currentOrder = prevOrders[orderIndex]
                // Only update if there are actual changes to prevent unnecessary re-renders
                const hasChanges = Object.keys(payload.new).some(key => {
                  const newValue = payload.new[key]
                  const currentValue = currentOrder[key as keyof Order]
                  // Compare values, handling dates and nulls
                  if (newValue === null && currentValue === null) return false
                  if (newValue === currentValue) return false
                  // For dates, compare timestamps
                  if (key === 'updated_at' || key === 'created_at') {
                    const newTime = new Date(newValue).getTime()
                    const currentTime = new Date(currentValue as string).getTime()
                    // Ignore if difference is less than 1 second (likely same update)
                    return Math.abs(newTime - currentTime) > 1000
                  }
                  return true
                })
                
                if (!hasChanges) {
                  console.log('No changes detected, skipping update for order:', orderId)
                  return prevOrders
                }
                
                // Update existing order smoothly without causing visual glitches
                const updatedOrders = [...prevOrders]
                updatedOrders[orderIndex] = { ...currentOrder, ...payload.new }
                return updatedOrders
              }
              // If order not found and it's assigned to this courier, add it
              if (payload.new.assigned_courier_id === user.id) {
                return [...prevOrders, payload.new as Order]
              }
              return prevOrders
            })
          } else if (payload.eventType === 'INSERT' && payload.new && payload.new.assigned_courier_id === user.id) {
            // Add new order if it's assigned to this courier
            setOrders(prevOrders => {
              // Check if order already exists
              if (prevOrders.some(o => o.id === payload.new.id)) {
                return prevOrders
              }
              return [payload.new as Order, ...prevOrders]
            })
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted order
            setOrders(prevOrders => prevOrders.filter(o => o.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Scroll preservation disabled for stability


  // Enhanced payment detection function
  const isOrderPaid = (order: Order) => {
    // First check if payment_status is explicitly set
    if (order.payment_status) {
      return order.payment_status === "paid"
    }

    // Fallback to payment method analysis
    const method = order.payment_method?.toLowerCase() || ""

    // Payment gateways and online payments (PAID)
    if (method.includes("paymob") || method.includes("pay mob")) return true
    if (method.includes("valu") || method.includes("val u")) return true
    if (method.includes("fawry")) return true
    if (method.includes("instapay") || method.includes("insta pay")) return true
    if (method.includes("vodafone cash") || method.includes("vodafone-cash")) return true
    if (method.includes("orange cash") || method.includes("orange-cash")) return true
    if (method.includes("we pay") || method.includes("we-pay") || method.includes("wepay")) return true

    // Card payments (PAID)
    if (
      method.includes("visa") ||
      method.includes("mastercard") ||
      method.includes("amex") ||
      method.includes("discover")
    )
      return true
    if (method.includes("card") || method.includes("credit") || method.includes("debit")) return true

    // International payment gateways (PAID)
    if (
      method.includes("paypal") ||
      method.includes("stripe") ||
      method.includes("square") ||
      method.includes("razorpay")
    )
      return true

    // Status-based detection (PAID)
    if (
      method.includes("paid") ||
      method.includes("completed") ||
      method.includes("successful") ||
      method.includes("success")
    )
      return true

    // Cash on delivery and failed payments are NOT paid
    if (method.includes("cash") || method.includes("cod") || method.includes("cash on delivery")) return false
    if (
      method.includes("failed") ||
      method.includes("cancelled") ||
      method.includes("declined") ||
      method.includes("rejected")
    )
      return false

    // If we can't identify it clearly, check if it's not explicitly cash/cod
    // This is a conservative approach - assume paid unless explicitly cash/cod
    return !method.includes("cash") && !method.includes("cod") && method.length > 0
  }

  // Updated normalize method function
  const normalizeMethod = (method: string) => {
    if (!method) return "cash"
    const m = method.toLowerCase()

    if (m.includes("paymob")) {
      if (m.includes("valu")) return "valu"
      return "paymob"
    }
    if (m.includes("valu")) return "valu"
    if (m.includes("fawry")) return "fawry"
    if (m.includes("instapay")) return "instapay"
    if (m.includes("vodafone cash")) return "vodafone_cash"
    if (m.includes("orange cash")) return "orange_cash"
    if (m.includes("we pay")) return "we_pay"

    // All card payments (visa, mastercard, etc.) should be categorized as paymob
    if (
      m.includes("visa") ||
      m.includes("mastercard") ||
      m.includes("card") ||
      m.includes("credit") ||
      m.includes("debit")
    )
      return "paymob"

    if (m.includes("cash") || m.includes("cod")) return "cash"

    return method
  }

  // Helper function to format date in Arabic
  const formatDateInArabic = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "اليوم"
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "أمس"
    }

    const arabicDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    const arabicMonths = [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ]

    const dayName = arabicDays[date.getDay()]
    const day = date.getDate()
    const month = arabicMonths[date.getMonth()]
    const year = date.getFullYear()

    return `${dayName} ${day} ${month} ${year}`
  }

  // Helper function to format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Navigation functions
  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() - 1)
    setSelectedDate(currentDate.toISOString().split("T")[0])
  }

  const goToNextDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + 1)
    setSelectedDate(currentDate.toISOString().split("T")[0])
  }

  const goToToday = () => {
    setSelectedDate(getTodayDateString())
  }

  // Helper function to check if order was edited by courier
  const wasOrderEditedByCourier = (order: Order) => {
    return order.updated_at !== order.created_at
  }

  // Helper function to extract numeric part from order_id for sorting
  const getOrderNumber = (orderId: string) => {
    const match = orderId.match(/\d+/)
    return match ? Number.parseInt(match[0], 10) : 0
  }

  const fetchOrders = useCallback(async (showRefreshing = false, showFullLoading = true, dateOverride?: string) => {
    if (!user?.id) {
      console.error("User not authenticated")
      setLoading(false)
      return
    }

    // Only show full loading screen on initial load or explicit refresh
    // Date changes should show subtle loading indicator
    if (showRefreshing) {
      setRefreshing(true)
    } else if (showFullLoading) {
      setLoading(true)
    }
    try {
      const dateToUse = dateOverride || selectedDate
      const startDate = new Date(dateToUse)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(dateToUse)
      endDate.setHours(23, 59, 59, 999)

      // Get orders assigned to this courier on the selected date
      // Primary filter: assigned_at (when order was assigned to courier)
      // Fallback: created_at (for legacy rows without assigned_at)
      
      // Primary: assigned_at in range
      const { data: assignedAtOrders, error: assignedAtError } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_courier_id", user.id)
        .gte("assigned_at", startDate.toISOString())
        .lte("assigned_at", endDate.toISOString())
        .order("assigned_at", { ascending: false })

      // Fallback: created_at in range for rows without assigned_at (legacy)
      const { data: createdAtOrders, error: createdAtError } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_courier_id", user.id)
        .is("assigned_at", null)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false })

      // Merge results
      const orderMap = new Map<string, any>()
      for (const order of (assignedAtOrders || [])) {
        orderMap.set(order.id, order)
      }
      if (createdAtError) {
        console.warn("Error fetching created_at fallback orders:", createdAtError)
      }
      for (const order of (createdAtOrders || [])) {
        if (!orderMap.has(order.id)) {
          orderMap.set(order.id, order)
        }
      }

      const allOrders = Array.from(orderMap.values())

      // Fetch order_proofs and order_items separately for all order IDs
      if (allOrders.length > 0) {
        const orderIds = allOrders.map(order => order.id)
        
        // Fetch order proofs
        const { data: orderProofs, error: proofsError } = await supabase
          .from("order_proofs")
          .select("id, order_id, image_data")
          .in("order_id", orderIds)

        if (proofsError) {
          console.warn("Error fetching order proofs:", proofsError)
        } else if (orderProofs) {
          // Merge proofs into orders
          const proofsMap = new Map<string, OrderProof[]>()
          orderProofs.forEach((proof: any) => {
            if (!proofsMap.has(proof.order_id)) {
              proofsMap.set(proof.order_id, [])
            }
            proofsMap.get(proof.order_id)!.push({
              id: proof.id,
              image_data: proof.image_data
            })
          })
          allOrders.forEach(order => {
            order.order_proofs = proofsMap.get(order.id) || []
          })
        }

        // Fetch order items (products)
        const { data: orderItems, error: itemsError } = await supabase
          .from("order_items")
          .select("id, order_id, title, variant_title, quantity, price, sku, image_url, vendor, product_type, is_removed, properties")
          .in("order_id", orderIds)

        if (itemsError) {
          console.warn("Error fetching order items:", itemsError)
        } else if (orderItems) {
          // Merge items into orders
          const itemsMap = new Map<string, OrderItem[]>()
          orderItems.forEach((item: any) => {
            if (!itemsMap.has(item.order_id)) {
              itemsMap.set(item.order_id, [])
            }
            itemsMap.get(item.order_id)!.push({
              id: item.id,
              title: item.title,
              variant_title: item.variant_title,
              quantity: item.quantity,
              price: item.price,
              sku: item.sku,
              image_url: item.image_url,
              vendor: item.vendor,
              product_type: item.product_type,
              is_removed: item.is_removed,
              properties: item.properties,
            })
          })
          allOrders.forEach(order => {
            order.order_items = itemsMap.get(order.id) || []
          })
        }
      }

      // Sort by order number (numeric part of order_id)
      const sortedData = allOrders.sort((a: Order, b: Order) => {
        const isAAssigned = a.status === "assigned"
        const isBAssigned = b.status === "assigned"

        // First priority: assigned orders go to top
        if (isAAssigned && !isBAssigned) return -1
        if (!isAAssigned && isBAssigned) return 1

        // Second priority: sort by order number (ascending - lowest numbers first)
        const orderNumA = getOrderNumber(a.order_id)
        const orderNumB = getOrderNumber(b.order_id)
        return orderNumA - orderNumB
      })

      setOrders(sortedData)
    } catch (error: any) {
      console.error("Error fetching orders:", error)
      const errorMessage = error?.message || "حدث خطأ غير معروف"
      alert(`فشل تحميل الطلبات\n\n${errorMessage}\n\nيرجى المحاولة مرة أخرى أو تحديث الصفحة`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, selectedDate])

  const handlePhoneClick = (phoneNumber: string, sourceEvent?: React.MouseEvent) => {
    setSelectedPhoneNumber(phoneNumber)
    if (typeof window !== 'undefined' && sourceEvent?.currentTarget) {
      const el = sourceEvent.currentTarget as HTMLElement
      const rect = el.getBoundingClientRect()
      setPhonePosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      })
    } else {
      setPhonePosition(null)
    }
    setPhoneOptionsOpen(true)
  }

  const handlePhoneCall = () => {
    window.location.href = `tel:${selectedPhoneNumber}`
    setPhoneOptionsOpen(false)
  }

  const handleWhatsApp = () => {
    const cleanNumber = selectedPhoneNumber.replace(/\D/g, "")
    const whatsappNumber = cleanNumber.startsWith("20") ? cleanNumber : `20${cleanNumber}`
    window.open(`https://wa.me/${whatsappNumber}`, "_blank")
    setPhoneOptionsOpen(false)
  }

  const openModal = (order: Order, sourceEvent?: React.MouseEvent | React.TouchEvent | { currentTarget?: any }) => {
    // FIRST: Capture the card's EXACT viewport position BEFORE opening modal
    let capturedPosition: { top: number; left: number; width: number; height: number } | null = null
    
    if (typeof window !== 'undefined') {
      const eventTarget = sourceEvent && 'currentTarget' in sourceEvent ? (sourceEvent as any).currentTarget as HTMLElement | null : null
      const cardElement = eventTarget?.closest?.('[data-order-card]') as HTMLElement | null
      if (cardElement) {
        // Get the card's position INCLUDING scroll offset (absolute position in document)
        const rect = cardElement.getBoundingClientRect()
        capturedPosition = {
          top: rect.top + window.scrollY, // Add scroll offset for absolute position
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        }
        // Store position immediately in ref (synchronous)
        cardPositionRef.current = capturedPosition
        // Also set in state (async, but ref is already set)
        setCardPosition(capturedPosition)
        console.log('✅ Card position captured (with scroll):', capturedPosition, 'scrollY:', window.scrollY)
      } else {
        cardPositionRef.current = null
        setCardPosition(null)
      }
    } else {
      cardPositionRef.current = null
      setCardPosition(null)
    }

    initializeOrderState(order)
    // Open modal - ensure it happens
    console.log('Opening modal for order:', order.order_id)
    setModalOpen(true)

    // Ensure modal content starts at top without jumping the page scroll position
    requestAnimationFrame(() => {
      const container = document.querySelector('[data-modal-container]') as HTMLElement | null
      const content = document.querySelector('[data-modal-content]') as HTMLElement | null
      if (container) container.scrollTop = 0
      if (content) content.scrollTop = 0
    })
  }
    // DO NOT force scroll here - let the useEffect handle it once on open
  

  // Compress a single image (skip/soft-fail on unsupported types like HEIC to keep mobile uploads working)
  const compressImage = async (file: File): Promise<File> => {
    const mime = (file.type || "").toLowerCase()
    const isImage = mime.startsWith("image/")
    const isHeic = mime.includes("heic") || mime.includes("heif")

    // Many mobile galleries (especially iOS) return HEIC; canvas can't read it reliably.
    // In that case, just return the original file so the upload can proceed.
    if (!isImage || isHeic) return file

    // On mobile, if file is already small enough, skip compression to avoid issues
    if (file.size < 500000) { // Less than 500KB
      return file
    }

    try {
      return await Promise.race([
        new Promise<File>((resolve) => {
          const reader = new FileReader()
          let resolved = false

          const resolveWithOriginal = () => {
            if (!resolved) {
              resolved = true
              resolve(file)
            }
          }

          reader.onload = (event) => {
            if (resolved) return
            
            const img = new Image()
            img.crossOrigin = "anonymous"
            
            img.onload = () => {
              if (resolved) return
              
              try {
                const canvas = document.createElement("canvas")
                const MAX_WIDTH = 720
                const MAX_HEIGHT = 540

                let width = img.width
                let height = img.height

                if (width > height) {
                  if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width
                    width = MAX_WIDTH
                  }
                } else {
                  if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height
                    height = MAX_HEIGHT
                  }
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext("2d")
                if (!ctx) {
                  resolveWithOriginal()
                  return
                }

                ctx.drawImage(img, 0, 0, width, height)

                canvas.toBlob(
                  (blob) => {
                    if (resolved) return
                    if (blob) {
                      resolved = true
                      resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }))
                    } else {
                      resolveWithOriginal()
                    }
                  },
                  "image/jpeg",
                  0.85, // Higher quality for mobile
                )
              } catch (err) {
                console.warn("Canvas compression error:", err)
                resolveWithOriginal()
              }
            }
            
            img.onerror = () => {
              resolveWithOriginal()
            }
            
            try {
              img.src = event.target?.result as string
            } catch (err) {
              console.warn("Image src error:", err)
              resolveWithOriginal()
            }
          }
          
          reader.onerror = () => {
            resolveWithOriginal()
          }
          
          try {
            reader.readAsDataURL(file)
          } catch (err) {
            console.warn("FileReader error:", err)
            resolveWithOriginal()
          }
        }),
        // Timeout after 5 seconds to prevent hanging on mobile
        new Promise<File>((resolve) => {
          setTimeout(() => {
            console.warn("Image compression timeout, using original file")
            resolve(file)
          }, 5000)
        })
      ])
    } catch (err) {
      console.warn("Image compression failed, using original file", err)
      return file
    }
  }

  // Fallback upload to Supabase Storage if Cloudinary fails (helps some Android devices)
  const uploadToSupabaseStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
    const filePath = `${selectedOrder!.id}/${user!.id}/${fileName}`

    // Determine content type - important for mobile browsers
    let contentType = file.type || "image/jpeg"
    if (!contentType || contentType === "application/octet-stream") {
      // Fallback content type detection
      if (fileExt.toLowerCase() === "heic" || fileExt.toLowerCase() === "heif") {
        contentType = "image/heic"
      } else if (fileExt.toLowerCase() === "png") {
        contentType = "image/png"
      } else {
        contentType = "image/jpeg"
      }
    }

    try {
      const { error: uploadError } = await supabase.storage.from(SUPABASE_BUCKET).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: contentType,
      })
      
      if (uploadError) {
        console.error("Supabase upload error:", uploadError)
        throw new Error(uploadError.message || "فشل رفع الصورة إلى التخزين")
      }

      const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath)
      if (!urlData?.publicUrl) {
        throw new Error("فشل الحصول على رابط الصورة من سبابيز")
      }
      
      return urlData.publicUrl
    } catch (err: any) {
      console.error("Supabase storage error:", err)
      throw err
    }
  }

  // Upload a single image with Cloudinary primary + Supabase fallback
  const uploadSingleImage = async (file: File): Promise<OrderProof> => {
    console.log(`[v0] Starting upload for file: ${file.name}, size: ${file.size}, type: ${file.type}`)
    
    // Compress image with timeout protection
    let compressedFile: File
    try {
      compressedFile = await Promise.race([
        compressImage(file),
        new Promise<File>((resolve) => {
          setTimeout(() => {
            console.warn("[v0] Compression taking too long, using original file")
            resolve(file)
          }, 8000) // 8 second timeout
        })
      ])
      console.log(`[v0] Compression successful: ${compressedFile.size} bytes`)
    } catch (err) {
      console.warn("[v0] Compression error, using original file:", err)
      compressedFile = file
    }

    let imageUrl: string | null = null
    let lastError: any = null

    // Primary: Cloudinary (handles HEIC via /auto)
    try {
      const formData = new FormData()
      formData.append("file", compressedFile)
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)

      // Add timeout for mobile networks
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        console.log("[v0] Uploading to Cloudinary...")
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        
        const data = await res.json()
        if (!data.secure_url) {
          throw new Error(data?.error?.message || "فشل رفع الصورة على كلاودينارى")
        }
        imageUrl = data.secure_url
        console.log("[v0] Cloudinary upload successful:", imageUrl)
      } catch (fetchErr: any) {
        clearTimeout(timeoutId)
        if (fetchErr.name === 'AbortError') {
          throw new Error("انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.")
        }
        throw fetchErr
      }
    } catch (err) {
      lastError = err
      console.warn("[v0] Cloudinary upload failed, trying Supabase Storage...", err)
    }

    // Fallback: Supabase Storage (helps mobile uploads)
    if (!imageUrl) {
      try {
        console.log("[v0] Uploading to Supabase Storage...")
        imageUrl = await uploadToSupabaseStorage(compressedFile)
        console.log("[v0] Supabase upload successful:", imageUrl)
      } catch (err) {
        lastError = err
        console.warn("[v0] Supabase upload also failed:", err)
      }
    }

    if (!imageUrl) {
      const errorMsg = lastError?.message || lastError?.error?.message || "فشل رفع الصورة، برجاء المحاولة مرة أخرى"
      console.error("[v0] Upload failed with error:", errorMsg)
      throw new Error(errorMsg)
    }

    // Save to database
    console.log("[v0] Saving to database...")
    const { data: inserted, error } = await supabase.from("order_proofs").insert({
      order_id: selectedOrder!.id,
      courier_id: user!.id,
      image_data: imageUrl,
    }).select().single()

    if (error) {
      console.error("[v0] Database insert error:", error)
      throw new Error(error.message || "فشل حفظ الصورة في قاعدة البيانات")
    }

    if (!inserted) {
      throw new Error("لم يتم حفظ الصورة في قاعدة البيانات")
    }

    console.log("[v0] Image successfully saved with ID:", inserted.id)
    return {
      id: inserted.id,
      image_data: inserted.image_data || imageUrl,
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[v0] handleImageChange triggered", e.target, e.target.files)
    
    const target = e.target
    const files = target.files
    
    // Store files immediately before any async operations
    if (!files || files.length === 0) {
      // On mobile, sometimes files can be null if user cancels
      // Don't show alert in this case as it's expected behavior
      console.log("[v0] No files selected or user cancelled")
      return
    }
    
    console.log(`[v0] Files selected: ${files.length}`, Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type })))
    
    if (!selectedOrder || !user) {
      console.warn("[v0] No selected order or user", { selectedOrder: !!selectedOrder, user: !!user })
      alert("خطأ: لا يوجد طلب محدد أو مستخدم. يرجى تحديث الصفحة.")
      return
    }

    const fileArray = Array.from(files)
    if (fileArray.length === 0) {
      console.warn("[v0] File array is empty")
      return
    }

    console.log("[v0] Starting upload process...")
    setImageUploading(true)
    setUploadingImages(fileArray.map(f => f.name))
    const uploadedProofs: OrderProof[] = []
    const errors: string[] = []

    try {
      // Upload all images sequentially to avoid overwhelming the server
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        try {
          // Validate file before upload
          if (!file || file.size === 0) {
            errors.push(`${file.name}: ملف فارغ أو تالف`)
            setUploadingImages(prev => prev.filter(name => name !== file.name))
            continue
          }
          
          // Check file size (max 10MB for mobile)
          if (file.size > 10 * 1024 * 1024) {
            errors.push(`${file.name}: حجم الملف كبير جداً (الحد الأقصى 10MB)`)
            setUploadingImages(prev => prev.filter(name => name !== file.name))
            continue
          }
          
          const proof = await uploadSingleImage(file)
          uploadedProofs.push(proof)
          // Remove this file from uploading list
          setUploadingImages(prev => prev.filter(name => name !== file.name))
        } catch (error: any) {
          const errorMsg = error?.message || "خطأ غير معروف"
          errors.push(`${file.name}: ${errorMsg}`)
          console.error(`Error uploading ${file.name}:`, error)
          // Remove this file from uploading list even on error
          setUploadingImages(prev => prev.filter(name => name !== file.name))
        }
      }

      if (uploadedProofs.length > 0) {
        // Update the selected order with all new images
        // Use functional update to preserve reference stability
        setSelectedOrder((prev) => {
          if (!prev) return prev
          const existingProofs = prev.order_proofs || []
          if (uploadedProofs.length === 0) return prev
          return {
            ...prev,
            order_proofs: [...existingProofs, ...uploadedProofs],
          }
        })

        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrder.id
              ? {
                  ...o,
                  order_proofs: [
                    ...(o.order_proofs || []),
                    ...uploadedProofs,
                  ],
                }
              : o,
          ),
        )

        // Show success message
        setImageUploadSuccess(true)
        setTimeout(() => setImageUploadSuccess(false), 3000)
      }

      if (errors.length > 0) {
        const successMsg = uploadedProofs.length > 0 
          ? `تم رفع ${uploadedProofs.length} صورة بنجاح\n\n`
          : ""
        alert(`${successMsg}فشل رفع ${errors.length} صورة:\n${errors.join('\n')}`)
      } else if (uploadedProofs.length > 0) {
        // Success message will be shown by the success indicator
      } else {
        alert("لم يتم رفع أي صورة. يرجى المحاولة مرة أخرى.")
      }
    } catch (error: any) {
      console.error("Upload error:", error)
      alert("فشل الرفع: " + (error?.message || "خطأ غير معروف"))
    } finally {
      setImageUploading(false)
      setUploadingImages([])
      // Clear the file input to allow uploading the same files again if needed
      // Use setTimeout to ensure this happens after the event is fully processed
      setTimeout(() => {
        if (target) {
          target.value = ""
        }
      }, 100)
    }
  }

  const triggerFileInput = useCallback((type: "camera" | "gallery" = "gallery") => {
    if (imageUploading) {
      console.log("Upload in progress, ignoring click")
      return
    }

    const inputEl =
      type === "camera"
        ? (cameraInputRef.current || (document.getElementById("image-upload-camera") as HTMLInputElement | null))
        : (galleryInputRef.current || (document.getElementById("image-upload-gallery") as HTMLInputElement | null))

    if (!inputEl) {
      console.error(`File input not found for type: ${type}`)
      alert("خطأ: لم يتم العثور على حقل رفع الصور. يرجى تحديث الصفحة.")
      return
    }

    console.log(`Triggering file input for ${type}`, inputEl)

    // Reset value to ensure onChange fires even if the same file is re-selected
    inputEl.value = ""
    
    try {
      // Remove disabled attribute if present
      inputEl.removeAttribute('disabled')
      
      // For mobile: directly call click() without complex style manipulations
      // This is more reliable across different mobile browsers
      console.log("[v0] Triggering file input click for:", type)
      inputEl.click()
      
    } catch (err) {
      console.error("Error opening file input:", err)
      alert("خطأ في فتح حقل رفع الصور. يرجى المحاولة مرة أخرى.")
    }
  }, [imageUploading])

  const calculateTotalAmount = (order: Order, deliveryFee: number, partialAmount: number, currentStatus: string) => {
    if (currentStatus === "hand_to_hand" && deliveryFee === 0 && partialAmount === 0) {
      return 0
    }

    if (["canceled", "return", "hand_to_hand", "receiving_part"].includes(currentStatus)) {
      if (deliveryFee === 0 && partialAmount === 0) {
        return 0
      }
      return deliveryFee + partialAmount
    }

    if (currentStatus === "partial") {
      return partialAmount > 0 ? partialAmount : 0
    }

    return order.total_order_fees
  }

  const getOrderDiscountInfo = (order: Order) => {
    const parseLineItems = () => {
      if (!order.line_items) return []
      if (Array.isArray(order.line_items)) return order.line_items
      try {
        return JSON.parse(order.line_items) || []
      } catch {
        return []
      }
    }

    const items = order.order_items || []
    const lineItems = parseLineItems()
    const allItems = items.length > 0 ? items : lineItems

    const itemDiscountTotal = allItems.reduce((sum: number, item: any) => {
      const value = parseFloat(item?.total_discount ?? item?.discount ?? 0)
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0)

    const orderLevelDiscountRaw = order.total_discounts ?? 0
    const orderLevelDiscount = Number.isFinite(orderLevelDiscountRaw as number)
      ? Number(orderLevelDiscountRaw)
      : parseFloat(orderLevelDiscountRaw as any) || 0

    const amount = itemDiscountTotal > 0 ? itemDiscountTotal : orderLevelDiscount

    let subtotal =
      typeof order.subtotal_price === "number" && Number.isFinite(order.subtotal_price)
        ? order.subtotal_price
        : null

    if ((subtotal === null || subtotal === undefined || Number.isNaN(subtotal)) && allItems.length > 0) {
      subtotal = allItems.reduce((sum: number, item: any) => {
        const price = parseFloat(item?.price ?? 0)
        const qty = parseInt(item?.quantity ?? 1)
        const validPrice = Number.isFinite(price) ? price : 0
        const validQty = Number.isFinite(qty) ? qty : 0
        return sum + validPrice * (validQty || 1)
      }, 0)
    }

    const percentage = amount > 0 && subtotal && subtotal > 0 ? (amount / subtotal) * 100 : null

    return {
      amount,
      percentage,
      source: itemDiscountTotal > 0 ? "items" : "order",
    }
  }

  const getRemovedItemsInfo = (order: Order) => {
    const parseLineItems = () => {
      if (!order.line_items) return []
      if (Array.isArray(order.line_items)) return order.line_items
      try {
        return JSON.parse(order.line_items) || []
      } catch {
        return []
      }
    }

    const items = order.order_items || []
    const lineItems = parseLineItems()
    const allItems = items.length > 0 ? items : lineItems
    const removedItems = (allItems || []).filter(isOrderItemRemoved)

    const amount = removedItems.reduce((sum: number, item: any) => {
      const price = parseFloat(item?.price ?? 0)
      const qty = parseInt(item?.quantity ?? 1)
      const discount = parseFloat(item?.total_discount ?? item?.discount ?? 0)
      const validPrice = Number.isFinite(price) ? price : 0
      const validQty = Number.isFinite(qty) ? qty : 0
      const validDiscount = Number.isFinite(discount) ? discount : 0
      const lineTotal = Math.max(0, validPrice * (validQty || 1) - validDiscount)
      return sum + lineTotal
    }, 0)

    const quantity = removedItems.reduce((sum: number, item: any) => {
      const qty = parseInt(item?.quantity ?? 1)
      return sum + (Number.isFinite(qty) ? qty : 0)
    }, 0)

    return { amount, quantity, count: removedItems.length }
  }

  const getFulfillmentTotals = (order: Order) => {
    const parseLineItems = () => {
      if (!order.line_items) return []
      if (Array.isArray(order.line_items)) return order.line_items
      try {
        return JSON.parse(order.line_items) || []
      } catch {
        return []
      }
    }

    const rawLineItems = parseLineItems()
    const fulfillmentItems =
      rawLineItems && rawLineItems.length > 0 ? rawLineItems : (order.order_items || [])

    const removedTotal = fulfillmentItems.reduce((sum: number, i: any) => {
      if (!isOrderItemRemoved(i)) return sum
      const price = Number.parseFloat(i?.price ?? 0) || 0
      const qty = Number.parseInt(i?.quantity ?? 1) || 0
      const discount = Number.parseFloat(i?.total_discount ?? i?.discount ?? 0) || 0
      const lineTotal = Math.max(0, price * qty - discount)
      return sum + lineTotal
    }, 0)

    const fulfilledTotal = fulfillmentItems.reduce((sum: number, i: any) => {
      if (isOrderItemRemoved(i) || !isOrderItemFulfilled(i)) return sum
      const price = Number.parseFloat(i?.price ?? 0) || 0
      const qty = Number.parseInt(i?.quantity ?? 1) || 1
      const discount = Number.parseFloat(i?.total_discount ?? i?.discount ?? 0) || 0
      const lineTotal = Math.max(0, price * qty - discount)
      return sum + lineTotal
    }, 0)

    const unfulfilledTotal = fulfillmentItems.reduce((sum: number, i: any) => {
      if (isOrderItemRemoved(i) || isOrderItemFulfilled(i)) return sum
      const price = Number.parseFloat(i?.price ?? 0) || 0
      const qty = Number.parseInt(i?.quantity ?? 1) || 1
      const discount = Number.parseFloat(i?.total_discount ?? i?.discount ?? 0) || 0
      const lineTotal = Math.max(0, price * qty - discount)
      return sum + lineTotal
    }, 0)

    return { fulfilledTotal, unfulfilledTotal, removedTotal }
  }

  const isOrderItemRemoved = (i: any) =>
    i?.is_removed === true ||
    Number(i?.quantity) === 0 ||
    i?.properties?._is_removed === true ||
    i?.properties?._is_removed === 'true'

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

  const isOrderItemUnfulfilled = (i: any) => {
    return !isOrderItemFulfilled(i)
  }

  const handleSaveUpdate = async () => {
    if (!selectedOrder) return

    setSaving(true)
    setUpdatingOrderId(selectedOrder.id)
    
    // Store original order for rollback
    const originalOrder = { ...selectedOrder }
    
    try {
      const method = normalizeMethod(selectedOrder.payment_method)
      const isOrderOriginallyPaidOnline = isOrderPaid(selectedOrder)
      const isOrderUnpaid = !isOrderPaid(selectedOrder)

      const updatePayload: any = {
        status: updateData.status,
        updated_at: new Date().toISOString(),
        // Preserve paid state/method by default (especially for online paid orders)
        payment_status: selectedOrder.payment_status || (isOrderOriginallyPaidOnline ? "paid" : selectedOrder.payment_status),
        payment_method: selectedOrder.payment_method,
      }

      let fee = Number.parseFloat(updateData.delivery_fee) || 0
      let partial = Number.parseFloat(updateData.partial_paid_amount) || 0

      const isReturnStatus = updateData.status === "return"
      const isReceivingPartWithNoFees = updateData.status === "receiving_part" && fee === 0 && partial === 0
      const isHandToHandWithNoFees = updateData.status === "hand_to_hand" && fee === 0 && partial === 0
      const isCanceledWithNoFees = updateData.status === "canceled" && fee === 0 && partial === 0

      if (isReturnStatus || isReceivingPartWithNoFees || isCanceledWithNoFees) {
        fee = 0
        partial = 0
        updatePayload.collected_by = null
        updatePayload.payment_sub_type = null
        // Keep payment_status as paid if it was originally paid online
        if (isOrderOriginallyPaidOnline) {
          updatePayload.payment_status = "paid"
          updatePayload.payment_method = selectedOrder.payment_method
        }
      }

      updatePayload.delivery_fee = fee
      updatePayload.partial_paid_amount = partial

      if (updateData.internal_comment?.trim()) {
        updatePayload.internal_comment = updateData.internal_comment.trim()
      }

      if (
        ["partial", "canceled", "delivered", "hand_to_hand", "return", "receiving_part"].includes(updateData.status)
      ) {
        if (isReturnStatus || isReceivingPartWithNoFees || isCanceledWithNoFees) {
          // Already handled above
        } else if (isHandToHandWithNoFees) {
          updatePayload.collected_by = null
          updatePayload.payment_sub_type = null
        } else if (isOrderOriginallyPaidOnline) {
          // Allow courier to change payment type even for paid orders (e.g., client pays cash)
          if (updateData.collected_by || updateData.payment_sub_type) {
            // If courier selected a payment method, use it
            if (updateData.collected_by === "courier" && updateData.payment_sub_type) {
              updatePayload.collected_by = updateData.collected_by
              updatePayload.payment_sub_type = updateData.payment_sub_type
            } else if (updateData.collected_by) {
              updatePayload.collected_by = updateData.collected_by
              updatePayload.payment_sub_type = updateData.payment_sub_type || null
            } else {
              // Keep original payment method if no change
              updatePayload.collected_by = method
              updatePayload.payment_sub_type = null
            }
          } else if (fee > 0 || partial > 0) {
            // Order is already paid; if courier didn't choose method, default to paymob and keep paid state
            updatePayload.collected_by = "paymob"
            updatePayload.payment_sub_type = null
            updatePayload.payment_method = "paymob"
            updatePayload.payment_status = "paid"
          } else {
            // Order is paid, no fees, no payment type change - keep original
            updatePayload.collected_by = method
            updatePayload.payment_sub_type = null
            updatePayload.payment_status = "paid"
            updatePayload.payment_method = selectedOrder.payment_method
          }
        } else if (updateData.status === "canceled" && fee > 0) {
          if (!updateData.payment_sub_type) {
            alert("يرجى اختيار نوع الدفع الفرعي للمندوب عند إضافة رسوم التوصيل لطلب ملغي.")
            setSaving(false)
            setUpdatingOrderId(null)
            return
          }
          updatePayload.collected_by = "courier"
          updatePayload.payment_sub_type = updateData.payment_sub_type
        } else if (isOrderUnpaid) {
          // For unpaid orders, if payment type is selected, use it; otherwise order is still considered paid if originally paid
          if (updateData.payment_sub_type) {
            updatePayload.collected_by = "courier"
            updatePayload.payment_sub_type = updateData.payment_sub_type
          } else if (updateData.collected_by) {
            // If collected_by is set but no payment_sub_type, use collected_by
            updatePayload.collected_by = updateData.collected_by
            updatePayload.payment_sub_type = null
          } else {
            // If no payment type selected, order is still considered paid (if originally paid)
            // Otherwise, leave as null
            updatePayload.collected_by = null
            updatePayload.payment_sub_type = null
          }
        } else if (fee > 0 || partial > 0) {
          // For receiving_part status, payment method is conditional
          if (updateData.status === "receiving_part") {
            // If courier added amounts, payment method is required
            const collected = updateData.collected_by
            if (!collected) {
              alert("يرجى اختيار طريقة تحصيل عند إضافة رسوم التوصيل.")
              setSaving(false)
              setUpdatingOrderId(null)
              return
            }
            if (collected === "courier") {
              if (!updateData.payment_sub_type) {
                alert("يرجى اختيار نوع الدفع الفرعي للمندوب.")
                setSaving(false)
                setUpdatingOrderId(null)
                return
              }
              updatePayload.collected_by = collected
              updatePayload.payment_sub_type = updateData.payment_sub_type
            } else {
              updatePayload.collected_by = collected
              updatePayload.payment_sub_type = null
            }
          } else {
            // For other statuses, payment method is always required
            const collected = updateData.collected_by
            if (!collected) {
              alert("يرجى اختيار طريقة تحصيل عند إضافة رسوم التوصيل.")
              setSaving(false)
              setUpdatingOrderId(null)
              return
            }
            if (collected === "courier") {
              if (!updateData.payment_sub_type) {
                alert("يرجى اختيار نوع الدفع الفرعي للمندوب.")
                setSaving(false)
                setUpdatingOrderId(null)
                return
              }
              updatePayload.collected_by = collected
              updatePayload.payment_sub_type = updateData.payment_sub_type
            } else {
              updatePayload.collected_by = collected
              updatePayload.payment_sub_type = null
            }
          }
        } else if (updateData.status === "receiving_part" && fee === 0 && partial === 0) {
          // For receiving_part with no amounts, no payment method required
          updatePayload.collected_by = null
          updatePayload.payment_sub_type = null
        } else {
          updatePayload.collected_by = null
          updatePayload.payment_sub_type = null
        }
      } else {
        updatePayload.collected_by = null
        updatePayload.payment_sub_type = null
      }

      // Update payment_method based on collected_by and payment_sub_type
      // If courier changed payment type, update payment_method accordingly
      if (updatePayload.collected_by === "courier" && updatePayload.payment_sub_type) {
        // Map payment_sub_type to payment_method
        const paymentMethodMap: Record<string, string> = {
          "on_hand": "cash",
          "instapay": "instapay",
          "wallet": "wallet",
          "visa_machine": "card",
          "paymob": "paymob",
        }
        updatePayload.payment_method = paymentMethodMap[updatePayload.payment_sub_type] || selectedOrder.payment_method
      } else if (updatePayload.collected_by && updatePayload.collected_by !== "courier") {
        // For non-courier collection methods, map to payment_method
        const collectionMethodMap: Record<string, string> = {
          "paymob": "paymob",
          "valu": "valu",
          "fawry": "paid",
          "instapay": "instapay",
          "vodafone_cash": "paid",
          "orange_cash": "paid",
          "we_pay": "paid",
        }
        updatePayload.payment_method = collectionMethodMap[updatePayload.collected_by] || selectedOrder.payment_method
      } else if (!updatePayload.collected_by && !updatePayload.payment_sub_type) {
        // If both are cleared, keep original payment_method (don't change it)
        // This ensures that if courier/admin clears payment type, we don't accidentally change payment_method
      }

      // Mark this order as recently updated to prevent real-time subscription from causing double updates
      recentlyUpdatedOrderIds.current.add(selectedOrder.id)

      // Optimistically update the UI immediately without re-sorting to prevent jarring UX
      setOrders(prevOrders => {
        return prevOrders.map(order =>
          order.id === selectedOrder.id
            ? { ...order, ...updatePayload, updated_at: new Date().toISOString() }
            : order
        )
      })

      // Close modal immediately for better UX and clear position
      setModalOpen(false)
      setSelectedOrder(null)
      setCardPosition(null)
      if (cardPositionRef.current) {
        cardPositionRef.current = null
      }
      // Restore body scroll
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''

      // Then update the database
      const { error } = await supabase.from("orders").update(updatePayload).eq("id", selectedOrder.id)

      if (error) {
        // Rollback on error
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === selectedOrder.id ? originalOrder : order
          )
        )
        console.error("Supabase error:", error.message)
        alert("خطأ في الحفظ: " + error.message)
        setSaving(false)
        setUpdatingOrderId(null)
        return
      }

      // Persist modified marker locally so it survives reload
      try {
        storedModifiedOrderIds.current.add(selectedOrder.id)
        const arr = Array.from(storedModifiedOrderIds.current)
        localStorage.setItem("courierModifiedOrders", JSON.stringify(arr))
      } catch (e) {
        console.warn("Failed to persist courierModifiedOrders", e)
      }

      // Success - no need to refetch, already updated optimistically
    } catch (error: any) {
      // Rollback on error
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === selectedOrder.id ? originalOrder : order
        )
      )
      alert("خطأ: " + error.message)
    } finally {
      setSaving(false)
      setUpdatingOrderId(null)
    }
  }

  const getStatusInfo = (status: string) => {
    return (
      statusLabels[status] || {
        label: status,
        icon: Clock,
        color: "text-gray-700",
        bgColor: "bg-gray-50 border-gray-200",
      }
    )
  }

  const canEditOrder = (order: Order) => {
    return ["assigned", "partial", "delivered", "hand_to_hand", "return", "canceled", "receiving_part"].includes(order.status)
  }

  // Helper function to get display payment method
  const getDisplayPaymentMethod = (order: Order) => {
    const method = normalizeMethod(order.payment_method)

    // If collected_by and payment_sub_type are set, prioritize them for display
    if (order.collected_by && allCollectionMethods[order.collected_by]) {
      if (
        order.collected_by === "courier" &&
        order.payment_sub_type &&
        paymentSubTypesForCourier[order.payment_sub_type]
      ) {
        return paymentSubTypesForCourier[order.payment_sub_type]
      }

      // If collected_by is set but no sub-type (e.g., for online payments or non-courier collection)
      if (order.collected_by === "valu") return `${allCollectionMethods.valu} (مدفوع)`
      if (order.collected_by === "paymob") return `${allCollectionMethods.paymob} (مدفوع)`
      if (order.collected_by === "fawry") return `${allCollectionMethods.fawry} (مدفوع)`
      if (order.collected_by === "instapay") return `${allCollectionMethods.instapay} (مدفوع)`
      if (order.collected_by === "vodafone_cash") return `${allCollectionMethods.vodafone_cash} (مدفوع)`
      if (order.collected_by === "orange_cash") return `${allCollectionMethods.orange_cash} (مدفوع)`
      if (order.collected_by === "we_pay") return `${allCollectionMethods.we_pay} (مدفوع)`

      return allCollectionMethods[order.collected_by]
    }

    // Fallback to original payment method if no collected_by is set
    if (method === "valu") {
      return `${allCollectionMethods.valu} (مدفوع)`
    }
    if (method === "paymob") {
      return `${allCollectionMethods.paymob} (مدفوع)`
    }
    if (method === "fawry") {
      return `${allCollectionMethods.fawry} (مدفوع)`
    }
    if (method === "instapay") {
      return `${allCollectionMethods.instapay} (مدفوع)`
    }
    if (method === "vodafone_cash") {
      return `${allCollectionMethods.vodafone_cash} (مدفوع)`
    }
    if (method === "orange_cash") {
      return `${allCollectionMethods.orange_cash} (مدفوع)`
    }
    if (method === "we_pay") {
      return `${allCollectionMethods.we_pay} (مدفوع)`
    }

    return order.payment_method === "cash_on_delivery" ? "الدفع عند الاستلام" : order.payment_method
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <Package className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">جاري تحميل الطلبات</h2>
            <p className="text-gray-600">يرجى الانتظار قليلاً...</p>
          </div>
        </div>
      </div>
    )
  }

const handleRemoveImage = async (id: string) => {
  if (!selectedOrder) return;
  if (!window.confirm("هل أنت متأكد من حذف هذه الصورة؟")) return;
  try {
    // Remove from Supabase
    const { error } = await supabase
      .from("order_proofs")
      .delete()
      .eq("id", id);
    if (error) throw error;
    // Remove from UI
    setSelectedOrder(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        order_proofs: (prev.order_proofs || []).filter(proof => proof.id !== id)
      };
    });
    setOrders(prev =>
      prev.map(o =>
        o.id === selectedOrder.id
          ? {
              ...o,
              order_proofs: (o.order_proofs || []).filter(proof => proof.id !== id)
            }
          : o
      )
    );
    alert("تم حذف الصورة بنجاح!");
  } catch (error: any) {
    alert("فشل حذف الصورة: " + error.message);
  }
};

// Duplicate order function
const duplicateOrder = async (order: Order) => {
  if (!user) return;
  
  // Don't allow duplicating already duplicated orders
  if (order.order_id.includes("(نسخة)")) {
    alert("لا يمكن نسخ طلب مكرر")
    return
  }
  
  // Ask for confirmation
  if (!window.confirm(`هل أنت متأكد من نسخ الطلب #${order.order_id}؟\n\nسيتم إنشاء نسخة جديدة من هذا الطلب مع:\n• إضافة "(نسخة)" للرقم\n• إعادة تعيين الحالة إلى "مكلف"\n• إعادة تعيين جميع الرسوم والتعليقات\n• تاريخ اليوم ليظهر في قائمة اليوم`)) {
    return;
  }
  
  setDuplicatingOrderId(order.id)
  try {
    console.log("Starting to duplicate order:", order.order_id);

    const nowIso = new Date().toISOString();
    const todayString = nowIso.split("T")[0];
    
    // Create a copy of the order with modified fields
    const duplicatedOrder = {
      order_id: `${order.order_id} (نسخة)`,
      customer_name: order.customer_name,
      address: order.address,
      mobile_number: order.mobile_number,
      total_order_fees: order.total_order_fees,
      delivery_fee: null,
      payment_method: order.payment_method,
      payment_sub_type: null,
      status: "assigned", // Reset to assigned status
      partial_paid_amount: null,
      internal_comment: null,
      collected_by: null,
      assigned_courier_id: user.id, // Assign to current courier
      notes: order.notes,
      // Use today's date so the duplicate appears in today's list
      created_at: nowIso,
      updated_at: nowIso,
    };

    console.log("Duplicated order data:", duplicatedOrder);
    console.log("Original order created_at:", order.created_at);
    console.log("Duplicated order created_at:", duplicatedOrder.created_at);
    console.log("Current selected date:", selectedDate);

    // Insert the duplicated order
    const { data: newOrder, error } = await supabase
      .from("orders")
      .insert(duplicatedOrder)
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    console.log("Successfully created duplicated order:", newOrder);
    
    // Show success message with order details
    const duplicateOrderDate = new Date(nowIso).toLocaleDateString('ar-EG');
    const successMessage = `تم نسخ الطلب بنجاح!

الطلب الجديد:
• الرقم: #${duplicatedOrder.order_id}
• العميل: ${duplicatedOrder.customer_name}
• العنوان: ${duplicatedOrder.address}
• الحالة: مكلف
• التاريخ: ${duplicateOrderDate}
• يمكنك تعديله كما تريد

سيظهر الطلب المكرر في تاريخ اليوم (${duplicateOrderDate})...`;
    
    // Show success message with option to confirm (no navigation needed; we jump to today)
    window.alert(successMessage);
    setSelectedDate(todayString);
    
    // Refresh orders to show the new duplicated order
    console.log("Refreshing orders...");
    await fetchOrders(false, true, todayString);
    console.log("Orders refreshed, checking if duplicated order appears...");
    
    // Force refresh the current date's orders to ensure we get the latest data
    // Use today's date to ensure we're looking at the right day
    const refreshDate = todayString;
    console.log("Refresh date for verification:", refreshDate);
    console.log("Original order date:", order.created_at.split('T')[0]);
    
          // Verify the order appears in the list
      setTimeout(async () => {
        // Double-check by fetching orders again
        const { data: freshOrders } = await supabase
          .from("orders")
          .select("*")
          .eq("assigned_courier_id", user.id)
          .gte("created_at", new Date(refreshDate + "T00:00:00.000Z").toISOString())
          .lte("created_at", new Date(refreshDate + "T23:59:59.999Z").toISOString());
      
      const duplicatedOrderExists = freshOrders?.some(o => o.order_id === duplicatedOrder.order_id);
      console.log("Fresh orders count:", freshOrders?.length);
      console.log("Duplicated order exists in fresh orders:", duplicatedOrderExists);
      
      if (!duplicatedOrderExists) {
        console.warn("Duplicated order still not found after fresh fetch");
        // Try to show the duplicated order anyway by adding it to the current orders
        setOrders(prev => {
          const orderExists = prev.some(o => o.id === newOrder.id);
          if (!orderExists) {
            console.log("Manually adding duplicated order to orders list");
            return [newOrder, ...prev];
          }
          return prev;
        });
      } else {
        console.log("Duplicated order found successfully in fresh orders");
      }
    }, 1000);
    
  } catch (error: any) {
    console.error("Error duplicating order:", error);
    alert("فشل نسخ الطلب: " + error.message);
  } finally {
    setDuplicatingOrderId(null)
  }
};

// Test function to check RLS policies (kept for debugging)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const testRLSPolicies = async () => {
  if (!user) return;
  
  console.log("Testing RLS policies...");
  console.log("User ID:", user.id);
  console.log("User role:", user.role);
  
  try {
    // Test SELECT policy
    const { data: selectTest, error: selectError } = await supabase
      .from("orders")
      .select("id, order_id")
      .eq("assigned_courier_id", user.id)
      .limit(1);
    
    console.log("SELECT test result:", selectTest, selectError);
    
    // Test UPDATE policy
    const { data: updateTest, error: updateError } = await supabase
      .from("orders")
      .update({ internal_comment: "RLS test" })
      .eq("assigned_courier_id", user.id)
      .eq("id", orders[0]?.id)
      .select();
    
    console.log("UPDATE test result:", updateTest, updateError);
    
    // Test DELETE policy
    const { data: deleteTest, error: deleteError } = await supabase
      .from("orders")
      .delete()
      .eq("id", "test-id-that-doesnt-exist")
      .select();
    
    console.log("DELETE test result:", deleteTest, deleteError);
    
  } catch (error) {
    console.error("RLS test error:", error);
  }
};

// Delete duplicated order function
const deleteDuplicatedOrder = async (order: Order) => {
  // Only allow deletion of duplicated orders
  if (!order.order_id.includes("(نسخة)")) {
    alert("يمكن حذف الطلبات المكررة فقط");
    return;
  }

  // Check if the order belongs to the current courier
  if (order.assigned_courier_id !== user?.id) {
    alert("يمكنك حذف الطلبات المكررة الخاصة بك فقط");
    return;
  }

  // Ask for confirmation
  const confirmMessage = `هل أنت متأكد من حذف الطلب المكرر #${order.order_id}؟

تفاصيل الطلب:
• العميل: ${order.customer_name}
• العنوان: ${order.address}
• المبلغ: ${order.total_order_fees} ج.م

⚠️ تحذير: لا يمكن التراجع عن هذا الإجراء!`;

  if (!window.confirm(confirmMessage)) {
    return;
  }

  setDeletingOrderId(order.id);

      try {
      console.log("Starting to delete duplicated order:", order.order_id);
      console.log("Current user ID:", user?.id);
      console.log("Order assigned_courier_id:", order.assigned_courier_id);
      console.log("Order ID contains (نسخة):", order.order_id.includes("(نسخة)"));
      console.log("User role check:", user?.role);

    // Delete the order from Supabase
    console.log("Attempting to delete order from Supabase...");
    let { error, count } = await supabase
      .from("orders")
      .delete()
      .eq("id", order.id);

    if (error) {
      console.error("Supabase delete error:", error);
      console.error("Error details:", error.message, error.details, error.hint);
      
      // If RLS policy fails, show detailed error and instructions
      console.error("DELETE operation failed due to RLS policy");
      console.error("Error details:", error.message, error.details, error.hint);
      
      // Show user-friendly error message with solution
      const errorMessage = `فشل في حذف الطلب بسبب سياسات الأمان.

الخطأ: ${error.message}

لحل هذه المشكلة:
1. تأكد من تشغيل سياسات RLS الصحيحة في Supabase
2. تحقق من أن لديك صلاحيات الحذف
3. اتصل بالمدير لتفعيل صلاحيات الحذف

سيتم إخفاء الطلب من الواجهة مؤقتاً...`;
      
      alert(errorMessage);
      
      // Force remove from UI anyway to provide immediate feedback
      count = 1; // Pretend deletion was successful
    }

    console.log("Delete operation completed. Rows affected:", count);

    // Verify the order was actually deleted
    const { data: verifyDeletion } = await supabase
      .from("orders")
      .select("id")
      .eq("id", order.id)
      .single();

    if (verifyDeletion) {
      throw new Error("Order still exists after deletion attempt");
    }

    console.log("Order deletion verified successfully");

    console.log("Successfully deleted duplicated order:", order.order_id);
    
    // Show success message with more details
    const successMessage = `تم حذف الطلب المكرر بنجاح!

تفاصيل الطلب المحذوف:
• الرقم: #${order.order_id}
• العميل: ${order.customer_name}
• العنوان: ${order.address}

إذا لم يختف الطلب من القائمة، يرجى الضغط على زر "تحديث" في الأعلى.`;
    
    alert(successMessage);
    
    // Optimistically remove the order from the local state immediately
    setOrders(prev => {
      const filteredOrders = prev.filter(o => o.id !== order.id);
      console.log("Orders after deletion:", filteredOrders.length);
      return filteredOrders;
    });
    
    // Success - order already removed from UI, no need to refetch
    
  } catch (error: any) {
    console.error("Error deleting duplicated order:", error);
    alert("فشل حذف الطلب المكرر: " + error.message);
  } finally {
    setDeletingOrderId(null);
  }
};

  return (
    <>
      {/* Smooth Animations CSS */}
      <style>{`
        /* Disable all animations */
        .animate-slideIn,
        .animate-fadeIn,
        .modal-backdrop-animate,
        .modal-expand-animate,
        .modal-expand-from-card {
          animation: none !important;
          transition: none !important;
          opacity: 1 !important;
          transform: none !important;
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">

      {/* Header Section - Mobile Optimized */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 border-b border-blue-800 z-10 shadow-lg">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">طلبياتي</h1>
                <p className="text-xs text-blue-100">إدارة ومتابعة طلبات التوصيل</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  fetchOrders(true)
                }}
                disabled={refreshing}
                className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title="تحديث"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                <span className="text-xs font-bold text-white">{orders.length}</span>
              </div>
            </div>
          </div>

          {/* Date Navigation - Compact */}
          <div className="flex items-center justify-between gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                goToPreviousDay()
              }}
              className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex-1 flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4 text-white" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                }}
                className="flex-1 bg-white/90 border-0 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-white/50"
                dir="ltr"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  goToToday()
                }}
                className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-medium transition-all active:scale-95"
              >
                اليوم
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                goToNextDay()
              }}
              className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile First List View */}
      <div className="px-2 py-3 pb-20">
        {orders.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 px-4">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  لا توجد طلبات{" "}
                  {selectedDate === getTodayDateString() ? "اليوم" : `في ${formatDateInArabic(selectedDate)}`}
                </h3>
                <p className="text-gray-600 max-w-xs mx-auto text-sm">
                  لم يتم العثور على أي طلبات مخصصة لك في هذا التاريخ
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    goToToday()
                  }}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm active:scale-95"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  عرض طلبات اليوم
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    fetchOrders(true)
                  }}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 bg-gray-600 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'جاري التحديث...' : 'تحديث'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Orders List - Two Columns on Mobile and Desktop
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {orders.map((order, index) => {
              const statusInfo = getStatusInfo(order.status)
              const StatusIcon = statusInfo.icon
              const deliveryFee = order.delivery_fee || 0
              const partialAmount = order.partial_paid_amount || 0
              const totalAmount = calculateTotalAmount(order, deliveryFee, partialAmount, order.status)
              const isPaid = isOrderPaid(order)
              const rawLineItems = order.line_items
                ? (typeof order.line_items === 'string' ? JSON.parse(order.line_items) : order.line_items)
                : []
              const fulfillmentItems =
                rawLineItems && rawLineItems.length > 0 ? rawLineItems : (order.order_items || [])
              const allItems = [...(order.order_items || []), ...(rawLineItems || [])]
              const hasRemovedItems = allItems.some(isOrderItemRemoved)
              const discountInfo = getOrderDiscountInfo(order)
              const fulfilledItems = fulfillmentItems.filter(
                (i: any) => !isOrderItemRemoved(i) && isOrderItemFulfilled(i)
              )
              const fulfilledTotal = fulfilledItems.reduce((sum: number, i: any) => {
                const price = Number.parseFloat(i?.price ?? 0) || 0
                const qty = Number.parseInt(i?.quantity ?? 1) || 1
                const discount = Number.parseFloat(i?.total_discount ?? i?.discount ?? 0) || 0
                const lineTotal = Math.max(0, price * qty - discount)
                return sum + lineTotal
              }, 0)
              const unfulfilledItems = fulfillmentItems.filter(
                (i: any) => !isOrderItemRemoved(i) && isOrderItemUnfulfilled(i)
              )
              const unfulfilledTotal = unfulfilledItems.reduce((sum: number, i: any) => {
                const price = Number.parseFloat(i?.price ?? 0) || 0
                const qty = Number.parseInt(i?.quantity ?? 1) || 1
                const discount = Number.parseFloat(i?.total_discount ?? i?.discount ?? 0) || 0
                const lineTotal = Math.max(0, price * qty - discount)
                return sum + lineTotal
              }, 0)
              const adminTotal = Number.parseFloat(String(order.total_order_fees ?? 0)) || 0
              const hasAdminTotal = adminTotal > 0
              const collectibleAmount = hasAdminTotal ? adminTotal : Math.max(0, fulfilledTotal)
              const noteText = `${order.internal_comment || ""} ${order.notes || ""}`.toLowerCase()
              const isReceivingPartNote =
                noteText.includes("استلام قط") || noteText.includes("استلام قطعة") || noteText.includes("استلام قطعه")
              const isExchangeNote =
                noteText.includes("تبديل") || noteText.includes("استبدال") || noteText.includes("exchange")
              const isReceivingPartStatus =
                order.status === "receiving_part" ||
                order.payment_sub_type === "receiving_part" ||
                isReceivingPartNote
              const isExchangeStatus =
                order.status === "hand_to_hand" ||
                order.payment_sub_type === "hand_to_hand" ||
                order.payment_sub_type === "exchange" ||
                isExchangeNote
              const showSpecialBadge = isReceivingPartStatus || isExchangeStatus
              const showDashedBorder =
                recentlyUpdatedOrderIds.current.has(order.id) ||
                storedModifiedOrderIds.current.has(order.id)

              return (
                <div
                  key={order.id}
                  data-order-card
                  onTouchStart={(e) => {
                    const touch = e.touches[0]
                    touchStartYRef.current = touch ? touch.clientY : null
                  }}
                  onTouchEnd={(e) => {
                    const target = e.target as HTMLElement
                    if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button') || target.closest('a')) {
                      return
                    }

                    // Avoid opening when the user is scrolling
                    const touch = e.changedTouches[0]
                    if (touch && touchStartYRef.current !== null) {
                      const deltaY = Math.abs(touch.clientY - touchStartYRef.current)
                      if (deltaY > 10) {
                        touchStartYRef.current = null
                        return
                      }
                    }
                    touchStartYRef.current = null

                    e.preventDefault()
                    e.stopPropagation()

                    const cardElement = e.currentTarget as HTMLElement
                    if (cardElement && typeof window !== 'undefined') {
                      const rect = cardElement.getBoundingClientRect()
                      const position = {
                        top: rect.top + window.scrollY,
                        left: rect.left + window.scrollX,
                        width: rect.width,
                        height: rect.height,
                      }
                      cardPositionRef.current = position
                      setCardPosition(position)
                    }

                    openModal(order, e)
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement
                    if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button') || target.closest('a')) {
                      return
                    }
                    e.preventDefault()
                    e.stopPropagation()

                    const cardElement = e.currentTarget as HTMLElement
                    if (cardElement && typeof window !== 'undefined') {
                      const rect = cardElement.getBoundingClientRect()
                      const position = {
                        top: rect.top + window.scrollY,
                        left: rect.left + window.scrollX,
                        width: rect.width,
                        height: rect.height,
                      }
                      cardPositionRef.current = position
                      setCardPosition(position)
                    }

                    openModal(order, e)
                  }}
                  onMouseDown={(e) => {
                    // Prevent any scroll behavior on mouse down
                    const target = e.target as HTMLElement
                    if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button') || target.closest('a')) {
                      e.preventDefault()
                    }
                  }}
                  className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all active:scale-[0.98] cursor-pointer hover:shadow-xl border-2 ${
                    showDashedBorder
                      ? "border-amber-400 border-dashed bg-amber-50"
                      : order.order_id.includes("(نسخة)")
                        ? "border-green-300 bg-green-50"
                        : isReceivingPartStatus
                          ? "border-indigo-300 bg-indigo-50"
                          : isExchangeStatus
                            ? "border-purple-300 bg-purple-50"
                            : order.status === "assigned"
                              ? "border-blue-300 bg-blue-50"
                              : "border-gray-200"
                  } ${showDashedBorder ? "line-through decoration-amber-700/70 decoration-2" : ""}`}
                  style={
                    showDashedBorder
                      ? {
                          backgroundImage:
                            "repeating-linear-gradient(135deg, rgba(251,191,36,0.14) 0, rgba(251,191,36,0.14) 10px, rgba(255,255,255,0.6) 10px, rgba(255,255,255,0.6) 20px), repeating-linear-gradient(45deg, rgba(251,191,36,0.14) 0, rgba(251,191,36,0.14) 10px, rgba(255,255,255,0.6) 10px, rgba(255,255,255,0.6) 20px)",
                          backgroundSize: "18px 18px, 18px 18px",
                        }
                      : undefined
                  }
                >
                  {showSpecialBadge && (
                    <div className="absolute top-2 right-2 z-30 flex gap-2 pointer-events-none">
                      {isExchangeStatus && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-600 text-white text-xs font-semibold shadow-md">
                          <Star className="w-3.5 h-3.5" />
                          تبديل
                        </span>
                      )}
                      {isReceivingPartStatus && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold shadow-md">
                          <Star className="w-3.5 h-3.5" />
                          استلام قطعة
                        </span>
                      )}
                    </div>
                  )}
                  {/* Status Indicator Bar */}
                  <div className={`h-1 relative z-0 ${
                    order.order_id.includes("(نسخة)") ? "bg-green-500" : 
                    order.status === "assigned" ? "bg-blue-500" :
                    statusInfo.bgColor.replace("bg-", "bg-").replace("border-", "")
                  }`}></div>

                  {/* Card Content - Modern Mobile Design */}
                  <div className="p-4 space-y-3 overflow-hidden relative z-20">
                    {/* Header Row - Modern Design */}
                    <div className="space-y-2">
                      {/* Order ID and badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-gray-900">#{order.order_id}</h3>
                          {order.order_id.includes("(نسخة)") && (
                            <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-medium whitespace-nowrap">
                              نسخة
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{formatTime(order.created_at)}</p>
                      </div>
                      
                      {/* Customer name */}
                      <div>
                        <p className="text-base font-semibold text-gray-800">{order.customer_name}</p>
                      </div>
                      
                      {/* Status & Payment Badges */}
                      <div className="flex gap-2 flex-wrap">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusInfo.bgColor} ${statusInfo.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span>{statusInfo.label}</span>
                        </div>
                        {showSpecialBadge && (
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm ${
                            isExchangeStatus
                              ? "bg-purple-50 border-purple-200 text-purple-700"
                              : "bg-indigo-50 border-indigo-200 text-indigo-700"
                          }`}>
                            <Star className="w-4 h-4" />
                            <span>{isExchangeStatus ? "تبديل" : "استلام قطعة"}</span>
                          </div>
                        )}
                        {unfulfilledItems.length > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>منتجات غير منفذة</span>
                            <span className="text-[11px] font-bold">-{unfulfilledTotal.toFixed(0)} ج.م</span>
                          </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          isPaid ? "bg-green-100 text-green-700 border border-green-300" : "bg-yellow-100 text-yellow-700 border border-yellow-300"
                        }`}>
                          {isPaid ? <CheckCircle className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                          <span>{isPaid ? "مدفوع" : "غير مدفوع"}</span>
                        </div>
                        {hasRemovedItems && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <Trash2 className="w-4 h-4" />
                            <span>منتجات محذوفة</span>
                          </div>
                        )}
                      </div>

                      {discountInfo.amount > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <Percent className="w-4 h-4" />
                            <span>
                              خصم
                              {discountInfo.percentage !== null ? ` ${discountInfo.percentage.toFixed(0)}%` : ""}
                            </span>
                            <span className="text-[11px] font-bold">
                              -{discountInfo.amount.toFixed(2)} ج.م
                            </span>
                          </div>
                          <span className="text-[10px] text-red-600 bg-red-100 px-2 py-0.5 rounded">
                            {discountInfo.source === "items" ? "من المنتجات" : "من الطلب"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Address - Modern Design */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-800 leading-relaxed flex-1">{order.address}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`, '_blank')
                          }}
                          className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors active:scale-95 flex-shrink-0"
                        >
                          <MapPin className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                    </div>

                    {/* Financial Info Row - Modern Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-3 text-center">
                        <p className="text-xs text-green-700 mb-1">المبلغ للتحصيل</p>
                        <p className="text-xl font-bold text-green-800">{collectibleAmount.toFixed(0)}</p>
                        <p className="text-xs text-green-600">ج.م</p>
                        {!hasAdminTotal && unfulfilledTotal > 0 && (
                          <p className="text-[11px] text-amber-700 font-semibold mt-1">
                            طرح {unfulfilledTotal.toFixed(0)} ج.م لمنتجات غير منفذة
                          </p>
                        )}
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-3 text-center">
                        <p className="text-xs text-blue-700 mb-1">طريقة الدفع</p>
                        <p className="text-sm font-semibold text-blue-800">{getDisplayPaymentMethod(order)}</p>
                      </div>
                    </div>

                    {/* Phone & Actions Row - Modern Design */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handlePhoneClick(order.mobile_number, e)
                      }}
                        onFocus={(e) => {
                          // Prevent scrolling when button gets focus
                          e.preventDefault()
                        }}
                        className="w-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-3 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                      >
                        <Phone className="w-5 h-5 flex-shrink-0" />
                        <span className="font-mono text-sm font-semibold">{order.mobile_number}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const cleanNumber = order.mobile_number.replace(/\D/g, "")
                          const whatsappNumber = cleanNumber.startsWith("20") ? cleanNumber : `20${cleanNumber}`
                          window.open(`https://wa.me/${whatsappNumber}`, "_blank")
                        }}
                        onFocus={(e) => {
                          // Prevent scrolling when button gets focus
                          e.preventDefault()
                        }}
                        className="w-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-3 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                      >
                        <MessageCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-semibold">واتساب</span>
                      </button>
                    </div>

                    {/* Notes - Modern Design */}
                    {order.notes && (
                      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-3">
                        <div className="flex items-start gap-2">
                          <FileText className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-yellow-800 leading-relaxed flex-1">
                            <p className="font-semibold mb-1">ملاحظات:</p>
                            <div className="text-sm">{renderNotesWithLinks(order.notes, false)}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Actions - Modern Design */}
                    <div className="flex gap-3 pt-3 border-t-2 border-gray-200">
                      {canEditOrder(order) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            // Find the card element to get its position
                            const cardElement = e.currentTarget.closest('[data-order-card]') as HTMLElement
                            if (cardElement) {
                              // Capture position IMMEDIATELY and synchronously
                              const rect = cardElement.getBoundingClientRect()
                              const position = {
                                top: rect.top + window.scrollY,
                                left: rect.left + window.scrollX,
                                width: rect.width,
                                height: rect.height,
                              }
                              
                              // CRITICAL: Store in ref FIRST (synchronous, immediate)
                              cardPositionRef.current = position
                              // Then update state (async, but ref is already set)
                              setCardPosition(position)
                              
                              console.log('Update button - Position captured:', position)
                              
                              // Create a synthetic event with the card element
                              const syntheticEvent = {
                                currentTarget: cardElement,
                                preventDefault: () => {},
                                stopPropagation: () => {},
                              } as any
                              
                              // Call openModal - it will see cardPositionRef.current is already set and use it
                              openModal(order, syntheticEvent)
                            } else {
                              openModal(order)
                            }
                          }}
                          onFocus={(e) => {
                            // Prevent scrolling when button gets focus
                            e.preventDefault()
                          }}
                          className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all active:scale-95 shadow-md bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Edit className="w-4 h-4" />
                            <span>تحديث الطلب</span>
                          </div>
                        </button>
                      )}
                      {!order.order_id.includes("(نسخة)") && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            duplicateOrder(order)
                          }}
                          onFocus={(e) => {
                            // Prevent scrolling when button gets focus
                            e.preventDefault()
                          }}
                          disabled={duplicatingOrderId === order.id}
                          className="px-1.5 sm:px-3 py-1.5 sm:py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md sm:rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center flex-shrink-0"
                          title="نسخ الطلب"
                        >
                          {duplicatingOrderId === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                      )}
                      {order.order_id.includes("(نسخة)") && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            deleteDuplicatedOrder(order)
                          }}
                          onFocus={(e) => {
                            // Prevent scrolling when button gets focus
                            e.preventDefault()
                          }}
                          disabled={deletingOrderId === order.id}
                          className="px-1.5 sm:px-3 py-1.5 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md sm:rounded-xl transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
                        >
                          {deletingOrderId === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Phone Options Modal */}
        {phoneOptionsOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 modal-backdrop"
            style={{
              alignItems: 'flex-start',
              overflowY: 'auto',
              paddingTop: phonePosition ? `${Math.max(16, phonePosition.top)}px` : '40px'
            }}
          >
            <div 
              className="bg-white rounded-xl shadow-xl max-w-sm w-full modal-content"
              style={{
                position: 'relative',
                top: 0,
                left: 0
              }}
            >
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">اختر طريقة التواصل</h3>
                  <p className="text-gray-600 bg-gray-50 px-3 py-2 rounded-lg font-mono">{selectedPhoneNumber}</p>
                </div>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePhoneCall()
                    }}
                    className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors active:scale-95"
                  >
                    <Phone className="w-5 h-5" />
                    مكالمة هاتفية
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleWhatsApp()
                    }}
                    className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors active:scale-95"
                  >
                    <MessageCircle className="w-5 h-5" />
                    رسالة واتساب
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setPhoneOptionsOpen(false)
                    }}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors active:scale-95"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Update Order Modal - Opens at Card Position */}
        {modalOpen && selectedOrder && (
          <div 
            className="fixed inset-0 z-50"
            style={{ 
              position: 'fixed',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              pointerEvents: 'auto',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              paddingTop: 0,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setModalOpen(false)
                setSelectedOrder(null)
                setCardPosition(null)
                cardPositionRef.current = null
              }
            }}
          >
            <div 
              ref={modalContainerRef}
              data-modal-container
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
              style={{
                position: 'fixed',
                maxHeight: '90vh',
                width: 'calc(100% - 16px)',
                maxWidth: '768px',
                // Initial position - will be overridden by useEffect
                top: cardPositionRef.current 
                  ? `${cardPositionRef.current.top}px` 
                  : (cardPosition 
                    ? `${cardPosition.top}px` 
                    : '50%'),
                left: '50%',
                transform: (cardPositionRef.current || cardPosition)
                  ? 'translateX(-50%)'
                  : 'translate(-50%, -50%)',
                marginBottom: '24px',
                zIndex: 1000,
                pointerEvents: 'auto',
                touchAction: 'manipulation',
              }}
              onClick={(e) => {
                // Allow native inputs (camera/file picker) to work while keeping modal open
                e.stopPropagation()
              }}
            >
              {/* Modal Header - Ultra Compact Mobile - Always Visible */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-1.5 sm:p-6 flex-shrink-0 w-full shadow">
                {/* Close Button - Absolutely Positioned Top Right - ALWAYS VISIBLE */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // Restore body scroll BEFORE closing
                    const scrollY = document.body.style.top
                    document.body.style.position = ''
                    document.body.style.top = ''
                    document.body.style.width = ''
                    document.body.style.overflow = ''
                    document.documentElement.style.overflow = ''
                    if (scrollY) {
                      const savedScrollY = parseInt(scrollY.replace('-', '').replace('px', '') || '0')
                      window.scrollTo(0, savedScrollY)
                    }
                    setModalOpen(false)
                    setSelectedOrder(null)
                    setCardPosition(null)
                    if (cardPositionRef.current) {
                      cardPositionRef.current = null
                    }
                  }}
                  className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2.5 sm:p-3 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-lg sm:rounded-xl transition-all active:scale-95 shadow-2xl border-2 border-white z-50"
                  style={{
                    minWidth: '52px',
                    minHeight: '52px',
                    width: '52px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1001,
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.5)',
                  }}
                  aria-label="إغلاق"
                >
                  <XCircle className="w-7 h-7 sm:w-7 sm:h-7" strokeWidth={2.5} />
                </button>
                
                <div className="flex items-start gap-1.5 sm:gap-3 pr-14 sm:pr-16" style={{ width: '100%' }}>
                  <div className="flex-1 min-w-0" style={{ flexShrink: 1, overflow: 'hidden' }}>
                    {/* Compact single line header on mobile */}
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                      <div className="w-6 h-6 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs sm:text-xl font-bold truncate">#{selectedOrder.order_id}</h3>
                          <p className="text-blue-100 text-[9px] sm:text-sm whitespace-nowrap">{formatTime(selectedOrder.created_at)}</p>
                        </div>
                        <p className="text-[10px] sm:text-lg font-semibold truncate mt-0.5">{selectedOrder.customer_name}</p>
                      </div>
                    </div>
                    {/* Address - Single line truncated on mobile */}
                    <div className="flex items-center gap-1 sm:gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-1.5 py-1 sm:p-2 mb-1 sm:mb-0">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-blue-200 flex-shrink-0" />
                      <p className="text-blue-100 text-[9px] sm:text-sm leading-tight flex-1 line-clamp-1">{selectedOrder.address}</p>
                    </div>
                    {/* Admin Notes - Collapsed indicator only on mobile */}
                    {(selectedOrder.notes || selectedOrder.order_note || selectedOrder.customer_note) && (
                      <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-3 px-1.5 py-1 sm:p-3 bg-yellow-500/20 backdrop-blur-sm rounded-lg border border-yellow-400/30">
                        <FileText className="w-3 h-3 sm:w-5 sm:h-5 text-yellow-200 flex-shrink-0" />
                        <p className="text-yellow-100 text-[9px] sm:text-sm font-bold flex items-center gap-1 sm:gap-2">
                          <span className="truncate">ملاحظات الإدارة:</span>
                          <span className="bg-yellow-500/30 px-1 sm:px-2 py-0.5 rounded text-[8px] sm:text-xs whitespace-nowrap">مهم</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Content - Ultra Compact Mobile */}
              <div 
                data-modal-content
                className="p-1.5 sm:p-6"
                style={{
                  flex: '1 1 0%',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                  minHeight: 0,
                  maxHeight: 'calc(90vh - 96px)',
                  overscrollBehavior: 'contain',
                }}
              >
                {/* Complete Order Details Section - Compact */}
                <div className="space-y-2 sm:space-y-4 mb-4 sm:mb-6">
                  {/* Products Section */}
                  {(() => {
                    const items = selectedOrder.order_items || []
                    const lineItems = selectedOrder.line_items 
                      ? (typeof selectedOrder.line_items === 'string' 
                          ? JSON.parse(selectedOrder.line_items) 
                          : selectedOrder.line_items)
                      : []
                    const allItemsRaw = items.length > 0 ? items : lineItems
                    const isRemoved = (i: any) =>
                      i?.is_removed === true ||
                      Number(i?.quantity) === 0 ||
                      i?.properties?._is_removed === true ||
                      i?.properties?._is_removed === 'true'
                    const allItems = (allItemsRaw || []).filter((i: any) => !isRemoved(i))
                    
                    if (allItems && allItems.length > 0) {
                      return (
                        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl sm:rounded-2xl border-2 border-gray-200 p-2.5 sm:p-5 shadow-lg animate-fadeIn">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md">
                              <Package className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <h4 className="text-sm sm:text-lg font-bold text-gray-800">المنتجات</h4>
                            <span className="bg-blue-100 text-blue-700 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold">
                              {allItems.length} {allItems.length === 1 ? 'منتج' : 'منتجات'}
                            </span>
                          </div>
                          <div className="space-y-2 sm:space-y-3">
                            {allItems.map((item: any, idx: number) => {
                              // Get basic item info first
                              const itemTitle = item.title || item.name || 'منتج'
                              const itemVariant = item.variant_title || item.variant?.title || ''
                              const itemSku = item.sku || ''
                              
                              // Get product image from multiple possible sources
                              let itemImage = null
                              
                              // Priority 1: Direct image_url from order_items
                              if (item.image_url && item.image_url !== 'null' && item.image_url !== null && item.image_url.trim() !== '') {
                                itemImage = item.image_url
                              }
                              
                              // Priority 2: From product_images map (by variant_id or product_id)
                              if (!itemImage && selectedOrder.product_images) {
                                try {
                                  const productImages = typeof selectedOrder.product_images === 'string' 
                                    ? JSON.parse(selectedOrder.product_images) 
                                    : selectedOrder.product_images
                                  
                                  if (Array.isArray(productImages) && productImages.length > 0) {
                                    // Try to match by variant_id first
                                    const variantId = item.variant_id || item.variant?.id || (item.shopify_raw_data && (item.shopify_raw_data.variant_id || item.shopify_raw_data.variant?.id))
                                    if (variantId) {
                                      const match = productImages.find((img: any) => {
                                        const imgVariantId = img.variant_id
                                        return imgVariantId != null && (
                                          imgVariantId == variantId || 
                                          String(imgVariantId) === String(variantId) ||
                                          Number(imgVariantId) === Number(variantId)
                                        )
                                      })
                                      if (match && match.image) {
                                        itemImage = typeof match.image === 'string' 
                                          ? match.image 
                                          : (match.image.src || match.image.url || null)
                                        if (itemImage) {
                                          console.log(`✅ Found image by variant_id ${variantId} for "${itemTitle}"`)
                                        }
                                      }
                                    }
                                    
                                    // Try to match by product_id if variant_id didn't work
                                    if (!itemImage) {
                                      const productId = item.product_id || item.product?.id || (item.shopify_raw_data && (item.shopify_raw_data.product_id || item.shopify_raw_data.product?.id))
                                      if (productId) {
                                        const match = productImages.find((img: any) => {
                                          const imgProductId = img.product_id
                                          return imgProductId != null && (
                                            imgProductId == productId || 
                                            String(imgProductId) === String(productId) ||
                                            Number(imgProductId) === Number(productId)
                                          )
                                        })
                                        if (match && match.image) {
                                          itemImage = typeof match.image === 'string' 
                                            ? match.image 
                                            : (match.image.src || match.image.url || null)
                                          if (itemImage) {
                                            console.log(`✅ Found image by product_id ${productId} for "${itemTitle}"`)
                                          }
                                        }
                                      }
                                    }
                                    
                                    // Fallback: use image by index or first available
                                    if (!itemImage && productImages.length > 0) {
                                      // Try to use image at same index
                                      if (productImages[idx] && productImages[idx].image) {
                                        itemImage = typeof productImages[idx].image === 'string' 
                                          ? productImages[idx].image 
                                          : (productImages[idx].image.src || productImages[idx].image.url || null)
                                      }
                                      // Or use first available image
                                      if (!itemImage) {
                                        const firstImg = productImages.find((img: any) => img.image)
                                        if (firstImg && firstImg.image) {
                                          itemImage = typeof firstImg.image === 'string' 
                                            ? firstImg.image 
                                            : (firstImg.image.src || firstImg.image.url || null)
                                        }
                                      }
                                    }
                                  }
                                } catch (e) {
                                  console.error('Error parsing product_images:', e, selectedOrder.product_images)
                                }
                              }
                              
                              // Priority 3: From line_item direct properties
                              if (!itemImage) {
                                // Check item.image (can be string or object)
                                if (item.image) {
                                  if (typeof item.image === 'string' && item.image.trim() !== '' && item.image !== 'null') {
                                    itemImage = item.image
                                  } else if (typeof item.image === 'object' && item.image.src) {
                                    itemImage = item.image.src
                                  } else if (typeof item.image === 'object' && item.image.url) {
                                    itemImage = item.image.url
                                  }
                                }
                                
                                // Check item.variant.image
                                if (!itemImage && item.variant?.image) {
                                  if (typeof item.variant.image === 'string' && item.variant.image.trim() !== '' && item.variant.image !== 'null') {
                                    itemImage = item.variant.image
                                  } else if (typeof item.variant.image === 'object' && item.variant.image.src) {
                                    itemImage = item.variant.image.src
                                  } else if (typeof item.variant.image === 'object' && item.variant.image.url) {
                                    itemImage = item.variant.image.url
                                  }
                                }
                                
                                // Check item.variant.featured_image
                                if (!itemImage && item.variant?.featured_image) {
                                  itemImage = item.variant.featured_image
                                }
                                
                                // Check item.product?.images array
                                if (!itemImage && item.product?.images && Array.isArray(item.product.images) && item.product.images.length > 0) {
                                  const firstProductImg = item.product.images[0]
                                  if (typeof firstProductImg === 'string') {
                                    itemImage = firstProductImg
                                  } else if (firstProductImg.src) {
                                    itemImage = firstProductImg.src
                                  } else if (firstProductImg.url) {
                                    itemImage = firstProductImg.url
                                  }
                                }
                              }
                              
                              // Priority 4: From line_item images array
                              if (!itemImage && item.images && Array.isArray(item.images) && item.images.length > 0) {
                                const firstImg = item.images[0]
                                if (typeof firstImg === 'string' && firstImg.trim() !== '' && firstImg !== 'null') {
                                  itemImage = firstImg
                                } else if (firstImg.src) {
                                  itemImage = firstImg.src
                                } else if (firstImg.url) {
                                  itemImage = firstImg.url
                                }
                              }
                              
                              // Final fallback
                              if (!itemImage || itemImage === '/placeholder.svg' || itemImage === 'null' || itemImage === null || itemImage.trim() === '') {
                                itemImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" textAnchor="middle" dy=".3em" fill="%239ca3af" fontSize="12"%3ENo Image%3C/text%3E%3C/svg%3E'
                                console.warn(`⚠️ No image found for "${itemTitle}"`, {
                                  hasImageUrl: !!item.image_url,
                                  hasProductImages: !!selectedOrder.product_images,
                                  variantId: item.variant_id || item.variant?.id,
                                  productId: item.product_id || item.product?.id,
                                  itemKeys: Object.keys(item)
                                })
                              } else {
                                console.log(`✅ Image found for "${itemTitle}":`, itemImage.substring(0, 80))
                              }
                              
                              const itemPrice = parseFloat(item.price || 0)
                              const itemQuantity = parseInt(item.quantity || 1)
                              const itemDiscount = parseFloat(item.total_discount || item.discount || 0)
                              const itemTotal = (itemPrice * itemQuantity) - itemDiscount
                              const isRemoved =
                                item.is_removed === true ||
                                Number(item.quantity) === 0 ||
                                item?.properties?._is_removed === true ||
                                item?.properties?._is_removed === 'true'
                              const isUnfulfilled = !isRemoved && isOrderItemUnfulfilled(item)
                              
                              return (
                                <div 
                                  key={idx}
                                  className={`rounded-lg sm:rounded-xl border-2 p-2 sm:p-4 transition-all duration-300 hover:shadow-md ${
                                    isRemoved
                                      ? 'bg-red-50 border-red-200 text-red-700 opacity-90'
                                      : isUnfulfilled
                                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                                        : 'bg-white border-gray-100 hover:border-blue-300'
                                  }`}
                                >
                                  <div className="flex gap-2 sm:gap-4">
                                    {/* Product Image - Clickable */}
                                    <div 
                                      className={`w-14 h-14 sm:w-24 sm:h-24 rounded-lg sm:rounded-xl overflow-hidden border-2 flex-shrink-0 relative ${
                                        itemImage && itemImage !== 'data:image/svg+xml' && !itemImage.includes('placeholder') 
                                          ? `cursor-pointer hover:shadow-md transition-all ${isRemoved ? 'border-red-200 bg-red-100' : 'border-gray-200 bg-gray-100 hover:border-blue-400'}`
                                          : isRemoved ? 'border-red-200 bg-red-100' : 'border-gray-200 bg-gray-100'
                                      }`}
                                      onClick={() => {
                                        if (itemImage && itemImage !== 'data:image/svg+xml' && !itemImage.includes('placeholder')) {
                                          setSelectedImage(itemImage)
                                          setImageModalOpen(true)
                                        }
                                      }}
                                    >
                                      {itemImage && itemImage !== 'data:image/svg+xml' && !itemImage.includes('placeholder') ? (
                                        <img 
                                          src={itemImage || "/placeholder.svg"} 
                                          alt={itemTitle}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement
                                            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" textAnchor="middle" dy=".3em" fill="%239ca3af" fontSize="12"%3ENo Image%3C/text%3E%3C/svg%3E'
                                            target.onerror = null // Prevent infinite loop
                                          }}
                                          onLoad={() => {
                                            console.log(`✅ Image loaded: ${itemTitle}`, itemImage?.substring(0, 60))
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                          <Package className="w-8 h-8 text-gray-400" />
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Product Details */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h5 className={`font-bold text-xs sm:text-base mb-0.5 sm:mb-1 line-clamp-2 ${isRemoved ? 'text-red-800' : 'text-gray-900'}`}>
                                          {itemTitle}
                                        </h5>
                                        {isRemoved && (
                                          <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full bg-red-600 text-white uppercase shadow">
                                            removed
                                          </span>
                                        )}
                                        {isUnfulfilled && (
                                          <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 shadow">
                                            غير منفذ
                                          </span>
                                        )}
                                      </div>
                                      {itemVariant && (
                                        <p className={`text-[10px] sm:text-sm mb-0.5 sm:mb-1 ${isRemoved ? 'text-red-700' : 'text-gray-600'}`}>
                                          {itemVariant}
                                        </p>
                                      )}
                                      {itemSku && (
                                        <p className={`text-[9px] sm:text-xs font-mono mb-1 sm:mb-2 ${isRemoved ? 'text-red-600' : 'text-gray-500'}`}>
                                          SKU: {itemSku}
                                        </p>
                                      )}
                                      <div className="flex items-center justify-between mt-1 sm:mt-2">
                                        <span className={`text-[10px] sm:text-sm ${isRemoved ? 'text-red-700' : 'text-gray-600'}`}>
                                          الكمية:{' '}
                                          <span className={`font-semibold ${isRemoved ? 'text-red-800 line-through' : 'text-gray-800'}`}>
                                            {itemQuantity}
                                          </span>
                                        </span>
                                        <div className="text-right">
                                          {itemDiscount > 0 && (
                                            <div className="text-[9px] sm:text-xs text-red-600 mb-0.5">
                                              خصم: -{itemDiscount.toFixed(2)} ج.م
                                            </div>
                                          )}
                                          <span className={`text-xs sm:text-base font-bold ${isRemoved ? 'text-red-700 line-through' : 'text-blue-600'}`}>
                                            {itemTotal.toFixed(2)} ج.م
                                          </span>
                                        </div>
                                      </div>
                                      {isRemoved && (
                                        <div className="mt-2 sm:mt-3 bg-red-100 text-red-800 text-[10px] sm:text-xs px-2 py-1.5 rounded border border-red-200 flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                          <span>تم حذف هذا المنتج من الطلب في Shopify</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Payment Details Section - Compact */}
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl sm:rounded-2xl border-2 border-amber-200 p-2.5 sm:p-5 shadow-lg animate-fadeIn">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                      <div className="w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md">
                        <CreditCard className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <h4 className="text-sm sm:text-lg font-bold text-gray-800">تفاصيل الدفع</h4>
                      {selectedOrder.payment_status && (
                        <span className={`px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
                          selectedOrder.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {selectedOrder.payment_status === 'paid' ? 'مدفوع' : 'في الانتظار'}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 sm:space-y-2.5 bg-white rounded-lg sm:rounded-xl p-2 sm:p-4 border border-amber-100">
                      <div className="flex justify-between items-center py-1 sm:py-1.5 border-b border-gray-100">
                        <span className="text-xs sm:text-sm text-gray-600">عدد المنتجات:</span>
                        <span className="font-semibold text-xs sm:text-sm text-gray-800">
                          {(() => {
                            const items = selectedOrder.order_items || []
                            const lineItems = selectedOrder.line_items 
                              ? (typeof selectedOrder.line_items === 'string' 
                                  ? JSON.parse(selectedOrder.line_items) 
                                  : selectedOrder.line_items)
                              : []
                            const allItemsRaw = items.length > 0 ? items : lineItems
                            const isRemoved = (i: any) =>
                              i?.is_removed === true ||
                              Number(i?.quantity) === 0 ||
                              i?.properties?._is_removed === true ||
                              i?.properties?._is_removed === 'true'
                            const allItems = (allItemsRaw || []).filter((i: any) => !isRemoved(i))
                            const totalQty = allItems.reduce((sum: number, item: any) => sum + (parseInt(item.quantity || 1)), 0)
                            return totalQty || 0
                          })()} منتج
                        </span>
                      </div>
                      {selectedOrder.subtotal_price !== undefined && (
                        <div className="flex justify-between items-center py-1 sm:py-1.5 border-b border-gray-100">
                          <span className="text-xs sm:text-sm text-gray-600">المجموع الفرعي:</span>
                          <span className="font-semibold text-xs sm:text-sm text-gray-800">
                            {selectedOrder.subtotal_price.toFixed(2)} ج.م
                          </span>
                        </div>
                      )}
                      {(() => {
                        const discountInfo = getOrderDiscountInfo(selectedOrder)
                        if (discountInfo.amount > 0) {
                          return (
                            <div className="flex justify-between items-center py-1 sm:py-1.5 border-b border-gray-100 bg-red-50 -mx-2 sm:-mx-4 px-2 sm:px-4 rounded-lg">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Percent className="w-4 h-4 text-red-600" />
                                <span className="text-xs sm:text-sm font-semibold text-red-700">الخصم:</span>
                                {discountInfo.percentage !== null && (
                                  <span className="text-[9px] sm:text-xs text-red-700 bg-red-100 px-1 sm:px-2 py-0.5 rounded font-bold">
                                    {discountInfo.percentage.toFixed(0)}%
                                  </span>
                                )}
                                <span className="text-[9px] sm:text-xs text-red-600 bg-red-100 px-1 sm:px-2 py-0.5 rounded">
                                  {discountInfo.source === "items" ? "من المنتجات" : "من الطلب"}
                                </span>
                              </div>
                              <span className="font-bold text-red-600 text-xs sm:text-base">
                                -{discountInfo.amount.toFixed(2)} ج.م
                              </span>
                            </div>
                          )
                        }
                        return null
                      })()}
                      {(() => {
                        const removedInfo = getRemovedItemsInfo(selectedOrder)
                        if (removedInfo.amount > 0) {
                          return (
                            <div className="flex justify-between items-center py-1 sm:py-1.5 border-b border-gray-100 bg-amber-50 -mx-2 sm:-mx-4 px-2 sm:px-4 rounded-lg">
                              <div className="flex items-center gap-1 sm:gap-2 text-amber-800">
                                <Trash2 className="w-4 h-4" />
                                <span className="text-xs sm:text-sm font-semibold">طرح منتجات محذوفة</span>
                                <span className="text-[9px] sm:text-xs bg-amber-100 px-1 sm:px-2 py-0.5 rounded font-bold">
                                  {removedInfo.count} منتج / {removedInfo.quantity} قطعة
                                </span>
                              </div>
                              <span className="font-bold text-amber-800 text-xs sm:text-base">
                                -{removedInfo.amount.toFixed(2)} ج.م
                              </span>
                            </div>
                          )
                        }
                        return null
                      })()}
                      {selectedOrder.total_tax !== undefined && selectedOrder.total_tax > 0 && (
                        <div className="flex justify-between items-center py-1 sm:py-1.5 border-b border-gray-100">
                          <span className="text-xs sm:text-sm text-gray-600">الضريبة:</span>
                          <span className="font-semibold text-xs sm:text-sm text-gray-800">
                            {selectedOrder.total_tax.toFixed(2)} ج.م
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t-2 border-gray-300">
                        {(() => {
                          const { fulfilledTotal, unfulfilledTotal, removedTotal } = getFulfillmentTotals(selectedOrder)
                          const adjustedTotal = Math.max(0, fulfilledTotal)
                          const showAdjustment = removedTotal > 0 || unfulfilledTotal > 0
                          return (
                            <>
                              <span className="text-sm sm:text-base font-bold text-gray-800">الإجمالي:</span>
                              <div className="text-right">
                                <span className="block text-base sm:text-xl font-bold text-green-600">
                                  {adjustedTotal.toFixed(2)} ج.م
                                </span>
                                {showAdjustment && (
                                  <span className="block text-[10px] sm:text-xs text-amber-700 font-semibold">
                                    بعد طرح غير منفذ/محذوف
                                  </span>
                                )}
                              </div>
                            </>
                          )
                        })()}
                      </div>
                      {selectedOrder.payment_gateway_names && selectedOrder.payment_gateway_names.length > 0 && (
                        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                          <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">بوابة الدفع:</p>
                          <p className="text-xs sm:text-sm font-semibold text-gray-800">
                            {selectedOrder.payment_gateway_names.join(', ')}
                          </p>
                        </div>
                      )}
                      {!selectedOrder.payment_gateway_names && (
                        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                          <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">طريقة الدفع:</p>
                          <p className="text-xs sm:text-sm font-semibold text-gray-800">
                            {getDisplayPaymentMethod(selectedOrder)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shipping Address Section - Compact */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl border-2 border-green-200 p-2.5 sm:p-5 shadow-lg animate-fadeIn">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-gray-800">عنوان الشحن</h4>
                    </div>
                    <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 border border-green-100 space-y-1 sm:space-y-1.5 text-xs sm:text-sm">
                      {(() => {
                        if (selectedOrder.shipping_address) {
                          try {
                            const addr = typeof selectedOrder.shipping_address === 'string' 
                              ? JSON.parse(selectedOrder.shipping_address) 
                              : selectedOrder.shipping_address
                            if (addr && (addr.name || addr.address1)) {
                              return (
                                <>
                                  <p className="font-semibold text-xs sm:text-sm text-gray-900">{addr.name || selectedOrder.customer_name}</p>
                                  {addr.address1 && <p className="text-xs sm:text-sm text-gray-700">{addr.address1}</p>}
                                  {addr.address2 && <p className="text-xs sm:text-sm text-gray-700">{addr.address2}</p>}
                                  <p className="text-xs sm:text-sm text-gray-700">
                                    {[addr.city, addr.province, addr.country].filter(Boolean).join(', ')}
                                  </p>
                                  {addr.zip && <p className="text-gray-600 text-[10px] sm:text-xs">ZIP: {addr.zip}</p>}
                                  {addr.phone && (
                                    <div className="flex items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-gray-100">
                                      <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
                                      <a href={`tel:${addr.phone}`} className="text-green-600 font-medium text-[10px] sm:text-xs">
                                        {addr.phone}
                                      </a>
                                    </div>
                                  )}
                                </>
                              )
                            }
                          } catch (e) {
                            console.error('Error parsing shipping address:', e)
                          }
                        }
                        return (
                          <>
                            <p className="font-semibold text-xs sm:text-sm text-gray-900">{selectedOrder.customer_name}</p>
                            <p className="text-xs sm:text-sm text-gray-700">{selectedOrder.address}</p>
                            <div className="flex items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-gray-100">
                              <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
                              <a href={`tel:${selectedOrder.mobile_number}`} className="text-green-600 font-medium text-[10px] sm:text-xs">
                                {selectedOrder.mobile_number}
                              </a>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Admin Notes Section - Prominent Display */}
                  {(selectedOrder.notes || selectedOrder.order_note || selectedOrder.customer_note) && (
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border-2 border-yellow-300 p-4 sm:p-5 shadow-lg animate-fadeIn">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-800">ملاحظات الإدارة</h4>
                        <span className="bg-yellow-200 text-yellow-800 px-2.5 py-1 rounded-full text-xs font-bold">
                          مهم
                        </span>
                      </div>
                      <div className="bg-white rounded-xl p-3 sm:p-4 border border-yellow-200">
                        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {renderNotesWithLinks(
                            selectedOrder.notes || selectedOrder.order_note || selectedOrder.customer_note || '', 
                            false
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <form
                  className="space-y-4 sm:space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSaveUpdate()
                  }}
                >
                  {/* Order Summary - Modern Design */}
                  <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl border-2 border-slate-200 shadow-lg p-4 sm:p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                        <Calculator className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">ملخص الطلب</h4>
                        <p className="text-xs text-gray-500">تفاصيل المبالغ والرسوم</p>
                      </div>
                    </div>
                    {(() => {
                      const { fulfilledTotal, unfulfilledTotal, removedTotal } = getFulfillmentTotals(selectedOrder)
                      const adjustedOrderForCalc = { ...selectedOrder, total_order_fees: fulfilledTotal }
                      const showAdjustment = removedTotal > 0 || unfulfilledTotal > 0
                      return (
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 space-y-3 border border-white/50">
                      <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600 font-medium">قيمة الطلب الأساسية:</span>
                        <span className="font-bold text-gray-900 text-base">
                          {fulfilledTotal.toFixed(2)} ج.م
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 px-3 bg-amber-50 rounded-lg border border-amber-100">
                        <span className="text-sm text-gray-700 font-medium">رسوم التوصيل:</span>
                        <span className="font-bold text-amber-700 text-base">{updateData.delivery_fee || "0.00"} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center py-2 px-3 bg-amber-50 rounded-lg border border-amber-100">
                        <span className="text-sm text-gray-700 font-medium">مبلغ جزئي:</span>
                        <span className="font-bold text-amber-700 text-base">
                          {updateData.partial_paid_amount || "0.00"} ج.م
                        </span>
                      </div>
                      <div className="border-t-2 border-gray-300 pt-3 mt-3 flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg px-3 py-2.5">
                        <span className="text-gray-800 font-bold text-base">
                          {updateData.status === "partial"
                            ? "المبلغ المحصل:"
                            : ["canceled", "return", "hand_to_hand", "receiving_part"].includes(updateData.status)
                              ? "إجمالي الرسوم:"
                              : "إجمالي الطلب:"}
                        </span>
                            <div className="text-right">
                              <span className="text-green-700 font-bold text-xl block">
                                {calculateTotalAmount(
                                  adjustedOrderForCalc as any,
                                  Number.parseFloat(updateData.delivery_fee) || 0,
                                  Number.parseFloat(updateData.partial_paid_amount) || 0,
                                  updateData.status,
                                ).toFixed(2)}{" "}
                                ج.م
                              </span>
                              {showAdjustment && (
                                <span className="text-[11px] text-amber-700 font-semibold block">
                                  بعد طرح غير منفذ/محذوف
                                </span>
                              )}
                            </div>
                      </div>
                      <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-lg text-xs text-blue-800 mt-2 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span><strong>ملاحظة:</strong> الرسوم منفصلة تماماً عن قيمة الطلب الأساسية ولا تُضاف إليها</span>
                      </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Status Selection - Modern Design */}
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 sm:p-5 shadow-md">
                    <label className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-base font-bold text-gray-800">
                        حالة الطلب <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <select
                      value={updateData.status}
                      onChange={(e) => {
                        setUpdateData({ ...updateData, status: e.target.value })
                      }}
                      className="w-full rounded-xl border-2 border-gray-300 px-4 py-3.5 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-blue-400 transition-colors shadow-sm"
                      required
                    >
                      {Object.entries(statusLabels).map(([key, { label }]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delivery Fee - Modern Design */}
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 sm:p-5 shadow-md">
                    <label className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-base font-bold text-gray-800">رسوم التوصيل</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={updateData.delivery_fee}
                        onChange={(e) => {
                          setUpdateData({ ...updateData, delivery_fee: e.target.value })
                        }}
                        className="w-full rounded-xl border-2 border-gray-300 px-4 py-3.5 pr-14 text-base font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white hover:border-amber-400 transition-colors shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={updateData.status === "return"}
                        placeholder="0.00"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-bold">ج.م</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      رسوم التوصيل منفصلة تماماً عن قيمة الطلب الأساسية
                    </p>
                  </div>

                  {/* Collection Fields - Modern Design */}
                  {["partial", "canceled", "delivered", "hand_to_hand", "return", "receiving_part"].includes(
                    updateData.status,
                  ) && (
                    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border-2 border-blue-200 shadow-lg p-4 sm:p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                          <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-800">تفاصيل التحصيل</h4>
                          <p className="text-xs text-gray-500">طريقة الدفع والتحصيل</p>
                        </div>
                      </div>
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 space-y-4 border border-white/50">
                      {(() => {
                        const currentMethod = normalizeMethod(selectedOrder.payment_method)
                        const isOrderOriginallyPaidOnline = isOrderPaid(selectedOrder)
                        const isOrderUnpaid = !isOrderPaid(selectedOrder)
                        const currentFee = Number.parseFloat(updateData.delivery_fee) || 0
                        const currentPartial = Number.parseFloat(updateData.partial_paid_amount) || 0
                        const isReturnStatus = updateData.status === "return"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const isReceivingPartWithNoFees =
                          updateData.status === "receiving_part" && currentFee === 0 && currentPartial === 0
                        const isHandToHandWithNoFees =
                          updateData.status === "hand_to_hand" && currentFee === 0 && currentPartial === 0
                        const isCanceledWithNoFees =
                          updateData.status === "canceled" && currentFee === 0 && currentPartial === 0

                        // Condition for the "Order Paid" message
                        const showOrderPaidMessage =
                          isOrderOriginallyPaidOnline && currentFee === 0 && currentPartial === 0

                        // Condition for the "Order Unpaid" message
                        const showOrderUnpaidMessage =
                          isOrderUnpaid &&
                          !isReturnStatus &&
                          !isHandToHandWithNoFees &&
                          !isCanceledWithNoFees &&
                          updateData.status !== "receiving_part"

                        // Condition for "Return Status" message
                        const showReturnStatusMessage = isReturnStatus



                        // Condition for "Hand to Hand No Fees" message
                        const showHandToHandNoFeesMessage = isHandToHandWithNoFees

                        // Condition for "Canceled No Fees" message
                        const showCanceledNoFeesMessage = isCanceledWithNoFees

                        // Condition to show Payment Sub-Type dropdown
                        // Allow payment type selection even for paid orders (courier can change if client pays differently)
                        const showPaymentSubTypeDropdown =
                          !isReturnStatus &&
                          !isHandToHandWithNoFees &&
                          !isCanceledWithNoFees &&
                          ((isOrderOriginallyPaidOnline && (currentFee > 0 || currentPartial > 0)) ||
                            (isOrderOriginallyPaidOnline && updateData.status !== "receiving_part") || // Allow for paid orders
                            (isOrderUnpaid && updateData.status !== "receiving_part") ||
                            (updateData.status === "canceled" && currentFee > 0) ||
                            (updateData.status === "receiving_part" && (currentFee > 0 || currentPartial > 0)))

                        // Condition to show Collected By dropdown
                        // Allow collected_by selection even for paid orders (courier can change if client pays differently)
                        const showCollectedByDropdown =
                          Object.keys(collectionMethodsForCourier).length > 0 &&
                          !isReturnStatus &&
                          !isHandToHandWithNoFees &&
                          !isCanceledWithNoFees &&
                          ((currentFee > 0 || currentPartial > 0) ||
                            (isOrderOriginallyPaidOnline && updateData.status !== "receiving_part")) && // Allow for paid orders
                          (isOrderOriginallyPaidOnline ||
                            (!isOrderOriginallyPaidOnline && !isOrderUnpaid && updateData.status !== "canceled"))

                        return (
                          <>
                            {showOrderPaidMessage && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-green-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">طلب مدفوع</span>
                                </div>
                                <p className="text-xs text-green-600 mt-1">
                                  هذا الطلب مدفوع بالفعل عبر {allCollectionMethods[currentMethod] || currentMethod}.
                                  يمكنك تغيير طريقة الدفع إذا دفع العميل نقداً أو بطريقة أخرى.
                                </p>
                              </div>
                            )}

                            {showReturnStatusMessage && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-yellow-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">طلب مؤجل</span>
                                </div>
                                <p className="text-xs text-yellow-600 mt-1">
                                  الطلبات المؤجلة لا تتطلب تحصيل رسوم. سيتم حساب الإجمالي كصفر.
                                </p>
                              </div>
                            )}

                            {updateData.status === "receiving_part" && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-blue-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">استلام قطعة</span>
                                </div>
                                <p className="text-xs text-blue-600 mt-1">
                                  {currentFee === 0 && currentPartial === 0 ? (
                                    "يمكنك إضافة رسوم التوصيل أو المبلغ الجزئي حسب الحاجة. إذا أضفت مبالغ، سيُطلب منك اختيار طريقة الدفع."
                                  ) : (
                                    "تم إضافة مبالغ - يرجى اختيار طريقة الدفع المطلوبة."
                                  )}
                                </p>
                              </div>
                            )}

                            {showHandToHandNoFeesMessage && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-purple-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">استبدال بدون رسوم</span>
                                </div>
                                <p className="text-xs text-purple-600 mt-1">
                                  لا يتطلب اختيار طريقة دفع عند عدم وجود رسوم توصيل أو مبلغ جزئي.
                                </p>
                              </div>
                            )}

                            {showCanceledNoFeesMessage && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">طلب ملغي بدون رسوم</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  الطلبات الملغاة بدون رسوم سيتم حساب إجماليها كصفر تلقائياً.
                                </p>
                              </div>
                            )}

                            {showOrderUnpaidMessage && (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-orange-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">طلب غير مدفوع</span>
                                </div>
                                <p className="text-xs text-orange-600 mt-1">
                                  يمكن للمندوب اختيار طريقة الدفع المناسبة لهذا الطلب.
                                </p>
                              </div>
                            )}

                            {showPaymentSubTypeDropdown && (
                              <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                                <label className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <CreditCard className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="text-base font-bold text-gray-800">
                                    طريقة الدفع {isOrderUnpaid ? "(للطلب غير المدفوع)" : "(نوع الدفع الفرعي)"}
                                  </span>
                                </label>
                                <select
                                  value={updateData.payment_sub_type}
                                  onChange={(e) => {
                                    const selectedValue = e.target.value
                                    console.log('Payment method selected:', selectedValue)
                                    setUpdateData({ ...updateData, payment_sub_type: selectedValue })
                                  }}
                                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3.5 text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white hover:border-indigo-400 transition-colors shadow-sm"
                                  required={
                                    showPaymentSubTypeDropdown &&
                                    (isOrderUnpaid ||
                                      (updateData.collected_by === "courier" && !isOrderOriginallyPaidOnline) ||
                                      (updateData.status === "canceled" && currentFee > 0))
                                  }
                                >
                                  <option value="">اختر طريقة الدفع</option>
                                  {Object.entries(paymentSubTypesForCourier).map(([key, label]) => (
                                    <option key={key} value={key}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {showCollectedByDropdown && (
                              <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                                <label className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                                    <UserCheck className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="text-base font-bold text-gray-800">تم تحصيل الدفع بواسطة</span>
                                </label>
                                <select
                                  value={updateData.collected_by}
                                  onChange={(e) => {
                                    setUpdateData({ ...updateData, collected_by: e.target.value })
                                  }}
                                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3.5 text-base font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white hover:border-teal-400 transition-colors shadow-sm"
                                  required={showCollectedByDropdown}
                                >
                                  <option value="">اختر الطريقة</option>
                                  {Object.entries(collectionMethodsForCourier).map(([key, label]) => (
                                    <option key={key} value={key}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </>
                        )
                      })()}

                        {/* Partial Amount - Modern Design */}
                        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                          <label className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                              <DollarSign className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-base font-bold text-gray-800">المبلغ المدفوع جزئياً</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={updateData.partial_paid_amount}
                              onChange={(e) => {
                                setUpdateData({ ...updateData, partial_paid_amount: e.target.value })
                              }}
                              className="w-full rounded-xl border-2 border-gray-300 px-4 py-3.5 pr-14 text-base font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:border-purple-400 transition-colors shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                              disabled={updateData.status === "return"}
                              placeholder="0.00"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-bold">ج.م</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            للطلبات الجزئية - هذا المبلغ منفصل عن قيمة الطلب الأساسية
                          </p>
                        </div>

                        {/* Zero Amount Warning */}
                        {["canceled", "return", "hand_to_hand", "receiving_part"].includes(updateData.status) && (
                          <div className="bg-yellow-50/80 border-2 border-yellow-300 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-yellow-800 mb-2">
                              <AlertCircle className="w-5 h-5" />
                              <span className="text-sm font-bold">تنبيه</span>
                            </div>
                            <p className="text-xs text-yellow-700 leading-relaxed">
                              إذا لم يتم وضع أي رسوم، سيتم حساب إجمالي الطلب كصفر (الرسوم منفصلة عن قيمة الطلب الأساسية)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Internal Comment - Modern Design */}
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 sm:p-5 shadow-md">
                    <label className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-slate-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-base font-bold text-gray-800">التعليق الداخلي</span>
                    </label>
                    <textarea
                      rows={4}
                      value={updateData.internal_comment}
                      onChange={(e) => {
                        setUpdateData({ ...updateData, internal_comment: e.target.value })
                      }}
                      className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white hover:border-gray-400 transition-colors shadow-sm resize-none"
                      placeholder="أضف أي ملاحظات أو تعليقات..."
                    />
                  </div>

                  {/* Image Upload - Multiple Images Support */}
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 sm:p-5 shadow-md">
                    <label className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <Camera className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-base font-bold text-gray-800">رفع صور الإثبات</span>
                      {selectedOrder.order_proofs && selectedOrder.order_proofs.length > 0 && (
                        <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-bold">
                          {selectedOrder.order_proofs.length} صورة
                        </span>
                      )}
                    </label>
                    <div 
                      className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 text-center hover:border-green-400 transition-colors bg-gradient-to-br from-gray-50 to-white"
                      style={{ touchAction: 'manipulation' }}
                    >
                      {/* File inputs are now inside the button containers above for better mobile support */}

                      <div className="space-y-4 relative" style={{ pointerEvents: 'auto', touchAction: 'manipulation', zIndex: 1 }}>
                        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto">
                          {imageUploading ? (
                            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                          ) : (
                            <Camera className="w-8 h-8 text-green-600" />
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                          {/* Camera Button with Overlay Input */}
                          <div className="relative w-full sm:w-auto" style={{ position: 'relative', display: 'inline-block', zIndex: 1 }}>
                            <button
                              type="button"
                              disabled={imageUploading}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (!imageUploading && cameraInputRef.current) {
                                  cameraInputRef.current.click()
                                }
                              }}
                              style={{
                                touchAction: 'manipulation',
                                WebkitTapHighlightColor: 'rgba(0,0,0,0.1)',
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                minHeight: '44px',
                                minWidth: '44px',
                                width: '100%',
                                pointerEvents: 'auto', // Allow button clicks as fallback
                              }}
                              className={`w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg ${
                                imageUploading ? "opacity-50" : ""
                              }`}
                            >
                              <span className="flex items-center gap-2 justify-center pointer-events-none">
                                <Camera className="w-4 h-4" />
                                التقط صورة الآن
                              </span>
                            </button>
                            {/* File input overlaying the button - handles all clicks on mobile */}
                            <input
                              type="file"
                              accept="image/*"
                              capture
                              ref={cameraInputRef}
                              onChange={(e) => {
                                console.log("[v0] Camera input onChange triggered", e.target.files)
                                handleImageChange(e)
                              }}
                              disabled={imageUploading}
                              style={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                width: '100%',
                                height: '100%',
                                opacity: 0,
                                cursor: 'pointer',
                                zIndex: 9999,
                                pointerEvents: 'auto', // Always allow clicks
                                touchAction: 'manipulation',
                                WebkitUserSelect: 'none',
                                userSelect: 'none',
                                WebkitTapHighlightColor: 'transparent',
                                fontSize: '16px', // Prevents iOS zoom on focus
                                WebkitAppearance: 'none',
                                appearance: 'none',
                              } as React.CSSProperties}
                              id="image-upload-camera"
                              aria-label="Take a photo"
                            />
                          </div>

                          {/* Gallery Button with Overlay Input */}
                          <div className="relative w-full sm:w-auto" style={{ position: 'relative', display: 'inline-block', zIndex: 1 }}>
                            <button
                              type="button"
                              disabled={imageUploading}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (!imageUploading && galleryInputRef.current) {
                                  galleryInputRef.current.click()
                                }
                              }}
                              style={{
                                touchAction: 'manipulation',
                                WebkitTapHighlightColor: 'rgba(0,0,0,0.1)',
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                minHeight: '44px',
                                minWidth: '44px',
                                width: '100%',
                                pointerEvents: 'auto', // Allow button clicks as fallback
                              }}
                              className={`w-full sm:w-auto px-5 py-3 bg-white text-green-700 border-2 border-green-500 rounded-xl font-bold text-sm transition-all shadow-lg ${
                                imageUploading ? "opacity-50" : ""
                              }`}
                            >
                              <span className="flex items-center gap-2 justify-center pointer-events-none">
                                <Upload className="w-4 h-4" />
                                اختر من المعرض
                              </span>
                            </button>
                            {/* File input overlaying the button - handles all clicks on mobile */}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              ref={galleryInputRef}
                              onChange={(e) => {
                                console.log("[v0] Gallery input onChange triggered", e.target.files)
                                handleImageChange(e)
                              }}
                              disabled={imageUploading}
                              style={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                width: '100%',
                                height: '100%',
                                opacity: 0,
                                cursor: 'pointer',
                                zIndex: 9999,
                                pointerEvents: 'auto', // Always allow clicks
                                touchAction: 'manipulation',
                                WebkitUserSelect: 'none',
                                userSelect: 'none',
                                WebkitTapHighlightColor: 'transparent',
                                fontSize: '16px', // Prevents iOS zoom on focus
                                WebkitAppearance: 'none',
                                appearance: 'none',
                              } as React.CSSProperties}
                              id="image-upload-gallery"
                              aria-label="Upload images from gallery"
                            />
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          على الهاتف يمكنك فتح الكاميرا مباشرة أو اختيار صورك من المعرض
                        </p>

                        {uploadingImages.length > 0 && (
                          <div className="mt-3 space-y-1">
                            <p className="text-xs text-blue-600 font-medium">جاري رفع:</p>
                            {uploadingImages.map((fileName, idx) => (
                              <div key={idx} className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded">
                                {fileName}
                              </div>
                            ))}
                          </div>
                        )}
                        {imageUploadSuccess && (
                          <p className="text-xs text-green-600 mt-2 flex items-center justify-center gap-1.5 font-bold">
                            <CheckCircle className="w-4 h-4" />
                            تم رفع الصور بنجاح!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Current Images - Enhanced with Better Removal */}
                  {selectedOrder.order_proofs && selectedOrder.order_proofs.length > 0 && (
                    <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 sm:p-5 shadow-md">
                      <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-base font-bold text-gray-800">
                            صور الإثبات الحالية
                          </span>
                        </label>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-bold">
                          {selectedOrder.order_proofs.length} {selectedOrder.order_proofs.length === 1 ? 'صورة' : 'صور'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedOrder.order_proofs.map((proof, idx) => (
                          <div key={proof.id} className="relative group bg-gray-50 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all">
                            <div className="aspect-square relative">
                              <img
                                src={proof.image_data || "/placeholder.svg"}
                                alt={`إثبات ${idx + 1}`}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  window.open(proof.image_data, "_blank")
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" textAnchor="middle" dy=".3em" fill="%239ca3af" fontSize="12"%3ENo Image%3C/text%3E%3C/svg%3E'
                                }}
                              />
                              {/* Overlay on hover */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center pointer-events-none">
                                <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                              </div>
                              {/* Remove button - Always visible on mobile, on hover on desktop */}
                            <button
                              type="button"
                              title="حذف الصورة"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleRemoveImage(proof.id)
                              }}
                              className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg opacity-100 sm:opacity-90 sm:group-hover:opacity-100 transition-all z-10 active:scale-95"
                            >
                              <X className="w-4 h-4" />
                            </button>
                              {/* Image number badge */}
                              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full">
                                #{idx + 1}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        اضغط على الصورة لعرضها بالحجم الكامل، أو اضغط على X لحذفها
                      </p>
                    </div>
                  )}

                  {/* Action Buttons - Modern Design */}
                  <div className="bg-gradient-to-t from-white via-white to-transparent border-t-2 border-gray-200 pt-6 pb-4 sm:pb-6 -mx-4 sm:-mx-6 px-4 sm:px-6 backdrop-blur-sm">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setModalOpen(false)
                          setSelectedOrder(null)
                          setCardPosition(null)
                          if (cardPositionRef.current) {
                            cardPositionRef.current = null
                          }
                          // Restore body scroll
                          document.body.style.overflow = ''
                          document.documentElement.style.overflow = ''
                        }}
                        className="flex-1 px-4 py-4 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 font-bold transition-all active:scale-95 text-base shadow-md border-2 border-gray-300"
                        disabled={saving}
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSaveUpdate()
                        }}
                        disabled={saving}
                        className="flex-1 px-4 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-xl border-2 border-blue-800"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>جاري الحفظ...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            <span>حفظ التغييرات</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>



      </div>

      {/* Image Modal - Large View */}
      {imageModalOpen && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setImageModalOpen(false)
            setSelectedImage(null)
          }}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => {
                setImageModalOpen(false)
                setSelectedImage(null)
              }}
              className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Large Image */}
            <img
              src={selectedImage || "/placeholder.svg"}
              alt="Product Image"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" textAnchor="middle" dy=".3em" fill="%239ca3af" fontSize="16"%3EImage Not Available%3C/text%3E%3C/svg%3E'
                target.onerror = null
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default OrdersList
