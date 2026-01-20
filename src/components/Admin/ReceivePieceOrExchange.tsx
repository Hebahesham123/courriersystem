"use client"
import React, { useState, useEffect, useCallback } from "react"
import {
  Package,
  UserPlus,
  CheckCircle,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
  Truck,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Settings,
  Calendar,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"
import { OrderDetailModal } from "./OrderDetailModal"

interface Order {
  id: string
  order_id: string
  customer_name: string
  address: string
  mobile_number: string
  total_order_fees: number
  receive_piece_or_exchange?: string | null
  assigned_courier_id?: string | null
  courier_name?: string | null
  created_at?: string
}

interface Courier {
  id: string
  name: string
  email: string
}

const ReceivePieceOrExchange: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [assignLoading, setAssignLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedCourier, setSelectedCourier] = useState<string>("")
  const [showAddOrderModal, setShowAddOrderModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [availableOrders, setAvailableOrders] = useState<Order[]>([])
  const [loadingAvailableOrders, setLoadingAvailableOrders] = useState(false)
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<any>(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [assignSelectedLoading, setAssignSelectedLoading] = useState(false)
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    // Get today's date
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', { // 'en-CA' gives YYYY-MM-DD format
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    
    // Calculate 3 months ago
    const threeMonthsAgo = new Date(now)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    const fromStr = formatter.format(threeMonthsAgo)
    const toStr = formatter.format(now)
    
    return {
      from: fromStr,
      to: toStr,
    }
  })
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    fetchOrders()
    fetchCouriers()
  }, [dateRange])

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("orders")
        .select(`
          id, order_id, customer_name, address, mobile_number, total_order_fees,
          receive_piece_or_exchange, assigned_courier_id, created_at, shopify_created_at,
          users!orders_assigned_courier_id_fkey(name)
        `)
        .in("receive_piece_or_exchange", ["receive_piece", "exchange"])

      // Apply date filter
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from)
        fromDate.setHours(0, 0, 0, 0)
        query = query.gte("shopify_created_at", fromDate.toISOString())
      }
      if (dateRange.to) {
        const toDate = new Date(dateRange.to)
        toDate.setHours(23, 59, 59, 999)
        query = query.lte("shopify_created_at", toDate.toISOString())
      }

      const { data, error: fetchError } = await query
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError

      const mapped = (data || []).map((o: any) => ({
        ...o,
        courier_name: o.users?.name || null,
      }))

      setOrders(mapped)
    } catch (err: any) {
      console.error("Error fetching orders:", err)
      setError(err.message || "خطأ في جلب الطلبات")
    } finally {
      setLoading(false)
    }
  }

  const fetchCouriers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("role", "courier")
        .order("name")

      if (fetchError) throw fetchError
      setCouriers(data || [])
    } catch (err: any) {
      console.error("Error fetching couriers:", err)
    }
  }

  const handleUpdateStatus = async (orderId: string, status: "receive_piece" | "exchange" | null) => {
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ receive_piece_or_exchange: status })
        .eq("id", orderId)

      if (updateError) throw updateError

      // If removing (setting to null), remove from local state
      if (status === null) {
        setOrders((prev) => prev.filter((order) => order.id !== orderId))
        setSuccessMessage("تم إزالة الطلب من القائمة")
      } else {
        // If adding/changing, update in local state or add if not present
        setOrders((prev) => {
          const existing = prev.find((o) => o.id === orderId)
          if (existing) {
            return prev.map((order) =>
              order.id === orderId ? { ...order, receive_piece_or_exchange: status } : order
            )
          } else {
            // Order not in list, need to fetch it
            fetchOrders()
            return prev
          }
        })
        setSuccessMessage(
          `تم تحديث حالة الطلب إلى ${status === "receive_piece" ? "استلام قطعه" : "تبديل"}`
        )
      }
    } catch (err: any) {
      console.error("Error updating order status:", err)
      setError(err.message || "خطأ في تحديث حالة الطلب")
    }
  }

  const handleRemoveOrder = async (orderId: string) => {
    await handleUpdateStatus(orderId, null)
  }

  const handleSearchOrders = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setAvailableOrders([])
      return
    }

    setLoadingAvailableOrders(true)
    try {
      const { data, error: searchError } = await supabase
        .from("orders")
        .select(`
          id, order_id, customer_name, address, mobile_number, total_order_fees,
          receive_piece_or_exchange, assigned_courier_id, created_at,
          users!orders_assigned_courier_id_fkey(name)
        `)
        .or(`order_id.ilike.%${query}%,customer_name.ilike.%${query}%,mobile_number.ilike.%${query}%`)
        .is("receive_piece_or_exchange", null) // Only show orders not already in these categories
        .limit(20)
        .order("created_at", { ascending: false })

      if (searchError) throw searchError

      const mapped = (data || []).map((o: any) => ({
        ...o,
        courier_name: o.users?.name || null,
      }))

      setAvailableOrders(mapped)
    } catch (err: any) {
      console.error("Error searching orders:", err)
      setError(err.message || "خطأ في البحث")
    } finally {
      setLoadingAvailableOrders(false)
    }
  }

  const handleAddOrder = async (orderId: string, status: "receive_piece" | "exchange") => {
    await handleUpdateStatus(orderId, status)
    setShowAddOrderModal(false)
    setSearchQuery("")
    setAvailableOrders([])
  }

  const handleAssignCourier = async (orderId: string, courierId: string | null) => {
    try {
      const { error: assignError } = await supabase
        .from("orders")
        .update({
          assigned_courier_id: courierId,
          assigned_at: courierId ? new Date().toISOString() : null,
        })
        .eq("id", orderId)

      if (assignError) throw assignError

      const courier = couriers.find((c) => c.id === courierId)
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, assigned_courier_id: courierId || null, courier_name: courier?.name || null }
            : order
        )
      )

      setSuccessMessage(courierId ? `تم تعيين المندوب ${courier?.name}` : "تم إلغاء تعيين المندوب")
    } catch (err: any) {
      console.error("Error assigning courier:", err)
      setError(err.message || "خطأ في تعيين المندوب")
    }
  }

  const handleBulkAssign = async () => {
    if (!selectedCourier) {
      setError("يرجى اختيار مندوب")
      return
    }

    const unassignedOrders = orders.filter(
      (order) => order.receive_piece_or_exchange && !order.assigned_courier_id
    )

    if (unassignedOrders.length === 0) {
      setError("لا توجد طلبات غير معينة")
      return
    }

    setAssignLoading(true)
    try {
      const { error: assignError } = await supabase
        .from("orders")
        .update({
          assigned_courier_id: selectedCourier,
          assigned_at: new Date().toISOString(),
        })
        .in(
          "id",
          unassignedOrders.map((o) => o.id)
        )

      if (assignError) throw assignError

      const courier = couriers.find((c) => c.id === selectedCourier)
      await fetchOrders()
      setSuccessMessage(`تم تعيين ${unassignedOrders.length} طلب إلى ${courier?.name}`)
      setSelectedCourier("")
    } catch (err: any) {
      console.error("Error bulk assigning:", err)
      setError(err.message || "خطأ في تعيين المندوبين")
    } finally {
      setAssignLoading(false)
    }
  }

  const handleAssignSelected = async (courierId: string) => {
    if (selectedOrderIds.length === 0) {
      setError("يرجى اختيار طلبات أولاً")
      return
    }

    if (!courierId) {
      setError("يرجى اختيار مندوب")
      return
    }

    setAssignSelectedLoading(true)
    try {
      const { error: assignError } = await supabase
        .from("orders")
        .update({
          assigned_courier_id: courierId,
          assigned_at: new Date().toISOString(),
        })
        .in("id", selectedOrderIds)

      if (assignError) throw assignError

      const courier = couriers.find((c) => c.id === courierId)
      await fetchOrders()
      setSuccessMessage(`تم تعيين ${selectedOrderIds.length} طلب إلى ${courier?.name}`)
      setSelectedOrderIds([])
    } catch (err: any) {
      console.error("Error assigning selected orders:", err)
      setError(err.message || "خطأ في تعيين الطلبات")
    } finally {
      setAssignSelectedLoading(false)
    }
  }

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    )
  }

  const toggleAllOrders = (orderIds: string[]) => {
    if (selectedOrderIds.length === orderIds.length) {
      setSelectedOrderIds([])
    } else {
      setSelectedOrderIds(orderIds)
    }
  }

  const receivePieceOrders = orders.filter((o) => o.receive_piece_or_exchange === "receive_piece")
  const exchangeOrders = orders.filter((o) => o.receive_piece_or_exchange === "exchange")

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            <span>رجوع</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">استلام قطعه أو تبديل</h1>
            <p className="text-sm text-gray-600 mt-1">إدارة طلبات الاستلام والتبديل</p>
          </div>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

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

      {/* Action Bar */}
      <div className="mb-6 space-y-4">
        {/* Date Filter and Add Order Button */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">التاريخ:</label>
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {dateRange.from && dateRange.to
                    ? `${dateRange.from} - ${dateRange.to}`
                    : "اختر التاريخ"}
                </span>
              </button>
              {showDatePicker && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDatePicker(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-20 min-w-[300px]">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          من (From)
                        </label>
                        <input
                          type="date"
                          value={dateRange.from}
                          onChange={(e) =>
                            setDateRange((prev) => ({ ...prev, from: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          إلى (To)
                        </label>
                        <input
                          type="date"
                          value={dateRange.to}
                          onChange={(e) =>
                            setDateRange((prev) => ({ ...prev, to: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const now = new Date()
                            const formatter = new Intl.DateTimeFormat('en-CA', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })
                            const threeMonthsAgo = new Date(now)
                            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
                            setDateRange({
                              from: formatter.format(threeMonthsAgo),
                              to: formatter.format(now),
                            })
                            setShowDatePicker(false)
                          }}
                          className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors"
                        >
                          آخر 3 أشهر
                        </button>
                        <button
                          onClick={() => setShowDatePicker(false)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
                        >
                          تطبيق
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowAddOrderModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة طلب
          </button>
        </div>

        {/* Selected Orders Actions */}
        {selectedOrderIds.length > 0 && (
          <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900">
                  {selectedOrderIds.length} طلب محدد
                </span>
              </div>
              <button
                onClick={() => setSelectedOrderIds([])}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                إلغاء التحديد
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تعيين جميع الطلبات المحددة إلى مندوب واحد:
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssignSelected(e.target.value)
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue=""
                  >
                    <option value="">اختر المندوب</option>
                    {couriers.map((courier) => (
                      <option key={courier.id} value={courier.id}>
                        {courier.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-3 border-t border-blue-200">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  أو قم بتعيين كل طلب إلى مندوب مختلف من خلال القائمة أدناه:
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Assign */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تعيين جميع الطلبات غير المعينة إلى مندوب:
              </label>
              <select
                value={selectedCourier}
                onChange={(e) => setSelectedCourier(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر المندوب</option>
                {couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleBulkAssign}
              disabled={assignLoading || !selectedCourier}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {assignLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              تعيين الكل
            </button>
          </div>
        </div>
      </div>

      {/* Add Order Modal */}
      {showAddOrderModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setShowAddOrderModal(false)
              setSearchQuery("")
              setAvailableOrders([])
            }}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl border border-gray-200 p-6 z-50 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">إضافة طلب</h3>
              <button
                onClick={() => {
                  setShowAddOrderModal(false)
                  setSearchQuery("")
                  setAvailableOrders([])
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البحث عن طلب (رقم الطلب، اسم العميل، أو رقم الهاتف):
                </label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchOrders(e.target.value)}
                    placeholder="ابحث..."
                    className="w-full border border-gray-300 rounded-lg px-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {loadingAvailableOrders && (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                </div>
              )}

              {availableOrders.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">#{order.order_id}</span>
                          <span className="text-sm text-gray-600">{order.customer_name}</span>
                        </div>
                        <p className="text-xs text-gray-500">{order.address}</p>
                        <p className="text-xs text-gray-500">{order.mobile_number}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAddOrder(order.id, "receive_piece")}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          استلام قطعه
                        </button>
                        <button
                          onClick={() => handleAddOrder(order.id, "exchange")}
                          className="px-3 py-1.5 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          تبديل
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !loadingAvailableOrders && availableOrders.length === 0 && (
                <p className="text-center text-gray-500 py-4">لا توجد نتائج</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* استلام قطعه - Blue */}
        <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-blue-900">استلام قطعه</h2>
              <p className="text-sm text-blue-700">{receivePieceOrders.length} طلب</p>
            </div>
          </div>

          <div className="space-y-3">
            {receivePieceOrders.length === 0 ? (
              <p className="text-blue-600 text-center py-8">لا توجد طلبات</p>
            ) : (
              <>
                {receivePieceOrders.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blue-200">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.length === receivePieceOrders.length && receivePieceOrders.length > 0}
                      onChange={() => toggleAllOrders(receivePieceOrders.map(o => o.id))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs text-blue-700 font-medium">
                      تحديد الكل ({receivePieceOrders.length})
                    </span>
                  </div>
                )}
                {receivePieceOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    color="blue"
                    couriers={couriers}
                    onUpdateStatus={handleUpdateStatus}
                    onAssignCourier={handleAssignCourier}
                    onViewDetails={async () => {
                      // Fetch full order details
                      const { data: fullOrder } = await supabase
                        .from("orders")
                        .select(`
                          id, order_id, shopify_order_id, shopify_order_name, customer_name, customer_email, customer_phone,
                          address, billing_address, shipping_address, billing_city, shipping_city, billing_country, shipping_country, mobile_number,
                          total_order_fees, subtotal_price, total_tax, total_discounts, total_shipping_price, currency,
                          payment_method, payment_status, financial_status, payment_gateway_names,
                          status, fulfillment_status, shipping_method, tracking_number, tracking_url,
                          line_items, product_images, order_note, customer_note, notes, order_tags,
                          shopify_created_at, shopify_cancelled_at, assigned_courier_id, original_courier_id, created_at, updated_at,
                          archived, archived_at, collected_by, payment_sub_type, delivery_fee, partial_paid_amount, internal_comment, shopify_raw_data, receive_piece_or_exchange
                        `)
                        .eq("id", order.id)
                        .single()
                      
                      if (fullOrder) {
                        setSelectedOrderForDetail(fullOrder)
                      }
                    }}
                    isSelected={selectedOrderIds.includes(order.id)}
                    onToggleSelect={() => toggleOrderSelection(order.id)}
                    showQuickAssign={selectedOrderIds.includes(order.id)}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* تبديل - Orange */}
        <div className="bg-orange-50 rounded-xl border-2 border-orange-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-orange-900">تبديل</h2>
              <p className="text-sm text-orange-700">{exchangeOrders.length} طلب</p>
            </div>
          </div>

          <div className="space-y-3">
            {exchangeOrders.length === 0 ? (
              <p className="text-orange-600 text-center py-8">لا توجد طلبات</p>
            ) : (
              <>
                {exchangeOrders.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-orange-200">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.length === exchangeOrders.length && exchangeOrders.length > 0}
                      onChange={() => toggleAllOrders(exchangeOrders.map(o => o.id))}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <span className="text-xs text-orange-700 font-medium">
                      تحديد الكل ({exchangeOrders.length})
                    </span>
                  </div>
                )}
                {exchangeOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    color="orange"
                    couriers={couriers}
                    onUpdateStatus={handleUpdateStatus}
                    onAssignCourier={handleAssignCourier}
                    onViewDetails={async () => {
                      // Fetch full order details
                      const { data: fullOrder } = await supabase
                        .from("orders")
                        .select(`
                          id, order_id, shopify_order_id, shopify_order_name, customer_name, customer_email, customer_phone,
                          address, billing_address, shipping_address, billing_city, shipping_city, billing_country, shipping_country, mobile_number,
                          total_order_fees, subtotal_price, total_tax, total_discounts, total_shipping_price, currency,
                          payment_method, payment_status, financial_status, payment_gateway_names,
                          status, fulfillment_status, shipping_method, tracking_number, tracking_url,
                          line_items, product_images, order_note, customer_note, notes, order_tags,
                          shopify_created_at, shopify_cancelled_at, assigned_courier_id, original_courier_id, created_at, updated_at,
                          archived, archived_at, collected_by, payment_sub_type, delivery_fee, partial_paid_amount, internal_comment, shopify_raw_data, receive_piece_or_exchange
                        `)
                        .eq("id", order.id)
                        .single()
                      
                      if (fullOrder) {
                        setSelectedOrderForDetail(fullOrder)
                      }
                    }}
                    isSelected={selectedOrderIds.includes(order.id)}
                    onToggleSelect={() => toggleOrderSelection(order.id)}
                    showQuickAssign={selectedOrderIds.includes(order.id)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrderForDetail && (
        <OrderDetailModal
          order={selectedOrderForDetail}
          onClose={() => setSelectedOrderForDetail(null)}
          onUpdate={async () => {
            // Re-fetch orders from database to get updated data
            await fetchOrders()
            
            // Re-fetch the selected order to update the modal
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
                archived, archived_at, collected_by, payment_sub_type, delivery_fee, partial_paid_amount, internal_comment, shopify_raw_data, receive_piece_or_exchange
              `)
              .eq('id', selectedOrderForDetail.id)
              .single()
            
            if (updatedOrder) {
              setSelectedOrderForDetail(updatedOrder)
            }
          }}
        />
      )}
    </div>
  )
}

interface OrderCardProps {
  order: Order
  color: "blue" | "orange"
  couriers: Courier[]
  onUpdateStatus: (orderId: string, status: "receive_piece" | "exchange" | null) => void
  onAssignCourier: (orderId: string, courierId: string | null) => void
  onViewDetails: () => void
  isSelected?: boolean
  onToggleSelect?: () => void
  showQuickAssign?: boolean
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  color,
  couriers,
  onUpdateStatus,
  onAssignCourier,
  onViewDetails,
  isSelected = false,
  onToggleSelect,
  showQuickAssign = false,
}) => {
  const [showActions, setShowActions] = useState(false)
  const [selectedCourier, setSelectedCourier] = useState<string>(order.assigned_courier_id || "")

  const colorClasses = {
    blue: {
      bg: "bg-blue-100",
      border: "border-blue-300",
      text: "text-blue-900",
      button: "bg-blue-600 hover:bg-blue-700",
    },
    orange: {
      bg: "bg-orange-100",
      border: "border-orange-300",
      text: "text-orange-900",
      button: "bg-orange-600 hover:bg-orange-700",
    },
  }

  const classes = colorClasses[color]

  return (
    <div className={`${classes.bg} ${classes.border} border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all ${
      isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
    }`}>
      <div 
        className="flex items-start justify-between mb-3"
        onClick={(e) => {
          // Don't open details if clicking on checkbox, settings button, or actions panel
          if ((e.target as HTMLElement).closest('button') || 
              (e.target as HTMLElement).closest('input[type="checkbox"]') ||
              (e.target as HTMLElement).closest('.actions-panel')) {
            return
          }
          onViewDetails()
        }}
      >
        <div className="flex items-start gap-2 flex-1">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation()
                onToggleSelect()
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 flex-shrink-0"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-bold ${classes.text}`}>#{order.order_id}</span>
              <span className="text-xs text-gray-600">{order.customer_name}</span>
            </div>
            <p className="text-sm text-gray-700 mb-1">{order.address}</p>
            <p className="text-xs text-gray-600">{order.mobile_number}</p>
            <p className={`text-sm font-semibold ${classes.text} mt-2`}>
              {order.total_order_fees.toFixed(2)} ج.م
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowActions(!showActions)
          }}
          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          title={showActions ? "إخفاء الإعدادات" : "إظهار الإعدادات"}
        >
          {showActions ? (
            <X className={`w-4 h-4 ${classes.text}`} />
          ) : (
            <Settings className={`w-4 h-4 ${classes.text}`} />
          )}
        </button>
      </div>

      {/* Courier Assignment - Show if selected or if already assigned */}
      {(isSelected || order.courier_name) && (
        <div className="mb-2 space-y-2">
          {order.courier_name && (
            <div className="flex items-center gap-2">
              <Truck className={`w-4 h-4 ${classes.text}`} />
              <span className="text-xs font-medium text-gray-700">{order.courier_name}</span>
            </div>
          )}
          {isSelected && showQuickAssign && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">تعيين إلى:</label>
              <select
                value={order.assigned_courier_id || ""}
                onChange={(e) => {
                  onAssignCourier(order.id, e.target.value || null)
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">اختر المندوب</option>
                {couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {showActions && (
        <div 
          className="mt-3 pt-3 border-t border-gray-300 space-y-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">تغيير الحالة:</label>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdateStatus(order.id, "receive_piece")
                  setShowActions(false)
                }}
                className={`flex-1 px-3 py-1.5 text-xs ${order.receive_piece_or_exchange === "receive_piece" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"} rounded-lg transition-colors`}
              >
                استلام قطعه
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdateStatus(order.id, "exchange")
                  setShowActions(false)
                }}
                className={`flex-1 px-3 py-1.5 text-xs ${order.receive_piece_or_exchange === "exchange" ? "bg-orange-600 text-white" : "bg-orange-100 text-orange-700"} rounded-lg transition-colors`}
              >
                تبديل
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">تعيين مندوب:</label>
            <select
              value={selectedCourier}
              onChange={(e) => {
                e.stopPropagation()
                setSelectedCourier(e.target.value)
                onAssignCourier(order.id, e.target.value || null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">لا يوجد</option>
              {couriers.map((courier) => (
                <option key={courier.id} value={courier.id}>
                  {courier.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onUpdateStatus(order.id, null)
              setShowActions(false)
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            إزالة من القائمة
          </button>
        </div>
      )}
    </div>
  )
}

export default ReceivePieceOrExchange

