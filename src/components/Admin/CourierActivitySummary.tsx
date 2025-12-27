"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import {
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  RefreshCw,
  X,
  ArrowLeft,
  HandMetal,
  Receipt,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"

interface Courier {
  id: string
  name: string
  email: string
}

interface Order {
  id: string
  order_id: string
  shopify_order_id?: number
  customer_name: string
  total_order_fees: number
  payment_method: string
  payment_status?: string
  status: string
  assigned_courier_id: string | null
  original_courier_id?: string | null
  created_at: string
  updated_at: string
  assigned_at?: string | null
  courier_name?: string
  address?: string
  mobile_number?: string
  delivery_fee?: number
  partial_paid_amount?: number
  collected_by?: string | null
  payment_sub_type?: string | null
}

interface OrderCategory {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  bgColor: string
  textColor: string
  borderColor: string
  originalValue: number
  collectedValue: number
  orders: Order[]
  ordersCount: number
}

const CourierActivitySummary: React.FC = () => {
  const { user } = useAuth()
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [dateRange, setDateRange] = useState<"today" | "yesterday" | "week" | "month" | "custom">("today")
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([])

  const fetchCouriers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("role", "courier")
        .order("name", { ascending: true })

      if (error) throw error
      setCouriers(data || [])
    } catch (error: any) {
      console.error("Error fetching couriers:", error)
    }
  }, [])

  const calculateDateRange = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let startDate: Date
    let endDate = new Date()
    endDate.setHours(23, 59, 59, 999)

    switch (dateRange) {
      case "today":
        startDate = new Date(today)
        break
      case "yesterday":
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 1)
        endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999)
        break
      case "week":
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 7)
        break
      case "month":
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 30)
        break
      case "custom":
        const customDate = new Date(selectedDate)
        customDate.setHours(0, 0, 0, 0)
        startDate = customDate
        endDate = new Date(customDate)
        endDate.setHours(23, 59, 59, 999)
        break
      default:
        startDate = new Date(today)
    }

    return { startDate, endDate }
  }, [dateRange, selectedDate])

  const fetchOrders = useCallback(async () => {
    if (!user || user.role !== "admin") return

    setLoading(true)
    try {
      const { startDate, endDate } = calculateDateRange()

      // Fetch orders that were created, assigned, or updated in the date range
      // Include collected_by and payment_sub_type for accurate accounting
      const { data: ordersCreated, error: ordersCreatedError } = await supabase
        .from("orders")
        .select("*, collected_by, payment_sub_type")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())

      if (ordersCreatedError) throw ordersCreatedError

      const { data: ordersAssigned, error: ordersAssignedError } = await supabase
        .from("orders")
        .select("*, collected_by, payment_sub_type")
        .not("assigned_at", "is", null)
        .gte("assigned_at", startDate.toISOString())
        .lte("assigned_at", endDate.toISOString())

      if (ordersAssignedError) throw ordersAssignedError

      const { data: ordersUpdated, error: ordersUpdatedError } = await supabase
        .from("orders")
        .select("*, collected_by, payment_sub_type")
        .not("assigned_courier_id", "is", null)
        .gte("updated_at", startDate.toISOString())
        .lte("updated_at", endDate.toISOString())

      if (ordersUpdatedError) throw ordersUpdatedError

      // Combine and deduplicate orders
      const allOrdersMap = new Map<string, Order>()
      ;[...(ordersCreated || []), ...(ordersAssigned || []), ...(ordersUpdated || [])].forEach((order) => {
        allOrdersMap.set(order.id, order)
      })
      
      let allOrders = Array.from(allOrdersMap.values())

      // Filter by courier if selected
      if (selectedCourier) {
        allOrders = allOrders.filter(
          (o) => o.assigned_courier_id === selectedCourier || o.original_courier_id === selectedCourier
        )
      }

      // Join with courier names
      const ordersWithCouriers = await Promise.all(
        allOrders.map(async (order) => {
          if (order.assigned_courier_id) {
            const courier = couriers.find((c) => c.id === order.assigned_courier_id)
            return { ...order, courier_name: courier?.name || "غير معروف" }
          }
          return order
        })
      )

      setOrders(ordersWithCouriers)
    } catch (error: any) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }, [user, calculateDateRange, selectedCourier, couriers])

  useEffect(() => {
    fetchCouriers()
  }, [fetchCouriers])

  useEffect(() => {
    if (couriers.length > 0) {
      fetchOrders()
    }
  }, [couriers, fetchOrders, dateRange, selectedDate, selectedCourier])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getCollectedAmount = (order: Order): number => {
    // Helper to check if payment was collected as cash by courier
    const isCashCollectedByCourier = () => {
      // Check if courier collected cash (on_hand)
      if (order.collected_by === "courier" && order.payment_sub_type === "on_hand") {
        return true
      }
      // Check if payment_method indicates cash
      if (order.payment_method === "cash" || order.payment_method === "cod" || 
          (order.payment_method && order.payment_method.toLowerCase().includes("cash"))) {
        return true
      }
      return false
    }

    if (order.status === "delivered") {
      // For delivered orders, only count if cash was collected by courier
      if (isCashCollectedByCourier()) {
        return Number(order.total_order_fees) || 0
      }
      return 0
    } else if (order.status === "partial") {
      // For partial orders, use the partial_paid_amount
      return Number(order.partial_paid_amount) || 0
    } else if (order.status === "canceled") {
      // For canceled orders, only delivery fee is collected (if any)
      return Number(order.delivery_fee) || 0
    } else if (order.status === "hand_to_hand") {
      // For hand_to_hand, check if cash was collected
      if (isCashCollectedByCourier()) {
        return Number(order.total_order_fees) || 0
      }
      return 0
    } else if (order.status === "return") {
      // For returned orders, typically no amount is collected
      return 0
    } else if (order.status === "receiving_part") {
      // For receiving_part, use partial_paid_amount if available
      return Number(order.partial_paid_amount) || 0
    }
    return 0
  }

  const getEstimatedCollected = (order: Order): number => {
    if (order.status === "delivered" || order.status === "partial") {
      return Number(order.total_order_fees) || 0
    }
    return 0
  }

  const categories: OrderCategory[] = [
    {
      id: "total",
      title: "إجمالي الطلبات",
      icon: Package,
      bgColor: "bg-gray-50",
      textColor: "text-gray-700",
      borderColor: "border-gray-300",
      originalValue: orders.reduce((sum, o) => sum + (Number(o.total_order_fees) || 0), 0),
      collectedValue: orders.reduce((sum, o) => sum + getCollectedAmount(o), 0),
      orders: orders,
      ordersCount: orders.length,
    },
    {
      id: "completed",
      title: "الطلبات المكتملة",
      icon: CheckCircle,
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-300",
      originalValue: orders
        .filter((o) => o.status === "delivered" || o.status === "partial")
        .reduce((sum, o) => sum + (Number(o.total_order_fees) || 0), 0),
      collectedValue: orders
        .filter((o) => o.status === "delivered" || o.status === "partial")
        .reduce((sum, o) => sum + getCollectedAmount(o), 0),
      orders: orders.filter((o) => o.status === "delivered" || o.status === "partial"),
      ordersCount: orders.filter((o) => o.status === "delivered" || o.status === "partial").length,
    },
    {
      id: "delivered",
      title: "الطلبات المسلمة",
      icon: CheckCircle,
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-300",
      originalValue: orders
        .filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + (Number(o.total_order_fees) || 0), 0),
      collectedValue: orders
        .filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + getCollectedAmount(o), 0),
      orders: orders.filter((o) => o.status === "delivered"),
      ordersCount: orders.filter((o) => o.status === "delivered").length,
    },
    {
      id: "assigned",
      title: "الطلبات المكلفة",
      icon: Clock,
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-300",
      originalValue: orders
        .filter((o) => o.status === "assigned")
        .reduce((sum, o) => sum + (Number(o.total_order_fees) || 0), 0),
      collectedValue: orders
        .filter((o) => o.status === "assigned")
        .reduce((sum, o) => sum + getEstimatedCollected(o), 0),
      orders: orders.filter((o) => o.status === "assigned"),
      ordersCount: orders.filter((o) => o.status === "assigned").length,
    },
    {
      id: "canceled",
      title: "الطلبات الملغاة",
      icon: XCircle,
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-300",
      originalValue: orders
        .filter((o) => o.status === "canceled")
        .reduce((sum, o) => sum + (Number(o.total_order_fees) || 0), 0),
      collectedValue: orders
        .filter((o) => o.status === "canceled")
        .reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0),
      orders: orders.filter((o) => o.status === "canceled"),
      ordersCount: orders.filter((o) => o.status === "canceled").length,
    },
    {
      id: "partial",
      title: "الطلبات الجزئية",
      icon: Receipt,
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      borderColor: "border-yellow-300",
      originalValue: orders
        .filter((o) => o.status === "partial")
        .reduce((sum, o) => sum + (Number(o.total_order_fees) || 0), 0),
      collectedValue: orders
        .filter((o) => o.status === "partial")
        .reduce((sum, o) => sum + getCollectedAmount(o), 0),
      orders: orders.filter((o) => o.status === "partial"),
      ordersCount: orders.filter((o) => o.status === "partial").length,
    },
    {
      id: "deferred",
      title: "الطلبات المؤجلة",
      icon: Calendar,
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      borderColor: "border-orange-300",
      originalValue: 0,
      collectedValue: 0,
      orders: [],
      ordersCount: 0,
    },
    {
      id: "hand_to_hand",
      title: "الطلبات يد بيد",
      icon: HandMetal,
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      borderColor: "border-purple-300",
      originalValue: orders
        .filter((o) => o.status === "hand_to_hand")
        .reduce((sum, o) => sum + (Number(o.total_order_fees) || 0), 0),
      collectedValue: orders
        .filter((o) => o.status === "hand_to_hand")
        .reduce((sum, o) => sum + getCollectedAmount(o), 0),
      orders: orders.filter((o) => o.status === "hand_to_hand"),
      ordersCount: orders.filter((o) => o.status === "hand_to_hand").length,
    },
  ]

  const handleCategoryClick = (category: OrderCategory) => {
    if (category.ordersCount > 0) {
      setSelectedCategory(category.id)
      setSelectedOrders(category.orders)
    }
  }

  const closeModal = () => {
    setSelectedCategory(null)
    setSelectedOrders([])
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      delivered: { label: "مسلم", color: "bg-green-100 text-green-800" },
      canceled: { label: "ملغي", color: "bg-red-100 text-red-800" },
      partial: { label: "جزئي", color: "bg-yellow-100 text-yellow-800" },
      assigned: { label: "مكلف", color: "bg-blue-100 text-blue-800" },
      hand_to_hand: { label: "يد بيد", color: "bg-purple-100 text-purple-800" },
    }
    const config = statusConfig[status] || { label: status, color: "bg-gray-100 text-gray-800" }
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">لوحة المحاسبة التفصيلية</h1>
              <p className="text-gray-600">تقرير شامل للعمليات المالية</p>
            </div>
            <button
              onClick={() => fetchOrders()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
            </button>
          </div>

          {/* Date Range Selector */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setDateRange("today")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateRange === "today"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setDateRange("yesterday")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateRange === "yesterday"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              أمس
            </button>
            <button
              onClick={() => setDateRange("week")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateRange === "week"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => setDateRange("month")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateRange === "month"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              آخر 30 يوم
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setDateRange("custom")
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedCourier || ""}
              onChange={(e) => setSelectedCourier(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">جميع المندوبين</option>
              {couriers.map((courier) => (
                <option key={courier.id} value={courier.id}>
                  {courier.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="mr-3 text-gray-600">جاري التحميل...</span>
          </div>
        ) : (
          <>
            {/* Orders Summary Cards */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">ملخص الطلبات</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map((category) => {
                  const Icon = category.icon
                  return (
                    <div
                      key={category.id}
                      onClick={() => handleCategoryClick(category)}
                      className={`${category.bgColor} ${category.borderColor} border-2 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                        category.ordersCount === 0 ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <Icon className={`w-8 h-8 ${category.textColor}`} />
                        <span className={`text-sm font-semibold ${category.textColor}`}>
                          {category.ordersCount} طلب
                        </span>
                      </div>
                      <h3 className={`text-lg font-bold ${category.textColor} mb-3`}>
                        {category.title}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">القيمة الأصلية:</span>
                          <span className={`font-bold ${category.textColor}`}>
                            {formatCurrency(category.originalValue)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            {category.id === "assigned" || category.id === "completed"
                              ? "المحصل التقديرية:"
                              : category.id === "canceled" || category.id === "deferred"
                              ? "المحصل (الرسوم فقط):"
                              : "المحصل فعليا:"}
                          </span>
                          <span className={`font-bold ${category.textColor}`}>
                            {formatCurrency(category.collectedValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Collected and Undelivered Summary */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">ملخص المحصل والغير مسلم</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-8 h-8 text-green-700" />
                    <h3 className="text-lg font-bold text-green-700">إجمالي مسلم فعليا</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">مجموع المحصل فعليا:</span>
                      <span className="text-xl font-bold text-green-700">
                        {formatCurrency(
                          categories
                            .filter((c) => c.id === "delivered" || c.id === "partial")
                            .reduce((sum, c) => sum + c.collectedValue, 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">الطلبات:</span>
                      <span className="text-lg font-bold text-green-700">
                        {categories
                          .filter((c) => c.id === "delivered" || c.id === "partial")
                          .reduce((sum, c) => sum + c.ordersCount, 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <XCircle className="w-8 h-8 text-red-700" />
                    <h3 className="text-lg font-bold text-red-700">إجمالي غير مسلم</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">مجموع الغير مسلم:</span>
                      <span className="text-xl font-bold text-red-700">
                        {formatCurrency(
                          categories
                            .filter((c) => c.id === "assigned" || c.id === "canceled")
                            .reduce((sum, c) => sum + (c.originalValue - c.collectedValue), 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">الطلبات:</span>
                      <span className="text-lg font-bold text-red-700">
                        {categories
                          .filter((c) => c.id === "assigned" || c.id === "canceled")
                          .reduce((sum, c) => sum + c.ordersCount, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total to be Handed Over */}
            <div className="bg-green-100 border-2 border-green-400 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-8 h-8 text-green-700" />
                <h3 className="text-xl font-bold text-green-700">إجمالي ما يسلم للمحاسبة</h3>
              </div>
              <div className="text-3xl font-bold text-green-700 mb-2">
                {formatCurrency(
                  categories
                    .filter((c) => c.id === "delivered" || c.id === "partial")
                    .reduce((sum, c) => sum + c.collectedValue, 0)
                )}
              </div>
              <div className="text-sm text-gray-600">
                النقد في اليد فقط - طلب نقدي{" "}
                {categories
                  .filter((c) => c.id === "delivered" || c.id === "partial")
                  .reduce((sum, c) => sum + c.orders.filter((o) => o.payment_method === "cash" || o.payment_method === "cod").length, 0)}
              </div>
            </div>
          </>
        )}

        {/* Orders Modal */}
        {selectedCategory && selectedOrders.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {categories.find((c) => c.id === selectedCategory)?.title}
                  </h2>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    {selectedOrders.length} طلب
                  </span>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {selectedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-5 h-5 text-blue-600" />
                            <span className="font-bold text-gray-800">{order.order_id}</span>
                            {getStatusBadge(order.status)}
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            <strong>العميل:</strong> {order.customer_name}
                          </div>
                          {order.courier_name && (
                            <div className="text-sm text-gray-600 mb-1">
                              <strong>المندوب:</strong> {order.courier_name}
                            </div>
                          )}
                          {order.address && (
                            <div className="text-sm text-gray-600 mb-1">
                              <strong>العنوان:</strong> {order.address}
                            </div>
                          )}
                          {order.mobile_number && (
                            <div className="text-sm text-gray-600">
                              <strong>الهاتف:</strong> {order.mobile_number}
                            </div>
                          )}
                        </div>
                        <div className="text-left">
                          <div className="mb-2">
                            <span className="text-sm text-gray-600">القيمة الأصلية:</span>
                            <span className="mr-2 font-bold text-gray-800">
                              {formatCurrency(Number(order.total_order_fees) || 0)}
                            </span>
                          </div>
                          <div className="mb-2">
                            <span className="text-sm text-gray-600">المحصل:</span>
                            <span className="mr-2 font-bold text-green-600">
                              {formatCurrency(getCollectedAmount(order))}
                            </span>
                          </div>
                          <div className="mb-2">
                            <span className="text-sm text-gray-600">طريقة الدفع:</span>
                            <span className="mr-2 font-semibold text-gray-800">
                              {order.payment_method || "غير محدد"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(order.updated_at).toLocaleDateString("ar-EG", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CourierActivitySummary
