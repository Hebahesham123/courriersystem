"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts"
import {
  TrendingUp,
  Package,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  Activity,
  Target,
  Users,
  Percent,
  Search,
  Trophy,
  Award,
  ArrowRight,
  Zap,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

interface Courier {
  id: string
  name: string
  email: string
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
  payment_sub_type: string | null
  status: string
  partial_paid_amount: number | null
  internal_comment: string | null
  collected_by: string | null
  assigned_courier_id: string | null
  original_courier_id?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  archived?: boolean
  archived_at?: string
}

interface CourierPerformance {
  courierId: string
  courierName: string
  courierEmail: string
  totalOrders: number
  deliveredOrders: number
  canceledOrders: number
  partialOrders: number
  returnedOrders: number
  handToHandOrders: number
  cardOrders: number
  totalRevenue: number
  deliveredRevenue: number
  averageOrderValue: number
  completionRate: number
  cancellationRate: number
  returnRate: number
  rank: number
  score: number
  lifecycleStats: {
    returnedThenDelivered: number
    returnedThenCanceled: number
    returnedThenPartial: number
    totalReturnedOrders: number
  }
}


interface AnalyticsData {
  totalOrders: number
  deliveredOrders: number
  canceledOrders: number
  partialOrders: number
  returnedOrders: number
  handToHandOrders: number
  cardOrders: number
  totalRevenue: number
  deliveredRevenue: number
  averageOrderValue: number
  completionRate: number
  cancellationRate: number
  returnRate: number
  dailyStats: Array<{
    date: string
    orders: number
    revenue: number
    delivered: number
    canceled: number
    returned: number
  }>
  statusDistribution: Array<{
    status: string
    count: number
    percentage: number
    color: string
    revenue: number
  }>
  paymentMethodStats: Array<{
    method: string
    count: number
    percentage: number
    revenue: number
  }>
  hourlyDistribution: Array<{
    hour: string
    orders: number
  }>
  weeklyTrend: Array<{
    week: string
    orders: number
    revenue: number
  }>
  monthlyComparison: Array<{
    month: string
    current: number
    previous: number
  }>
  topAreas: Array<{
    area: string
    orders: number
    revenue: number
  }>
  performanceMetrics: {
    avgDeliveryTime: number
    customerSatisfaction: number
    onTimeDelivery: number
    efficiency: number
  }
  lifecycleStats: {
    returnedThenDelivered: number
    returnedThenCanceled: number
    returnedThenPartial: number
    totalReturnedOrders: number
    returnedThenDeliveredPercentage: number
    returnedThenCanceledPercentage: number
  }
  statusFlow: Array<{
    from: string
    to: string
    count: number
    percentage: number
  }>
  returnedOrdersDetails: Array<{
    orderId: string
    orderNumber: string
    customerName: string
    totalFees: number
    currentStatus: string
    statusHistory: Array<{
      status: string
      timestamp: string
    }>
    finalOutcome: string
    wasDelivered: boolean
    wasCanceled: boolean
    wasPartial: boolean
    stillReturned: boolean
  }>
}

const statusConfig = {
  pending: { label: "Pending", color: "#9CA3AF" },
  assigned: { label: "Assigned", color: "#3B82F6" },
  delivered: { label: "Delivered", color: "#10B981" },
  canceled: { label: "Canceled", color: "#EF4444" },
  partial: { label: "Partial", color: "#F59E0B" },
  hand_to_hand: { label: "Hand to Hand", color: "#06B6D4" },
  return: { label: "Returned", color: "#8B5CF6" },
  card: { label: "Card", color: "#3B82F6" },
  valu: { label: "Valu", color: "#A855F7" },
  receiving_part: { label: "Receiving Part", color: "#EC4899" },
}

const paymentMethodConfig = {
  cash: { label: "Cash", color: "#10B981" },
  card: { label: "Card", color: "#3B82F6" },
  valu: { label: "Valu", color: "#8B5CF6" },
  partial: { label: "Partial", color: "#F59E0B" },
}

const AdminAnalytics: React.FC = () => {
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days ago
    end: new Date().toISOString().split("T")[0], // today
    preset: "" as string
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "custom">("30d")
  const [chartType, setChartType] = useState<"bar" | "line" | "area">("bar")
  const [viewMode, setViewMode] = useState<"overview" | "detailed" | "orders" | "rankings" | "flow">("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [orderSearchTerm, setOrderSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [selectedDay, setSelectedDay] = useState<string>("")
  const [allCouriersPerformance, setAllCouriersPerformance] = useState<CourierPerformance[]>([])
  const [loadingRankings, setLoadingRankings] = useState(false)
  const [expandedReturnedOrders, setExpandedReturnedOrders] = useState<Set<string>>(new Set())
  const [showAllReturnedOrders, setShowAllReturnedOrders] = useState(false)

  // Fetch all couriers
  const fetchCouriers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("role", "courier")
        .order("name")

      if (error) throw error
      setCouriers(data || [])
    } catch (error) {
      console.error("Error fetching couriers:", error)
    }
  }, [])

  // Fetch all orders for ranking calculation
  // Use updated_at to include orders assigned/updated in date range
  // Analytics will use the current order status (final status)
  const fetchAllOrdersForRankings = useCallback(async () => {
    try {
      const { data: allOrders, error } = await supabase
        .from("orders")
        .select("*")
        .gte("updated_at", `${dateRange.start}T00:00:00`)
        .lte("updated_at", `${dateRange.end}T23:59:59`)
        .order("updated_at", { ascending: false })

      if (error) throw error
      return allOrders || []
    } catch (error) {
      console.error("Error fetching all orders:", error)
      return []
    }
  }, [dateRange])

  // Calculate courier rankings and performance
  const calculateCourierRankings = useCallback(async () => {
    setLoadingRankings(true)
    try {
      const allOrders = await fetchAllOrdersForRankings()
      const performanceMap = new Map<string, CourierPerformance>()

      // Initialize performance for each courier
      couriers.forEach(courier => {
        performanceMap.set(courier.id, {
          courierId: courier.id,
          courierName: courier.name,
          courierEmail: courier.email,
          totalOrders: 0,
          deliveredOrders: 0,
          canceledOrders: 0,
          partialOrders: 0,
          returnedOrders: 0,
          handToHandOrders: 0,
          cardOrders: 0,
          totalRevenue: 0,
          deliveredRevenue: 0,
          averageOrderValue: 0,
          completionRate: 0,
          cancellationRate: 0,
          returnRate: 0,
          rank: 0,
          score: 0,
          lifecycleStats: {
            returnedThenDelivered: 0,
            returnedThenCanceled: 0,
            returnedThenPartial: 0,
            totalReturnedOrders: 0,
          },
        })
      })

      // Track order lifecycle - group orders by order_id to track status changes
      const ordersByOrderId = new Map<string, Order[]>()
      allOrders.forEach(order => {
        // Include orders with either assigned_courier_id or original_courier_id
        const courierId = order.assigned_courier_id || order.original_courier_id
        if (!courierId) return
        const key = order.order_id || order.id
        if (!ordersByOrderId.has(key)) {
          ordersByOrderId.set(key, [])
        }
        ordersByOrderId.get(key)!.push(order)
      })

      // Calculate performance metrics
      // Track orders by both assigned_courier_id and original_courier_id
      allOrders.forEach(order => {
        // Get the courier ID - prefer assigned, fallback to original
        const courierId = order.assigned_courier_id || order.original_courier_id
        if (!courierId) return
        
        // If order has original_courier_id, track it for that courier
        // This ensures orders remain tracked even after reassignment
        const trackingCourierId = order.original_courier_id || order.assigned_courier_id
        const perf = performanceMap.get(trackingCourierId)
        if (!perf) return

        perf.totalOrders++
        perf.totalRevenue += order.total_order_fees || 0

        switch (order.status) {
          case "delivered":
            perf.deliveredOrders++
            perf.deliveredRevenue += order.total_order_fees || 0
            break
          case "canceled":
            perf.canceledOrders++
            break
          case "partial":
            perf.partialOrders++
            perf.deliveredRevenue += order.total_order_fees || 0
            break
          case "return":
            perf.returnedOrders++
            break
          case "hand_to_hand":
            perf.handToHandOrders++
            break
          case "card":
            perf.cardOrders++
            break
        }
      })

      // Analyze lifecycle - check for returned orders that were later delivered/canceled
      ordersByOrderId.forEach((orderGroup) => {
        if (orderGroup.length === 0) return
        
        // Sort by updated_at to see status progression
        const sortedOrders = [...orderGroup].sort((a, b) => 
          new Date(a.updated_at || a.created_at).getTime() - 
          new Date(b.updated_at || b.created_at).getTime()
        )

        // Get courier ID from first order - prefer original_courier_id to track lifecycle
        const firstOrder = sortedOrders[0]
        const courierId = firstOrder.original_courier_id || firstOrder.assigned_courier_id
        if (!courierId) return

        const perf = performanceMap.get(courierId)
        if (!perf) return

        // Check if order was ever returned
        const wasReturned = sortedOrders.some(o => o.status === "return")
        if (wasReturned) {
          perf.lifecycleStats.totalReturnedOrders++
          
          // Check final status
          const finalOrder = sortedOrders[sortedOrders.length - 1]
          if (finalOrder.status === "delivered") {
            perf.lifecycleStats.returnedThenDelivered++
          } else if (finalOrder.status === "canceled") {
            perf.lifecycleStats.returnedThenCanceled++
          } else if (finalOrder.status === "partial") {
            perf.lifecycleStats.returnedThenPartial++
          }
        }
      })

      // Calculate rates and scores
      const performances: CourierPerformance[] = Array.from(performanceMap.values()).map(perf => {
        const successfulOrders = perf.deliveredOrders + perf.partialOrders
        perf.completionRate = perf.totalOrders > 0 ? (successfulOrders / perf.totalOrders) * 100 : 0
        perf.cancellationRate = perf.totalOrders > 0 ? (perf.canceledOrders / perf.totalOrders) * 100 : 0
        perf.returnRate = perf.totalOrders > 0 ? (perf.returnedOrders / perf.totalOrders) * 100 : 0
        perf.averageOrderValue = perf.totalOrders > 0 ? perf.totalRevenue / perf.totalOrders : 0

        // Calculate performance score (weighted)
        // Completion rate: 40%, Revenue: 30%, Low cancellation: 20%, Low return: 10%
        perf.score = 
          (perf.completionRate * 0.4) +
          (Math.min(perf.totalRevenue / 10000, 100) * 0.3) + // Normalize revenue
          ((100 - perf.cancellationRate) * 0.2) +
          ((100 - perf.returnRate) * 0.1)

        return perf
      })

      // Sort by score and assign ranks
      performances.sort((a, b) => b.score - a.score)
      performances.forEach((perf, index) => {
        perf.rank = index + 1
      })

      setAllCouriersPerformance(performances)
    } catch (error) {
      console.error("Error calculating rankings:", error)
    } finally {
      setLoadingRankings(false)
    }
  }, [couriers, fetchAllOrdersForRankings])

  // Fetch detailed orders for selected courier
  // Include orders where courier is CURRENTLY assigned OR was ORIGINALLY assigned
  // This ensures orders remain tracked even after reassignment
  const fetchDetailedOrders = useCallback(async (courierId: string) => {
    if (!courierId) return

    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .or(`assigned_courier_id.eq.${courierId},original_courier_id.eq.${courierId}`)
        .gte("updated_at", `${dateRange.start}T00:00:00`)
        .lte("updated_at", `${dateRange.end}T23:59:59`)
        .order("updated_at", { ascending: false })

      if (error) throw error
      setOrders(orders || [])
      setFilteredOrders(orders || [])
    } catch (error) {
      console.error("Error fetching detailed orders:", error)
    }
  }, [dateRange])

  // Fetch all orders for overview
  const fetchAllOrders = useCallback(async () => {
    try {
      const { data: allOrders, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", `${dateRange.start}T00:00:00`)
        .lte("created_at", `${dateRange.end}T23:59:59`)
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrders(allOrders || [])
      setFilteredOrders(allOrders || [])
    } catch (error) {
      console.error("Error fetching all orders:", error)
    }
  }, [dateRange])

  useEffect(() => {
    if (!selectedCourier) {
      fetchAllOrders()
    }
  }, [selectedCourier, fetchAllOrders])

  // Fetch analytics data for selected courier
  const fetchAnalyticsData = useCallback(async (courierId: string, startDate?: string, endDate?: string) => {
    if (!courierId) return

    setLoadingAnalytics(true)
    try {
      // Use provided dates or fall back to current dateRange state
      const start = startDate || dateRange.start
      const end = endDate || dateRange.end
      
      // Fetch ALL orders for the courier to track full lifecycle
      // Include orders where courier is CURRENTLY assigned OR was ORIGINALLY assigned
      // This ensures orders remain tracked even after reassignment
      const { data: allOrders, error: allOrdersError } = await supabase
        .from("orders")
        .select("*")
        .or(`assigned_courier_id.eq.${courierId},original_courier_id.eq.${courierId}`)
        .order("updated_at", { ascending: true })

      if (allOrdersError) throw allOrdersError

      // Group all orders by order_id to track full lifecycle
      const allOrdersByOrderId = new Map<string, Order[]>()
      allOrders?.forEach(order => {
        const key = order.order_id || order.id
        if (!allOrdersByOrderId.has(key)) {
          allOrdersByOrderId.set(key, [])
        }
        allOrdersByOrderId.get(key)!.push(order)
      })

      // Filter orders to include in analytics:
      // 1. Orders updated during date range
      // 2. Returned orders that had any status change during date range OR were returned during date range
      const ordersData: Order[] = []
      const rangeStartDate = new Date(`${start}T00:00:00`)
      const rangeEndDate = new Date(`${end}T23:59:59`)

      allOrdersByOrderId.forEach((orderGroup) => {
        if (orderGroup.length === 0) return

        // Sort by updated_at to see status progression
        const sortedOrders = [...orderGroup].sort((a, b) => 
          new Date(a.updated_at || a.created_at).getTime() - 
          new Date(b.updated_at || b.created_at).getTime()
        )

        // Check if order was ever returned
        const wasReturned = sortedOrders.some(o => o.status === "return")
        
        // Check if order had activity during date range
        const hasActivityInRange = sortedOrders.some(order => {
          const updatedAt = new Date(order.updated_at || order.created_at)
          return updatedAt >= rangeStartDate && updatedAt <= rangeEndDate
        })

        // Check if order was returned during date range
        const wasReturnedInRange = sortedOrders.some(order => {
          if (order.status !== "return") return false
          const updatedAt = new Date(order.updated_at || order.created_at)
          return updatedAt >= rangeStartDate && updatedAt <= rangeEndDate
        })

        // Include order if:
        // 1. It was updated during date range (normal case)
        // 2. OR it was returned and had activity during date range
        // 3. OR it was returned during date range
        if (hasActivityInRange || (wasReturned && (hasActivityInRange || wasReturnedInRange))) {
          // Add all versions of this order to track full lifecycle
          ordersData.push(...sortedOrders)
        }
      })

      // Group orders by order_id to track lifecycle
      const ordersByOrderId = new Map<string, Order[]>()
      ordersData.forEach(order => {
        const key = order.order_id || order.id
        if (!ordersByOrderId.has(key)) {
          ordersByOrderId.set(key, [])
        }
        ordersByOrderId.get(key)!.push(order)
      })

      // Calculate basic stats
      const totalOrders = ordersData.length
      const deliveredOrders = ordersData.filter((o) => o.status === "delivered").length
      const partialOrders = ordersData.filter((o) => o.status === "partial").length
      const handToHandOrders = ordersData.filter((o) => o.status === "hand_to_hand").length
      const cardOrders = ordersData.filter((o) => o.status === "card").length
      // Count partial orders as successful deliveries
      const successfulOrders = deliveredOrders + partialOrders
      const canceledOrders = ordersData.filter((o) => o.status === "canceled").length
      const returnedOrders = ordersData.filter((o) => o.status === "return").length

      const totalRevenue = ordersData.reduce((sum, o) => sum + (o.total_order_fees || 0), 0)
      const deliveredRevenue = ordersData
        .filter((o) => o.status === "delivered" || o.status === "partial")
        .reduce((sum, o) => sum + (o.total_order_fees || 0), 0)

      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const completionRate = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0
      const cancellationRate = totalOrders > 0 ? (canceledOrders / totalOrders) * 100 : 0
      const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0

      // Analyze lifecycle - orders that were returned then delivered/canceled
      let returnedThenDelivered = 0
      let returnedThenCanceled = 0
      let returnedThenPartial = 0
      let totalReturnedOrders = 0
      const returnedOrdersDetails: Array<{
        orderId: string
        orderNumber: string
        customerName: string
        totalFees: number
        currentStatus: string
        statusHistory: Array<{ status: string; timestamp: string }>
        finalOutcome: string
        wasDelivered: boolean
        wasCanceled: boolean
        wasPartial: boolean
        stillReturned: boolean
      }> = []

      ordersByOrderId.forEach((orderGroup) => {
        if (orderGroup.length === 0) return
        
        // Sort by updated_at to see status progression
        const sortedOrders = [...orderGroup].sort((a, b) => 
          new Date(a.updated_at || a.created_at).getTime() - 
          new Date(b.updated_at || b.created_at).getTime()
        )

        // Check if order was ever returned
        const wasReturned = sortedOrders.some(o => o.status === "return")
        if (wasReturned) {
          totalReturnedOrders++
          
          // Get the first order for basic info
          const firstOrder = sortedOrders[0]
          const finalOrder = sortedOrders[sortedOrders.length - 1]
          
          // Build status history
          const statusHistory = sortedOrders.map((order) => ({
            status: order.status,
            timestamp: order.updated_at || order.created_at,
          }))

          // Determine final outcome
          let finalOutcome = "Still Returned"
          let wasDelivered = false
          let wasCanceled = false
          let wasPartial = false
          let stillReturned = false

          if (finalOrder.status === "delivered") {
            returnedThenDelivered++
            finalOutcome = "Recovered - Delivered"
            wasDelivered = true
          } else if (finalOrder.status === "canceled") {
            returnedThenCanceled++
            finalOutcome = "Lost - Canceled"
            wasCanceled = true
          } else if (finalOrder.status === "partial") {
            returnedThenPartial++
            finalOutcome = "Partially Recovered"
            wasPartial = true
          } else if (finalOrder.status === "return") {
            stillReturned = true
            finalOutcome = "Still Returned"
          } else {
            finalOutcome = `Current: ${finalOrder.status}`
          }

          // Add to details array
          returnedOrdersDetails.push({
            orderId: firstOrder.id,
            orderNumber: firstOrder.order_id || firstOrder.id,
            customerName: firstOrder.customer_name || "Unknown",
            totalFees: firstOrder.total_order_fees || 0,
            currentStatus: finalOrder.status,
            statusHistory,
            finalOutcome,
            wasDelivered,
            wasCanceled,
            wasPartial,
            stillReturned,
          })
        }
      })

      // Calculate status flow transitions
      const statusFlowMap = new Map<string, number>()
      ordersByOrderId.forEach((orderGroup) => {
        if (orderGroup.length < 2) return
        
        const sortedOrders = [...orderGroup].sort((a, b) => 
          new Date(a.updated_at || a.created_at).getTime() - 
          new Date(b.updated_at || b.created_at).getTime()
        )

        for (let i = 0; i < sortedOrders.length - 1; i++) {
          const from = sortedOrders[i].status
          const to = sortedOrders[i + 1].status
          if (from !== to) {
            const key = `${from}->${to}`
            statusFlowMap.set(key, (statusFlowMap.get(key) || 0) + 1)
          }
        }
      })

      const statusFlow = Array.from(statusFlowMap.entries()).map(([key, count]) => {
        const [from, to] = key.split("->")
        return {
          from,
          to,
          count,
          percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0,
        }
      }).sort((a, b) => b.count - a.count)

      // Daily stats
      const dailyStatsMap = new Map()
      ordersData.forEach((order) => {
        const date = order.created_at.split("T")[0]
        if (!dailyStatsMap.has(date)) {
          dailyStatsMap.set(date, { date, orders: 0, revenue: 0, delivered: 0, canceled: 0, returned: 0 })
        }
        const dayData = dailyStatsMap.get(date)
        dayData.orders += 1
        dayData.revenue += order.total_order_fees || 0
        if (order.status === "delivered" || order.status === "partial") {
          dayData.delivered += 1
        }
        if (order.status === "canceled") {
          dayData.canceled += 1
        }
        if (order.status === "return") {
          dayData.returned += 1
        }
      })

      const dailyStats = Array.from(dailyStatsMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Status distribution - only include statuses that have data
      const statusCounts = Object.keys(statusConfig).reduce((acc, status) => {
        const count = ordersData.filter((o) => o.status === status).length
        if (count > 0) {
          acc[status] = count
        }
        return acc
      }, {} as Record<string, number>)

      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => {
        const statusOrders = ordersData.filter((o) => o.status === status)
        const revenue = statusOrders.reduce((sum, o) => sum + (o.total_order_fees || 0), 0)
        return {
          status: statusConfig[status as keyof typeof statusConfig]?.label || status,
          count,
          percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0,
          color: statusConfig[status as keyof typeof statusConfig]?.color || "#6B7280",
          revenue,
        }
      })

      // Payment method stats
      const paymentCounts = Object.keys(paymentMethodConfig).reduce((acc, method) => {
        const count = ordersData.filter((o) => o.payment_method === method).length
        const revenue = ordersData
          .filter((o) => o.payment_method === method)
          .reduce((sum, o) => sum + o.total_order_fees, 0)
        return { ...acc, [method]: { count, revenue } }
      }, {} as Record<string, { count: number; revenue: number }>)

      const paymentMethodStats = Object.entries(paymentCounts).map(([method, data]) => ({
        method: paymentMethodConfig[method as keyof typeof paymentMethodConfig]?.label || method,
        count: data.count,
        percentage: totalOrders > 0 ? (data.count / totalOrders) * 100 : 0,
        revenue: data.revenue,
      }))

      // Hourly distribution
      const hourlyCounts = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, orders: 0 }))
      ordersData.forEach((order) => {
        const hour = new Date(order.created_at).getHours()
        hourlyCounts[hour].orders += 1
      })

      // Weekly trend (last 8 weeks)
      const weeklyTrend = []
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - (i * 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)

        const weekOrders = ordersData.filter((order) => {
          const orderDate = new Date(order.created_at)
          return orderDate >= weekStart && orderDate <= weekEnd
        })

        weeklyTrend.push({
          week: `Week ${8 - i}`,
          orders: weekOrders.length,
          revenue: weekOrders.reduce((sum, o) => sum + o.total_order_fees, 0),
        })
      }

      // Monthly comparison (current vs previous month)
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear

      const currentMonthOrders = ordersData.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
      })

      const previousMonthOrders = ordersData.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate.getMonth() === previousMonth && orderDate.getFullYear() === previousYear
      })

      const monthlyComparison = [
        {
          month: "Current Month",
          current: currentMonthOrders.length,
          previous: 0,
        },
        {
          month: "Previous Month",
          current: 0,
          previous: previousMonthOrders.length,
        },
      ]

      // Top areas (simplified - using first part of address)
      const areaCounts = new Map()
      ordersData.forEach((order) => {
        const area = order.address.split(",")[0].trim()
        if (!areaCounts.has(area)) {
          areaCounts.set(area, { orders: 0, revenue: 0 })
        }
        const areaData = areaCounts.get(area)
        areaData.orders += 1
        areaData.revenue += order.total_order_fees
      })

      const topAreas = Array.from(areaCounts.entries())
        .map(([area, data]) => ({ area, ...data }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5)

      // Performance metrics (simulated for now)
      const performanceMetrics = {
        avgDeliveryTime: Math.random() * 2 + 1, // 1-3 hours
        customerSatisfaction: Math.random() * 20 + 80, // 80-100%
        onTimeDelivery: Math.random() * 15 + 85, // 85-100%
        efficiency: Math.random() * 10 + 90, // 90-100%
      }

      setAnalyticsData({
        totalOrders,
        deliveredOrders: successfulOrders, // Total successful = delivered + partial
        canceledOrders,
        partialOrders,
        returnedOrders,
        handToHandOrders,
        cardOrders,
        totalRevenue,
        deliveredRevenue,
        averageOrderValue,
        completionRate,
        cancellationRate,
        returnRate,
        dailyStats,
        statusDistribution,
        paymentMethodStats,
        hourlyDistribution: hourlyCounts,
        weeklyTrend,
        monthlyComparison,
        topAreas,
        performanceMetrics,
        lifecycleStats: {
          returnedThenDelivered,
          returnedThenCanceled,
          returnedThenPartial,
          totalReturnedOrders,
          returnedThenDeliveredPercentage: totalReturnedOrders > 0 ? (returnedThenDelivered / totalReturnedOrders) * 100 : 0,
          returnedThenCanceledPercentage: totalReturnedOrders > 0 ? (returnedThenCanceled / totalReturnedOrders) * 100 : 0,
        },
        statusFlow,
        returnedOrdersDetails: returnedOrdersDetails.sort((a, b) => 
          new Date(b.statusHistory[b.statusHistory.length - 1]?.timestamp || 0).getTime() - 
          new Date(a.statusHistory[a.statusHistory.length - 1]?.timestamp || 0).getTime()
        ),
      })
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setLoadingAnalytics(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchCouriers()
    setLoading(false)
  }, [fetchCouriers])

  useEffect(() => {
    if (selectedCourier) {
      fetchAnalyticsData(selectedCourier.id, dateRange.start, dateRange.end)
      fetchDetailedOrders(selectedCourier.id)
    }
  }, [selectedCourier, fetchAnalyticsData, fetchDetailedOrders, dateRange])

  useEffect(() => {
    if (couriers.length > 0) {
      calculateCourierRankings()
    }
  }, [couriers, calculateCourierRankings, dateRange])

  const handlePeriodChange = (period: "7d" | "30d" | "90d" | "custom") => {
    setSelectedPeriod(period)
    if (period !== "custom") {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      setDateRange({
        start: startDate.toISOString().split("T")[0],
        end: new Date().toISOString().split("T")[0],
        preset: ""
      })
    }
  }

  const exportData = () => {
    if (!analyticsData || !selectedCourier) return

    const dataToExport = {
      courier: selectedCourier.name,
      period: `${dateRange.start} to ${dateRange.end}`,
      summary: {
        totalOrders: analyticsData.totalOrders,
        deliveredOrders: analyticsData.deliveredOrders,
        completionRate: analyticsData.completionRate,
        totalRevenue: analyticsData.totalRevenue,
        averageOrderValue: analyticsData.averageOrderValue,
      },
      dailyStats: analyticsData.dailyStats,
      statusDistribution: analyticsData.statusDistribution,
      paymentMethodStats: analyticsData.paymentMethodStats,
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `analytics-${selectedCourier.name}-${dateRange.start}-${dateRange.end}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Filter orders based on search term, status, and day
  const filterOrders = useCallback(() => {
    let filtered = [...orders]

    // Filter by search term
    if (orderSearchTerm) {
      filtered = filtered.filter(order =>
        order.order_id.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
        order.mobile_number.includes(orderSearchTerm) ||
        order.address.toLowerCase().includes(orderSearchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter.length > 0) {
      filtered = filtered.filter(order => statusFilter.includes(order.status))
    }

    // Filter by specific day
    if (selectedDay) {
      filtered = filtered.filter(order => {
        const orderDate = order.created_at.split("T")[0]
        return orderDate === selectedDay
      })
    }

    setFilteredOrders(filtered)
  }, [orders, orderSearchTerm, statusFilter, selectedDay])

  useEffect(() => {
    filterOrders()
  }, [filterOrders])

  // Auto-refresh courier overview when date range changes
  useEffect(() => {
    setRefreshKey(prev => prev + 1)
  }, [dateRange.start, dateRange.end])

  const filteredCouriers = couriers.filter(courier =>
    courier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    courier.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading couriers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Compact */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-3 h-3 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Courier Analytics</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
              {/* Compact Date Range */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, start: e.target.value, preset: "" }))
                  }}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, end: e.target.value, preset: "" }))
                  }}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select
                  value={dateRange.preset || ""}
                  onChange={(e) => {
                    const preset = e.target.value
                    if (preset) {
                      const today = new Date()
                      let startDate = new Date()
                      
                      switch (preset) {
                        case "today":
                          startDate = new Date(today)
                          break
                        case "yesterday":
                          startDate = new Date(today)
                          startDate.setDate(today.getDate() - 1)
                          break
                        case "last7days":
                          startDate = new Date(today)
                          startDate.setDate(today.getDate() - 7)
                          break
                        case "last30days":
                          startDate = new Date(today)
                          startDate.setDate(today.getDate() - 30)
                          break
                        case "thisMonth":
                          startDate = new Date(today.getFullYear(), today.getMonth(), 1)
                          break
                        case "lastMonth":
                          startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                          today.setDate(0)
                          break
                      }
                      
                      const endDate = preset === "today" || preset === "yesterday" ? startDate : today
                      
                      setDateRange({
                        start: startDate.toISOString().split('T')[0],
                        end: endDate.toISOString().split('T')[0],
                        preset
                      })
                    }
                  }}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Quick Range</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7days">Last 7 Days</option>
                  <option value="last30days">Last 30 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                </select>
              </div>

              <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                <button
                  onClick={() => setViewMode("overview")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === "overview"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Overview</span>
                </button>
                <button
                  onClick={() => setViewMode("detailed")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === "detailed"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  <span>Detailed</span>
                </button>
                <button
                  onClick={() => setViewMode("orders")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === "orders"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <Package className="w-3 h-3" />
                  <span>Orders</span>
                </button>
                <button
                  onClick={() => setViewMode("rankings")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === "rankings"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <Trophy className="w-3 h-3" />
                  <span>Rankings</span>
                </button>
                {selectedCourier && (
                  <button
                    onClick={() => setViewMode("flow")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                      viewMode === "flow"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    <span>Flow</span>
                  </button>
                )}
              </div>
              {selectedCourier && (
                <button
                  onClick={exportData}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
              )}
              <button
                onClick={() => selectedCourier && fetchAnalyticsData(selectedCourier.id, dateRange.start, dateRange.end)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Courier Selection Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-3 h-3 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Select Courier</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="relative mb-4">
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search couriers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCouriers.map((courier) => (
                    <button
                      key={courier.id}
                      onClick={() => setSelectedCourier(courier)}
                      className={`w-full text-right p-3 rounded-lg transition-colors ${
                        selectedCourier?.id === courier.id
                          ? "bg-blue-100 border-2 border-blue-500 text-blue-900"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                          {courier.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{courier.name}</p>
                          <p className="text-xs text-gray-500">{courier.email}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedCourier ? (
              <div className="space-y-8">
                {/* Selected Courier Info */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-base">
                        {selectedCourier.name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedCourier.name}</h2>
                        <p className="text-gray-600">{selectedCourier.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{dateRange.start} - {dateRange.end}</span>
                    </div>
                  </div>
                </div>

                {/* Period Selection */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Select Time Period</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "7d", label: "Last 7 Days" },
                      { key: "30d", label: "Last 30 Days" },
                      { key: "90d", label: "Last 90 Days" },
                      { key: "custom", label: "Custom" },
                    ].map((period) => (
                      <button
                        key={period.key}
                        onClick={() => handlePeriodChange(period.key as any)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          selectedPeriod === period.key
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                  {selectedPeriod === "custom" && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                        <input
                          type="date"
                          value={dateRange.start}
                          onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                        <input
                          type="date"
                          value={dateRange.end}
                          onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Analytics Content */}
                {loadingAnalytics ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg font-medium text-gray-700">جاري تحميل التحليلات...</p>
                  </div>
                ) : viewMode === "overview" ? (
                  <div className="space-y-4">
                    {/* Header with Courier Info */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-white/30">
                            {selectedCourier.name.charAt(0)}
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold">{selectedCourier.name}</h2>
                            <p className="text-blue-100">{selectedCourier.email}</p>
                            <p className="text-sm text-blue-200 mt-1">
                              Period: {dateRange.start} - {dateRange.end}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                            <p className="text-xs text-blue-100">Performance Score</p>
                            <p className="text-3xl font-bold">
                              {selectedCourier ? (allCouriersPerformance.find(p => p.courierId === selectedCourier.id)?.score.toFixed(0) || "N/A") : "N/A"}
                            </p>
                            <p className="text-xs text-blue-200">
                              Rank #{selectedCourier ? (allCouriersPerformance.find(p => p.courierId === selectedCourier.id)?.rank || "N/A") : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Statistics Grid - Enhanced */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Total Orders */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200 shadow-md hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                            <Package className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-right">
                            <p className="text-4xl font-bold text-gray-900">{analyticsData?.totalOrders || 0}</p>
                            <p className="text-sm font-semibold text-gray-700 mt-1">Total Orders</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-blue-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">100% of all orders</span>
                            <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full">
                              <TrendingUp className="w-3 h-3 text-green-600" />
                              <span className="text-xs font-bold text-green-700">100%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Successful Orders */}
                      <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4 border-2 border-green-200 shadow-md hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-right">
                            <p className="text-4xl font-bold text-gray-900">{analyticsData?.deliveredOrders || 0}</p>
                            <p className="text-sm font-semibold text-gray-700 mt-1">Successful Orders</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">{analyticsData?.completionRate.toFixed(1) || 0}% Success Rate</span>
                            <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full">
                              <Percent className="w-3 h-3 text-green-600" />
                              <span className="text-xs font-bold text-green-700">{analyticsData?.completionRate.toFixed(1) || 0}%</span>
                            </div>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all"
                              style={{ width: `${analyticsData?.completionRate || 0}%` }}
                            ></div>
                          </div>
                          {/* Breakdown of Successful Orders */}
                          <div className="mt-3 pt-3 border-t border-green-200">
                            <p className="text-xs font-semibold text-gray-700 mb-2">📊 Calculation Breakdown:</p>
                            <div className="space-y-1.5 bg-white/50 rounded-lg p-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <span>Status: "delivered"</span>
                                </span>
                                <span className="font-bold text-gray-900">
                                  {(analyticsData?.deliveredOrders || 0) - (analyticsData?.partialOrders || 0)} orders
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                  <span>Status: "partial" (included)</span>
                                </span>
                                <span className="font-bold text-gray-900">
                                  {analyticsData?.partialOrders || 0} orders
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1.5 mt-1.5 border-t border-gray-300">
                                <span className="font-semibold text-gray-800">✅ Total Successful:</span>
                                <span className="font-bold text-green-700 text-sm">
                                  {analyticsData?.deliveredOrders || 0} orders
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded mt-1.5">
                                <span className="font-semibold">Formula:</span> Delivered ({analyticsData?.deliveredOrders && analyticsData?.partialOrders ? (analyticsData.deliveredOrders - analyticsData.partialOrders) : 0}) + Partial ({analyticsData?.partialOrders || 0}) = <span className="font-bold text-green-700">{analyticsData?.deliveredOrders || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Canceled Orders */}
                      <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl p-4 border-2 border-red-200 shadow-md hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center shadow-md">
                            <XCircle className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-right">
                            <p className="text-4xl font-bold text-gray-900">{analyticsData?.canceledOrders || 0}</p>
                            <p className="text-sm font-semibold text-gray-700 mt-1">Canceled</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-red-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">
                              {analyticsData?.totalOrders ? ((analyticsData.canceledOrders / analyticsData.totalOrders) * 100).toFixed(1) : 0}% Cancel Rate
                            </span>
                            <div className="flex items-center gap-1 bg-red-100 px-2 py-1 rounded-full">
                              <XCircle className="w-3 h-3 text-red-600" />
                              <span className="text-xs font-bold text-red-700">
                                {analyticsData?.cancellationRate.toFixed(1) || 0}%
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-red-500 to-rose-600 h-2 rounded-full transition-all"
                              style={{ width: `${analyticsData?.cancellationRate || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Total Revenue */}
                      <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl p-4 border-2 border-purple-200 shadow-md hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
                            <DollarSign className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-right">
                            <p className="text-4xl font-bold text-gray-900">{analyticsData?.totalRevenue.toFixed(0) || 0}</p>
                            <p className="text-sm font-semibold text-gray-700 mt-1">Revenue (EGP)</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-purple-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">Avg {analyticsData?.averageOrderValue.toFixed(0) || 0} EGP/order</span>
                            <div className="flex items-center gap-1 bg-purple-100 px-2 py-1 rounded-full">
                              <TrendingUp className="w-3 h-3 text-purple-600" />
                              <span className="text-xs font-bold text-purple-700">+{analyticsData?.deliveredRevenue && analyticsData?.totalRevenue ? ((analyticsData.deliveredRevenue / analyticsData.totalRevenue) * 100).toFixed(0) : 0}%</span>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-600">
                            Delivered: {analyticsData?.deliveredRevenue.toFixed(0) || 0} EGP
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Returned Orders */}
                      <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-lg p-3 border-2 border-orange-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{analyticsData?.returnedOrders || 0}</p>
                            <p className="text-sm font-medium text-gray-700">Returned Orders</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            {analyticsData?.returnRate.toFixed(1) || 0}% Return Rate
                          </span>
                          <span className="text-xs font-bold text-orange-600">
                            {analyticsData?.lifecycleStats?.returnedThenDelivered || 0} Recovered
                          </span>
                        </div>
                      </div>

                      {/* Partial Orders */}
                      <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-lg p-3 border-2 border-yellow-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
                            <Percent className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{analyticsData?.partialOrders || 0}</p>
                            <p className="text-sm font-medium text-gray-700">Partial Orders</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            {analyticsData?.totalOrders ? ((analyticsData.partialOrders / analyticsData.totalOrders) * 100).toFixed(1) : 0}% of total
                          </span>
                          <span className="text-xs font-bold text-yellow-600">Included in Success</span>
                        </div>
                      </div>

                      {/* Hand to Hand */}
                      <div className="bg-gradient-to-br from-cyan-50 to-blue-100 rounded-lg p-3 border-2 border-cyan-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900">{analyticsData?.handToHandOrders || 0}</p>
                            <p className="text-sm font-medium text-gray-700">Hand to Hand</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            {analyticsData?.totalOrders ? ((analyticsData.handToHandOrders / analyticsData.totalOrders) * 100).toFixed(1) : 0}% of total
                          </span>
                          <span className="text-xs font-bold text-cyan-600">Exchange Orders</span>
                        </div>
                      </div>
                    </div>

                      {/* Detailed Status Breakdown - Enhanced */}
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-200 shadow-md">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <BarChart3 className="w-3 h-3 text-white" />
                            </div>
                            Complete Status Breakdown
                          </h4>
                          <span className="text-sm text-gray-600 font-medium">
                            {analyticsData?.statusDistribution.length || 0} Status Types
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {analyticsData?.statusDistribution.map((statusData, index) => {
                            const percentage = analyticsData?.totalOrders ? (statusData.count / analyticsData.totalOrders) * 100 : 0
                            return (
                              <div 
                                key={index} 
                                className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-md hover:shadow-xl transition-all transform hover:scale-105"
                                style={{ borderColor: statusData.color + '40' }}
                              >
                                <div className="flex items-center justify-center mb-2">
                                  <div 
                                    className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
                                    style={{ backgroundColor: statusData.color + '20' }}
                                  >
                                    <div 
                                      className="w-6 h-6 rounded-lg"
                                      style={{ backgroundColor: statusData.color }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="text-3xl font-bold text-gray-900 mb-1">{statusData.count}</p>
                                  <p className="text-sm font-semibold text-gray-700 mb-2">{statusData.status}</p>
                                  <div className="flex items-center justify-center gap-2 mb-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="h-2 rounded-full transition-all"
                                        style={{ 
                                          width: `${percentage}%`,
                                          backgroundColor: statusData.color
                                        }}
                                      ></div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-600">{percentage.toFixed(1)}%</span>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <p className="text-xs text-gray-500">Revenue</p>
                                    <p className="text-sm font-bold text-green-600">{statusData.revenue.toFixed(0)} EGP</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Lifecycle Analysis */}
                      {analyticsData?.lifecycleStats && analyticsData.lifecycleStats.totalReturnedOrders > 0 && (
                        <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 bg-purple-500 rounded-lg flex items-center justify-center">
                              <Activity className="w-3 h-3 text-white" />
                            </div>
                            <h4 className="text-sm font-semibold text-gray-900">Order Lifecycle Analysis</h4>
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="text-center p-3 bg-white rounded-lg border border-purple-200">
                              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
                                <Package className="w-3 h-3 text-purple-600" />
                              </div>
                              <p className="text-xl font-bold text-gray-900">{analyticsData.lifecycleStats.totalReturnedOrders}</p>
                              <p className="text-xs text-gray-600 font-medium mb-1">Total Returned Orders</p>
                              <p className="text-xs text-gray-500">
                                {analyticsData.totalOrders > 0 ? ((analyticsData.lifecycleStats.totalReturnedOrders / analyticsData.totalOrders) * 100).toFixed(1) : 0}% of all orders
                              </p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              </div>
                              <p className="text-lg font-bold text-gray-900">{analyticsData.lifecycleStats.returnedThenDelivered}</p>
                              <p className="text-xs text-gray-600 font-medium">Returned → Delivered</p>
                              <p className="text-xs text-green-600 font-semibold mt-0.5">
                                {analyticsData.lifecycleStats.returnedThenDeliveredPercentage.toFixed(1)}% recovery
                              </p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg border border-red-200">
                              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
                                <XCircle className="w-3 h-3 text-red-600" />
                              </div>
                              <p className="text-lg font-bold text-gray-900">{analyticsData.lifecycleStats.returnedThenCanceled}</p>
                              <p className="text-xs text-gray-600 font-medium">Returned → Canceled</p>
                              <p className="text-xs text-red-600 font-semibold mt-0.5">
                                {analyticsData.lifecycleStats.returnedThenCanceledPercentage.toFixed(1)}% loss
                              </p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg border border-orange-200">
                              <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
                                <Percent className="w-3 h-3 text-orange-600" />
                              </div>
                              <p className="text-lg font-bold text-gray-900">{analyticsData.lifecycleStats.returnedThenPartial}</p>
                              <p className="text-xs text-gray-600 font-medium">Returned → Partial</p>
                              <p className="text-xs text-orange-600 font-semibold mt-0.5">
                                {analyticsData.lifecycleStats.totalReturnedOrders > 0 ? ((analyticsData.lifecycleStats.returnedThenPartial / analyticsData.lifecycleStats.totalReturnedOrders) * 100).toFixed(1) : 0}% partial
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Detailed Returned Orders Process - Compact Clickable Cards */}
                      {analyticsData?.returnedOrdersDetails && analyticsData.returnedOrdersDetails.length > 0 && (
                        <div className="mt-4 bg-white rounded-xl border-2 border-purple-200 shadow-lg">
                          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 text-white rounded-t-xl">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                <h3 className="text-base font-bold">Returned Orders Details</h3>
                              </div>
                              <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-semibold">
                                {analyticsData.returnedOrdersDetails.length} Orders
                              </span>
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(showAllReturnedOrders 
                                ? analyticsData.returnedOrdersDetails 
                                : analyticsData.returnedOrdersDetails.slice(0, 6)
                              ).map((order, index) => {
                                const isExpanded = expandedReturnedOrders.has(order.orderId)
                                const outcomeColor = order.wasDelivered 
                                  ? "bg-green-50 border-green-300 text-green-700" 
                                  : order.wasCanceled 
                                  ? "bg-red-50 border-red-300 text-red-700"
                                  : order.wasPartial
                                  ? "bg-orange-50 border-orange-300 text-orange-700"
                                  : "bg-purple-50 border-purple-300 text-purple-700"
                                
                                const outcomeIcon = order.wasDelivered 
                                  ? <CheckCircle className="w-4 h-4" />
                                  : order.wasCanceled 
                                  ? <XCircle className="w-4 h-4" />
                                  : order.wasPartial
                                  ? <Percent className="w-4 h-4" />
                                  : <Package className="w-4 h-4" />
                                
                                return (
                                  <div 
                                    key={order.orderId} 
                                    className={`bg-white rounded-lg border-2 ${outcomeColor} cursor-pointer transition-all hover:shadow-lg ${
                                      isExpanded ? "ring-2 ring-purple-400" : ""
                                    }`}
                                    onClick={() => {
                                      setExpandedReturnedOrders(prev => {
                                        const newSet = new Set(prev)
                                        if (newSet.has(order.orderId)) {
                                          newSet.delete(order.orderId)
                                        } else {
                                          newSet.add(order.orderId)
                                        }
                                        return newSet
                                      })
                                    }}
                                  >
                                    {/* Compact Card Header */}
                                    <div className="p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                                            #{index + 1}
                                          </div>
                                          <div>
                                            <p className="text-sm font-bold text-gray-900">#{order.orderNumber}</p>
                                            <p className="text-xs text-gray-600">{order.customerName}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {outcomeIcon}
                                          <ArrowRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-gray-700">{order.totalFees.toFixed(0)} EGP</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${outcomeColor}`}>
                                          {order.finalOutcome}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                      <div className="border-t border-gray-200 p-3 bg-gray-50 space-y-3">
                                        {/* Quick Outcome Summary */}
                                        <div className="grid grid-cols-4 gap-2">
                                          <div className={`text-center p-1.5 rounded text-xs ${order.wasDelivered ? "bg-green-100 text-green-700 font-bold" : "bg-gray-100 text-gray-400"}`}>
                                            {order.wasDelivered ? "✓ Del" : "✗"}
                                          </div>
                                          <div className={`text-center p-1.5 rounded text-xs ${order.wasCanceled ? "bg-red-100 text-red-700 font-bold" : "bg-gray-100 text-gray-400"}`}>
                                            {order.wasCanceled ? "✓ Can" : "✗"}
                                          </div>
                                          <div className={`text-center p-1.5 rounded text-xs ${order.wasPartial ? "bg-orange-100 text-orange-700 font-bold" : "bg-gray-100 text-gray-400"}`}>
                                            {order.wasPartial ? "✓ Par" : "✗"}
                                          </div>
                                          <div className={`text-center p-1.5 rounded text-xs ${order.stillReturned ? "bg-purple-100 text-purple-700 font-bold" : "bg-gray-100 text-gray-400"}`}>
                                            {order.stillReturned ? "✓ Ret" : "✗"}
                                          </div>
                                        </div>

                                        {/* Compact Status History */}
                                        <div>
                                          <p className="text-xs font-semibold text-gray-700 mb-2">Status Flow:</p>
                                          <div className="space-y-1.5">
                                            {order.statusHistory.map((historyItem, historyIndex) => {
                                              const statusConfigItem = statusConfig[historyItem.status as keyof typeof statusConfig] || { label: historyItem.status, color: "#6B7280" }
                                              
                                              return (
                                                <div key={historyIndex} className="flex items-center gap-2">
                                                  <div 
                                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: statusConfigItem.color }}
                                                  ></div>
                                                  <div className="flex-1 flex items-center justify-between bg-white rounded px-2 py-1 text-xs">
                                                    <span 
                                                      className="px-1.5 py-0.5 rounded text-xs font-semibold text-white"
                                                      style={{ backgroundColor: statusConfigItem.color }}
                                                    >
                                                      {statusConfigItem.label}
                                                    </span>
                                                    <span className="text-gray-500 text-xs">
                                                      {new Date(historyItem.timestamp).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                      })}
                                                    </span>
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            
                            {/* See More / See Less Button */}
                            {analyticsData.returnedOrdersDetails.length > 6 && (
                              <div className="mt-4 flex justify-center">
                                <button
                                  onClick={() => setShowAllReturnedOrders(!showAllReturnedOrders)}
                                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold text-sm hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                >
                                  {showAllReturnedOrders ? (
                                    <>
                                      <span>See Less</span>
                                      <ArrowRight className="w-4 h-4 rotate-90" />
                                    </>
                                  ) : (
                                    <>
                                      <span>See More ({analyticsData.returnedOrdersDetails.length - 6} more)</span>
                                      <ArrowRight className="w-4 h-4 -rotate-90" />
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Financial Breakdown - Enhanced */}
                      <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-200 shadow-md">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                            <DollarSign className="w-4 h-4 text-white" />
                          </div>
                          <h4 className="text-lg font-bold text-gray-900">Financial Performance Analysis</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="bg-white rounded-lg p-4 border-2 border-green-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-gray-900">{analyticsData?.deliveredRevenue.toFixed(0) || 0}</p>
                                <p className="text-xs font-medium text-gray-600">Successful Revenue</p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Of Total Revenue</span>
                                <span className="text-sm font-bold text-green-600">
                                  {analyticsData?.totalRevenue ? ((analyticsData.deliveredRevenue / analyticsData.totalRevenue) * 100).toFixed(1) : 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 border-2 border-blue-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <Target className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-gray-900">{analyticsData?.averageOrderValue.toFixed(0) || 0}</p>
                                <p className="text-xs font-medium text-gray-600">Avg Order Value</p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <span className="text-xs text-gray-500">EGP per order</span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                                <Percent className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-gray-900">
                                  {analyticsData?.totalRevenue ? ((analyticsData.deliveredRevenue / analyticsData.totalRevenue) * 100).toFixed(1) : 0}%
                                </p>
                                <p className="text-xs font-medium text-gray-600">Revenue Achievement</p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full"
                                  style={{ width: `${analyticsData?.totalRevenue ? ((analyticsData.deliveredRevenue / analyticsData.totalRevenue) * 100) : 0}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 border-2 border-orange-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-gray-900">
                                  {analyticsData?.completionRate.toFixed(1) || 0}%
                                </p>
                                <p className="text-xs font-medium text-gray-600">Success Rate</p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full"
                                  style={{ width: `${analyticsData?.completionRate || 0}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                ) : viewMode === "orders" ? (
                  <div className="space-y-6">
                    {/* Orders Filters */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">تصفية الطلبات</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">البحث في الطلبات</label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                            <input
                              type="text"
                              placeholder="رقم الطلب، اسم العميل، الهاتف..."
                              value={orderSearchTerm}
                              onChange={(e) => setOrderSearchTerm(e.target.value)}
                              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">تصفية حسب الحالة</label>
                          <select
                            multiple
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(Array.from(e.target.selectedOptions, option => option.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="assigned">مكلف</option>
                            <option value="delivered">تم التوصيل</option>
                            <option value="canceled">ملغي</option>
                            <option value="partial">جزئي</option>
                            <option value="hand_to_hand">استبدال</option>
                            <option value="return">مرتجع</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">تصفية حسب اليوم</label>
                          <input
                            type="date"
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => {
                              setOrderSearchTerm("")
                              setStatusFilter([])
                              setSelectedDay("")
                            }}
                            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            مسح المرشحات
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Orders Summary */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">ملخص الطلبات</h3>
                        <div className="text-sm text-gray-600">
                          عرض {filteredOrders.length} من {orders.length} طلب
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                        {Object.entries(statusConfig).map(([status, config]) => {
                          const count = filteredOrders.filter(order => order.status === status).length
                          if (count === 0) return null // Don't show statuses with 0 count
                          const percentage = filteredOrders.length > 0 ? (count / filteredOrders.length) * 100 : 0
                          return (
                            <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                              <div className="w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: config.color + '20' }}>
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config.color }}></div>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{count}</p>
                              <p className="text-sm text-gray-600">{config.label}</p>
                              <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
                            </div>
                          )
                        }).filter(Boolean)}
                      </div>
                    </div>

                    {/* Orders Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الطلب</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الهاتف</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طريقة الدفع</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العنوان</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredOrders.map((order) => {
                              const orderStatusConfig = statusConfig[order.status as keyof typeof statusConfig] || { label: order.status, color: "#6B7280" }
                              return (
                                <tr key={order.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    #{order.order_id}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {order.customer_name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <a href={`tel:${order.mobile_number}`} className="text-blue-600 hover:text-blue-800">
                                      {order.mobile_number}
                                    </a>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {order.total_order_fees.toFixed(2)} ج.م
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {paymentMethodConfig[order.payment_method as keyof typeof paymentMethodConfig]?.label || order.payment_method}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                      style={{ backgroundColor: orderStatusConfig.color + '20', color: orderStatusConfig.color }}
                                    >
                                      {orderStatusConfig.label}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(order.created_at).toLocaleDateString("ar-EG")}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                    {order.address}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      {filteredOrders.length === 0 && (
                        <div className="text-center py-12">
                          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد طلبات</h3>
                          <p className="text-gray-600">جرب تعديل المرشحات أو اختيار فترة زمنية أخرى</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : viewMode === "rankings" ? (
                  <div className="space-y-4">
                    {/* Compact Header */}
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-3 text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-5 h-5" />
                          <h3 className="text-lg font-bold">Courier Rankings</h3>
                        </div>
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">{dateRange.start} - {dateRange.end}</span>
                      </div>
                    </div>

                    {loadingRankings ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-sm font-medium text-gray-700">Calculating rankings...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allCouriersPerformance.map((perf) => {
                          const rankColor = perf.rank === 1 ? "from-yellow-400 to-yellow-600 border-yellow-300" 
                            : perf.rank === 2 ? "from-gray-300 to-gray-500 border-gray-300"
                            : perf.rank === 3 ? "from-orange-400 to-orange-600 border-orange-300"
                            : "from-blue-400 to-blue-600 border-blue-300"
                          const rankIcon = perf.rank === 1 ? <Trophy className="w-4 h-4" /> 
                            : perf.rank === 2 ? <Award className="w-4 h-4" /> 
                            : perf.rank === 3 ? <Award className="w-4 h-4" /> 
                            : null
                          const recoveryRate = perf.lifecycleStats.totalReturnedOrders > 0 
                            ? ((perf.lifecycleStats.returnedThenDelivered + perf.lifecycleStats.returnedThenPartial) / perf.lifecycleStats.totalReturnedOrders) * 100 
                            : 0
                          const isSelected = selectedCourier && selectedCourier.id === perf.courierId
                          
                          return (
                            <div 
                              key={perf.courierId}
                              onClick={() => setSelectedCourier({ id: perf.courierId, name: perf.courierName, email: perf.courierEmail })}
                              className={`bg-white rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${
                                isSelected ? "ring-2 ring-blue-400 border-blue-400" : "border-gray-200"
                              }`}
                            >
                              {/* Rank Badge */}
                              <div className={`bg-gradient-to-r ${rankColor} p-2 rounded-t-lg flex items-center justify-between`}>
                                <div className="flex items-center gap-2 text-white">
                                  {rankIcon}
                                  <span className="font-bold text-sm">Rank #{perf.rank}</span>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold text-white">
                                  {perf.score.toFixed(1)} pts
                                </div>
                              </div>

                              {/* Courier Info */}
                              <div className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                    {perf.courierName.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900 truncate">{perf.courierName}</p>
                                    <p className="text-xs text-gray-500 truncate">{perf.courierEmail}</p>
                                  </div>
                                </div>

                                {/* Key Metrics Grid */}
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  <div className="bg-green-50 rounded p-2 border border-green-200">
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <CheckCircle className={`w-3 h-3 ${perf.completionRate >= 80 ? "text-green-600" : perf.completionRate >= 60 ? "text-yellow-600" : "text-red-600"}`} />
                                      <span className="text-xs font-semibold text-gray-700">Success</span>
                                    </div>
                                    <p className={`text-sm font-bold ${perf.completionRate >= 80 ? "text-green-700" : perf.completionRate >= 60 ? "text-yellow-700" : "text-red-700"}`}>
                                      {perf.completionRate.toFixed(1)}%
                                    </p>
                                  </div>
                                  <div className="bg-blue-50 rounded p-2 border border-blue-200">
                                    <p className="text-xs font-semibold text-gray-700 mb-0.5">Orders</p>
                                    <p className="text-sm font-bold text-blue-700">{perf.totalOrders}</p>
                                  </div>
                                  <div className="bg-red-50 rounded p-2 border border-red-200">
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <XCircle className={`w-3 h-3 ${perf.cancellationRate <= 10 ? "text-green-600" : perf.cancellationRate <= 20 ? "text-yellow-600" : "text-red-600"}`} />
                                      <span className="text-xs font-semibold text-gray-700">Cancel</span>
                                    </div>
                                    <p className={`text-sm font-bold ${perf.cancellationRate <= 10 ? "text-green-700" : perf.cancellationRate <= 20 ? "text-yellow-700" : "text-red-700"}`}>
                                      {perf.cancellationRate.toFixed(1)}%
                                    </p>
                                  </div>
                                  <div className="bg-purple-50 rounded p-2 border border-purple-200">
                                    <p className="text-xs font-semibold text-gray-700 mb-0.5">Revenue</p>
                                    <p className="text-sm font-bold text-purple-700">{perf.totalRevenue.toFixed(0)}</p>
                                  </div>
                                </div>

                                {/* Additional Metrics */}
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Return Rate:</span>
                                    <span className={`font-semibold ${perf.returnRate <= 5 ? "text-green-600" : perf.returnRate <= 15 ? "text-yellow-600" : "text-red-600"}`}>
                                      {perf.returnRate.toFixed(1)}%
                                    </span>
                                  </div>
                                  {perf.lifecycleStats.totalReturnedOrders > 0 && (
                                    <div className="flex items-center justify-between text-xs mt-1">
                                      <span className="text-gray-600">Recovery:</span>
                                      <span className={`font-semibold ${recoveryRate >= 50 ? "text-green-600" : recoveryRate >= 30 ? "text-yellow-600" : "text-red-600"}`}>
                                        {recoveryRate.toFixed(1)}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : viewMode === "flow" && analyticsData ? (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Order Status Flow & Roadmap</h3>
                            <p className="text-sm text-gray-600">Visualization of order status transitions</p>
                          </div>
                        </div>
                      </div>

                      {/* Status Flow Diagram */}
                      <div className="mb-8">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Status Transition Flow</h4>
                        <div className="bg-gray-50 rounded-lg p-6">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {analyticsData.statusFlow.slice(0, 12).map((flow, index) => {
                              const fromConfig = statusConfig[flow.from as keyof typeof statusConfig] || { label: flow.from, color: "#6B7280" }
                              const toConfig = statusConfig[flow.to as keyof typeof statusConfig] || { label: flow.to, color: "#6B7280" }
                              
                              return (
                                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: fromConfig.color }}
                                    ></div>
                                    <span className="text-xs font-medium text-gray-700">{fromConfig.label}</span>
                                  </div>
                                  <div className="flex items-center justify-center my-2">
                                    <ArrowRight className="w-4 h-4 text-gray-400" />
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: toConfig.color }}
                                    ></div>
                                    <span className="text-xs font-medium text-gray-700">{toConfig.label}</span>
                                  </div>
                                  <div className="text-center mt-2">
                                    <span className="text-lg font-bold text-gray-900">{flow.count}</span>
                                    <span className="text-xs text-gray-500 ml-1">({flow.percentage.toFixed(1)}%)</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Detailed Status Breakdown with Percentages */}
                      <div className="mb-8">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Complete Status Breakdown</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {analyticsData.statusDistribution.map((status, index) => (
                            <div key={index} className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <div 
                                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: status.color + '20' }}
                                >
                                  <div 
                                    className="w-6 h-6 rounded"
                                    style={{ backgroundColor: status.color }}
                                  ></div>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-gray-900">{status.count}</p>
                                  <p className="text-xs text-gray-500">orders</p>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-900">{status.status}</p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-600">Percentage:</span>
                                  <span className="text-xs font-bold text-gray-900">{status.percentage.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-600">Revenue:</span>
                                  <span className="text-xs font-bold text-green-600">{status.revenue.toFixed(0)} EGP</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                  <div 
                                    className="h-2 rounded-full transition-all"
                                    style={{ 
                                      width: `${status.percentage}%`,
                                      backgroundColor: status.color
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Lifecycle Statistics */}
                      {analyticsData.lifecycleStats && analyticsData.lifecycleStats.totalReturnedOrders > 0 && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Lifecycle Recovery Analysis</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg p-4 border border-purple-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="w-5 h-5 text-purple-600" />
                                <span className="text-sm font-medium text-gray-700">Total Returned</span>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{analyticsData.lifecycleStats.totalReturnedOrders}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {analyticsData.totalOrders > 0 ? ((analyticsData.lifecycleStats.totalReturnedOrders / analyticsData.totalOrders) * 100).toFixed(1) : 0}% of all orders
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-green-200">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-gray-700">Recovered (Delivered)</span>
                              </div>
                              <p className="text-2xl font-bold text-green-600">{analyticsData.lifecycleStats.returnedThenDelivered}</p>
                              <p className="text-xs text-green-600 font-semibold mt-1">
                                {analyticsData.lifecycleStats.returnedThenDeliveredPercentage.toFixed(1)}% recovery rate
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-orange-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Percent className="w-5 h-5 text-orange-600" />
                                <span className="text-sm font-medium text-gray-700">Partially Recovered</span>
                              </div>
                              <p className="text-2xl font-bold text-orange-600">{analyticsData.lifecycleStats.returnedThenPartial}</p>
                              <p className="text-xs text-orange-600 font-semibold mt-1">
                                {analyticsData.lifecycleStats.totalReturnedOrders > 0 ? ((analyticsData.lifecycleStats.returnedThenPartial / analyticsData.lifecycleStats.totalReturnedOrders) * 100).toFixed(1) : 0}% partial recovery
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-red-200">
                              <div className="flex items-center gap-2 mb-2">
                                <XCircle className="w-5 h-5 text-red-600" />
                                <span className="text-sm font-medium text-gray-700">Lost (Canceled)</span>
                              </div>
                              <p className="text-2xl font-bold text-red-600">{analyticsData.lifecycleStats.returnedThenCanceled}</p>
                              <p className="text-xs text-red-600 font-semibold mt-1">
                                {analyticsData.lifecycleStats.returnedThenCanceledPercentage.toFixed(1)}% loss rate
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : analyticsData ? (
                  <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.totalOrders}</p>
                            <p className="text-sm text-gray-600">إجمالي الطلبات</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">+12%</span>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.deliveredOrders}</p>
                            <p className="text-sm text-gray-600">طلبات مسلمة</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">{analyticsData.completionRate.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.totalRevenue.toFixed(0)}</p>
                            <p className="text-sm text-gray-600">إجمالي الإيرادات (ج.م)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">+8%</span>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Target className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.averageOrderValue.toFixed(0)}</p>
                            <p className="text-sm text-gray-600">متوسط قيمة الطلب (ج.م)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">+5%</span>
                        </div>
                      </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Daily Orders Chart */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">الطلبات اليومية</h3>
                          <div className="flex items-center gap-2">
                            {["bar", "line", "area"].map((type) => (
                              <button
                                key={type}
                                onClick={() => setChartType(type as any)}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                  chartType === type
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                              >
                                {type === "bar" ? "أعمدة" : type === "line" ? "خط" : "منطقة"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            {chartType === "bar" ? (
                              <BarChart data={analyticsData.dailyStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="orders" fill="#3B82F6" />
                              </BarChart>
                            ) : chartType === "line" ? (
                              <LineChart data={analyticsData.dailyStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} />
                              </LineChart>
                            ) : (
                              <AreaChart data={analyticsData.dailyStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="orders" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                              </AreaChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Status Distribution */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Status Distribution</h3>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analyticsData.statusDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ status, count }) => {
                                  const total = analyticsData?.statusDistribution.reduce((sum, item) => sum + item.count, 0) || 1
                                  const percentage = ((count as number) / total * 100).toFixed(1)
                                  return `${status}: ${percentage}%`
                                }}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                              >
                                {analyticsData.statusDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">لا توجد بيانات متاحة</h3>
                    <p className="text-gray-600">لا توجد طلبات في الفترة المحددة لهذا المندوب</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* All Couriers Overview - Compact Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-3 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <h3 className="text-base font-bold">All Couriers Overview</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs bg-white/20 px-2 py-1 rounded">
                        {dateRange.start} - {dateRange.end}
                      </div>
                      <button
                        onClick={() => {
                          setRefreshKey(prev => prev + 1)
                        }}
                        className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        title="Refresh data"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>

                {/* Compact Courier Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" key={refreshKey}>
                  {couriers.map((courier: Courier) => {
                    // Calculate basic stats for each courier with date filtering
                    const courierOrders = orders.filter(order => {
                      if (order.assigned_courier_id !== courier.id) return false
                      
                      // Apply date range filter
                      const orderDate = new Date(order.created_at)
                      const startDate = new Date(dateRange.start)
                      const endDate = new Date(dateRange.end)
                      endDate.setHours(23, 59, 59, 999) // Include the entire end date
                      
                      return orderDate >= startDate && orderDate <= endDate
                    })
                    const totalOrders = courierOrders.length
                    const deliveredOrders = courierOrders.filter(o => o.status === "delivered").length
                    const partialOrders = courierOrders.filter(o => o.status === "partial").length
                    const successfulOrders = deliveredOrders + partialOrders // Count partial as successful
                    const canceledOrders = courierOrders.filter(o => o.status === "canceled").length
                    const returnedOrders = courierOrders.filter(o => o.status === "return").length
                    const handToHandOrders = courierOrders.filter(o => o.status === "hand_to_hand").length
                    const cardOrders = courierOrders.filter(o => o.status === "card").length
                    const totalRevenue = courierOrders.reduce((sum, o) => sum + o.total_order_fees, 0)
                    const completionRate = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0
                    const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0
                    const isSelected = (selectedCourier as Courier | null)?.id === courier.id

                    return (
                      <div 
                        key={courier.id}
                        className={`bg-white rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${
                          isSelected 
                            ? 'border-blue-500 ring-2 ring-blue-200 shadow-md' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                        onClick={() => setSelectedCourier(courier)}
                      >
                        {/* Compact Header */}
                        <div className={`p-3 rounded-t-lg ${isSelected ? 'bg-gradient-to-r from-blue-50 to-purple-50' : 'bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {courier.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 text-sm truncate">{courier.name}</h4>
                              <p className="text-xs text-gray-500 truncate">{courier.email}</p>
                            </div>
                            <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              completionRate >= 80 ? 'bg-green-100 text-green-700' :
                              completionRate >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {completionRate.toFixed(0)}%
                            </div>
                          </div>
                        </div>

                        {/* Compact Metrics Grid */}
                        <div className="p-3 space-y-2">
                          <div className="grid grid-cols-4 gap-2">
                            <div className="text-center p-2 bg-blue-50 rounded border border-blue-100">
                              <p className="text-lg font-bold text-blue-600">{totalOrders}</p>
                              <p className="text-xs text-gray-600">Total</p>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded border border-green-100">
                              <p className="text-lg font-bold text-green-600">{successfulOrders}</p>
                              <p className="text-xs text-gray-600">Success</p>
                            </div>
                            <div className="text-center p-2 bg-red-50 rounded border border-red-100">
                              <p className="text-lg font-bold text-red-600">{canceledOrders}</p>
                              <p className="text-xs text-gray-600">Cancel</p>
                            </div>
                            <div className="text-center p-2 bg-purple-50 rounded border border-purple-100">
                              <p className="text-sm font-bold text-purple-600">{totalRevenue > 1000 ? `${(totalRevenue/1000).toFixed(0)}k` : totalRevenue.toFixed(0)}</p>
                              <p className="text-xs text-gray-600">Revenue</p>
                            </div>
                          </div>

                          {/* Compact Status Details */}
                          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between text-xs px-2 py-1 bg-orange-50 rounded">
                              <span className="text-gray-600">Partial:</span>
                              <span className="font-bold text-orange-600">{partialOrders}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs px-2 py-1 bg-purple-50 rounded">
                              <span className="text-gray-600">Returned:</span>
                              <span className="font-bold text-purple-600">{returnedOrders}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs px-2 py-1 bg-cyan-50 rounded">
                              <span className="text-gray-600">H2H:</span>
                              <span className="font-bold text-cyan-600">{handToHandOrders}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs px-2 py-1 bg-blue-50 rounded">
                              <span className="text-gray-600">Card:</span>
                              <span className="font-bold text-blue-600">{cardOrders}</span>
                            </div>
                          </div>

                          {/* Compact Progress Bars */}
                          <div className="pt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Success Rate</span>
                              <span className="font-semibold text-gray-700">{completionRate.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-emerald-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${completionRate}%` }}
                              ></div>
                            </div>
                            {returnRate > 0 && (
                              <>
                                <div className="flex items-center justify-between text-xs mt-1">
                                  <span className="text-gray-600">Return Rate</span>
                                  <span className="font-semibold text-purple-600">{returnRate.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className="bg-gradient-to-r from-purple-500 to-pink-600 h-1.5 rounded-full transition-all"
                                    style={{ width: `${returnRate}%` }}
                                  ></div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Instructions */}
                <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-gray-800">اختر مندوب لعرض تحليلاته التفصيلية</h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        اضغط على أي مندوب من القائمة أعلاه لعرض إحصائياته المفصلة والرسوم البيانية
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminAnalytics
