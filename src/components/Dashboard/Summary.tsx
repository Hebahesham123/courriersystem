"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import {
  DollarSign,
  CreditCard,
  Wallet,
  XCircle,
  Clock,
  Package,
  CheckCircle,
  Truck,
  HandMetal,
  Banknote,
  Smartphone,
  Calendar,
  User,
  Eye,
  X,
  Filter,
  ArrowLeft,
  Users,
  HandCoins,
  Monitor,
  Calculator,
  Receipt,
  RefreshCw,
  Edit3,
  Save,
  Trash2,
  Plus,
  AlertCircle,
  MapPin,
  Copy,
  ExternalLink,
  Phone,
  Info,
  BarChart3,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"
// useLanguage is unused
// import { useLanguage } from "../../contexts/LanguageContext"
import { useModalScrollPreserve } from "../../lib/useModalScrollPreserve"

interface OrderProof {
  id: string
  image_data: string
}



interface Order {
  id: string
  order_id: string
  customer_name: string
  address: string
  mobile_number: string
  total_order_fees: number | string
  delivery_fee: number | string | null
  payment_method: string
  payment_sub_type: string | null
  status: string
  partial_paid_amount: number | string | null
  internal_comment: string | null
  collected_by: string | null
  assigned_courier_id: string | null
  updated_at: string
  notes?: string | null
  order_proofs?: OrderProof[]

  hold_fee?: number | null
  hold_fee_comment?: string | null
  hold_fee_created_by?: string | null
  hold_fee_created_at?: string | null
  hold_fee_added_at?: string | null
  hold_fee_removed_at?: string | null
  admin_delivery_fee?: number | null
  extra_fee?: number | null
  payment_status?: string
  onther_payments?: string | { method: string; amount: string }[]
  courier_name?: string | null
  courier_email?: string | null
  // Allow extra properties for temporary fields (like _onther_amount)
  [key: string]: any
}

interface CourierSummary {
  courierId: string
  courierName: string
}

interface DateRange {
  startDate: string
  endDate: string
}

// Updated normalize function to handle all sub-methods for onther payments
const normalizePaymentMethod = (method = ""): "cash" | "paymob" | "valu" | "visa_machine" | "instapay" | "wallet" | "on_hand" | "other" => {
  const m = method.toLowerCase().trim()
  // Treat accounting collectors (e.g., CAR, Emad) as cash on hand for summaries
  if (m.includes("car") || m.includes("emad") || m.includes("cae")) return "on_hand"
  if (m.includes("valu") || m.includes("paymob.valu")) return "valu"
  if (m === "visa_machine") return "visa_machine"
  if (m === "instapay") return "instapay"
  if (m === "wallet") return "wallet"
  if (m === "on_hand" || m === "on hand") return "on_hand"
  if (
    m === "paymob" ||
    m.includes("paymob") ||
    m.includes("pay mob") ||
    m.includes("باي موب") ||
    m.includes("visa") ||
    m.includes("mastercard") ||
    m.includes("card") ||
    m.includes("credit") ||
    m.includes("debit")
  )
    return "paymob"
  if (m === "cash" || m === "cod" || m.includes("cash on delivery") || m === "cash_on_delivery") return "cash"
  // Debug: log any sub-methods that are grouped as 'other'
  if (m && m !== "other") {
    if (typeof window !== 'undefined' && window.console) {
      window.console.warn("[normalizePaymentMethod] Unrecognized payment method, grouped as 'other':", method)
    }
  }
  return "other"
}

// Helper function to get the display payment method (with translation)
const getDisplayPaymentMethod = (order: Order, t?: (key: string) => string): string => {
  // For other cases, use normalized payment method
  if (order.payment_sub_type && order.payment_sub_type !== 'onther') {
    const normalized = normalizePaymentMethod(order.payment_sub_type)
    const label = t ? t(normalized) : normalized
    if (label === normalized) {
      if (typeof window !== 'undefined' && window.console) {
        window.console.warn('[getDisplayPaymentMethod] No translation for normalized payment_sub_type:', normalized)
      }
    }
    return label
  }
  if (order.collected_by) {
    const label = t ? t(order.collected_by) : order.collected_by
    if (label === order.collected_by) {
      if (typeof window !== 'undefined' && window.console) {
        window.console.warn('[getDisplayPaymentMethod] No translation for collected_by:', order.collected_by)
      }
    }
    return label
  }
  const normalized = normalizePaymentMethod(order.payment_method || "")
  const label = t ? t(normalized) : normalized
  if (label === normalized) {
    if (typeof window !== 'undefined' && window.console) {
      window.console.warn('[getDisplayPaymentMethod] No translation for payment_method:', normalized)
    }
  }
  return label
}

