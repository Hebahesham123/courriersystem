"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Receipt,
  Clock3,
  HandMetal,
  RefreshCw,
  Truck,
  CreditCard,
  Wallet,
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
  status: string
  assigned_courier_id: string
  assigned_at?: string
  customer_name?: string
  address?: string
  mobile_number?: string
  total_order_fees?: number
  delivery_fee?: number
  partial_paid_amount?: number
  payment_method?: string
  payment_status?: string
  payment_sub_type?: string | null
  collected_by?: string | null
}

type CategoryId =
  | "delivered"
  | "partial"
  | "canceled"
  | "assigned"
  | "hand_to_hand"
  | "receiving_part"
  | "return"

const STATUS_LABELS: Record<CategoryId, { title: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  delivered: { title: "الطلبات المسلمة", color: "text-emerald-700", icon: CheckCircle2 },
  partial: { title: "الطلبات الجزئية", color: "text-amber-700", icon: Receipt },
  canceled: { title: "الطلبات الملغاة", color: "text-rose-700", icon: XCircle },
  assigned: { title: "الطلبات المكلفة", color: "text-blue-700", icon: Clock3 },
  hand_to_hand: { title: "الطلبات يد بيد", color: "text-purple-700", icon: HandMetal },
  receiving_part: { title: "طلبات استلام قطعة", color: "text-indigo-700", icon: HandMetal },
  return: { title: "طلبات مرتجعة", color: "text-gray-700", icon: Clock3 },
}

