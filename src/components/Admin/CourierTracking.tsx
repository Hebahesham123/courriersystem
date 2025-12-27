"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Calendar, ClipboardList, RefreshCw, Truck } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"

interface Courier {
  id: string
  name: string
  email: string
}

interface AssignedOrder {
  id: string
  order_id: string
  assigned_courier_id: string
  assigned_at: string
  status?: string
  customer_name?: string
  total_order_fees?: number
  payment_method?: string
  payment_status?: string
  payment_sub_type?: string | null
  collected_by?: string | null
  address?: string
  mobile_number?: string
  updated_at?: string
  created_at?: string
}

const CourierTracking: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [assignedOrders, setAssignedOrders] = useState<AssignedOrder[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(true)

  const buildDayRangeUtc = useCallback(() => {
    const startDate = new Date(`${selectedDate}T00:00:00`)
    const endDateInclusive = new Date(`${selectedDate}T23:59:59.999`)
    // use exclusive end to avoid missing last-millisecond values
    const endExclusive = new Date(endDateInclusive.getTime() + 1)
    return { startIso: startDate.toISOString(), endIso: endExclusive.toISOString() }
  }, [selectedDate])

  const fetchCouriers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("role", "courier")
        .order("name", { ascending: true })

      if (error) throw error
      setCouriers(data || [])
    } catch (error) {
      console.error("Error fetching couriers:", error)
    }
  }, [])

  const fetchAssignedOrders = useCallback(async () => {
    if (!user || user.role !== "admin") return

    setLoading(true)
    try {
      const { startIso, endIso } = buildDayRangeUtc()

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_id, assigned_courier_id, assigned_at, status, customer_name, total_order_fees, payment_method, payment_status, payment_sub_type, collected_by, address, mobile_number, updated_at, created_at"
        )
        .not("assigned_courier_id", "is", null)
        .or(
          `and(assigned_at.gte.${startIso},assigned_at.lt.${endIso}),` +
            `and(updated_at.gte.${startIso},updated_at.lt.${endIso}),` +
            `and(created_at.gte.${startIso},created_at.lt.${endIso})`
        )

      if (error) throw error
      setAssignedOrders(data || [])
    } catch (error) {
      console.error("Error fetching assigned orders:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, user, buildDayRangeUtc])

  useEffect(() => {
    fetchCouriers()
  }, [fetchCouriers])

  useEffect(() => {
    fetchAssignedOrders()
  }, [fetchAssignedOrders])

  const courierStats = useMemo(() => {
    const grouped = couriers.map((courier) => {
      const courierOrders = assignedOrders.filter((o) => o.assigned_courier_id === courier.id)
      return {
        courier,
        orders: courierOrders,
        count: courierOrders.length,
      }
    })

    const unknownCourierOrders = assignedOrders.filter(
      (o) => !couriers.find((c) => c.id === o.assigned_courier_id)
    )

    return { grouped, unknownCourierOrders }
  }, [assignedOrders, couriers])

  const totalAssigned = assignedOrders.length

  const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value || 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <ClipboardList className="w-7 h-7 text-blue-600" />
              تتبع المندوبين
            </h1>
            <p className="text-gray-600">عرض عدد الطلبات المسندة لكل مندوب في يوم محدد</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent focus:outline-none text-gray-800"
              />
            </div>
            <button
              onClick={fetchAssignedOrders}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="mr-3 text-gray-600">جاري التحميل...</span>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow p-6 mb-6 flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-3">
                <Truck className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">إجمالي الطلبات المسندة في اليوم</p>
                  <p className="text-2xl font-bold text-green-700">{formatNumber(totalAssigned)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ClipboardList className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">عدد المندوبين الذين لديهم مهام</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatNumber(courierStats.grouped.filter((c) => c.count > 0).length)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courierStats.grouped.map(({ courier, orders, count }) => {
                const hasOrders = count > 0
                return (
                  <button
                    key={courier.id}
                    onClick={() =>
                      navigate(`/admin/courier-tracking/${courier.id}?date=${selectedDate}`)
                    }
                    className={`text-left border rounded-xl p-5 bg-white shadow-sm transition-all ${
                      hasOrders
                        ? "border-blue-200 hover:shadow-md hover:-translate-y-1"
                        : "border-gray-200 cursor-pointer hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-500">المندوب</p>
                        <p className="text-lg font-bold text-gray-800">{courier.name}</p>
                        <p className="text-xs text-gray-500">{courier.email}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-gray-500">طلبات اليوم</span>
                        <span
                          className={`text-3xl font-extrabold ${
                            hasOrders ? "text-blue-600" : "text-gray-400"
                          }`}
                        >
                          {formatNumber(count)}
                        </span>
                      </div>
                    </div>
                    {hasOrders && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700">أرقام الطلبات:</p>
                        <div className="flex flex-wrap gap-2">
                          {orders.slice(0, 6).map((order) => (
                            <span
                              key={order.id}
                              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold"
                            >
                              {order.order_id}
                            </span>
                          ))}
                          {orders.length > 6 && (
                            <span className="text-xs text-gray-500">
                              +{formatNumber(orders.length - 6)} أخرى
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-blue-600 font-semibold">اضغط لعرض تفاصيل الطلبات</p>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {courierStats.unknownCourierOrders.length > 0 && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="font-semibold text-yellow-800 mb-2">طلبات بدون مندوب معروف</p>
                <div className="flex flex-wrap gap-2">
                  {courierStats.unknownCourierOrders.map((order) => (
                    <span
                      key={order.id}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold"
                    >
                      {order.order_id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!loading && totalAssigned === 0 && (
              <div className="mt-6 bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-600">
                لا توجد طلبات مسندة في هذا اليوم.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CourierTracking