const Summary: React.FC = () => {
  const { user } = useAuth()
  // t is unused according to linter
  // const { t } = useLanguage()

  const translate = useRef((key: string) => {
    const translations: Record<string, string> = {
      loading: "جاري التحميل...",
      pleaseLogin: "يرجى تسجيل الدخول",
      noDataForDate: "لا توجد بيانات لهذا التاريخ",
      todaySummary: "ملخص اليوم",
      selectDate: "اختر التاريخ",
      courier: "المندوب",
      ordersCount: "طلبات",
      amount: "المبلغ",
      EGP: "ج.م",
      backToCouriers: "العودة للمندوبين",
      selectCourier: "اختر مندوب لعرض تفاصيله",
      couriersList: "قائمة المندوبين",
      // Date Range
      today: "اليوم",
      yesterday: "أمس",
      last7Days: "آخر 7 أيام",
      last30Days: "آخر 30 يوم",
      customRange: "فترة مخصصة",
      from: "من",
      to: "إلى",
      apply: "تطبيق",
      // Analytics
      totalAnalytics: "إجمالي التحليلات",
      overallPerformance: "الأداء العام",
      orderStatusBreakdown: "توزيع حالة الطلبات",
      paymentMethodsAnalysis: "تحليل طرق الدفع",
      courierPerformance: "أداء المندوبين",
      dailyTrends: "الاتجاهات اليومية",
      // Order Status Metrics
      totalAssignedOrders: "إجمالي الطلبات المكلفة",
      deliveredOrders: "الطلبات المسلمة",
      canceledOrders: "الطلبات الملغاة",
      partialOrders: "الطلبات الجزئية",
      handToHandOrders: "الطلبات يد بيد",
      returnOrders: "الطلبات المؤجله",
      assignedOrders: "الطلبات المكلفة",
      receivingPartOrders: "طلبات استلام قطعه",
      totalOrders: "إجمالي الطلبات",
      totalDeliveryOrders: "إجمالي طلبات التوصيل",
      totalDeliveryFees: "إجمالي رسوم التوصيل",
      totalPartialFees: "إجمالي المبالغ الجزئية",
      // Accounting
      accountingDifference: "الفرق المحاسبي",
      paymentBreakdown: "تفصيل طرق الدفع",
      totalHandToAccounting: "إجمالي ما يسلم للمحاسبة",
      orderValue: "قيمة الطلبات",
      deliveryFeesValue: "قيمة رسوم التوصيل",
      totalValue: "القيمة الإجمالية",
      // Electronic Payment Methods
      paymobOrders: "طلبات paymob",
      valuOrders: "طلبات فاليو",
      // Cash-based Payment Sub-types
      cashOnHandOrders: "طلبات نقداً",
      instapayOrders: "طلبات إنستاباي",
      walletOrders: "طلبات المحفظة",
      visaMachineOrders: "طلبات ماكينة فيزا",
      totalCODOrders: "إجمالي الدفع عند التسليم",
      // Collection Metrics
      totalCashOnHand: "إجمالي النقد في اليد",
      totalPaymobCollected: "إجمالي paymob محصل",
      totalValuCollected: "إجمالي فاليو محصل",
      deliveryFeesCollected: "رسوم التوصيل المحصلة",
      totalCollected: "إجمالي المحصل",
      totalRevenue: "إجمالي الإيرادات",
      averageOrderValue: "متوسط قيمة الطلب",
      successRate: "معدل النجاح",
      orderId: "رقم الطلب",
      customer: "العميل",
      total: "الإجمالي",
      status: "الحالة",
      address: "العنوان",
      phone: "الهاتف",
      comment: "تعليق",
      close: "إغلاق",
      paymentMethod: "طريقة الدفع",
      collectedBy: "محصل بواسطة",
      partialAmount: "المبلغ الجزئي",
      deliveryFee: "رسوم التوصيل",
      assigned: "مكلف",
      delivered: "تم التوصيل",
      canceled: "ملغي",
      partial: "جزئي",
      hand_to_hand: "استبدال",
      return: "مؤجل",
      receiving_part: "استلام قطعه",
      cash: "نقداً",
      paymob: "باي موب",
      valu: "فاليو",
      on_hand: "نقداً",
      instapay: "إنستاباي",
      wallet: "المحفظة",
      visa_machine: "ماكينة فيزا",
      orderTotalLabel: "إجمالي الطلب",
      partialAmountLabel: "المبلغ الجزئي",
      orderAmountCollectedLabel: "مبلغ الطلب المحصل",
      totalCourierHandledLabel: "إجمالي ما تعامل معه المندوب",
      paymentSubTypeLabel: "نوع الدفع",
      proofImagesLabel: "صور الإثبات",
      // Hold Fees
      holdFee: "رسوم الحجز",
      holdFeeAmount: "مبلغ الحجز",
      holdFeeComment: "تعليق الحجز",
      addHoldFee: "إضافة رسوم حجز",
      editHoldFee: "تعديل رسوم الحجز",
      removeHoldFee: "إزالة رسوم الحجز",
      save: "حفظ",
      cancel: "إلغاء",
      enterAmount: "أدخل المبلغ",
      enterComment: "أدخل التعليق",
      holdFeeAddedBy: "أضيفت بواسطة",
      holdFeeAddedAt: "تاريخ الإضافة",
    }
    return translations[key] || key
  }).current

  const [summaryList, setSummaryList] = useState<CourierSummary[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [allHoldFeesOrders, setAllHoldFeesOrders] = useState<Order[]>([]) // New state for all hold fees regardless of date
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([])
  const [modalTitle, setModalTitle] = useState("")
  const [refreshKey, setRefreshKey] = useState(0) // Force refresh counter

  // Hold Fee Management States
  const [editingHoldFee, setEditingHoldFee] = useState<string | null>(null)
  const [holdFeeAmount, setHoldFeeAmount] = useState("")
  const [holdFeeComment, setHoldFeeComment] = useState("")
  const [holdFeeLoading, setHoldFeeLoading] = useState(false)

  // Helper function to get today's date in YYYY-MM-DD format (local timezone)
  const getTodayDateString = useCallback(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = (today.getMonth() + 1).toString().padStart(2, "0") // Months are 0-indexed
    const day = today.getDate().toString().padStart(2, "0")
    return `${year}-${month}-${day}`
  }, [])

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: getTodayDateString(),
    endDate: getTodayDateString(),
  })
  const [selectedCourier, setSelectedCourier] = useState<CourierSummary | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>("today")
  const [initialCourierApplied, setInitialCourierApplied] = useState(false)
  
  // Hold section date filter state
  const [holdDateFilter, setHoldDateFilter] = useState<string>("all")
  const [customHoldDate, setCustomHoldDate] = useState<string>("")
  const [includeHoldFeesInPayment, setIncludeHoldFeesInPayment] = useState<boolean>(true)
  const [courierFeeAmount, setCourierFeeAmount] = useState<string>("")
  const [courierFees, setCourierFees] = useState<Record<string, string>>({})

  // Check if user is courier for mobile optimization
  const isCourier = user?.role === "courier"
  const isAdmin = user?.role === "admin"

  // Scroll preservation hooks for modals
  const ordersModalScroll = useModalScrollPreserve('summary-orders-modal', {
    persistToLocalStorage: true,
    restoreDelay: 150,
    saveOnScroll: true,
    autoRestore: true
  })

  // Get current day's courier fee
  const getCurrentDayFee = () => {
    return courierFees[dateRange.startDate] || ""
  }

  // Save courier fee for specific date
  const saveCourierFee = () => {
    if (!courierFeeAmount) return
    setCourierFees(prev => ({
      ...prev,
      [dateRange.startDate]: courierFeeAmount
    }))
    setCourierFeeAmount("")
  }

  // Remove courier fee for specific date
  const removeCourierFee = () => {
    setCourierFees(prev => {
      const newFees = { ...prev }
      delete newFees[dateRange.startDate]
      return newFees
    })
    setCourierFeeAmount("")
  }

  // Function to filter hold fees by date - prioritize removal date over addition date
  const getFilteredHoldFees = useCallback((orders: Order[], filterType: string) => {
    if (filterType === "all") return orders
    
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    
    switch (filterType) {
      case "today":
        return orders.filter(order => {
          // Prioritize removal date over addition date
          const holdDate = order.hold_fee_removed_at || order.hold_fee_added_at || order.hold_fee_created_at
          if (!holdDate) return false
          const holdDateString = new Date(holdDate).toISOString().split('T')[0]
          return holdDateString === todayString
        })
      case "yesterday":
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayString = yesterday.toISOString().split('T')[0]
        return orders.filter(order => {
          // Prioritize removal date over addition date
          const holdDate = order.hold_fee_removed_at || order.hold_fee_added_at || order.hold_fee_created_at
          if (!holdDate) return false
          const holdDateString = new Date(holdDate).toISOString().split('T')[0]
          return holdDateString === yesterdayString
        })
      case "last7days":
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return orders.filter(order => {
          // Prioritize removal date over addition date
          const holdDate = order.hold_fee_removed_at || order.hold_fee_added_at || order.hold_fee_created_at
          if (!holdDate) return false
          const holdDateString = new Date(holdDate).toISOString().split('T')[0]
          const sevenDaysAgoString = sevenDaysAgo.toISOString().split('T')[0]
          return holdDateString >= sevenDaysAgoString && holdDateString <= todayString
        })
      case "last30days":
        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return orders.filter(order => {
          // Prioritize removal date over addition date
          const holdDate = order.hold_fee_removed_at || order.hold_fee_added_at || order.hold_fee_created_at
          if (!holdDate) return false
          const holdDateString = new Date(holdDate).toISOString().split('T')[0]
          const thirtyDaysAgoString = thirtyDaysAgo.toISOString().split('T')[0]
          return holdDateString >= thirtyDaysAgoString && holdDateString <= todayString
        })
      case "custom":
        if (!customHoldDate) return orders
        return orders.filter(order => {
          // Prioritize removal date over addition date
          const holdDate = order.hold_fee_removed_at || order.hold_fee_added_at || order.hold_fee_created_at
          if (!holdDate) return false
          const holdDateString = new Date(holdDate).toISOString().split('T')[0]
          return holdDateString === customHoldDate
        })
      default:
        return orders
    }
  }, [customHoldDate])

  // Function to fetch all hold fees data - ALWAYS fetch ALL hold fees regardless of date range
  const fetchAllHoldFeesData = useCallback(async () => {
    if (!user?.id) return
    try {
      let holdFeesOrders: Order[] = []
      if (user.role === "courier") {
        // For courier users, get ALL their orders with hold fee activity (past or present)
        const { data } = await supabase
          .from("orders")
          .select(`
            *,
            order_proofs (id, image_data)
          `)
          .eq("assigned_courier_id", user.id)
          // Get orders that have hold fee activity (either added or removed)
          .or(`hold_fee.gt.0,hold_fee_added_at.not.is.null,hold_fee_removed_at.not.is.null,hold_fee_created_at.not.is.null`)
        
        holdFeesOrders = (data ?? []) as Order[]
      } else {
        // For admin users - fetch ALL orders with hold fee activity from ALL couriers
        const { data } = await supabase
          .from("orders")
          .select(`
            *,
            order_proofs (id, image_data),
            assigned_courier:users!orders_assigned_courier_id_fkey(id, name, email)
          `)
          // Get orders that have hold fee activity (either added or removed)
          .or(`hold_fee.gt.0,hold_fee_added_at.not.is.null,hold_fee_removed_at.not.is.null,hold_fee_created_at.not.is.null`)
        
        // Map courier name to orders
        holdFeesOrders = ((data ?? []) as any[]).map((order: any) => ({
          ...order,
          courier_name: order.assigned_courier?.name || null,
          courier_email: order.assigned_courier?.email || null,
        })) as Order[]
      }
      setAllHoldFeesOrders(holdFeesOrders)
    } catch (error) {
      console.error("Error fetching all hold fees data:", error)
      setAllHoldFeesOrders([])
    }
  }, [user?.id, user?.role])

  const fetchSummary = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      console.log('=== FETCHING SUMMARY DATA ===')
      console.log('User role:', user.role)
      console.log('Selected courier:', selectedCourier)
      console.log('Show analytics:', showAnalytics)
      console.log('Date range:', dateRange)
      
      // Use consistent UTC boundaries for all queries to avoid timezone drift
      const startDateTime = new Date(dateRange.startDate)
      startDateTime.setHours(0, 0, 0, 0)
      const endDateTime = new Date(dateRange.endDate)
      endDateTime.setHours(23, 59, 59, 999)
      const startDateISO = startDateTime.toISOString()
      const endDateISO = endDateTime.toISOString()
      
      let orders: Order[] = []
      
      if (user.role === "courier") {
        // For courier users, fetch orders assigned on the selected date
        // Primary filter: assigned_at (when order was assigned to courier)
        // Fallback: created_at (for legacy orders without assigned_at)
        console.log('Fetching orders for courier user:', user.name)
        
        // Try assigned_at first (accurate assignment date)
        const { data: assignedAtOrders, error: assignedAtError } = await supabase
          .from("orders")
          .select(`
            *,
            order_proofs (id, image_data)
          `)
          .eq("assigned_courier_id", user.id)
          .gte("assigned_at", startDateISO)
          .lte("assigned_at", endDateISO)
        
        // Legacy fallback: some old orders don't have assigned_at.
        // For those, rely on their creation date instead of updated_at
        // to avoid pulling previously assigned orders that only had
        // status changes today.
        const { data: createdAtLegacyOrders, error: createdAtLegacyError } = await supabase
          .from("orders")
          .select(`
            *,
            order_proofs (id, image_data)
          `)
          .eq("assigned_courier_id", user.id)
          .is("assigned_at", null)  // Only get orders WITHOUT assigned_at
          .gte("created_at", startDateISO)
          .lte("created_at", endDateISO)
        
        // Merge both results
        const orderMap = new Map<string, Order>()
        for (const order of (assignedAtOrders || []) as Order[]) {
          orderMap.set(order.id, order)
        }
        for (const order of (createdAtLegacyOrders || []) as Order[]) {
          if (!orderMap.has(order.id)) {
            orderMap.set(order.id, order)
          }
        }
        
        const error = assignedAtError || createdAtLegacyError
        if (error) {
          console.error('Error fetching courier orders:', error)
          orders = []
        } else {
          orders = Array.from(orderMap.values())
        }
        
        console.log(`Found ${orders.length} orders for courier in date range`)
        
        const courierName = user.name ?? translate("courier")
        setSummaryList([{ courierId: user.id, courierName: courierName }])
        setAllOrders(orders)
        
      } else {
        // For admin users
        console.log('Fetching couriers list...')
        const { data: couriers } = await supabase.from("users").select("id, name").eq("role", "courier")
        setSummaryList((couriers ?? []).map((c) => ({ courierId: c.id, courierName: c.name ?? "مندوب" })))

        if (selectedCourier) {
          // If a courier is selected, fetch all their orders for the date range
          console.log('Fetching orders for selection:', selectedCourier.courierName)
          
          const isTotal = selectedCourier.courierId === 'total'
          
          // Fetch by updated_at
          let queryUpdate = supabase
            .from("orders")
            .select(`
              *,
              order_proofs (id, image_data),
              assigned_courier:users!orders_assigned_courier_id_fkey(id, name, email)
            `)
            .gte("updated_at", startDateISO)
            .lte("updated_at", endDateISO)

          if (!isTotal) {
            queryUpdate = queryUpdate.or(`assigned_courier_id.eq.${selectedCourier.courierId},original_courier_id.eq.${selectedCourier.courierId}`)
          }
          
          const { data: updatedAtData, error: updatedAtError } = await queryUpdate
          
          // Also fetch by assigned_at
          let queryAssign = supabase
            .from("orders")
            .select(`
              *,
              order_proofs (id, image_data),
              assigned_courier:users!orders_assigned_courier_id_fkey(id, name, email)
            `)
            .not("assigned_at", "is", null)
            .gte("assigned_at", startDateISO)
            .lte("assigned_at", endDateISO)

          if (!isTotal) {
            queryAssign = queryAssign.or(`assigned_courier_id.eq.${selectedCourier.courierId},original_courier_id.eq.${selectedCourier.courierId}`)
          }
          
          const { data: assignedAtData } = await queryAssign
          
          if (updatedAtError) {
            console.error('Error fetching selected courier orders:', updatedAtError)
            orders = []
          } else {
            // Merge both results, removing duplicates
            const orderMap = new Map<string, any>()
            for (const order of (assignedAtData || [])) {
              orderMap.set(order.id, order)
            }
            for (const order of (updatedAtData || [])) {
              if (!orderMap.has(order.id)) {
                orderMap.set(order.id, order)
              }
            }
            
            // Map courier information to orders
            orders = Array.from(orderMap.values()).map((order: any) => ({
              ...order,
              courier_name: order.assigned_courier?.name || selectedCourier.courierName || null,
              courier_email: order.assigned_courier?.email || null,
            })) as Order[]
          }
          
          console.log(`Found ${orders.length} orders for selected courier in date range`)
          
        } else if (showAnalytics) {
          // If showing analytics, fetch ALL orders from ALL couriers for the date range
          // Check both updated_at and assigned_at to ensure assigned orders are included
          console.log('Fetching ALL orders from ALL couriers for analytics')
          
          // Fetch by updated_at
          const { data: updatedAtData, error: updatedAtError } = await supabase
            .from("orders")
            .select(`
              *,
              order_proofs (id, image_data),
              assigned_courier:users!orders_assigned_courier_id_fkey(id, name, email)
            `)
            .gte("updated_at", startDateISO)
            .lte("updated_at", endDateISO)
          
          // Also fetch by assigned_at to catch orders assigned in date range
          const { data: assignedAtData } = await supabase
            .from("orders")
            .select(`
              *,
              order_proofs (id, image_data),
              assigned_courier:users!orders_assigned_courier_id_fkey(id, name, email)
            `)
            .not("assigned_at", "is", null)
            .gte("assigned_at", startDateISO)
            .lte("assigned_at", endDateISO)
          
          if (updatedAtError) {
            console.error('Error fetching all orders:', updatedAtError)
            orders = []
          } else {
            // Merge both results, removing duplicates
            const orderMap = new Map<string, any>()
            for (const order of (assignedAtData || [])) {
              orderMap.set(order.id, order)
            }
            for (const order of (updatedAtData || [])) {
              if (!orderMap.has(order.id)) {
                orderMap.set(order.id, order)
              }
            }
            
            // Map courier information to orders
            orders = Array.from(orderMap.values()).map((order: any) => ({
              ...order,
              courier_name: order.assigned_courier?.name || null,
              courier_email: order.assigned_courier?.email || null,
            })) as Order[]
          }
          
          console.log(`Found ${orders.length} total orders from all couriers in date range`)
          
        } else {
          // Default: fetch ALL orders (including unassigned) for admin dashboard
          // Check both updated_at and assigned_at to ensure assigned orders are included
          console.log('Fetching ALL orders (including unassigned) for admin dashboard')
          
          // Fetch by updated_at
          const { data: updatedAtData, error: updatedAtError } = await supabase
            .from("orders")
            .select(`
              *,
              order_proofs (id, image_data),
              assigned_courier:users!orders_assigned_courier_id_fkey(id, name, email)
            `)
            .gte("updated_at", startDateISO)
            .lte("updated_at", endDateISO)
          
          // Also fetch by assigned_at to catch orders assigned in date range
          const { data: assignedAtData } = await supabase
            .from("orders")
            .select(`
              *,
              order_proofs (id, image_data),
              assigned_courier:users!orders_assigned_courier_id_fkey(id, name, email)
            `)
            .not("assigned_at", "is", null)
            .gte("assigned_at", startDateISO)
            .lte("assigned_at", endDateISO)
          
          if (updatedAtError) {
            console.error('Error fetching all orders:', updatedAtError)
            orders = []
          } else {
            // Merge both results, removing duplicates
            const orderMap = new Map<string, any>()
            for (const order of (assignedAtData || [])) {
              orderMap.set(order.id, order)
            }
            for (const order of (updatedAtData || [])) {
              if (!orderMap.has(order.id)) {
                orderMap.set(order.id, order)
              }
            }
            
            // Map courier information to orders
            orders = Array.from(orderMap.values()).map((order: any) => ({
              ...order,
              courier_name: order.assigned_courier?.name || null,
              courier_email: order.assigned_courier?.email || null,
            })) as Order[]
          }
          
          console.log(`Found ${orders.length} total orders in date range`)
        }
        
        setAllOrders(orders)
      }
      
      // Log summary of what we found
      if (orders.length > 0) {
        console.log('=== ORDERS SUMMARY ===')
        console.log(`Total orders: ${orders.length}`)
        

        
        // Group by status
        const statusCounts = orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        console.log('Orders by status:', statusCounts)
        
        // Group by payment method
        const paymentCounts = orders.reduce((acc, order) => {
          acc[order.payment_method] = (acc[order.payment_method] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        console.log('Orders by payment method:', paymentCounts)
        
        // Sample orders
        console.log('Sample orders:', orders.slice(0, 3).map(o => ({
          order_id: o.order_id,
          status: o.status,
          payment_method: o.payment_method,
          total_fees: o.total_order_fees,
          courier: o.assigned_courier_id,
          created_at: o.created_at,

        })))
      }
      
    } catch (error) {
      console.error("Error fetching summary:", error)
      setSummaryList([])
      setAllOrders([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, user?.role, dateRange.startDate, dateRange.endDate, selectedCourier?.courierId, showAnalytics])

  useEffect(() => {
    fetchSummary()
    fetchAllHoldFeesData() // Also fetch hold fees data
  }, [fetchSummary, fetchAllHoldFeesData])

  // Auto-select courier for admin using URL query or last stored choice
  useEffect(() => {
    if (!isAdmin || initialCourierApplied || summaryList.length === 0) return
    let targetId: string | null = null
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search)
        targetId =
          params.get("courierId") ||
          params.get("courier") ||
          params.get("courier_id") ||
          window.localStorage.getItem("summary:lastSelectedCourierId")
      } catch {}
    }
    if (targetId) {
      const found = summaryList.find((c) => c.courierId === targetId)
      if (found) {
        setSelectedCourier(found)
        setShowAnalytics(false)
      }
    }
    setInitialCourierApplied(true)
  }, [isAdmin, summaryList, initialCourierApplied])

  // Separate useEffect for subscription to avoid recreation on every dependency change
  useEffect(() => {
    const subscription = supabase
      .channel("orders_changes_summary")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        console.log('Real-time order change detected:', payload)
        // Force immediate refresh
        setRefreshKey(prev => prev + 1)
        fetchSummary()
        fetchAllHoldFeesData() // Also refetch hold fees data on changes
      })
      .subscribe()

    return () => {
      subscription.unsubscribe().catch(console.error)
    }
  }, [fetchSummary, fetchAllHoldFeesData])

  // Cleanup effect for scroll preservation
  useEffect(() => {
    return () => {
      // Save scroll position when component unmounts
      if (ordersModalScroll.hasSavedPosition()) {
        ordersModalScroll.restoreScroll()
      }
    }
  }, [ordersModalScroll])

  // Save scroll position when page visibility changes (user switches tabs/navigates away)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && selectedOrders.length > 0) {
        // User is navigating away, save scroll position
        ordersModalScroll.restoreScroll()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [ordersModalScroll, selectedOrders.length])

  // Hold Fee Management Functions
  const handleEditHoldFee = (orderId: string, currentAmount?: number, currentComment?: string) => {
    setEditingHoldFee(orderId)
    setHoldFeeAmount(currentAmount ? currentAmount.toString() : "")
    setHoldFeeComment(currentComment || "")
  }

  const handleSaveHoldFee = async (orderId: string) => {
    if (!isAdmin) return
    setHoldFeeLoading(true)
    try {
      const order = allHoldFeesOrders.find(o => o.id === orderId) || allOrders.find(o => o.id === orderId)
      const currentAmount = order ? Number(order.hold_fee || 0) : 0
      
      // Check if we're only updating the comment (no amount change)
      // If holdFeeAmount is empty or matches current amount, we're only updating comment
      const inputAmount = holdFeeAmount.trim() === "" ? currentAmount : Number.parseFloat(holdFeeAmount) || 0
      const isUpdatingCommentOnly = inputAmount === currentAmount && currentAmount > 0
      
      console.log('Saving hold fee:', { 
        orderId, 
        currentAmount, 
        inputAmount, 
        holdFeeAmount, 
        comment: holdFeeComment, 
        userId: user?.id, 
        isUpdatingCommentOnly 
      })
      
      // If only updating comment, preserve all existing hold fee data
      const updateData = isUpdatingCommentOnly ? {
        hold_fee_comment: holdFeeComment || null,
      } : {
        hold_fee: inputAmount > 0 ? inputAmount : null,
        hold_fee_comment: inputAmount > 0 ? (holdFeeComment || null) : null,
        hold_fee_created_by: inputAmount > 0 ? (order?.hold_fee_created_by || user?.id) : null,
        hold_fee_created_at: inputAmount > 0 ? (order?.hold_fee_created_at || new Date().toISOString()) : null,
        hold_fee_added_at: inputAmount > 0 ? (order?.hold_fee_added_at || new Date().toISOString()) : null,
        hold_fee_removed_at: inputAmount > 0 ? null : (order?.hold_fee_removed_at || new Date().toISOString()),
      }
      
      console.log('Update data:', updateData)
      
      const { data, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select()

      if (error) {
        console.error('Supabase error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(error.message || `Database error: ${error.code || 'Unknown'}`)
      }
      
      if (!data || data.length === 0) {
        console.warn('No data returned from update')
        // This is not necessarily an error - the update might have succeeded
      } else {
        console.log('Update successful:', data)
      }

      // Update local state with the actual updated data from database
      const updatedOrder = data && data[0] ? data[0] : null
      if (updatedOrder) {
        setAllOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, ...updatedOrder } : order
          ),
        )
        setAllHoldFeesOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, ...updatedOrder } : order
          ),
        )
        setSelectedOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, ...updatedOrder } : order
          ),
        )
      } else {
        // Fallback: update manually if data not returned
        setAllOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  hold_fee: isUpdatingCommentOnly ? order.hold_fee : (inputAmount > 0 ? inputAmount : null),
                  hold_fee_comment: holdFeeComment || null,
                  hold_fee_created_by: isUpdatingCommentOnly ? order.hold_fee_created_by : (inputAmount > 0 ? (order.hold_fee_created_by || user?.id) : null),
                  hold_fee_created_at: isUpdatingCommentOnly ? order.hold_fee_created_at : (inputAmount > 0 ? (order.hold_fee_created_at || new Date().toISOString()) : null),
                  hold_fee_added_at: isUpdatingCommentOnly ? order.hold_fee_added_at : (inputAmount > 0 ? (order.hold_fee_added_at || new Date().toISOString()) : null),
                  hold_fee_removed_at: isUpdatingCommentOnly ? order.hold_fee_removed_at : (inputAmount > 0 ? null : (order.hold_fee_removed_at || new Date().toISOString())),
                }
              : order,
          ),
        )
        setAllHoldFeesOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  hold_fee: isUpdatingCommentOnly ? order.hold_fee : (inputAmount > 0 ? inputAmount : null),
                  hold_fee_comment: holdFeeComment || null,
                  hold_fee_created_by: isUpdatingCommentOnly ? order.hold_fee_created_by : (inputAmount > 0 ? (order.hold_fee_created_by || user?.id) : null),
                  hold_fee_created_at: isUpdatingCommentOnly ? order.hold_fee_created_at : (inputAmount > 0 ? (order.hold_fee_created_at || new Date().toISOString()) : null),
                  hold_fee_added_at: isUpdatingCommentOnly ? order.hold_fee_added_at : (inputAmount > 0 ? (order.hold_fee_added_at || new Date().toISOString()) : null),
                  hold_fee_removed_at: isUpdatingCommentOnly ? order.hold_fee_removed_at : (inputAmount > 0 ? null : (order.hold_fee_removed_at || new Date().toISOString())),
                }
              : order,
          ),
        )
        setSelectedOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  hold_fee: isUpdatingCommentOnly ? order.hold_fee : (inputAmount > 0 ? inputAmount : null),
                  hold_fee_comment: holdFeeComment || null,
                  hold_fee_created_by: isUpdatingCommentOnly ? order.hold_fee_created_by : (inputAmount > 0 ? (order.hold_fee_created_by || user?.id) : null),
                  hold_fee_created_at: isUpdatingCommentOnly ? order.hold_fee_created_at : (inputAmount > 0 ? (order.hold_fee_created_at || new Date().toISOString()) : null),
                  hold_fee_added_at: isUpdatingCommentOnly ? order.hold_fee_added_at : (inputAmount > 0 ? (order.hold_fee_added_at || new Date().toISOString()) : null),
                  hold_fee_removed_at: isUpdatingCommentOnly ? order.hold_fee_removed_at : (inputAmount > 0 ? null : (order.hold_fee_removed_at || new Date().toISOString())),
                }
              : order,
          ),
        )
      }
      setEditingHoldFee(null)
      setHoldFeeAmount("")
      setHoldFeeComment("")
    } catch (error) {
      console.error("Error saving hold fee:", error)
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace')
      // Show error to user with more details
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
        ? error 
        : JSON.stringify(error)
      alert(`Failed to save hold fee: ${errorMessage}`)
    } finally {
      setHoldFeeLoading(false)
    }
  }

  const handleRemoveHoldFee = async (orderId: string) => {
    if (!isAdmin) return
    setHoldFeeLoading(true)
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          hold_fee: null,
          hold_fee_comment: null,
          hold_fee_created_by: user?.id,
          hold_fee_created_at: new Date().toISOString(),
          hold_fee_removed_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (error) throw error

      // Update local state
      setAllOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                hold_fee: null,
                hold_fee_comment: null,
                hold_fee_created_by: user?.id,
                hold_fee_created_at: new Date().toISOString(),
                hold_fee_removed_at: new Date().toISOString(),
              }
            : order,
        ),
      )
      setAllHoldFeesOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                hold_fee: null,
                hold_fee_comment: null,
                hold_fee_created_by: user?.id,
                hold_fee_created_at: new Date().toISOString(),
                hold_fee_removed_at: new Date().toISOString(),
              }
            : order,
        ),
      )
      setSelectedOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                hold_fee: null,
                hold_fee_comment: null,
                hold_fee_created_by: user?.id,
                hold_fee_created_at: new Date().toISOString(),
                hold_fee_removed_at: new Date().toISOString(),
              }
            : order,
        ),
      )
    } catch (error) {
      console.error("Error removing hold fee:", error)
    } finally {
      setHoldFeeLoading(false)
    }
  }

  const handleCancelHoldFeeEdit = () => {
    setEditingHoldFee(null)
    setHoldFeeAmount("")
    setHoldFeeComment("")
  }

  // Helper function to copy text to clipboard
  const copyToClipboard = async (text: string | null | undefined, label: string) => {
    try {
      const textToCopy = text || ''
      await navigator.clipboard.writeText(textToCopy)
      // Show toast notification (you can replace with your toast system)
      if (typeof window !== 'undefined' && window.console) {
        window.console.log(`Copied ${label} to clipboard`)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Helper function to open maps with address
  const openMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
  }

  // Helper function to open WhatsApp
  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  // Safe number parser to avoid NaN creeping into totals
  const toNumber = (val: any): number => {
    const n = Number(val)
    return Number.isFinite(n) ? n : 0
  }

  // Normalize partial amounts to always be positive values (avoid negative inputs)
  const normalizePartial = (val: any): number => {
    return Math.abs(toNumber(val))
  }

  // Helper function to get the actual order amount the courier handled
  const getCourierOrderAmount = (order: Order): number => {
    const partialPaid = normalizePartial(order.partial_paid_amount)

    // Hand-to-hand (exchange) should not count the base amount
    if (order.status === "hand_to_hand") {
      return 0
    }

    // For partial orders, always use the partial amount (even if zero/negative)
    if (order.status === "partial") {
      return partialPaid
    }

    // For other statuses, if a partial amount was collected, use it
    if (partialPaid > 0) {
      return partialPaid
    }

    if (["delivered", "hand_to_hand"].includes(order.status)) {
      return toNumber(order.total_order_fees)
    }
    // For return orders, don't count the full order amount as collected
    if (order.status === "return") {
      return 0
    }
    return 0
  }

  // Helper function to get total amount courier handled (order + delivery fee)
  // If payment_sub_type is 'onther', this function is not used for payment breakdowns, only for totals.
  // For payment breakdowns, use getOntherSubPaymentAmount.
  const getTotalCourierAmount = (order: Order): number => {
    const partialPaid = normalizePartial(order.partial_paid_amount)
    const deliveryAmount = toNumber(order.delivery_fee)

    // If status is partial, use only the partial amount (plus delivery/fees below)
    if (order.status === "partial") {
      const holdFee = toNumber(order.hold_fee)
      const adminFee = toNumber(order.admin_delivery_fee)
      const extraFee = toNumber(order.extra_fee)
      return partialPaid + deliveryAmount - holdFee - adminFee - extraFee
    }

    // For hand-to-hand (exchange), do not count the base amount; only count any partial/fees logic
    // but if partial is zero, treat as zero collected
    if (order.status === "hand_to_hand") {
      const holdFee = toNumber(order.hold_fee)
      const adminFee = toNumber(order.admin_delivery_fee)
      const extraFee = toNumber(order.extra_fee)
      const amount = partialPaid + deliveryAmount - holdFee - adminFee - extraFee
      return Math.max(amount, 0)
    }

    let orderAmount = 0

    if (order.status === "canceled") {
      orderAmount = 0
    } else if (order.status === "return") {
      orderAmount = 0
    } else if (order.payment_sub_type === "onther" && order.onther_payments) {
      // Sum all onther_payments amounts for total only
      try {
        const arr = typeof order.onther_payments === 'string' ? JSON.parse(order.onther_payments) : order.onther_payments
        if (Array.isArray(arr)) {
          orderAmount = arr.reduce((sum, item) => sum + toNumber(item.amount), 0)
        } else {
          orderAmount = 0
        }
      } catch {
        orderAmount = 0
      }
    } else {
      orderAmount = getCourierOrderAmount(order)
    }

    // Subtract hold_fee, admin_delivery_fee, and extra_fee
    const holdFee = toNumber(order.hold_fee)
    const adminFee = toNumber(order.admin_delivery_fee)
    const extraFee = toNumber(order.extra_fee)

    return orderAmount + deliveryAmount - holdFee - adminFee - extraFee
  }

  // Enhanced: Only show the relevant sub-payment and amount for each payment method in the modal
  const scrollLockRef = useRef(0)

  const openOrders = (orders: Order[], title: string, methodKey?: string) => {
    // If methodKey is provided, filter and map orders to only include the relevant sub-payment
    let displayOrders = orders
    if (methodKey) {
      displayOrders = orders.map((order) => {
        if (order.payment_sub_type === 'onther' && order.onther_payments) {
          let arr: { method: string; amount: string }[] = []
          try {
            arr = typeof order.onther_payments === 'string' ? JSON.parse(order.onther_payments) : order.onther_payments
          } catch { arr = [] }
          // Find the sub-payment for this methodKey
          const sub = arr.find(item => normalizePaymentMethod(item.method) === methodKey)
          if (sub) {
            return { ...order, _onther_amount: parseFloat(sub.amount) || 0, payment_sub_type: methodKey }
          }
        }
        return order
      }).filter(order => {
        // Only include if it's a relevant sub-payment or a normal order for this method
        if (order.payment_sub_type === 'onther' && order._onther_amount && order.payment_sub_type === methodKey) return true
        if (order.payment_sub_type !== 'onther') return true
        return false
      })
    }
    setModalTitle(title)
    setSelectedOrders(displayOrders)
    // Modal scroll handled in effect below (no viewport jump)
  }

  // Lock body scroll when orders modal is open and force modal content to top
  useEffect(() => {
    if (selectedOrders.length > 0) {
      if (typeof window !== 'undefined') {
        const y = window.scrollY || window.pageYOffset || 0
        scrollLockRef.current = y
        try {
          if (ordersModalScroll?.containerRef?.current) {
            ordersModalScroll.containerRef.current.scrollTo({ top: 0, behavior: 'auto' })
          }
          // Lock body without moving viewport
          document.body.style.position = 'fixed'
          document.body.style.top = `-${y}px`
          document.body.style.width = '100%'
          document.body.style.overflow = 'hidden'
          document.documentElement.style.overflow = 'hidden'
        } catch {}
      }
    } else {
      if (typeof window !== 'undefined') {
        const y = scrollLockRef.current || 0
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
        if (y) {
          window.scrollTo({ top: y, behavior: 'auto' })
        }
      }
    }
  }, [selectedOrders.length, ordersModalScroll])

  const handleCourierSelect = (courier: CourierSummary) => {
    setSelectedCourier(courier)
    setShowAnalytics(false)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem("summary:lastSelectedCourierId", courier.courierId)
      } catch {}
    }
  }

  const handleBackToCouriers = () => {
    setSelectedCourier(null)
    setShowAnalytics(false)
    setAllOrders([])
  }

  const handleShowAnalytics = () => {
    setSelectedCourier(null)
    setShowAnalytics(true)
  }

  // Fixed date range function
  const setQuickDateRange = (filterType: string) => {
    const today = new Date()
    const endDate = new Date(today)
    let startDate = new Date(today)

    switch (filterType) {
      case "today":
        // Today only
        startDate = new Date(today)
        break
      case "yesterday":
        // Yesterday only
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 1)
        endDate.setDate(today.getDate() - 1)
        break
      case "last7Days":
        // Last 7 days including today
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 6)
        break
      case "last30Days":
        // Last 30 days including today
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 29)
        break
      default:
        break
    }

    const startDateString = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, "0")}-${startDate.getDate().toString().padStart(2, "0")}`
    const endDateString = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, "0")}-${endDate.getDate().toString().padStart(2, "0")}`

    setActiveFilter(filterType)
    setDateRange({
      startDate: startDateString,
      endDate: endDateString,
    })

    // The fetchSummary will be called automatically by useEffect when dateRange changes
  }

  // Calculate comprehensive accounting metrics
  const calculateAccountingMetrics = useCallback(() => {
    // Using refreshKey to ensure recalculation on real-time updates
    console.log('Calculating metrics, refreshKey:', refreshKey, 'allOrders:', allOrders.length)
    const filteredOrders = selectedCourier
      ? (selectedCourier.courierId === 'total'
          ? allOrders.filter((o) => o.assigned_courier_id !== null)
          : allOrders.filter((o) => o.assigned_courier_id === selectedCourier.courierId))
      : allOrders

    // Overall Totals - Calculate as sum of all status counts to ensure accuracy
    const totalOrdersCount = filteredOrders.length
    const totalOrdersOriginalValue = filteredOrders.reduce((acc, o) => acc + Number(o.total_order_fees || 0), 0)

    // Fee sums
    const totalHoldFees = filteredOrders.reduce((acc, o) => acc + Number(o.hold_fee || 0), 0)
    const totalExtraFees = filteredOrders.reduce((acc, o) => acc + Number(o.extra_fee || 0), 0)
    const totalAdminDeliveryFees = filteredOrders.reduce((acc, o) => acc + Number(o.admin_delivery_fee || 0), 0)
    const totalAllFees = totalHoldFees + totalExtraFees + totalAdminDeliveryFees
    const adjustedTotal = totalOrdersOriginalValue - totalAllFees

    // Function to calculate payment method totals
    const calculatePaymentMethodTotal = (method: string) => {
      let total = 0
      let regularOrdersCount = 0
      
      // Map Arabic payment method names to English equivalents
      const methodMapping: Record<string, string[]> = {
        'cash': ['cash', 'نقداً', 'on_hand'],
        'card': ['card', 'visa_machine', 'ماكينة فيزا'],
        'valu': ['valu', 'فاليو'],
        'paymob': ['paymob', 'باي موب'],
        'instapay': ['instapay', 'إنستاباي'],
        'wallet': ['wallet', 'المحفظة'],
        'visa_machine': ['visa_machine', 'ماكينة فيزا', 'card'],
        'on_hand': ['on_hand', 'نقداً', 'cash']
      }
      
      const methodVariants = methodMapping[method] || [method]
      
      filteredOrders.forEach(order => {
        // Check regular payment method
        if (methodVariants.includes(order.payment_method)) {
          total += Number(order.total_order_fees || 0)
          regularOrdersCount++
        }
      })
      
      return total
    }

    // Calculate totals for each payment method
    const cashTotal = calculatePaymentMethodTotal('cash')
    const cardTotal = calculatePaymentMethodTotal('card')
    const valuTotal = calculatePaymentMethodTotal('valu')
    const paymobTotal = calculatePaymentMethodTotal('paymob')
    const instapayTotal = calculatePaymentMethodTotal('instapay')
    const walletTotal = calculatePaymentMethodTotal('wallet')
    const visaMachineTotal = calculatePaymentMethodTotal('visa_machine')
    const onHandTotal = calculatePaymentMethodTotal('on_hand')


    // Helper to compute collected for partial orders explicitly (use partial amount + delivery - fees)
    const getPartialCollected = (o: Order) => {
      const partialPaid = normalizePartial(o.partial_paid_amount)
      const deliveryFee = toNumber(o.delivery_fee)
      const holdFee = toNumber(o.hold_fee)
      const adminFee = toNumber(o.admin_delivery_fee)
      const extraFee = toNumber(o.extra_fee)
      return partialPaid + deliveryFee - holdFee - adminFee - extraFee
    }

    // Status-based Metrics
    const getStatusMetrics = (status: string) => {
      const orders = filteredOrders.filter((o) => o.status === status)
      const count = orders.length
      const originalValue = orders.reduce((acc, o) => acc + toNumber(o.total_order_fees), 0)
      const courierCollected = orders.reduce((acc, o) => {
        if (status === "partial") {
          return acc + getPartialCollected(o)
        }
        if (status === "hand_to_hand") {
          // For hand_to_hand, include delivery/partial minus fees (no base amount)
          return acc + getTotalCourierAmount(o)
        }
        return acc + getTotalCourierAmount(o)
      }, 0)
      return { count, originalValue, courierCollected, orders }
    }

    // Check for orders with null/undefined status
    const ordersWithNullStatus = filteredOrders.filter((o) => !o.status || o.status === null || o.status === undefined)
    if (ordersWithNullStatus.length > 0) {
      console.warn(`Found ${ordersWithNullStatus.length} orders with null/undefined status:`, ordersWithNullStatus.map(o => ({ id: o.id, order_id: o.order_id, status: o.status })))
    }

    // Check for orders with unexpected status values
    const expectedStatuses = ["pending", "assigned", "delivered", "canceled", "partial", "return", "receiving_part", "hand_to_hand"]
    const ordersWithUnexpectedStatus = filteredOrders.filter((o) => o.status && !expectedStatuses.includes(o.status))
    if (ordersWithUnexpectedStatus.length > 0) {
      console.warn(`Found ${ordersWithUnexpectedStatus.length} orders with unexpected status:`, ordersWithUnexpectedStatus.map(o => ({ id: o.id, order_id: o.order_id, status: o.status })))
    }

    // Allow reassignment of pending -> assigned for couriers OR when admin views a specific courier
    let pending = getStatusMetrics("pending")
    let assigned = getStatusMetrics("assigned")
    const delivered = getStatusMetrics("delivered")
    const canceled = getStatusMetrics("canceled")
    const partial = getStatusMetrics("partial")
    const returned = getStatusMetrics("return")
    const receivingPart = getStatusMetrics("receiving_part")
    const handToHand = getStatusMetrics("hand_to_hand")

    // For couriers or when admin is viewing one courier, treat pending as assigned
    if ((isCourier || selectedCourier) && pending.count > 0) {
      assigned = {
        count: assigned.count + pending.count,
        originalValue: assigned.originalValue + pending.originalValue,
        courierCollected: assigned.courierCollected + pending.courierCollected,
        orders: [...assigned.orders, ...pending.orders],
      }
      pending = { count: 0, originalValue: 0, courierCollected: 0, orders: [] }
    }

    // Recalculate total orders count as sum of all status counts to ensure accuracy
    // Include pending orders in total count
    const calculatedTotalOrdersCount = pending.count + assigned.count + delivered.count + canceled.count + partial.count + returned.count + receivingPart.count + handToHand.count
    const calculatedTotalOrdersOriginalValue = pending.originalValue + assigned.originalValue + delivered.originalValue + canceled.originalValue + partial.originalValue + returned.originalValue + receivingPart.originalValue + handToHand.originalValue

    // Validate that calculated totals match original totals
    if (calculatedTotalOrdersCount !== totalOrdersCount) {
      console.warn(`Total orders count mismatch: Original=${totalOrdersCount}, Calculated=${calculatedTotalOrdersCount}`)
      console.log('Status breakdown:', {
        assigned: assigned.count,
        delivered: delivered.count,
        canceled: canceled.count,
        partial: partial.count,
        returned: returned.count,
        receivingPart: receivingPart.count,
        handToHand: handToHand.count
      })
    }
    if (Math.abs(calculatedTotalOrdersOriginalValue - totalOrdersOriginalValue) > 0.01) {
      console.warn(`Total orders value mismatch: Original=${totalOrdersOriginalValue}, Calculated=${calculatedTotalOrdersOriginalValue}`)
    }

    // Log final totals for debugging
    console.log('Final calculated totals:', {
      totalOrdersCount: calculatedTotalOrdersCount,
      totalOrdersOriginalValue: calculatedTotalOrdersOriginalValue,
      deliveredCount: delivered.count,
      deliveredOriginalValue: delivered.originalValue
    })

    // Delivery Fees and Partial Amounts
    const totalDeliveryFeesFromAllOrders = filteredOrders.reduce((acc, o) => acc + Number(o.delivery_fee || 0), 0)
    const totalPartialAmounts = filteredOrders.reduce((acc, o) => acc + normalizePartial(o.partial_paid_amount), 0)

    // Accounting Difference (This logic might need re-evaluation based on exact definition)
    // For now, keep it as is, but it's more of an admin-level metric.
    const accountingDifference =
      assigned.courierCollected -
      (delivered.courierCollected +
        canceled.courierCollected +
        partial.courierCollected +
        returned.courierCollected +
        receivingPart.courierCollected +
        handToHand.courierCollected)

    // Improved: Flatten all orders so each sub-payment in onther_payments is treated as a separate entry for summary
    const flattenOrdersForPaymentSummary = (orders: Order[]) => {
      console.log('flattenOrdersForPaymentSummary called with includeHoldFeesInPayment:', includeHoldFeesInPayment)
      const result: { order: Order; method: string; amount: number }[] = []
      for (const o of orders) {
        // Skip orders that have hold fees (either added or removed) unless includeHoldFeesInPayment is true
        if (!includeHoldFeesInPayment && (o.hold_fee_added_at || o.hold_fee_removed_at)) {
          console.log('Skipping order with hold fee:', o.order_id, 'hold_fee_added_at:', o.hold_fee_added_at, 'hold_fee_removed_at:', o.hold_fee_removed_at)
          continue
        }
        
        if (o.payment_sub_type === 'onther' && o.onther_payments) {
          let arr: { method: string; amount: string }[] = []
          try {
            arr = typeof o.onther_payments === 'string' ? JSON.parse(o.onther_payments) : o.onther_payments
          } catch { arr = [] }
          if (Array.isArray(arr)) {
            for (const item of arr) {
              const normalizedSubMethod = normalizePaymentMethod(item.method)
              const amt = parseFloat(item.amount) || 0
              if (amt > 0) {
                // Each sub-payment is a separate entry, with _onther_amount for modal display
                result.push({ order: { ...o, payment_sub_type: normalizedSubMethod, _onther_amount: amt }, method: normalizedSubMethod, amount: amt })
              }

            }
          }
        } else {
          // Prefer specific indicators over generic payment_method
          // 1) If payment_sub_type is present (and not onther), use it
          // 2) Else if collected_by is present (e.g., paymob collector), use it
          // 3) Else fallback to payment_method
          const sourceMethod = (o.payment_sub_type && o.payment_sub_type !== 'onther')
            ? o.payment_sub_type
            : (o.collected_by || o.payment_method)
          // Use normalized payment method for non-onther orders
          const normalized = normalizePaymentMethod(sourceMethod)
          const amt = getTotalCourierAmount(o)
          // Include cash on hand orders even if amount is 0 or negative (they represent collected cash)
          if (amt > 0 || normalized === 'on_hand') {
            result.push({ order: o, method: normalized, amount: amt })
          }
        }
      }
      console.log('flattenOrdersForPaymentSummary result:', result.length, 'orders')
      return result
    }

    // Use the flattened list for all payment method breakdowns
    // Note: filteredOrders should already be date-filtered from fetchSummary
    const paymentSummaryList = flattenOrdersForPaymentSummary(filteredOrders)

    const getPaymentMethodMetrics = (methodKey: string) => {
      const filtered = paymentSummaryList.filter(item => item.method === methodKey)
      return {
        count: filtered.length,
        amount: filtered.reduce((sum, item) => sum + item.amount, 0),
        orders: filtered.map(item => item.order),
      }
    }

    // Updated paymob orders calculation - include all orders with paymob payment that have collected amounts

    // Now, get metrics for each payment method using the new flat list
    const visaMachineOrders = getPaymentMethodMetrics('visa_machine')
    const instapayOrders = getPaymentMethodMetrics('instapay')
    const walletOrders = getPaymentMethodMetrics('wallet')
    const cashOnHandOrders = getPaymentMethodMetrics('on_hand')
    const paymobOrders = getPaymentMethodMetrics('paymob')
    const valuOrders = getPaymentMethodMetrics('valu')

    const totalCODOrders = {
      count: visaMachineOrders.count + instapayOrders.count + walletOrders.count + cashOnHandOrders.count,
      amount: visaMachineOrders.amount + instapayOrders.amount + walletOrders.amount + cashOnHandOrders.amount,
      orders: [
        ...visaMachineOrders.orders,
        ...instapayOrders.orders,
        ...walletOrders.orders,
        ...cashOnHandOrders.orders,
      ],
    }

    // Total amount courier should hand to accounting (Cash on Hand only)
    const totalHandToAccounting = cashOnHandOrders.amount

    return {
      totalOrdersCount: calculatedTotalOrdersCount,
      totalOrdersOriginalValue: calculatedTotalOrdersOriginalValue,
      totalHoldFees,
      totalExtraFees,
      totalAdminDeliveryFees,
      adjustedTotal,
      pending,
      assigned,
      delivered,
      canceled,
      partial,
      returned,
      receivingPart,
      handToHand,
      totalDeliveryFeesFromAllOrders,
      totalPartialAmounts,
      accountingDifference,
      paymobOrders,
      valuOrders,
      visaMachineOrders,
      instapayOrders,
      walletOrders,
      cashOnHandOrders,
      totalCODOrders,
      totalHandToAccounting,
      allOrders: filteredOrders, // Added allOrders to the returned metrics
  
      cashTotal,
      cardTotal,
      valuTotal,
      paymobTotal,
      instapayTotal,
      walletTotal,
      visaMachineTotal,
      onHandTotal,

    }
  }, [allOrders, selectedCourier, refreshKey])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-4">
          <div
            className={`border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto ${
              isCourier ? "w-8 h-8" : "w-12 h-12"
            }`}
          ></div>
          <p className={`font-medium text-gray-700 ${isCourier ? "text-base" : "text-lg"}`}>{translate("loading")}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-4">
          <div
            className={`bg-red-100 rounded-full flex items-center justify-center mx-auto ${
              isCourier ? "w-12 h-12" : "w-16 h-16"
            }`}
          >
            <User className={`text-red-600 ${isCourier ? "w-6 h-6" : "w-8 h-8"}`} />
          </div>
          <p className={`font-medium text-gray-700 ${isCourier ? "text-base" : "text-lg"}`}>
            {translate("pleaseLogin")}
          </p>
        </div>
      </div>
    )
  }

  // For admin users, show analytics or courier selection
  if (user.role !== "courier" && !selectedCourier) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">لوحة المحاسبة التفصيلية</h1>
                  <p className="text-gray-600 text-xs">تحليل شامل لجميع العمليات المالية</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Refresh Button */}
                <button
                  onClick={() => {
                    console.log('Manual refresh triggered')
                    console.log('Current state:', { 
                      showAnalytics, 
                      selectedCourier, 
                      dateRange, 
                      allOrdersLength: allOrders.length 
                    })
                    fetchSummary()
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 text-sm font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  تحديث
                </button>
                
                {/* Quick Date Filters */}
                <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setQuickDateRange("today")}
                    className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${
                      activeFilter === "today" 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "bg-white text-blue-700 hover:bg-blue-50"
                    }`}
                  >
                    {translate("today")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("yesterday")}
                    className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${
                      activeFilter === "yesterday" 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "bg-white text-blue-700 hover:bg-blue-50"
                    }`}
                  >
                    {translate("yesterday")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("last7Days")}
                    className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${
                      activeFilter === "last7Days" 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "bg-white text-blue-700 hover:bg-blue-50"
                    }`}
                  >
                    {translate("last7Days")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("last30Days")}
                    className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${
                      activeFilter === "last30Days" 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "bg-white text-blue-700 hover:bg-blue-50"
                    }`}
                  >
                    {translate("last30Days")}
                  </button>
                </div>
                {/* Date Range Picker */}
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => {
                      setActiveFilter("custom")
                      setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                    }}
                    className="border-0 bg-transparent px-1.5 py-0.5 text-xs focus:outline-none focus:ring-0 w-28"
                    dir="ltr"
                  />
                  <span className="text-gray-400 text-xs">-</span>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => {
                      setActiveFilter("custom")
                      setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                    }}
                    className="border-0 bg-transparent px-1.5 py-0.5 text-xs focus:outline-none focus:ring-0 w-28"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs REMOVED - Using Courier List 'Total' option instead */}
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200 w-fit">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold text-blue-600 bg-white shadow-sm">
              <Users className="w-3.5 h-3.5" />
              <span>{translate("couriersList")}</span>
            </div>
          </div>
        </div>

        {false && showAnalytics ? (
          /* Detailed Accounting Dashboard */
          <div className="max-w-7xl mx-auto px-6 pb-8">
            {(() => {
              const metrics = calculateAccountingMetrics()
              const belongsToCourier = (_o: Order) => true; // In total dashboard, all orders belong
              return (
                <div className="space-y-4">
                  {/* 📦 Order Summary Section */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 transform transition-all duration-300 hover:shadow-lg" style={{ animation: 'slideUp 0.3s ease-out forwards' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                          <Package className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900">📦 ملخص الطلبات (v2)</h2>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                      {/* Total Orders */}
                      <div
                        className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-200 group"
                        onClick={() => openOrders(metrics.allOrders, "إجمالي الطلبات")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <Package className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">إجمالي الطلبات</h3>
                              <p className="text-xs text-gray-600">{metrics.totalOrdersCount} طلب</p>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">القيمة:</span>
                            <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {metrics.totalOrdersOriginalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Pending Orders (New from Shopify) */}
                      <div
                        className="bg-gradient-to-br from-yellow-50 to-white border-2 border-yellow-200 rounded-lg p-3 cursor-pointer hover:border-yellow-400 hover:shadow-md transition-all duration-200 group"
                        onClick={() => openOrders(metrics.pending?.orders || [], "الطلبات المعلقة")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <Clock className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-yellow-900 group-hover:text-yellow-600 transition-colors">الطلبات المعلقة</h3>
                              <p className="text-xs text-yellow-700">{metrics.pending?.count || 0} طلب</p>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-yellow-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-yellow-700">القيمة:</span>
                            <span className="text-sm font-bold text-yellow-900">
                              {(metrics.pending?.originalValue || 0).toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Assigned Orders (Assigned to courier but not started) */}
                      <div
                        className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-lg p-3 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-200 group"
                        onClick={() => openOrders(metrics.assigned?.orders || [], "الطلبات المكلفة")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <Truck className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-blue-900 group-hover:text-blue-600 transition-colors">الطلبات المكلفة</h3>
                              <p className="text-xs text-blue-700">{metrics.assigned?.count || 0} طلب</p>
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-blue-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-blue-700">القيمة:</span>
                            <span className="text-sm font-bold text-blue-900">
                              {(metrics.assigned?.originalValue || 0).toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Delivered Orders */}
                      <div
                        className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 rounded-lg p-3 cursor-pointer hover:border-green-400 hover:shadow-md transition-all duration-200 group"
                        onClick={() => openOrders(metrics.delivered.orders, "الطلبات المسلمة")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-green-900 group-hover:text-green-600 transition-colors">الطلبات المسلمة</h3>
                              <p className="text-xs text-green-700">{metrics.delivered.count} طلب</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-green-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-green-700">القيمة:</span>
                            <span className="text-sm font-bold text-green-900">
                              {metrics.delivered.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-green-700">المحصل:</span>
                            <span className="text-sm font-bold text-green-900">
                              {metrics.delivered.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Canceled Orders */}
                      <div
                        className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 rounded-lg p-3 cursor-pointer hover:border-red-400 hover:shadow-md transition-all duration-200 group"
                        onClick={() => openOrders(metrics.canceled.orders, "الطلبات الملغاة")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <XCircle className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-red-900 group-hover:text-red-600 transition-colors">الطلبات الملغاة</h3>
                              <p className="text-xs text-red-700">{metrics.canceled.count} طلب</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-red-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-red-700">القيمة:</span>
                            <span className="text-sm font-bold text-red-900">
                              {metrics.canceled.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-red-700">المحصل:</span>
                            <span className="text-sm font-bold text-red-900">
                              {metrics.canceled.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Partial Orders */}
                      <div
                        className="bg-gradient-to-br from-yellow-50 to-white border-2 border-yellow-200 rounded-lg p-3 cursor-pointer hover:border-yellow-400 hover:shadow-md transition-all duration-200 group"
                        onClick={() => openOrders(metrics.partial.orders, "الطلبات الجزئية")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <HandCoins className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-yellow-900 group-hover:text-yellow-600 transition-colors">الطلبات الجزئية</h3>
                              <p className="text-xs text-yellow-700">{metrics.partial.count} طلب</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-yellow-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-yellow-700">القيمة:</span>
                            <span className="text-sm font-bold text-yellow-900">
                              {metrics.partial.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-yellow-700">المحصل:</span>
                            <span className="text-sm font-bold text-yellow-900">
                              {metrics.partial.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Returned Orders */}
                      <div
                        className="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-lg p-3 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all duration-200 group"
                        onClick={() => openOrders(metrics.returned.orders, "الطلبات المؤجله")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <Truck className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-orange-900 group-hover:text-orange-600 transition-colors">الطلبات المؤجله</h3>
                              <p className="text-xs text-orange-700">{metrics.returned.count} طلب</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-orange-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-orange-700">القيمة:</span>
                            <span className="text-sm font-bold text-orange-900">
                              {metrics.returned.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-orange-700">المحصل:</span>
                            <span className="text-sm font-bold text-orange-900">
                              {metrics.returned.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Receiving Part Orders */}
                      <div
                        className="bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-200 rounded-lg p-3 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all duration-200 group"
                        onClick={() => openOrders(metrics.receivingPart.orders, "طلبات استلام قطعة")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <HandMetal className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-indigo-900 group-hover:text-indigo-600 transition-colors">طلبات استلام قطعة</h3>
                              <p className="text-xs text-indigo-700">{metrics.receivingPart.count} طلب</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-indigo-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-indigo-700">القيمة:</span>
                            <span className="text-sm font-bold text-indigo-900">
                              {metrics.receivingPart.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-indigo-700">المحصل:</span>
                            <span className="text-sm font-bold text-indigo-900">
                              {metrics.receivingPart.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Hand-to-Hand Orders */}
                      <div
                        className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-lg p-3 cursor-pointer hover:border-purple-400 hover:shadow-md transition-all duration-200 group"
                        onClick={() => openOrders(metrics.handToHand.orders, "الطلبات يد بيد")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <RefreshCw className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-purple-900 group-hover:text-purple-600 transition-colors">الطلبات يد بيد</h3>
                              <p className="text-xs text-purple-700">{metrics.handToHand.count} طلب</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-purple-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-purple-700">القيمة:</span>
                            <span className="text-sm font-bold text-purple-900">
                              {metrics.handToHand.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-purple-700">المحصل:</span>
                            <span className="text-sm font-bold text-purple-900">
                              {metrics.handToHand.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 💰 Total Collected and Not Delivered Summary */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 transform transition-all duration-300 hover:shadow-lg" style={{ animation: 'slideUp 0.3s ease-out 0.1s forwards', opacity: 0 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                        <Calculator className="w-4 h-4 text-white" />
                      </div>
                      <h2 className="text-base font-bold text-gray-900">💰 ملخص المحصل والغير مُسلَّم</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      {/* Total Collected */}
                      <div
                        className="bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 rounded-lg p-3 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all duration-200 group"
                        onClick={() => {
                          const collectedOrders = [
                            ...metrics.delivered.orders,
                            ...metrics.partial.orders,
                            ...metrics.receivingPart.orders,
                            ...metrics.handToHand.orders,
                            ...metrics.canceled.orders,
                            ...metrics.returned.orders
                          ].filter(order => {
                            if (order.payment_method && ['paymob', 'valu', 'visa_machine', 'instapay', 'wallet'].includes(order.payment_method.toLowerCase())) {
                              return true
                            }
                            return true
                          })
                          openOrders(collectedOrders, "إجمالي مُسلَّم فعليًا")
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-emerald-900 group-hover:text-emerald-600 transition-colors">إجمالي مُسلَّم فعليًا</h3>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-emerald-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-emerald-700">المحصل:</span>
                            <span className="text-base font-bold text-emerald-900">
                              {(() => {
                                const totalCollected = 
                                  metrics.delivered.courierCollected +
                                  metrics.partial.courierCollected +
                                  metrics.receivingPart.courierCollected +
                                  metrics.handToHand.courierCollected +
                                  metrics.canceled.courierCollected +
                                  metrics.returned.courierCollected
                                return totalCollected.toFixed(2)
                              })()} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-emerald-700">الطلبات:</span>
                            <span className="text-sm font-bold text-emerald-900">
                              {(() => {
                                const collectedOrders = [
                                  ...metrics.delivered.orders,
                                  ...metrics.partial.orders,
                                  ...metrics.receivingPart.orders,
                                  ...metrics.handToHand.orders,
                                  ...metrics.canceled.orders,
                                  ...metrics.returned.orders
                                ].filter(order => {
                                  if (order.payment_method && ['paymob', 'valu', 'visa_machine', 'instapay', 'wallet'].includes(order.payment_method.toLowerCase())) {
                                    return true
                                  }
                                  return true
                                }).length
                                return collectedOrders
                              })()} طلب
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Total Not Delivered */}
                      <div
                        className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 rounded-lg p-3 cursor-pointer hover:border-red-400 hover:shadow-md transition-all duration-200 group"
                        onClick={() => {
                          const notDeliveredOrders = [
                            ...metrics.canceled.orders,
                            ...metrics.returned.orders,
                            ...metrics.assigned.orders
                          ]
                          openOrders(notDeliveredOrders, "إجمالي غير مُسلَّم")
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <XCircle className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-red-900 group-hover:text-red-600 transition-colors">إجمالي غير مُسلَّم</h3>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-red-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-red-700">الغير مُسلَّم:</span>
                            <span className="text-base font-bold text-red-900">
                              {(() => {
                                let totalNotDelivered = 0
                                totalNotDelivered += metrics.canceled.originalValue
                                totalNotDelivered += Math.max(0, metrics.partial.originalValue - metrics.partial.courierCollected)
                                totalNotDelivered += Math.max(0, metrics.handToHand.originalValue - metrics.handToHand.courierCollected)
                                totalNotDelivered += Math.max(0, metrics.receivingPart.originalValue - metrics.receivingPart.courierCollected)
                                totalNotDelivered += metrics.assigned.originalValue
                                totalNotDelivered += metrics.returned.originalValue
                                return totalNotDelivered.toFixed(2)
                              })()} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-red-700">الطلبات:</span>
                            <span className="text-sm font-bold text-red-900">
                              {(() => {
                                const notDeliveredCount = 
                                  metrics.canceled.count +
                                  metrics.returned.count +
                                  metrics.assigned.count
                                return notDeliveredCount
                              })()} طلب
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 💳 Payment Breakdown */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 transform transition-all duration-300 hover:shadow-lg" style={{ animation: 'slideUp 0.3s ease-out 0.2s forwards', opacity: 0 }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                          <CreditCard className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900">💳 تفصيل طرق الدفع</h2>
                      </div>
                      {/* Hold Fee Filter Toggle */}
                      <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeHoldFeesInPayment}
                            onChange={(e) => {
                              console.log('Toggle changed:', e.target.checked)
                              setIncludeHoldFeesInPayment(e.target.checked)
                            }}
                            className="w-4 h-4 text-purple-600 bg-white border-purple-300 rounded focus:ring-purple-500 focus:ring-1 cursor-pointer"
                          />
                          <span className="text-xs text-purple-800 font-medium">تضمين رسوم الحجز</span>
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 mb-3">
                      {/* Visa Machine */}
                      <div
                        className={`${metrics.visaMachineOrders.count > 0 ? "bg-gradient-to-br from-slate-50 to-white border-slate-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-lg p-3 cursor-pointer hover:border-slate-400 hover:shadow-md transition-all duration-200 group`}
                        onClick={() => openOrders(metrics.visaMachineOrders.orders, "طلبات ماكينة فيزا", 'visa_machine')}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${metrics.visaMachineOrders.count > 0 ? "bg-gradient-to-br from-slate-500 to-slate-600" : "bg-gray-400"}`}>
                            <Monitor className="w-4 h-4 text-white" />
                          </div>
                          <h4 className={`text-xs font-bold ${metrics.visaMachineOrders.count > 0 ? "text-slate-900 group-hover:text-slate-600" : "text-gray-500"} transition-colors`}>ماكينة فيزا</h4>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-slate-200">
                          <p className={`text-xl font-bold ${metrics.visaMachineOrders.count > 0 ? "text-slate-900" : "text-gray-500"}`}>{metrics.visaMachineOrders.count}</p>
                          <p className={`text-sm font-semibold ${metrics.visaMachineOrders.count > 0 ? "text-slate-700" : "text-gray-400"}`}>
                            {metrics.visaMachineOrders.amount.toFixed(2)} ج.م
                          </p>
                        </div>
                      </div>

                      {/* Instapay */}
                      <div
                        className={`${metrics.instapayOrders.count > 0 ? "bg-gradient-to-br from-cyan-50 to-white border-cyan-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-lg p-3 cursor-pointer hover:border-cyan-400 hover:shadow-md transition-all duration-200 group`}
                        onClick={() => openOrders(metrics.instapayOrders.orders, "طلبات إنستاباي", 'instapay')}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${metrics.instapayOrders.count > 0 ? "bg-gradient-to-br from-cyan-500 to-cyan-600" : "bg-gray-400"}`}>
                            <Smartphone className="w-4 h-4 text-white" />
                          </div>
                          <h4 className={`text-xs font-bold ${metrics.instapayOrders.count > 0 ? "text-cyan-900 group-hover:text-cyan-600" : "text-gray-500"} transition-colors`}>إنستاباي</h4>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-cyan-200">
                          <p className={`text-xl font-bold ${metrics.instapayOrders.count > 0 ? "text-cyan-900" : "text-gray-500"}`}>{metrics.instapayOrders.count}</p>
                          <p className={`text-sm font-semibold ${metrics.instapayOrders.count > 0 ? "text-cyan-700" : "text-gray-400"}`}>
                            {metrics.instapayOrders.amount.toFixed(2)} ج.م
                          </p>
                        </div>
                      </div>

                      {/* Wallet */}
                      <div
                        className={`${metrics.walletOrders.count > 0 ? "bg-gradient-to-br from-teal-50 to-white border-teal-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-lg p-3 cursor-pointer hover:border-teal-400 hover:shadow-md transition-all duration-200 group`}
                        onClick={() => openOrders(metrics.walletOrders.orders, "طلبات المحفظة", 'wallet')}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${metrics.walletOrders.count > 0 ? "bg-gradient-to-br from-teal-500 to-teal-600" : "bg-gray-400"}`}>
                            <Wallet className="w-4 h-4 text-white" />
                          </div>
                          <h4 className={`text-xs font-bold ${metrics.walletOrders.count > 0 ? "text-teal-900 group-hover:text-teal-600" : "text-gray-500"} transition-colors`}>المحفظة</h4>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-teal-200">
                          <p className={`text-xl font-bold ${metrics.walletOrders.count > 0 ? "text-teal-900" : "text-gray-500"}`}>{metrics.walletOrders.count}</p>
                          <p className={`text-sm font-semibold ${metrics.walletOrders.count > 0 ? "text-teal-700" : "text-gray-400"}`}>
                            {metrics.walletOrders.amount.toFixed(2)} ج.م
                          </p>
                        </div>
                      </div>

                      {/* Cash on Hand */}
                      <div
                        className={`${metrics.cashOnHandOrders.count > 0 ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-lg p-3 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all duration-200 group`}
                        onClick={() => openOrders(metrics.cashOnHandOrders.orders, "طلبات نقداً", 'on_hand')}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${metrics.cashOnHandOrders.count > 0 ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gray-400"}`}>
                            <Banknote className="w-4 h-4 text-white" />
                          </div>
                          <h4 className={`text-xs font-bold ${metrics.cashOnHandOrders.count > 0 ? "text-emerald-900 group-hover:text-emerald-600" : "text-gray-500"} transition-colors`}>نقداً</h4>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-emerald-200">
                          <p className={`text-xl font-bold ${metrics.cashOnHandOrders.count > 0 ? "text-emerald-900" : "text-gray-500"}`}>{metrics.cashOnHandOrders.count}</p>
                          <p className={`text-sm font-semibold ${metrics.cashOnHandOrders.count > 0 ? "text-emerald-700" : "text-gray-400"}`}>
                            {metrics.cashOnHandOrders.amount.toFixed(2)} ج.م
                          </p>
                        </div>
                      </div>

                      {/* Total COD */}
                      <div
                        className={`${metrics.totalCODOrders.count > 0 ? "bg-gradient-to-br from-amber-50 to-white border-amber-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-lg p-3 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all duration-200 group`}
                        onClick={() => openOrders(metrics.totalCODOrders.orders, "إجمالي الدفع عند التسليم")}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${metrics.totalCODOrders.count > 0 ? "bg-gradient-to-br from-amber-500 to-amber-600" : "bg-gray-400"}`}>
                            <HandCoins className="w-4 h-4 text-white" />
                          </div>
                          <h4 className={`text-xs font-bold ${metrics.totalCODOrders.count > 0 ? "text-amber-900 group-hover:text-amber-600" : "text-gray-500"} transition-colors`}>إجمالي COD</h4>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-amber-200">
                          <p className={`text-xl font-bold ${metrics.totalCODOrders.count > 0 ? "text-amber-900" : "text-gray-500"}`}>{metrics.totalCODOrders.count}</p>
                          <p className={`text-sm font-semibold ${metrics.totalCODOrders.count > 0 ? "text-amber-700" : "text-gray-400"}`}>
                            {metrics.totalCODOrders.amount.toFixed(2)} ج.م
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Electronic Payments Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Valu */}
                      <div
                        className={`${metrics.valuOrders.count > 0 ? "bg-gradient-to-br from-indigo-50 to-white border-indigo-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-lg p-3 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all duration-200 group`}
                        onClick={() => openOrders(metrics.valuOrders.orders, "طلبات فاليو", 'valu')}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${metrics.valuOrders.count > 0 ? "bg-gradient-to-br from-indigo-500 to-indigo-600" : "bg-gray-400"}`}>
                            <Wallet className="w-4 h-4 text-white" />
                          </div>
                          <h4 className={`text-xs font-bold ${metrics.valuOrders.count > 0 ? "text-indigo-900 group-hover:text-indigo-600" : "text-gray-500"} transition-colors`}>فاليو</h4>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-indigo-200">
                          <p className={`text-xl font-bold ${metrics.valuOrders.count > 0 ? "text-indigo-900" : "text-gray-500"}`}>{metrics.valuOrders.count}</p>
                          <p className={`text-sm font-semibold ${metrics.valuOrders.count > 0 ? "text-indigo-700" : "text-gray-400"}`}>
                            {metrics.valuOrders.amount.toFixed(2)} ج.م
                          </p>
                        </div>
                      </div>

                      {/* Paymob */}
                      <div
                        className={`${metrics.paymobOrders.count > 0 ? "bg-gradient-to-br from-blue-50 to-white border-blue-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-lg p-3 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-200 group`}
                        onClick={() => openOrders(metrics.paymobOrders.orders, "طلبات paymob", 'paymob')}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${metrics.paymobOrders.count > 0 ? "bg-gradient-to-br from-blue-500 to-blue-600" : "bg-gray-400"}`}>
                            <CreditCard className="w-4 h-4 text-white" />
                          </div>
                          <h4 className={`text-xs font-bold ${metrics.paymobOrders.count > 0 ? "text-blue-900 group-hover:text-blue-600" : "text-gray-500"} transition-colors`}>Paymob</h4>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-blue-200">
                          <p className={`text-xl font-bold ${metrics.paymobOrders.count > 0 ? "text-blue-900" : "text-gray-500"}`}>{metrics.paymobOrders.count}</p>
                          <p className={`text-sm font-semibold ${metrics.paymobOrders.count > 0 ? "text-blue-700" : "text-gray-400"}`}>
                            {metrics.paymobOrders.amount.toFixed(2)} ج.م
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 🚨 Hold Fees - ALWAYS VISIBLE - ALL DAYS */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 transform transition-all duration-300 hover:shadow-lg" style={{ animation: 'slideUp 0.3s ease-out 0.3s forwards', opacity: 0 }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm">
                          <AlertCircle className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-base font-bold text-gray-900">🚨 رسوم الحجز</h2>
                      </div>
                      
                      {/* Hold Date Filter */}
                      <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                        <span className="text-xs font-medium text-gray-700">فلتر:</span>
                        <select
                          value={holdDateFilter}
                          onChange={(e) => {
                            setHoldDateFilter(e.target.value)
                            if (e.target.value !== "custom") {
                              setCustomHoldDate("")
                            }
                          }}
                          className="px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="all">جميع الأيام</option>
                          <option value="today">اليوم</option>
                          <option value="yesterday">أمس</option>
                          <option value="last7days">آخر 7 أيام</option>
                          <option value="last30days">آخر 30 يوم</option>
                          <option value="custom">تاريخ مخصص</option>
                        </select>
                        {holdDateFilter === "custom" && (
                          <input
                            type="date"
                            value={customHoldDate}
                            onChange={(e) => setCustomHoldDate(e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                          />
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Active Hold Fees - Respects Filter and Courier */}
                      {(() => {
                        const orders = getFilteredHoldFees(allHoldFeesOrders.filter(o => 
                          belongsToCourier(o) && o.hold_fee && Number(o.hold_fee) > 0
                        ), holdDateFilter)
                        const amount = orders.reduce((acc, o) => acc + Number(o.hold_fee || 0), 0)
                        // Sort by addition date (most recent first)
                        const sortedOrders = orders.sort((a, b) => 
                          new Date(b.hold_fee_added_at || b.hold_fee_created_at || '').getTime() - 
                          new Date(a.hold_fee_added_at || a.hold_fee_created_at || '').getTime()
                        )
                        return (
                          <div
                            className={`${orders.length > 0 ? 'bg-gradient-to-br from-red-50 to-white border-red-200' : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'} border-2 rounded-lg p-3 ${orders.length > 0 ? 'cursor-pointer hover:border-red-400 hover:shadow-md' : ''} transition-all duration-200 group`}
                            onClick={orders.length > 0 ? () => openOrders(orders, `رسوم الحجز النشطة (${holdDateFilter === 'all' ? 'جميع الأيام' : holdDateFilter})`) : undefined}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${orders.length > 0 ? 'bg-gradient-to-br from-red-500 to-red-600 group-hover:scale-105' : 'bg-gray-400'} transition-transform`}>
                                  <AlertCircle className={`w-4 h-4 ${orders.length > 0 ? 'text-white' : 'text-gray-200'}`} />
                                </div>
                                <div>
                                  <h4 className={`text-xs font-bold ${orders.length > 0 ? 'text-red-900 group-hover:text-red-600' : 'text-gray-500'} transition-colors`}>رسوم حجز نشطة</h4>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1.5 pt-2 border-t border-red-200">
                              <div className="flex justify-between items-center">
                                <span className={`text-xs ${orders.length > 0 ? 'text-red-700' : 'text-gray-400'}`}>العدد:</span>
                                <span className={`text-lg font-bold ${orders.length > 0 ? 'text-red-900' : 'text-gray-500'}`}>{orders.length}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={`text-xs ${orders.length > 0 ? 'text-red-700' : 'text-gray-400'}`}>المبلغ:</span>
                                <span className={`text-sm font-bold ${orders.length > 0 ? 'text-red-900' : 'text-gray-500'}`}>
                                  {amount.toFixed(2)} ج.م
                                </span>
                              </div>
                              {sortedOrders.length > 0 && (sortedOrders[0].hold_fee_added_at || sortedOrders[0].hold_fee_created_at) && (
                                <p className="text-xs text-red-600 mt-1 pt-1 border-t border-red-100">
                                  آخر إضافة: {new Date(sortedOrders[0].hold_fee_added_at || sortedOrders[0].hold_fee_created_at || '').toLocaleDateString('ar-EG', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                      
                      {/* Removed Hold Fees - Respects Filter and Courier */}
                      {(() => {
                        const orders = getFilteredHoldFees(allHoldFeesOrders.filter(o => 
                          belongsToCourier(o) && !o.hold_fee && o.hold_fee_created_at && o.hold_fee_created_by
                        ), holdDateFilter)
                        
                        // Sort by removal date (most recent first)
                        const sortedOrders = orders.sort((a, b) => 
                          new Date(b.hold_fee_removed_at || b.hold_fee_created_at || '').getTime() - 
                          new Date(a.hold_fee_removed_at || a.hold_fee_created_at || '').getTime()
                        )
                        return (
                          <div
                            className={`${orders.length > 0 ? 'bg-gradient-to-br from-green-50 to-white border-green-200' : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'} border-2 rounded-lg p-3 ${orders.length > 0 ? 'cursor-pointer hover:border-green-400 hover:shadow-md' : ''} transition-all duration-200 group`}
                            onClick={orders.length > 0 ? () => openOrders(orders, `رسوم الحجز المزالة (${holdDateFilter === 'all' ? 'جميع الأيام' : holdDateFilter})`) : undefined}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${orders.length > 0 ? 'bg-gradient-to-br from-green-500 to-green-600 group-hover:scale-105' : 'bg-gray-400'} transition-transform`}>
                                  <CheckCircle className={`w-4 h-4 ${orders.length > 0 ? 'text-white' : 'text-gray-200'}`} />
                                </div>
                                <div>
                                  <h4 className={`text-xs font-bold ${orders.length > 0 ? 'text-green-900 group-hover:text-green-600' : 'text-gray-500'} transition-colors`}>رسوم حجز مزالة</h4>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1.5 pt-2 border-t border-green-200">
                              <div className="flex justify-between items-center">
                                <span className={`text-xs ${orders.length > 0 ? 'text-green-700' : 'text-gray-400'}`}>العدد:</span>
                                <span className={`text-lg font-bold ${orders.length > 0 ? 'text-green-900' : 'text-gray-500'}`}>{orders.length}</span>
                              </div>
                              {sortedOrders.length > 0 && (sortedOrders[0].hold_fee_removed_at || sortedOrders[0].hold_fee_created_at) && (
                                <p className="text-xs text-green-600 mt-1 pt-1 border-t border-green-100">
                                  آخر إزالة: {new Date(sortedOrders[0].hold_fee_removed_at || sortedOrders[0].hold_fee_created_at || '').toLocaleDateString('ar-EG', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* 🧾 Total Hand to Accounting */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 transform transition-all duration-300 hover:shadow-lg" style={{ animation: 'slideUp 0.3s ease-out 0.4s forwards', opacity: 0 }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
                        <Receipt className="w-4 h-4 text-white" />
                      </div>
                      <h2 className="text-base font-bold text-gray-900">🧾 إجمالي ما يسلم للمحاسبة</h2>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 text-center shadow-md">
                      <div className="text-3xl font-bold text-green-900 mb-2">
                        {metrics.totalHandToAccounting.toFixed(2)} ج.م
                      </div>
                      <p className="text-green-700 font-semibold text-sm mb-1">النقد في اليد فقط</p>
                      <p className="text-xs text-green-600">({metrics.cashOnHandOrders.count} طلب نقدي)</p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          /* Courier Selection */
          <div className="max-w-7xl mx-auto px-6 pb-8">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden transform transition-all duration-300 hover:shadow-lg" style={{ animation: 'slideUp 0.3s ease-out forwards' }}>
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{translate("couriersList")}</h3>
                </div>
              </div>
              <div className="p-6">
                {summaryList.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-700">{translate("noDataForDate")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Total Summary Box */}
                    <button
                      onClick={() => handleCourierSelect({ courierId: 'total', courierName: 'الإجمالي العام لجميع المناديب' })}
                      className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl p-6 text-right transition-all duration-200 group shadow-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 group-hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-white transition-colors">
                            الإجمالي العام
                          </h4>
                          <p className="text-sm text-blue-100 transition-colors">
                            جميع المناديب مجتمعين
                          </p>
                        </div>
                      </div>
                    </button>

                    {summaryList.map((courier) => (
                      <button
                        key={courier.courierId}
                        onClick={() => handleCourierSelect(courier)}
                        className="bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl p-6 text-right transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center transition-colors">
                            <User className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                              {courier.courierName}
                            </h4>
                            <p className="text-sm text-gray-600 group-hover:text-blue-700 transition-colors">
                              اضغط لعرض التفاصيل
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders Modal REMOVED - Using Mobile Optimized below */}
        {false && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 modal-backdrop">
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl modal-content">
              {/* Modal Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Filter className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{modalTitle}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedOrders.length} {translate("ordersCount")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    ordersModalScroll.restoreScroll()
                    setSelectedOrders([])
                  }}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                  aria-label={translate("close")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Modal Content */}
              <div 
                ref={ordersModalScroll.containerRef}
                className="flex-1 overflow-y-auto p-6 bg-gray-50"
              >
                <div className="space-y-4">
                  {selectedOrders.map((order) => {
            
                    const courierOrderAmount = typeof order._onther_amount === 'number' ? order._onther_amount : getCourierOrderAmount(order)
                    const deliveryFee = Number(order.delivery_fee || 0)
                    const totalCourierAmount = typeof order._onther_amount === 'number' ? order._onther_amount : getTotalCourierAmount(order)
                    const holdFee = Number(order.hold_fee || 0)
                    return (
                      <div 
                        key={order.id + (order._onther_amount ? `_${order._onther_amount}` : '')} 
                        className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Order Information */}
                          <div className="space-y-4">
                            {/* Order Header */}
                            <div className="flex items-start justify-between pb-4 border-b border-gray-200">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 
                                    className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                                    onClick={() => copyToClipboard(order.order_id, 'Order ID')}
                                  >
                                    طلب #{order.order_id}
                                  </h4>
                                  {order.hold_fee && order.hold_fee > 0 && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-medium">
                                      رسوم حجز
                                    </span>
                                  )}
                                  {(!order.hold_fee || order.hold_fee === 0) && order.hold_fee_removed_at && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                                      تم الإزالة
                                    </span>
                                  )}
                                </div>
                                <p 
                                  className="text-base text-gray-700 font-medium cursor-pointer hover:text-blue-600"
                                  onClick={() => copyToClipboard(order.customer_name, 'Customer Name')}
                                >
                                  {order.customer_name}
                                </p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(order.order_id, 'Order ID')}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Copy Order ID"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {/* Courier Information - Always Show */}
                            {isAdmin && order.assigned_courier_id && (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                                  <span className="text-xs font-semibold text-blue-800">Assigned Courier:</span>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <User className="w-3 h-3 text-blue-600" />
                                    <span className="text-xs text-blue-700 font-medium">
                                      {order.courier_name || "Unknown Courier"}
                                    </span>
                                  </div>
                                  {order.courier_email && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-blue-600">{order.courier_email}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Returned Order Details - Enhanced Lifecycle Tracking */}
                            {order.status === "return" && (
                              <div className="mt-2 p-3 bg-orange-50 border border-orange-300 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Truck className="w-4 h-4 text-orange-600" />
                                  <span className="text-sm font-semibold text-orange-800">Returned Order Lifecycle</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                  <div className="bg-white rounded p-2 border border-orange-200">
                                    <p className="font-semibold text-orange-900 mb-1">Current Status:</p>
                                    <p className="text-orange-700">
                                      This order is currently in "Returned" status. The courier attempted delivery but the order was not completed.
                                    </p>
                                    <p className="text-orange-600 mt-1 text-xs">
                                      💡 Full lifecycle tracking is available in Analytics - view complete status history and final outcome.
                                    </p>
                                  </div>
                                  {order.updated_at && (
                                    <div className="flex items-center gap-2 text-orange-600">
                                      <Calendar className="w-3 h-3" />
                                      <span>Last updated: {new Date(order.updated_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}</span>
                                    </div>
                                  )}
                                  {order.created_at && order.created_at !== order.updated_at && (
                                    <div className="flex items-center gap-2 text-orange-500">
                                      <Clock className="w-3 h-3" />
                                      <span>Order created: {new Date(order.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}</span>
                                    </div>
                                  )}
                                  {order.notes && (
                                    <div className="bg-white rounded p-2 border border-orange-200">
                                      <p className="font-semibold text-orange-900 mb-1">Notes:</p>
                                      <p className="text-orange-700">{order.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Success/Not Success Calculation Explanation */}
                            {(order.status === "delivered" || order.status === "partial" || order.status === "canceled" || order.status === "return") && (
                              <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Info className="w-3.5 h-3.5 text-gray-600" />
                                  <span className="text-xs font-semibold text-gray-700">Calculation Info:</span>
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                  {order.status === "delivered" && (
                                    <p className="flex items-start gap-1">
                                      <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                      <span><strong className="text-green-700">SUCCESS:</strong> This order is counted as successful. Status: "delivered" means the order was successfully completed.</span>
                                    </p>
                                  )}
                                  {order.status === "partial" && (
                                    <p className="flex items-start gap-1">
                                      <CheckCircle className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                                      <span><strong className="text-yellow-700">SUCCESS (Partial):</strong> This order is counted as successful but with partial payment. The courier collected {order.partial_paid_amount || 0} EGP out of {order.total_order_fees || 0} EGP.</span>
                                    </p>
                                  )}
                                  {order.status === "canceled" && (
                                    <p className="flex items-start gap-1">
                                      <XCircle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                                      <span><strong className="text-red-700">NOT SUCCESS:</strong> This order is counted as unsuccessful. Status: "canceled" means the order was canceled and not delivered.</span>
                                    </p>
                                  )}
                                  {order.status === "return" && (
                                    <p className="flex items-start gap-1">
                                      <Truck className="w-3 h-3 text-orange-600 mt-0.5 flex-shrink-0" />
                                      <span><strong className="text-orange-700">NOT SUCCESS:</strong> This order is counted as unsuccessful. Status: "return" means the order was returned and not delivered. Amount collected: 0 EGP.</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Hold Fee Information - Compact */}
                            {((order.hold_fee && order.hold_fee > 0) || order.hold_fee_removed_at || order.hold_fee_created_at) && (
                              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <User className="w-3 h-3 text-orange-600" />
                                    <span className="text-xs font-medium text-orange-800">المندوب:</span>
                                    <span className="text-xs text-orange-700 font-semibold">{order.courier_name || "غير محدد"}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-orange-600">
                                    <Calendar className="w-3 h-3" />
                                    {(order.hold_fee && order.hold_fee > 0) && order.hold_fee_added_at && (
                                      <span>
                                        {new Date(order.hold_fee_added_at).toLocaleDateString('ar-EG', {
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    )}
                                    {(!order.hold_fee || order.hold_fee === 0) && order.hold_fee_removed_at && (
                                      <span>
                                        إزالة: {new Date(order.hold_fee_removed_at).toLocaleDateString('ar-EG', {
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isAdmin && (
                                  <div className="flex items-center justify-between pt-1.5 border-t border-orange-200">
                                    <div className="flex items-center gap-1.5">
                                      <Edit3 className="w-3 h-3 text-yellow-600" />
                                      <span className="text-xs text-orange-700">
                                        {order.hold_fee_comment || "لا توجد ملاحظات"}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        const currentAmount = Number(order.hold_fee || 0)
                                        handleEditHoldFee(order.id, currentAmount, order.hold_fee_comment || "")
                                        setHoldFeeAmount(currentAmount > 0 ? currentAmount.toString() : "")
                                      }}
                                      className="text-xs text-yellow-700 hover:text-yellow-900 font-medium px-1.5 py-0.5"
                                    >
                                      {order.hold_fee_comment ? "تعديل" : "إضافة"}
                                    </button>
                                  </div>
                                )}
                                {editingHoldFee === order.id && (
                                  <div className="mt-2 pt-2 border-t border-orange-200 space-y-1.5">
                                    <textarea
                                      value={holdFeeComment}
                                      onChange={(e) => setHoldFeeComment(e.target.value)}
                                      placeholder="أضف ملاحظة..."
                                      className="w-full px-2 py-1 text-xs border border-yellow-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                      rows={2}
                                    />
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => handleSaveHoldFee(order.id)}
                                        disabled={holdFeeLoading}
                                        className="flex-1 px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 disabled:opacity-50"
                                      >
                                        {holdFeeLoading ? "جاري..." : "حفظ"}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingHoldFee(null)
                                          setHoldFeeComment("")
                                          setHoldFeeAmount("")
                                        }}
                                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Customer Details */}
                            <div className="space-y-3">
                              {/* Phone */}
                              <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                  <Smartphone className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">الهاتف:</span>
                                  <a
                                    href={`tel:${order.mobile_number}`}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                  >
                                    {order.mobile_number}
                                  </a>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => copyToClipboard(order.mobile_number, 'Phone')}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    title="Copy"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={`tel:${order.mobile_number}`}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    title="Call"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    onClick={() => openWhatsApp(order.mobile_number)}
                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                    title="WhatsApp"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Address */}
                              <div className="flex items-start justify-between py-2">
                                <div className="flex items-start gap-3 flex-1">
                                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                  <div className="flex-1">
                                    <span className="text-sm text-gray-600 block mb-1">العنوان:</span>
                                    <span 
                                      className="text-sm text-gray-800 cursor-pointer hover:text-blue-600"
                                      onClick={() => copyToClipboard(order.address, 'Address')}
                                    >
                                      {order.address}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => copyToClipboard(order.address, 'Address')}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    title="Copy"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => openMaps(order.address)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Maps"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Status */}
                              <div className="flex items-center gap-3 py-2">
                                <Info className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">الحالة:</span>
                                <span
                                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                                    order.status === "delivered"
                                      ? "bg-green-100 text-green-700"
                                      : order.status === "canceled"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {translate(order.status)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Financial Information - Compact */}
                          <div className="space-y-2">
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-gray-600" />
                                المعلومات المالية
                              </h5>
                              <div className="space-y-1.5">
                                {/* Order Total */}
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-xs text-gray-600">{translate("orderTotalLabel")}:</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-gray-900">
                                      {Number(order.total_order_fees).toFixed(2)} {translate("EGP")}
                                    </span>
                                    <button
                                      onClick={() => copyToClipboard(Number(order.total_order_fees).toFixed(2), 'Order Total')}
                                      className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Collected Amount */}
                                {courierOrderAmount > 0 && (
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-xs text-gray-600">
                                      {Number(order.partial_paid_amount || 0) > 0
                                        ? translate("partialAmountLabel")
                                        : translate("orderAmountCollectedLabel")}
                                      :
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold text-green-600">
                                        {courierOrderAmount.toFixed(2)} {translate("EGP")}
                                      </span>
                                      <button
                                        onClick={() => copyToClipboard(courierOrderAmount.toFixed(2), 'Collected')}
                                        className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Delivery Fee */}
                                {deliveryFee > 0 && (
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-xs text-gray-600">{translate("deliveryFee")}:</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-semibold text-blue-600">
                                        {deliveryFee.toFixed(2)} {translate("EGP")}
                                      </span>
                                      <button
                                        onClick={() => copyToClipboard(deliveryFee.toFixed(2), 'Delivery Fee')}
                                        className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {/* Hold Fee Section - Compact (no duplicate date) */}
                                {isAdmin && (
                                  <div className="border-t border-gray-200 pt-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                                        {translate("holdFee")}:
                                      </span>
                                      {!editingHoldFee || editingHoldFee !== order.id ? (
                                        <div className="flex items-center gap-1.5">
                                          {holdFee > 0 ? (
                                            <>
                                              <span className="text-xs font-semibold text-orange-600">
                                                -{holdFee.toFixed(2)} {translate("EGP")}
                                              </span>
                                              <button
                                                onClick={() =>
                                                  handleEditHoldFee(order.id, holdFee, order.hold_fee_comment ?? "")
                                                }
                                                className="text-blue-600 hover:text-blue-800 p-0.5"
                                                disabled={holdFeeLoading}
                                                title="Edit"
                                              >
                                                <Edit3 className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={() => handleRemoveHoldFee(order.id)}
                                                className="text-red-600 hover:text-red-800 p-0.5"
                                                disabled={holdFeeLoading}
                                                title="Remove"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              onClick={() => handleEditHoldFee(order.id)}
                                              className="text-green-600 hover:text-green-800 p-0.5 flex items-center gap-1"
                                              disabled={holdFeeLoading}
                                            >
                                              <Plus className="w-3 h-3" />
                                              <span className="text-xs">{translate("addHoldFee")}</span>
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="number"
                                            value={holdFeeAmount}
                                            onChange={(e) => setHoldFeeAmount(e.target.value)}
                                            placeholder={translate("enterAmount")}
                                            className="w-16 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            disabled={holdFeeLoading}
                                          />
                                          <button
                                            onClick={() => handleSaveHoldFee(order.id)}
                                            className="text-green-600 hover:text-green-800 p-0.5"
                                            disabled={holdFeeLoading}
                                          >
                                            <Save className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={handleCancelHoldFeeEdit}
                                            className="text-gray-600 hover:text-gray-800 p-0.5"
                                            disabled={holdFeeLoading}
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {editingHoldFee === order.id && (
                                      <input
                                        type="text"
                                        value={holdFeeComment}
                                        onChange={(e) => setHoldFeeComment(e.target.value)}
                                        placeholder={translate("enterComment")}
                                        className="w-full px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1"
                                        disabled={holdFeeLoading}
                                      />
                                    )}
                                  </div>
                                )}
                                {/* Total Courier Amount */}
                                {totalCourierAmount !== 0 && (
                                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-300">
                                    <span className="text-xs font-semibold text-gray-700">{translate("totalCourierHandledLabel")}:</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-bold text-purple-600">
                                        {totalCourierAmount.toFixed(2)} {translate("EGP")}
                                      </span>
                                      <button
                                        onClick={() => copyToClipboard(totalCourierAmount.toFixed(2), 'Total')}
                                        className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Payment Information - Compact */}
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <h6 className="text-xs font-medium text-gray-500 mb-1.5 uppercase">معلومات الدفع</h6>
                              <div className="space-y-1">
                                {/* Show payment_sub_type if it exists */}
                                {order.payment_sub_type && (
                                  <div className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-1.5">
                                      <CreditCard className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-600">{translate("paymentSubTypeLabel")}:</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                        {getDisplayPaymentMethod(order, translate)}
                                      </span>
                                      <button
                                        onClick={() => copyToClipboard(getDisplayPaymentMethod(order, translate), 'Payment')}
                                        className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Show collected_by if it exists and no payment_sub_type */}
                                {order.collected_by && !order.payment_sub_type && (
                                  <div className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-1.5">
                                      <User className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-600">{translate("collectedBy")}:</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                        {translate(order.collected_by)}
                                      </span>
                                      <button
                                        onClick={() => copyToClipboard(order.collected_by ? translate(order.collected_by) : '', 'Collected By')}
                                        className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Show payment_method only if no payment_sub_type and no collected_by */}
                                {!order.payment_sub_type && !order.collected_by && (
                                  <div className="flex items-center justify-between py-1">
                                    <div className="flex items-center gap-1.5">
                                      <CreditCard className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-600">{translate("paymentMethod")}:</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                        {translate(normalizePaymentMethod(order.payment_method))}
                                      </span>
                                      <button
                                        onClick={() => copyToClipboard(translate(normalizePaymentMethod(order.payment_method)), 'Payment')}
                                        className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Comment */}
                        {order.internal_comment && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Package className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-700">{translate("comment")}:</span>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">{order.internal_comment}</p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(order.internal_comment || '', 'Comment')}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Copy comment"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Proof Images */}
                        {order.order_proofs && order.order_proofs.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Eye className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-700">
                                {translate("proofImagesLabel")} ({order.order_proofs.length})
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {order.order_proofs.map((proof, idx) => (
                                <div 
                                  key={proof.id}
                                  className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors"
                                  onClick={() => window.open(proof.image_data, "_blank")}
                                >
                                  <img
                                    src={proof.image_data || "/placeholder.svg"}
                                    alt={`إثبات ${idx + 1}`}
                                    className="h-24 w-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <ExternalLink className="w-4 h-4 text-white drop-shadow-lg" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  // Get the current courier to display (either selected courier for admin or current user for courier)
  const currentCourier =
    user.role === "courier" ? { courierId: user.id, courierName: user.name ?? translate("courier") } : selectedCourier

  // Make sure all conditional returns are properly handled
  if (!currentCourier) return null

  // For courier view, show their detailed accounting dashboard
  const metrics = calculateAccountingMetrics()
  const belongsToCourier = (o: Order) => currentCourier.courierId === 'total' ? o.assigned_courier_id !== null : o.assigned_courier_id === currentCourier.courierId;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header - Mobile Optimized for Couriers */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className={`max-w-7xl mx-auto ${isCourier ? "px-3 py-3" : "px-6 py-6"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.role !== "courier" && (
                <button
                  onClick={handleBackToCouriers}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">{translate("backToCouriers")}</span>
                </button>
              )}
              <div
                className={`bg-blue-600 rounded-xl flex items-center justify-center ${
                  isCourier ? "w-8 h-8" : "w-12 h-12"
                }`}
              >
                <Calculator className={`text-white ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
              </div>
              <div>
                <h1 className={`font-bold text-gray-900 ${isCourier ? "text-lg" : "text-2xl"}`}>
                  {isCourier ? "المحاسبة" : "لوحة المحاسبة التفصيلية"}
                </h1>
                <p className={`text-gray-600 ${isCourier ? "text-xs" : "text-base"}`}>
                  {isCourier
                    ? currentCourier.courierName
                    : `تقرير شامل للعمليات المالية - ${currentCourier.courierName}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick Date Filters - Simplified for Mobile */}
              {!isCourier && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuickDateRange("today")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "today" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("today")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("yesterday")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "yesterday" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("yesterday")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("last7Days")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "last7Days" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("last7Days")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("last30Days")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "last30Days" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("last30Days")}
                  </button>
                </div>
              )}
              {isCourier && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQuickDateRange("today")}
                    className={`px-2 py-1 text-xs rounded hover:bg-blue-200 transition-colors ${
                      activeFilter === "today" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    اليوم
                  </button>
                  <button
                    onClick={() => setQuickDateRange("yesterday")}
                    className={`px-2 py-1 text-xs rounded hover:bg-blue-200 transition-colors ${
                      activeFilter === "yesterday" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    أمس
                  </button>
                </div>
              )}
              {/* Date Range Picker */}
              <div className="flex items-center gap-2">
                <Calendar className={`text-gray-400 ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => {
                    setActiveFilter("custom")
                    setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                    // fetchSummary will be called automatically by useEffect when dateRange changes
                  }}
                  className={`border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isCourier ? "px-2 py-1 text-xs" : "px-4 py-2"
                  }`}
                  dir="ltr"
                  aria-label={translate("selectDate")}
                />
                {!isCourier && (
                  <>
                    <span className="text-gray-500">-</span>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => {
                        setActiveFilter("custom")
                        setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                        // fetchSummary will be called automatically by useEffect when dateRange changes
                      }}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      dir="ltr"
                      aria-label={translate("selectDate")}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Mobile Optimized for Couriers */}
        <div className={`max-w-7xl mx-auto ${isCourier ? "px-3 py-2" : "px-4 py-3"}`}>
          <div className={isCourier ? "space-y-3" : "space-y-4"}>
            {/* 📦 Order Summary Section */}
            <div className={`bg-white rounded-xl border border-gray-200 ${isCourier ? "p-3" : "p-3"}`}>
              <div className={`flex items-center gap-2 ${isCourier ? "mb-2" : "mb-2"}`}>
                <div
                  className={`bg-blue-100 rounded-xl flex items-center justify-center ${
                    isCourier ? "w-8 h-8" : "w-10 h-10"
                  }`}
                >
                  <Package className={`text-blue-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                </div>
                <h2 className={`font-bold text-gray-900 ${isCourier ? "text-lg" : "text-xl"}`}>
                  {isCourier ? "📦 الطلبات" : "📦 ملخص الطلبات"}
                </h2>
              </div>
              <div
                className={`grid ${
                  isCourier ? "grid-cols-1 gap-3" : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                }`}
              >
                {/* Total Orders */}
                <div
                  className={`bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.allOrders, "إجمالي الطلبات")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-gray-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <Package className={`text-gray-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-gray-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "الإجمالي" : "إجمالي الطلبات"}
                      </h3>
                      <p className={`text-gray-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.totalOrdersCount} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-gray-300`}>
                      <span className={`font-bold text-gray-700 ${isCourier ? "text-xs" : "text-sm"}`}>القيمة:</span>
                      <span className={`font-bold text-gray-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.totalOrdersOriginalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-gray-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Pending Orders */}
                <div
                  className={`bg-yellow-50 border-2 border-yellow-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.pending?.orders || [], "الطلبات المعلقة")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-yellow-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <Clock className={`text-yellow-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-yellow-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "المعلقة" : "الطلبات المعلقة"}
                      </h3>
                      <p className={`text-yellow-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.pending?.count || 0} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-yellow-300`}>
                      <span className={`font-bold text-yellow-700 ${isCourier ? "text-xs" : "text-sm"}`}>القيمة:</span>
                      <span className={`font-bold text-yellow-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {(metrics.pending?.originalValue || 0).toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-yellow-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Assigned Orders */}
                <div
                  className={`bg-blue-50 border-2 border-blue-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.assigned?.orders || [], "الطلبات المكلفة")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-blue-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <Truck className={`text-blue-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-blue-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "المكلفة" : "الطلبات المكلفة"}
                      </h3>
                      <p className={`text-blue-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.assigned?.count || 0} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-blue-300`}>
                      <span className={`font-bold text-blue-700 ${isCourier ? "text-xs" : "text-sm"}`}>القيمة:</span>
                      <span className={`font-bold text-blue-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {(metrics.assigned?.originalValue || 0).toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-blue-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Delivered Orders */}
                <div
                  className={`bg-green-50 border-2 border-green-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.delivered.orders, "الطلبات المسلمة")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-green-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <CheckCircle className={`text-green-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-green-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "المسلمة" : "الطلبات المسلمة"}
                      </h3>
                      <p className={`text-green-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.delivered.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-green-300`}>
                      <span className={`font-bold text-green-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-green-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.delivered.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-green-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل فعلياً:
                      </span>
                      <span className={`font-bold text-green-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.delivered.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-green-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Canceled Orders */}
                <div
                  className={`bg-red-50 border-2 border-red-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.canceled.orders, "الطلبات الملغاة")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-red-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <XCircle className={`text-red-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-red-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "الملغاة" : "الطلبات الملغاة"}
                      </h3>
                      <p className={`text-red-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.canceled.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-red-300`}>
                      <span className={`font-bold text-red-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-red-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.canceled.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-red-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل (رسوم فقط):
                      </span>
                      <span className={`font-bold text-red-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.canceled.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-red-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Partial Orders */}
                <div
                  className={`bg-yellow-50 border-2 border-yellow-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.partial.orders, "الطلبات الجزئية")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-yellow-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <HandCoins className={`text-yellow-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-yellow-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "الجزئية" : "الطلبات الجزئية"}
                      </h3>
                      <p className={`text-yellow-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.partial.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-yellow-300`}>
                      <span className={`font-bold text-yellow-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-yellow-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.partial.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-yellow-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل فعلياً:
                      </span>
                      <span className={`font-bold text-yellow-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.partial.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-yellow-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Returned Orders */}
                <div
                  className={`bg-orange-50 border-2 border-orange-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.returned.orders, "الطلبات المؤجله")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-orange-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <Truck className={`text-orange-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-orange-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "المؤجلة" : "الطلبات المؤجله"}
                      </h3>
                      <p className={`text-orange-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.returned.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-orange-300`}>
                      <span className={`font-bold text-orange-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-orange-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.returned.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-orange-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل (رسوم فقط):
                      </span>
                      <span className={`font-bold text-orange-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.returned.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-orange-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Receiving Part Orders */}
                <div
                  className={`bg-indigo-50 border-2 border-indigo-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.receivingPart.orders, "طلبات استلام قطعة")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-indigo-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <HandMetal className={`text-indigo-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-indigo-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "استلام قطعة" : "طلبات استلام قطعة"}
                      </h3>
                      <p className={`text-indigo-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.receivingPart.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-indigo-300`}>
                      <span className={`font-bold text-indigo-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-indigo-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.receivingPart.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-indigo-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل فعلياً:
                      </span>
                      <span className={`font-bold text-indigo-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.receivingPart.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-indigo-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Hand-to-Hand Orders */}
                <div
                  className={`bg-purple-50 border-2 border-purple-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.handToHand.orders, "الطلبات يد بيد")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-purple-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <RefreshCw className={`text-purple-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-purple-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "يد بيد" : "الطلبات يد بيد"}
                      </h3>
                      <p className={`text-purple-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.handToHand.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-purple-300`}>
                      <span className={`font-bold text-purple-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-purple-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.handToHand.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-purple-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل فعلياً:
                      </span>
                      <span className={`font-bold text-purple-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.handToHand.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-purple-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* 💰 Total Collected and Not Delivered Summary - Courier View */}
            <div className={`bg-white rounded-xl border border-gray-200 ${isCourier ? "p-4" : "p-6"}`}>
              <div className={`flex items-center gap-3 ${isCourier ? "mb-4" : "mb-6"}`}>
                <div
                  className={`bg-emerald-100 rounded-xl flex items-center justify-center ${
                    isCourier ? "w-8 h-8" : "w-10 h-10"
                  }`}
                >
                  <Calculator className={`text-emerald-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                </div>
                <h2 className={`font-bold text-gray-900 ${isCourier ? "text-lg" : "text-xl"}`}>
                  {isCourier ? "💰 المحصل والغير مُسلَّم" : "💰 ملخص المحصل والغير مُسلَّم"}
                </h2>
              </div>
              <div className={`grid ${isCourier ? "grid-cols-1 gap-3" : "grid-cols-1 lg:grid-cols-2 gap-6"}`}>
                {/* Total Collected */}
                <div
                  className={`bg-emerald-50 border-2 border-emerald-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => {
                    const collectedOrders = [
                      ...metrics.delivered.orders,
                      ...metrics.partial.orders,
                      ...metrics.receivingPart.orders,
                      ...metrics.handToHand.orders,
                      ...metrics.canceled.orders,  // رسوم فقط
                      ...metrics.returned.orders     // رسوم فقط
                    ].filter(order => {
                      // For online payments (Visa/ValU/etc), consider collected as the paid amount
                      if (order.payment_method && ['paymob', 'valu', 'visa_machine', 'instapay', 'wallet'].includes(order.payment_method.toLowerCase())) {
                        return true
                      }
                      // Include all orders since we're now including fees only
                      return true
                    })
                    openOrders(collectedOrders, "إجمالي مُسلَّم فعليًا")
                  }}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-emerald-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <CheckCircle className={`text-emerald-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-emerald-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "المُسلَّم فعليًا" : "إجمالي مُسلَّم فعليًا"}
                      </h3>
                      <p className={`text-emerald-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {isCourier ? "المحصَّل فعليًا" : "مجموع المحصَّل فعليًا"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-emerald-300`}>
                      <span className={`font-bold text-emerald-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل فعلياً:
                      </span>
                      <span className={`font-bold text-emerald-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {(() => {
                          // Calculate total collected from all statuses including fees only
                          const totalCollected = 
                            metrics.delivered.courierCollected +
                            metrics.partial.courierCollected +
                            metrics.receivingPart.courierCollected +
                            metrics.handToHand.courierCollected +
                            metrics.canceled.courierCollected + // رسوم فقط
                            metrics.returned.courierCollected    // رسوم فقط
                          return totalCollected.toFixed(0)
                        })()} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-emerald-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        الطلبات:
                      </span>
                      <span className={`font-bold text-emerald-900 ${isCourier ? "text-sm" : "text-base"}`}>
                        {(() => {
                          const collectedOrders = [
                            ...metrics.delivered.orders,
                            ...metrics.partial.orders,
                            ...metrics.receivingPart.orders,
                            ...metrics.handToHand.orders,
                            ...metrics.canceled.orders,  // رسوم فقط
                            ...metrics.returned.orders    // رسوم فقط
                          ].filter(order => {
                            if (order.payment_method && ['paymob', 'valu', 'visa_machine', 'instapay', 'wallet'].includes(order.payment_method.toLowerCase())) {
                              return true
                            }
                            return true // Include all orders since we're now including fees only
                          }).length
                          return collectedOrders
                        })()} طلب
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-emerald-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Total Not Delivered */}
                <div
                  className={`bg-red-50 border-2 border-red-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => {
                    const notDeliveredOrders = [
                      ...metrics.canceled.orders,
                      ...metrics.returned.orders,
                      ...metrics.assigned.orders
                    ]
                    openOrders(notDeliveredOrders, "إجمالي غير مُسلَّم")
                  }}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-red-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <XCircle className={`text-red-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-red-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "غير مُسلَّم" : "إجمالي غير مُسلَّم"}
                      </h3>
                      <p className={`text-red-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {isCourier ? "العجز/الغير مُحصَّل" : "مجموع العجز/الغير مُحصَّل"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-red-300`}>
                      <span className={`font-bold text-red-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        غير مُسلَّم:
                      </span>
                      <span className={`font-bold text-red-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {(() => {
                          // Calculate total not delivered according to the specified rules
                          let totalNotDelivered = 0
                          
                          // Canceled orders: full original value (as specified)
                          totalNotDelivered += metrics.canceled.originalValue
                          
                          // Partial orders: (original value - actually collected)
                          totalNotDelivered += Math.max(0, metrics.partial.originalValue - metrics.partial.courierCollected)
                          
                          // Hand-to-hand orders: (original value - actually collected) if not collected
                          totalNotDelivered += Math.max(0, metrics.handToHand.originalValue - metrics.handToHand.courierCollected)
                          
                          // Receiving part orders: (original value - actually collected)
                          totalNotDelivered += Math.max(0, metrics.receivingPart.originalValue - metrics.receivingPart.courierCollected)
                          
                          // Assigned orders: full original value (not yet delivered)
                          totalNotDelivered += metrics.assigned.originalValue
                          
                          // Return orders: full original value (as specified - fees only are not subtracted)
                          totalNotDelivered += metrics.returned.originalValue
                          
                          return totalNotDelivered.toFixed(0)
                        })()} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-red-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        الطلبات:
                      </span>
                      <span className={`font-bold text-red-900 ${isCourier ? "text-sm" : "text-base"}`}>
                        {(() => {
                          const notDeliveredCount = 
                            metrics.canceled.count +
                            metrics.returned.count +
                            metrics.assigned.count
                          return notDeliveredCount
                        })()} طلب
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-red-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* 💰 Courier Fees Section - Admin Only */}
            {user.role === "admin" && (
              <div className={`bg-white rounded-xl border border-gray-200 ${isCourier ? "p-4" : "p-6"}`}>
                <div className={`flex items-center gap-3 ${isCourier ? "mb-4" : "mb-6"}`}>
                  <div
                    className={`bg-green-100 rounded-xl flex items-center justify-center ${
                      isCourier ? "w-8 h-8" : "w-10 h-10"
                    }`}
                  >
                    <HandCoins className={`text-green-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                  </div>
                  <h2 className={`font-bold text-gray-900 ${isCourier ? "text-lg" : "text-xl"}`}>
                    💰 رسوم المندوب
                  </h2>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-3">
                    <label htmlFor="courier-fee-amount" className="text-sm font-medium text-gray-700">المبلغ:</label>
                    <input
                      id="courier-fee-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-green-500 focus:ring-2 focus:ring-green-200 text-center"
                      placeholder="0.00"
                      value={courierFeeAmount}
                      onChange={(e) => setCourierFeeAmount(e.target.value)}
                    />
                    <span className="text-sm text-gray-600">د.ك</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label htmlFor="courier-fee-date" className="text-sm font-medium text-gray-700">التاريخ:</label>
                    <input
                      id="courier-fee-date"
                      type="date"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-green-500 focus:ring-200 focus:ring-green-200"
                      value={dateRange.startDate}
                      onChange={(e) => {
                        setDateRange((prev) => ({ ...prev, startDate: e.target.value, endDate: e.target.value }))
                      }}
                    />
                  </div>
                  {courierFeeAmount ? (
                    <div className="flex items-center gap-2">
                      <button
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all flex items-center gap-2"
                        onClick={saveCourierFee}
                      >
                        <Save className="w-4 h-4" />
                        حفظ
                      </button>
                      <button
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all flex items-center gap-2"
                        onClick={() => setCourierFeeAmount("")}
                      >
                        <X className="w-4 h-4" />
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all flex items-center gap-2"
                      disabled={!courierFeeAmount}
                    >
                      <Save className="w-4 h-4" />
                      حفظ
                    </button>
                  )}
                </div>
                {getCurrentDayFee() && (
                  <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-green-800 font-medium">
                        رسوم المندوب المحفوظة: <strong>{getCurrentDayFee()} د.ك</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm">
                          للتاريخ: {dateRange.startDate}
                        </span>
                        <button
                          onClick={removeCourierFee}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-3 text-xs text-gray-500 text-center">
                  يمكن للمدير تحديد رسوم التوصيل اليومية لكل مندوب
                </div>
              </div>
            )}

            {/* 💳 Payment Breakdown */}
            <div className={`bg-white rounded-xl border border-gray-200 ${isCourier ? "p-4" : "p-6"}`}>
              <div className={`flex items-center justify-between ${isCourier ? "mb-4" : "mb-6"}`}>
                <div className={`flex items-center gap-3`}>
                  <div
                    className={`bg-purple-100 rounded-xl flex items-center justify-center ${
                      isCourier ? "w-8 h-8" : "w-10 h-10"
                    }`}
                  >
                    <CreditCard className={`text-purple-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                  </div>
                  <h2 className={`font-bold text-gray-900 ${isCourier ? "text-lg" : "text-xl"}`}>
                    {isCourier ? "💳 طرق الدفع" : "💳 تفصيل طرق الدفع"}
                  </h2>
                </div>
                {/* Hold Fee Filter Toggle */}
                <div className="flex items-center gap-3 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                  <label className={`flex items-center gap-3 cursor-pointer ${isCourier ? "text-sm" : "text-base"}`}>
                    <input
                      type="checkbox"
                      checked={includeHoldFeesInPayment}
                      onChange={(e) => {
                        console.log('Toggle changed:', e.target.checked)
                        setIncludeHoldFeesInPayment(e.target.checked)
                      }}
                      className="w-5 h-5 text-purple-600 bg-white border-purple-300 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <span className="text-purple-800 font-medium">تضمين رسوم الحجز</span>
                  </label>
                </div>
              </div>
              <div
                className={`grid ${
                  isCourier
                    ? "grid-cols-2 gap-2 mb-4"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6"
                }`}
              >
                {/* Visa Machine */}
                {(() => {
                  const orders = allOrders.filter((o) => {
                    return (
                      o.payment_sub_type === "visa_machine" &&
                      getTotalCourierAmount(o) > 0 &&
                      belongsToCourier(o) &&
                      (includeHoldFeesInPayment || (!o.hold_fee_added_at && !o.hold_fee_removed_at))
                    )
                  })
                  const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return (
                    <div
                      className={`${orders.length > 0 ? "bg-slate-50 border-slate-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={() => openOrders(orders, "طلبات ماكينة فيزا")}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <Monitor className={`${orders.length > 0 ? "text-slate-600" : "text-gray-400"} ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold ${orders.length > 0 ? "text-slate-900" : "text-gray-500"} ${isCourier ? "text-xs" : "text-base"}`}>
                          {isCourier ? "فيزا" : "ماكينة فيزا"}
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold ${orders.length > 0 ? "text-slate-900" : "text-gray-500"} ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold ${orders.length > 0 ? "text-slate-700" : "text-gray-400"} ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(0)} ج.م
                        </p>
                      </div>
                    </div>
                  )
                })()}
                {/* Instapay */}
                {(() => {
                  const orders = allOrders.filter((o) => {
                    return (
                      o.payment_sub_type === "instapay" &&
                      getTotalCourierAmount(o) > 0 &&
                      belongsToCourier(o) &&
                      (includeHoldFeesInPayment || (!o.hold_fee_added_at && !o.hold_fee_removed_at))
                    )
                  })
                  const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return (
                    <div
                      className={`${orders.length > 0 ? "bg-cyan-50 border-cyan-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={() => openOrders(orders, "طلبات إنستاباي")}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <Smartphone className={`${orders.length > 0 ? "text-cyan-600" : "text-gray-400"} ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold ${orders.length > 0 ? "text-cyan-900" : "text-gray-500"} ${isCourier ? "text-xs" : "text-base"}`}>
                          {isCourier ? "إنستا" : "إنستاباي"}
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold ${orders.length > 0 ? "text-cyan-900" : "text-gray-500"} ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold ${orders.length > 0 ? "text-cyan-700" : "text-gray-400"} ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(0)} ج.م
                        </p>
                      </div>
                    </div>
                  )
                })()}
                {/* Wallet */}
                {(() => {
                  const orders = allOrders.filter((o) => {
                    return (
                      o.payment_sub_type === "wallet" &&
                      getTotalCourierAmount(o) > 0 &&
                      belongsToCourier(o) &&
                      (includeHoldFeesInPayment || (!o.hold_fee_added_at && !o.hold_fee_removed_at))
                    )
                  })
                  const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return (
                    <div
                      className={`${orders.length > 0 ? "bg-teal-50 border-teal-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={() => openOrders(orders, "طلبات المحفظة")}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <Wallet className={`${orders.length > 0 ? "text-teal-600" : "text-gray-400"} ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold ${orders.length > 0 ? "text-teal-900" : "text-gray-500"} ${isCourier ? "text-xs" : "text-base"}`}>
                          المحفظة
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold ${orders.length > 0 ? "text-teal-900" : "text-gray-500"} ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold ${orders.length > 0 ? "text-teal-700" : "text-gray-400"} ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(0)} ج.م
                        </p>
                      </div>
                    </div>
                  )
                })()}
                {/* Cash on Hand */}
                {(() => {
                  const orders = allOrders.filter((o) => {
                    const displayMethod = getDisplayPaymentMethod(o).toLowerCase()
                    const originalMethod = (o.payment_method || "").toLowerCase()

                    const isGeneralCash =
                      displayMethod === "cash" ||
                      originalMethod === "cash" ||
                      (o.collected_by && o.collected_by.toLowerCase() === "cash") ||
                      (o.collected_by && o.collected_by.toLowerCase() === "on_hand")

                    const isSpecificElectronicCashLike =
                      o.payment_sub_type === "instapay" ||
                      o.payment_sub_type === "wallet" ||
                      o.payment_sub_type === "visa_machine"

                    return (
                      (o.payment_sub_type === "on_hand" || (isGeneralCash && !isSpecificElectronicCashLike)) &&
                      getTotalCourierAmount(o) > 0 &&
                      belongsToCourier(o) &&
                      (includeHoldFeesInPayment || (!o.hold_fee_added_at && !o.hold_fee_removed_at))
                    )
                  })
                  const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return (
                    <div
                      className={`${orders.length > 0 ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={() => openOrders(orders, "طلبات نقداً")}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <Banknote className={`${orders.length > 0 ? "text-emerald-600" : "text-gray-400"} ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold ${orders.length > 0 ? "text-emerald-900" : "text-gray-500"} ${isCourier ? "text-xs" : "text-base"}`}>
                          نقداً
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold ${orders.length > 0 ? "text-emerald-900" : "text-gray-500"} ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold ${orders.length > 0 ? "text-emerald-700" : "text-gray-400"} ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(0)} ج.م
                        </p>
                      </div>
                    </div>
                  )
                })()}
                {/* Total COD - Hidden for mobile */}
                {!isCourier &&
                  (() => {
                    const orders = allOrders.filter((o) => {
                      const displayMethod = getDisplayPaymentMethod(o).toLowerCase()
                      const originalMethod = (o.payment_method || "").toLowerCase()

                      return (
                        (o.payment_sub_type === "on_hand" ||
                          o.payment_sub_type === "instapay" ||
                          o.payment_sub_type === "wallet" ||
                          o.payment_sub_type === "visa_machine" ||
                          displayMethod === "on_hand" ||
                          displayMethod === "cash" ||
                          displayMethod === "instapay" ||
                          displayMethod === "wallet" ||
                          displayMethod === "visa_machine" ||
                          originalMethod === "cash" ||
                          (o.collected_by &&
                            ["cash", "on_hand", "instapay", "wallet", "visa_machine"].includes(
                              o.collected_by.toLowerCase(),
                            )) ||
                          normalizePaymentMethod(displayMethod) === "cash" ||
                          normalizePaymentMethod(originalMethod) === "cash") &&
                        getTotalCourierAmount(o) > 0 &&
                        belongsToCourier(o) &&
                        (includeHoldFeesInPayment || (!o.hold_fee_added_at && !o.hold_fee_removed_at))
                      )
                    })
                    const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                    return (
                      <div
                        className={`${orders.length > 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all group`}
                        onClick={() => openOrders(orders, "إجمالي الدفع عند التسليم")}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <HandCoins className={`w-6 h-6 ${orders.length > 0 ? "text-amber-600" : "text-gray-400"}`} />
                          <h4 className={`font-semibold ${orders.length > 0 ? "text-amber-900" : "text-gray-500"}`}>إجمالي COD</h4>
                        </div>
                        <div className="space-y-1">
                          <p className={`text-2xl font-bold ${orders.length > 0 ? "text-amber-900" : "text-gray-500"}`}>{orders.length}</p>
                          <p className={`text-lg font-semibold ${orders.length > 0 ? "text-amber-700" : "text-gray-400"}`}>{amount.toFixed(2)} ج.م</p>
                        </div>
                      </div>
                    )
                  })()}
              </div>
              {/* Electronic Payments Row */}
              <div className={`grid ${isCourier ? "grid-cols-2 gap-2" : "grid-cols-1 sm:grid-cols-2 gap-4"}`}>
                {/* Valu */}
                {/* Valu */}
                {(() => {
                  const orders = allOrders.filter((o) => {
                    const displayMethod = getDisplayPaymentMethod(o)
                    const normalizedDisplay = normalizePaymentMethod(displayMethod)
                    const normalizedOriginal = normalizePaymentMethod(o.payment_method)
                    return (
                      (normalizedDisplay === "valu" || (normalizedOriginal === "valu" && !o.collected_by)) &&
                      getTotalCourierAmount(o) > 0 &&
                      belongsToCourier(o) &&
                      (includeHoldFeesInPayment || (!o.hold_fee_added_at && !o.hold_fee_removed_at))
                    )
                  })
                  const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return (
                    <div
                      className={`${orders.length > 0 ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={() => openOrders(orders, "طلبات فاليو")}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <Wallet className={`${orders.length > 0 ? "text-indigo-600" : "text-gray-400"} ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold ${orders.length > 0 ? "text-indigo-900" : "text-gray-500"} ${isCourier ? "text-xs" : "text-base"}`}>
                          فاليو
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold ${orders.length > 0 ? "text-indigo-900" : "text-gray-500"} ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold ${orders.length > 0 ? "text-indigo-700" : "text-gray-400"} ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(0)} ج.م
                        </p>
                      </div>
                    </div>
                  )
                })()}
                {/* Paymob - Updated logic to include all paymob orders with collected amounts */}
                {(() => {
                  const orders = allOrders.filter((o) => {
                    const displayMethod = getDisplayPaymentMethod(o)
                    const normalizedDisplay = normalizePaymentMethod(displayMethod)
                    const normalizedOriginal = normalizePaymentMethod(o.payment_method)
                    const isValu = normalizedDisplay === "valu" || normalizedOriginal === "valu"
                    // If it's valu, don't count as paymob
                    if (isValu) return false
                    // If it's paid and has collected amount, count as paymob
                    if (o.payment_status === "paid" && getTotalCourierAmount(o) > 0) {
                      return belongsToCourier(o) && (includeHoldFeesInPayment || (!o.hold_fee_added_at && !o.hold_fee_removed_at))
                    }
                    // Check for paymob indicators (excluding visa_machine which is separate)
                    return (
                      ((normalizedDisplay === "paymob" && o.payment_sub_type !== "visa_machine") ||
                        (normalizedOriginal === "paymob" && !o.collected_by && !o.payment_sub_type)) &&
                      getTotalCourierAmount(o) > 0 &&
                      belongsToCourier(o) &&
                      (includeHoldFeesInPayment || (!o.hold_fee_added_at && !o.hold_fee_removed_at))
                    )
                  })
                  const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return (
                    <div
                      className={`${orders.length > 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200 opacity-60"} border-2 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={() => openOrders(orders, "طلبات paymob")}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <CreditCard className={`${orders.length > 0 ? "text-blue-600" : "text-gray-400"} ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold ${orders.length > 0 ? "text-blue-900" : "text-gray-500"} ${isCourier ? "text-xs" : "text-base"}`}>Paymob</h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold ${orders.length > 0 ? "text-blue-900" : "text-gray-500"} ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold ${orders.length > 0 ? "text-blue-700" : "text-gray-400"} ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(0)} ج.م
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* 🚨 Hold Fees - ALWAYS VISIBLE - ALL DAYS */}
            <div className={`bg-white rounded-xl border border-gray-200 ${isCourier ? "p-4" : "p-6"}`}>
              <div className={`flex items-center justify-between ${isCourier ? "mb-4" : "mb-6"}`}>
                <div className={`flex items-center gap-3`}>
                  <div
                    className={`bg-red-100 rounded-xl flex items-center justify-center ${
                      isCourier ? "w-8 h-8" : "w-10 h-10"
                    }`}
                  >
                    <AlertCircle className={`text-red-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                  </div>
                  <h2 className={`font-bold text-gray-900 ${isCourier ? "text-lg" : "text-xl"}`}>
                    {isCourier ? "رسوم الحجز" : "🚨 رسوم الحجز"}
                  </h2>
                </div>
                
                {/* Note: Hold fees always show all days - no filter needed */}
                <div className="flex items-center gap-2">
                  <span className={`text-gray-500 ${isCourier ? "text-xs" : "text-sm"}`}>جميع الأيام</span>
                </div>
              </div>
              <div className={`grid ${isCourier ? "grid-cols-1 gap-3" : "grid-cols-1 sm:grid-cols-2 gap-4"}`}>
                {/* Active Hold Fees - ALWAYS VISIBLE - ALL DAYS - NO DATE FILTER */}
                {(() => {
                  const orders = allHoldFeesOrders.filter((o) => {
                    return o.hold_fee && Number(o.hold_fee) > 0 && belongsToCourier(o)
                  })
                  const amount = orders.reduce((acc, o) => acc + Number(o.hold_fee || 0), 0)
                  // Sort by addition date (most recent first)
                  const sortedOrders = orders.sort((a, b) => 
                    new Date(b.hold_fee_added_at || b.hold_fee_created_at || '').getTime() - 
                    new Date(a.hold_fee_added_at || a.hold_fee_created_at || '').getTime()
                  )
                  return (
                    <div
                      className={`${orders.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border-2 rounded-xl ${orders.length > 0 ? 'cursor-pointer hover:shadow-lg' : ''} transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={orders.length > 0 ? () => openOrders(orders, "رسوم الحجز النشطة (جميع الأيام)") : undefined}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <AlertCircle className={`${orders.length > 0 ? 'text-red-600' : 'text-gray-400'} ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold ${orders.length > 0 ? 'text-red-900' : 'text-gray-500'} ${isCourier ? "text-xs" : "text-base"}`}>
                          رسوم حجز نشطة
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold ${orders.length > 0 ? 'text-red-900' : 'text-gray-500'} ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold ${orders.length > 0 ? 'text-red-700' : 'text-gray-400'} ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(2)} ج.م
                        </p>
                        {sortedOrders.length > 0 && (sortedOrders[0].hold_fee_added_at || sortedOrders[0].hold_fee_created_at) && (
                          <p className={`${orders.length > 0 ? 'text-red-600' : 'text-gray-400'} ${isCourier ? "text-xs" : "text-sm"}`}>
                            آخر إضافة: {new Date(sortedOrders[0].hold_fee_added_at || sortedOrders[0].hold_fee_created_at || '').toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })()}
                
                {/* Removed Hold Fees - ALWAYS VISIBLE with removal date - ALL DAYS - NO DATE FILTER */}
                {(() => {
                  const orders = allHoldFeesOrders.filter((o) => {
                    return !o.hold_fee && o.hold_fee_created_at && o.hold_fee_created_by && belongsToCourier(o)
                  })
                  // Sort by removal date (most recent first)
                  const sortedOrders = orders.sort((a, b) => 
                    new Date(b.hold_fee_removed_at || b.hold_fee_created_at || '').getTime() - 
                    new Date(a.hold_fee_removed_at || a.hold_fee_created_at || '').getTime()
                  )
                  return (
                    <div
                      className={`${orders.length > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border-2 rounded-xl ${orders.length > 0 ? 'cursor-pointer hover:shadow-lg' : ''} transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={orders.length > 0 ? () => openOrders(orders, "رسوم الحجز المزالة (جميع الأيام)") : undefined}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <CheckCircle className={`${orders.length > 0 ? 'text-green-600' : 'text-gray-400'} ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold ${orders.length > 0 ? 'text-green-900' : 'text-gray-500'} ${isCourier ? "text-xs" : "text-base"}`}>
                          رسوم حجز مزالة
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold ${orders.length > 0 ? 'text-green-900' : 'text-gray-500'} ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold ${orders.length > 0 ? 'text-green-700' : 'text-gray-400'} ${isCourier ? "text-sm" : "text-lg"}`}>
                          {orders.length > 0 ? 'تم الإزالة' : 'لا توجد'}
                        </p>
                        {sortedOrders.length > 0 && (sortedOrders[0].hold_fee_removed_at || sortedOrders[0].hold_fee_created_at) && (
                          <p className={`${orders.length > 0 ? 'text-green-600' : 'text-gray-400'} ${isCourier ? "text-xs" : "text-sm"}`}>
                            آخر إزالة: {new Date(sortedOrders[0].hold_fee_removed_at || sortedOrders[0].hold_fee_created_at || '').toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* 🧾 Total Hand to Accounting */}
            <div className={`bg-white rounded-xl border border-gray-200 ${isCourier ? "p-4" : "p-6"}`}>
              <div className={`flex items-center gap-3 ${isCourier ? "mb-4" : "mb-6"}`}>
                <div
                  className={`bg-green-100 rounded-xl flex items-center justify-center ${
                    isCourier ? "w-8 h-8" : "w-10 h-10"
                  }`}
                >
                  <Receipt className={`text-green-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                </div>
                <h2 className={`font-bold text-gray-900 ${isCourier ? "text-lg" : "text-xl"}`}>
                  {isCourier ? "للمحاسبة" : "🧾 إجمالي ما يسلم للمحاسبة"}
                </h2>
              </div>
              <div
                className={`bg-green-50 border-2 border-green-200 rounded-xl text-center ${isCourier ? "p-6" : "p-8"}`}
              >
                {(() => {
                  const cashOnHandOrders = allOrders.filter((o) => {
                    const displayMethod = getDisplayPaymentMethod(o).toLowerCase()
                    const originalMethod = (o.payment_method || "").toLowerCase()

                    const isGeneralCash =
                      displayMethod === "cash" ||
                      originalMethod === "cash" ||
                      (o.collected_by && o.collected_by.toLowerCase() === "cash") ||
                      (o.collected_by && o.collected_by.toLowerCase() === "on_hand")

                    const isSpecificElectronicCashLike =
                      o.payment_sub_type === "instapay" ||
                      o.payment_sub_type === "wallet" ||
                      o.payment_sub_type === "visa_machine"

                    return (
                      (o.payment_sub_type === "on_hand" || (isGeneralCash && !isSpecificElectronicCashLike)) &&
                      belongsToCourier(o) &&
                      (includeHoldFeesInPayment || (!o.hold_fee_added_at && !o.hold_fee_removed_at))
                    )
                  })
                  const totalHandToAccounting = cashOnHandOrders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return (
                    <>
                      <div className={`font-bold text-green-900 mb-2 ${isCourier ? "text-2xl" : "text-4xl"}`}>
                        {totalHandToAccounting.toFixed(0)} ج.م
                      </div>
                      <p className={`text-green-700 font-medium ${isCourier ? "text-sm" : "text-base"}`}>
                        {isCourier ? "النقد فقط" : "النقد في اليد فقط"}
                      </p>
                      <p className={`text-green-600 mt-2 ${isCourier ? "text-xs" : "text-sm"}`}>
                        ({cashOnHandOrders.length} طلب نقدي)
                      </p>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Orders Modal - Mobile Optimized */}
        {selectedOrders.length > 0 && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
              className={`bg-white rounded-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl ${
                isCourier ? "max-w-md" : "max-w-5xl"
              }`}
            >
              {/* Modal Header */}
              <div className={`bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 ${isCourier ? "p-3" : "p-4"}`}>
                <div className="flex items-center gap-2">
                  <div className={`bg-blue-50 rounded-lg flex items-center justify-center ${isCourier ? "w-8 h-8" : "w-10 h-10"}`}>
                    <Filter className={`text-blue-600 ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-gray-900 ${isCourier ? "text-base" : "text-lg"}`}>{modalTitle}</h3>
                    <p className={`text-gray-500 ${isCourier ? "text-xs" : "text-sm"}`}>
                      {selectedOrders.length} {translate("ordersCount")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    ordersModalScroll.restoreScroll()
                    setSelectedOrders([])
                  }}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                  aria-label={translate("close")}
                >
                  <X className={`${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                </button>
              </div>
              {/* Modal Content */}
              <div 
                ref={ordersModalScroll.containerRef}
                className={`flex-1 overflow-y-auto bg-gray-50 ${isCourier ? "p-3" : "p-4"}`}
              >
                <div className={isCourier ? "space-y-3" : "space-y-4"}>
                  {selectedOrders.map((order) => {
                    
                    const courierOrderAmount = getCourierOrderAmount(order);
                    const deliveryFee = Number(order.delivery_fee || 0);
                    const totalCourierAmount = getTotalCourierAmount(order);
                    const paymentMethodLabel = translate(getDisplayPaymentMethod(order));
                    const holdFee = Number(order.hold_fee || 0);
                    const rowKey = order.id;
                    return (
                      <div
                        key={rowKey}
                        className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${isCourier ? "p-3" : "p-4"}`}
                      >
                        <div className={`grid ${isCourier ? "grid-cols-1 gap-4" : "grid-cols-1 lg:grid-cols-2 gap-6"}`}>
                          {/* Order Information */}
                          <div className={isCourier ? "space-y-3" : "space-y-4"}>
                            <div className={`flex items-center gap-3 pb-3 border-b border-gray-200`}>
                              <div
                                className={`bg-blue-100 rounded-lg flex items-center justify-center ${isCourier ? "w-6 h-6" : "w-8 h-8"}`}
                              >
                                <Package className={`text-blue-600 ${isCourier ? "w-3 h-3" : "w-4 h-4"}`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className={`font-semibold text-gray-900 ${isCourier ? "text-sm" : "text-base"}`}>
                                    طلب #{order.order_id}
                                  </h4>
                                  {order.hold_fee && order.hold_fee > 0 && (
                                    <span className={`px-2 py-1 bg-orange-100 text-orange-800 rounded-full font-medium ${isCourier ? "text-xs" : "text-xs"}`}>
                                      رسوم حجز
                                    </span>
                                  )}
                                  {(!order.hold_fee || order.hold_fee === 0) && order.hold_fee_removed_at && (
                                    <span className={`px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium ${isCourier ? "text-xs" : "text-xs"}`}>
                                      تم الإزالة
                                    </span>
                                  )}
                                </div>
                                <p className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>
                                  {order.customer_name}
                                </p>
                                
                                {/* Hold Fee Date Information - Enhanced */}
                                {(order.hold_fee && order.hold_fee > 0) && (
                                  <div className={`mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg ${isCourier ? "text-xs" : "text-sm"}`}>
                                    <div className="flex items-center gap-2">
                                      <Calendar className={`text-blue-600 ${isCourier ? "w-3 h-3" : "w-4 h-4"}`} />
                                      <span className={`font-medium text-blue-800 ${isCourier ? "text-xs" : "text-sm"}`}>تاريخ إضافة رسوم الحجز:</span>
                                    </div>
                                    <p className={`text-blue-700 mt-1 ${isCourier ? "text-xs" : "text-sm"}`}>
                                      {order.hold_fee_added_at ? 
                                        new Date(order.hold_fee_added_at).toLocaleDateString('ar-EG', {
                                          year: 'numeric',
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        }) : 
                                        order.hold_fee_created_at ? 
                                          new Date(order.hold_fee_created_at).toLocaleDateString('ar-EG', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          }) : 
                                          'تاريخ غير محدد'
                                      }
                                    </p>
                                  </div>
                                )}
                                {(!order.hold_fee || order.hold_fee === 0) && (order.hold_fee_removed_at || order.hold_fee_created_at) && (
                                  <div className={`mt-2 p-2 bg-green-50 border border-green-200 rounded-lg ${isCourier ? "text-xs" : "text-sm"}`}>
                                    <div className="flex items-center gap-2">
                                      <Calendar className={`text-green-600 ${isCourier ? "w-3 h-3" : "w-4 h-4"}`} />
                                      <span className={`font-medium text-green-800 ${isCourier ? "text-xs" : "text-sm"}`}>تاريخ إزالة رسوم الحجز:</span>
                                    </div>
                                    <p className={`text-green-700 mt-1 ${isCourier ? "text-xs" : "text-sm"}`}>
                                      {order.hold_fee_removed_at ? 
                                        new Date(order.hold_fee_removed_at).toLocaleDateString('ar-EG', {
                                          year: 'numeric',
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        }) : 
                                        order.hold_fee_created_at ? 
                                          new Date(order.hold_fee_created_at).toLocaleDateString('ar-EG', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          }) : 
                                          'تاريخ غير محدد'
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Returned Order Details */}
                            {order.status === "return" && (
                              <div className={`mt-2 p-2 bg-orange-50 border border-orange-300 rounded-lg ${isCourier ? "text-xs" : "text-sm"}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <Truck className={`text-orange-600 ${isCourier ? "w-3 h-3" : "w-4 h-4"}`} />
                                  <span className={`font-semibold text-orange-800 ${isCourier ? "text-xs" : "text-sm"}`}>Returned Order Details</span>
                                </div>
                                <div className={`space-y-2 ${isCourier ? "text-xs" : "text-xs"}`}>
                                  <div className="bg-white rounded p-2 border border-orange-200">
                                    <p className={`font-semibold text-orange-900 mb-1 ${isCourier ? "text-xs" : "text-xs"}`}>What happened:</p>
                                    <p className="text-orange-700">
                                      This order was returned by the courier. The courier attempted delivery but the order was not completed.
                                    </p>
                                  </div>
                                  {order.updated_at && (
                                    <div className="flex items-center gap-2 text-orange-600">
                                      <Calendar className={`${isCourier ? "w-3 h-3" : "w-3 h-3"}`} />
                                      <span>Returned on: {new Date(order.updated_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}</span>
                                    </div>
                                  )}
                                  {order.notes && (
                                    <div className="bg-white rounded p-2 border border-orange-200">
                                      <p className={`font-semibold text-orange-900 mb-1 ${isCourier ? "text-xs" : "text-xs"}`}>Notes:</p>
                                      <p className="text-orange-700">{order.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Success/Not Success Calculation Explanation */}
                            {(order.status === "delivered" || order.status === "partial" || order.status === "canceled" || order.status === "return") && (
                              <div className={`mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg ${isCourier ? "text-xs" : "text-sm"}`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Info className={`text-gray-600 ${isCourier ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
                                  <span className={`font-semibold text-gray-700 ${isCourier ? "text-xs" : "text-xs"}`}>Calculation Info:</span>
                                </div>
                                <div className={`text-gray-600 space-y-1 ${isCourier ? "text-xs" : "text-xs"}`}>
                                  {order.status === "delivered" && (
                                    <p className="flex items-start gap-1">
                                      <CheckCircle className={`text-green-600 mt-0.5 flex-shrink-0 ${isCourier ? "w-3 h-3" : "w-3 h-3"}`} />
                                      <span><strong className="text-green-700">SUCCESS:</strong> This order is counted as successful. Status: "delivered" means the order was successfully completed.</span>
                                    </p>
                                  )}
                                  {order.status === "partial" && (
                                    <p className="flex items-start gap-1">
                                      <CheckCircle className={`text-yellow-600 mt-0.5 flex-shrink-0 ${isCourier ? "w-3 h-3" : "w-3 h-3"}`} />
                                      <span><strong className="text-yellow-700">SUCCESS (Partial):</strong> This order is counted as successful but with partial payment. The courier collected {order.partial_paid_amount || 0} EGP out of {order.total_order_fees || 0} EGP.</span>
                                    </p>
                                  )}
                                  {order.status === "canceled" && (
                                    <p className="flex items-start gap-1">
                                      <XCircle className={`text-red-600 mt-0.5 flex-shrink-0 ${isCourier ? "w-3 h-3" : "w-3 h-3"}`} />
                                      <span><strong className="text-red-700">NOT SUCCESS:</strong> This order is counted as unsuccessful. Status: "canceled" means the order was canceled and not delivered.</span>
                                    </p>
                                  )}
                                  {order.status === "return" && (
                                    <p className="flex items-start gap-1">
                                      <Truck className={`text-orange-600 mt-0.5 flex-shrink-0 ${isCourier ? "w-3 h-3" : "w-3 h-3"}`} />
                                      <span><strong className="text-orange-700">NOT SUCCESS:</strong> This order is counted as unsuccessful. Status: "return" means the order was returned and not delivered. Amount collected: 0 EGP.</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Customer Details */}
                            <div className={isCourier ? "space-y-2" : "space-y-2.5"}>
                              {/* Phone */}
                              <div className="flex items-center justify-between py-1.5">
                                <div className="flex items-center gap-2 flex-1">
                                  <Smartphone className={`text-gray-400 ${isCourier ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                                  <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>الهاتف:</span>
                                  <a
                                    href={`tel:${order.mobile_number}`}
                                    className={`font-medium text-blue-600 hover:text-blue-700 ${isCourier ? "text-xs" : "text-sm"}`}
                                  >
                                    {order.mobile_number}
                                  </a>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => copyToClipboard(order.mobile_number, 'Phone')}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                  >
                                    <Copy className={`${isCourier ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
                                  </button>
                                  <a
                                    href={`tel:${order.mobile_number}`}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                  >
                                    <Phone className={`${isCourier ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
                                  </a>
                                </div>
                              </div>

                              {/* Address */}
                              <div className="flex items-start justify-between py-1.5">
                                <div className="flex items-start gap-2 flex-1">
                                  <MapPin className={`text-gray-400 mt-0.5 ${isCourier ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                                  <div className="flex-1">
                                    <span className={`text-gray-600 block mb-0.5 ${isCourier ? "text-xs" : "text-sm"}`}>العنوان:</span>
                                    <span 
                                      className={`text-gray-800 cursor-pointer hover:text-blue-600 ${isCourier ? "text-xs" : "text-sm"}`}
                                      onClick={() => copyToClipboard(order.address, 'Address')}
                                    >
                                      {isCourier && order.address.length > 50
                                        ? order.address.substring(0, 50) + "..."
                                        : order.address}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => copyToClipboard(order.address, 'Address')}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                  >
                                    <Copy className={`${isCourier ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
                                  </button>
                                  <button
                                    onClick={() => openMaps(order.address)}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <MapPin className={`${isCourier ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
                                  </button>
                                </div>
                              </div>

                              {/* Status */}
                              <div className="flex items-center gap-2 py-1.5">
                                <Info className={`text-gray-400 ${isCourier ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                                <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>الحالة:</span>
                                <span
                                  className={`px-2.5 py-1 rounded-md font-medium ${isCourier ? "text-xs" : "text-sm"} ${
                                    order.status === "delivered"
                                      ? "bg-green-100 text-green-700"
                                      : order.status === "canceled"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {translate(order.status)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Financial Information */}
                          <div className={isCourier ? "space-y-3" : "space-y-4"}>
                            <div className={`bg-white rounded-lg border border-gray-200 ${isCourier ? "p-3" : "p-4"}`}>
                              <h5
                                className={`font-semibold text-gray-800 mb-3 flex items-center gap-2 ${isCourier ? "text-sm" : "text-base"}`}
                              >
                                <DollarSign className={`${isCourier ? "w-3 h-3" : "w-4 h-4"}`} />
                                {isCourier ? "المالية" : "المعلومات المالية"}
                              </h5>
                              <div className={isCourier ? "space-y-2" : "space-y-3"}>
                                <div className="flex justify-between items-center">
                                  <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>
                                    {isCourier ? "الطلب:" : translate("orderTotalLabel") + ":"}
                                  </span>
                                  <span className={`font-medium ${isCourier ? "text-xs" : "text-sm"}`}>
                                    {Number(order.total_order_fees).toFixed(0)} {translate("EGP")}
                                  </span>
                                </div>
                                {courierOrderAmount > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>
                                      {Number(order.partial_paid_amount || 0) > 0
                                        ? isCourier
                                          ? "جزئي:"
                                          : translate("partialAmountLabel") + ":"
                                        : isCourier
                                          ? "محصل:"
                                          : translate("orderAmountCollectedLabel") + ":"}
                                    </span>
                                    <span
                                      className={`font-semibold text-green-600 ${isCourier ? "text-xs" : "text-sm"}`}
                                    >
                                      {courierOrderAmount.toFixed(0)} {translate("EGP")}
                                    </span>
                                  </div>
                                )}
                                {deliveryFee > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>
                                      {isCourier ? "رسوم:" : translate("deliveryFee") + ":"}
                                    </span>
                                    <span
                                      className={`font-semibold text-blue-600 ${isCourier ? "text-xs" : "text-sm"}`}
                                    >
                                      {deliveryFee.toFixed(0)} {translate("EGP")}
                                    </span>
                                  </div>
                                )}
                                {/* Hold Fee Section */}
                                {isAdmin && (
                                  <div className="border-t border-gray-200 pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-orange-500" />
                                        {translate("holdFee")}:
                                      </span>
                                      {!editingHoldFee || editingHoldFee !== order.id ? (
                                        <div className="flex items-center gap-2">
                                          {holdFee > 0 ? (
                                            <>
                                              <span className="font-semibold text-orange-600">
                                                -{holdFee.toFixed(2)} {translate("EGP")}
                                              </span>
                                              <button
                                                onClick={() =>
                                                  handleEditHoldFee(order.id, holdFee, order.hold_fee_comment ?? "")
                                                }
                                                className="text-blue-600 hover:text-blue-800 p-1"
                                                disabled={holdFeeLoading}
                                              >
                                                <Edit3 className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={() => handleRemoveHoldFee(order.id)}
                                                className="text-red-600 hover:text-red-800 p-1"
                                                disabled={holdFeeLoading}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              onClick={() => handleEditHoldFee(order.id)}
                                              className="text-green-600 hover:text-green-800 p-1 flex items-center gap-1"
                                              disabled={holdFeeLoading}
                                            >
                                              <Plus className="w-3 h-3" />
                                              <span className="text-xs">{translate("addHoldFee")}</span>
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="number"
                                            value={holdFeeAmount}
                                            onChange={(e) => setHoldFeeAmount(e.target.value)}
                                            placeholder={translate("enterAmount")}
                                            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            disabled={holdFeeLoading}
                                          />
                                          <button
                                            onClick={() => handleSaveHoldFee(order.id)}
                                            className="text-green-600 hover:text-green-800 p-1"
                                            disabled={holdFeeLoading}
                                          >
                                            <Save className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={handleCancelHoldFeeEdit}
                                            className="text-gray-600 hover:text-gray-800 p-1"
                                            disabled={holdFeeLoading}
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {editingHoldFee === order.id && (
                                      <input
                                        type="text"
                                        value={holdFeeComment}
                                        onChange={(e) => setHoldFeeComment(e.target.value)}
                                        placeholder={translate("enterComment")}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1"
                                        disabled={holdFeeLoading}
                                      />
                                    )}
                                    {holdFee > 0 && order.hold_fee_comment && (
                                      <p className="text-xs text-gray-600 mt-1 italic">"{order.hold_fee_comment}"</p>
                                    )}
                                    {holdFee > 0 && order.hold_fee_added_at && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        تم الإضافة: {new Date(order.hold_fee_added_at).toLocaleDateString('ar-EG', {
                                          year: 'numeric',
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    )}
                                    {holdFee === 0 && order.hold_fee_removed_at && (
                                      <p className="text-xs text-green-600 mt-1">
                                        تم الإزالة: {new Date(order.hold_fee_removed_at).toLocaleDateString('ar-EG', {
                                          year: 'numeric',
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {totalCourierAmount !== 0 && (
                                  <div className={`flex justify-between items-center pt-3 border-t border-gray-200`}>
                                    <span
                                      className={`font-semibold text-gray-700 ${isCourier ? "text-xs" : "text-sm"}`}
                                    >
                                      {isCourier ? "الإجمالي:" : translate("totalCourierHandledLabel") + ":"}
                                    </span>
                                    <span
                                      className={`font-bold text-purple-600 ${isCourier ? "text-sm" : "text-base"}`}
                                    >
                                      {totalCourierAmount.toFixed(0)} {translate("EGP")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Payment Information */}
                            <div className={`mt-3 pt-3 border-t border-gray-200`}>
                              <h6 className={`text-gray-500 mb-2 uppercase ${isCourier ? "text-xs" : "text-xs"} font-medium`}>معلومات الدفع</h6>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CreditCard className={`text-gray-400 ${isCourier ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                                  <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>
                                    {isCourier ? "الدفع" : translate("paymentMethod")}:
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium ${isCourier ? "text-xs" : "text-sm"}`}>
                                    {paymentMethodLabel}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(paymentMethodLabel, 'Payment')}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                  >
                                    <Copy className={`${isCourier ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Comment */}
                        {order.internal_comment && (
                          <div className={`mt-3 pt-3 border-t border-gray-200`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Package className={`text-gray-400 ${isCourier ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                                  <span className={`font-medium text-gray-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                                    {isCourier ? "تعليق" : translate("comment")}:
                                  </span>
                                </div>
                                <p className={`text-gray-600 leading-relaxed ${isCourier ? "text-xs" : "text-sm"}`}>
                                  {isCourier && order.internal_comment.length > 50
                                    ? order.internal_comment.substring(0, 50) + "..."
                                    : order.internal_comment}
                                </p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(order.internal_comment || '', 'Comment')}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              >
                                <Copy className={`${isCourier ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Proof Images */}
                        {order.order_proofs && order.order_proofs.length > 0 && (
                          <div className={`mt-3 pt-3 border-t border-gray-200`}>
                            <div className={`flex items-center gap-2 mb-3`}>
                              <Eye className={`text-gray-400 ${isCourier ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                              <span className={`font-medium text-gray-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                                {isCourier ? `صور (${order.order_proofs.length})` : `${translate("proofImagesLabel")} (${order.order_proofs.length})`}
                              </span>
                            </div>
                            <div className={`grid ${isCourier ? "grid-cols-2 gap-2" : "grid-cols-2 sm:grid-cols-3 gap-3"}`}>
                              {order.order_proofs.map((proof, idx) => (
                                <div 
                                  key={proof.id}
                                  className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors"
                                  onClick={() => window.open(proof.image_data, "_blank")}
                                >
                                  <img
                                    src={proof.image_data || "/placeholder.svg"}
                                    alt={`إثبات ${idx + 1}`}
                                    className={`w-full object-cover ${isCourier ? "h-20" : "h-24"}`}
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <ExternalLink className={`text-white drop-shadow-lg ${isCourier ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  )
}

export default Summary