const CourierTrackingDetail: React.FC = () => {
  const { user } = useAuth()
  const { courierId } = useParams<{ courierId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [courier, setCourier] = useState<Courier | null>(null)
  const selectedDate = useMemo(() => {
    return searchParams.get("date") || new Date().toISOString().split("T")[0]
  }, [searchParams])

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const buildDayRangeUtc = useCallback(() => {
    const startDate = new Date(`${selectedDate}T00:00:00`)
    const endDateInclusive = new Date(`${selectedDate}T23:59:59.999`)
    const endExclusive = new Date(endDateInclusive.getTime() + 1)
    return { startIso: startDate.toISOString(), endIso: endExclusive.toISOString() }
  }, [selectedDate])

  const setDate = (date: string) => {
    searchParams.set("date", date)
    setSearchParams(searchParams)
  }

  const fetchCourier = useCallback(async () => {
    if (!courierId) return
    const { data } = await supabase.from("users").select("id, name, email").eq("id", courierId).single()
    setCourier(data as Courier | null)
  }, [courierId])

  const fetchOrders = useCallback(async () => {
    if (!courierId || !user || user.role !== "admin") return
    setLoading(true)
    try {
      const startDate = new Date(selectedDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(selectedDate)
      endDate.setHours(23, 59, 59, 999)

      const { startIso, endIso } = buildDayRangeUtc()

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_id, status, assigned_courier_id, assigned_at, updated_at, created_at, customer_name, address, mobile_number, total_order_fees, delivery_fee, partial_paid_amount, payment_method, payment_status, payment_sub_type, collected_by"
        )
        .eq("assigned_courier_id", courierId)
        .or(
          `and(assigned_at.gte.${startIso},assigned_at.lt.${endIso}),` +
            `and(updated_at.gte.${startIso},updated_at.lt.${endIso}),` +
            `and(created_at.gte.${startIso},created_at.lt.${endIso})`
        )

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error("Error fetching courier orders:", error)
    } finally {
      setLoading(false)
    }
  }, [courierId, selectedDate, user, buildDayRangeUtc])

  useEffect(() => {
    fetchCourier()
  }, [fetchCourier])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const isCashCollected = (order: Order) => {
    const method = order.payment_method?.toLowerCase() || ""
    return (
      order.collected_by === "courier" ||
      order.payment_sub_type === "on_hand" ||
      method === "cod" ||
      method.includes("cash")
    )
  }

  const getCollectedAmount = (order: Order) => {
    if (order.status === "delivered") {
      return isCashCollected(order) ? Number(order.total_order_fees) || 0 : 0
    }
    if (order.status === "partial") {
      return Number(order.partial_paid_amount) || 0
    }
    if (order.status === "canceled") {
      return Number(order.delivery_fee) || 0
    }
    if (order.status === "hand_to_hand") {
      return isCashCollected(order) ? Number(order.total_order_fees) || 0 : 0
    }
    if (order.status === "receiving_part") {
      return Number(order.partial_paid_amount) || 0
    }
    return 0
  }

  const categories = useMemo(() => {
    const all: CategoryId[] = ["delivered", "partial", "hand_to_hand", "canceled", "assigned", "receiving_part", "return"]
    return all.map((id) => {
      const ordersByStatus = orders.filter((o) => o.status === id)
      const totalValue = ordersByStatus.reduce((sum, o) => sum + (Number(o.total_order_fees) || 0), 0)
      const collectedValue = ordersByStatus.reduce((sum, o) => sum + getCollectedAmount(o), 0)
      return {
        id,
        orders: ordersByStatus,
        count: ordersByStatus.length,
        totalValue,
        collectedValue,
        ...STATUS_LABELS[id],
      }
    })
  }, [orders])

  const paymentSummary = useMemo(() => {
    let cash = 0
    let nonCash = 0
    orders.forEach((o) => {
      const amount = getCollectedAmount(o)
      if (isCashCollected(o)) cash += amount
      else nonCash += amount
    })
    return { cash, nonCash }
  }, [orders])

  const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value || 0)
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "EGP", minimumFractionDigits: 0 }).format(amount)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-5 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              aria-label="عودة"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <p className="text-xs text-gray-500">المندوب</p>
              <p className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                {courier?.name || "غير معروف"}
              </p>
              <p className="text-xs text-gray-500">{courier?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-sm focus:outline-none"
              />
            </div>
            <button
              onClick={fetchOrders}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
            <span className="mr-2 text-gray-600">جاري التحميل...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {categories.map((cat) => {
                const Icon = cat.icon
                return (
                  <div
                    key={cat.id}
                    className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${cat.color}`} />
                        <p className="text-sm font-semibold text-gray-800">{cat.title}</p>
                      </div>
              <span className={`text-lg font-bold ${cat.color}`}>{formatNumber(cat.count)}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>القيمة الأصلية</span>
                      <span className="font-semibold text-gray-700">{formatCurrency(cat.totalValue)}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>المحصل</span>
                      <span className="font-semibold text-gray-700">{formatCurrency(cat.collectedValue)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">إجمالي نقدي محصل</p>
                    <p className="text-xs text-gray-500">يشمل الطلبات النقدية والمحصل بواسطة المندوب</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-700">{formatCurrency(paymentSummary.cash)}</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">تحصيل غير نقدي</p>
                    <p className="text-xs text-gray-500">بطاقات / تحويل / طرق أخرى</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-700">{formatCurrency(paymentSummary.nonCash)}</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">تفاصيل الطلبات</p>
                  <p className="text-xs text-gray-500">قابلة للضغط لإظهار تفاصيل الدفع والعنوان</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {formatNumber(orders.length)} طلب
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="text-center text-gray-500 py-8 text-sm">لا توجد طلبات في هذا اليوم.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {orders.map((order) => {
                    const catColor = STATUS_LABELS[order.status as CategoryId]?.color || "text-gray-700"
                    const collected = getCollectedAmount(order)
                    return (
                      <div
                        key={order.id}
                        className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-white hover:shadow transition-all text-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                            {order.order_id}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-1 bg-gray-200 rounded ${catColor}`}>
                            {order.status || "غير محدد"}
                          </span>
                        </div>
                        <p className="text-gray-800 font-semibold mb-1">{order.customer_name || "عميل غير معروف"}</p>
                        {order.address && <p className="text-xs text-gray-500 mb-1 truncate">العنوان: {order.address}</p>}
                        {order.mobile_number && <p className="text-xs text-gray-500 mb-1">الهاتف: {order.mobile_number}</p>}
                        <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
                          <span>القيمة: {formatCurrency(Number(order.total_order_fees) || 0)}</span>
                          <span>المحصل: {formatCurrency(collected)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                          <span>الدفع: {order.payment_method || "غير محدد"}</span>
                          {order.payment_status && <span>حالة الدفع: {order.payment_status}</span>}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          {isCashCollected(order) ? "نقدي / محصل بواسطة المندوب" : "غير نقدي"}
                          {order.payment_sub_type && ` • ${order.payment_sub_type}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CourierTrackingDetail


