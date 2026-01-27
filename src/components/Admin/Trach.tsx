"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  CircleDot,
  Clock,
  CreditCard,
  Filter,
  Loader2,
  MapPin,
  Monitor,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"
import { useLanguage } from "../../contexts/LanguageContext"
import OrderDetailModal from "./OrderDetailModal"

type PaymentKind =
  | "cash"
  | "paymob"
  | "valu"
  | "visa_machine"
  | "instapay"
  | "wallet"
  | "on_hand"
  | "other"

interface Courier {
  id: string
  name: string
  email?: string | null
}

interface Order {
  id: string
  order_id: string
  customer_name?: string | null
  address?: string | null
  mobile_number?: string | null
  status: string
  payment_method?: string | null
  payment_status?: string | null
  payment_sub_type?: string | null
  collected_by?: string | null
  total_order_fees?: number | string | null
  delivery_fee?: number | string | null
  assigned_courier_id?: string | null
  assigned_courier?: Courier | null
  assigned_at?: string | null
  updated_at?: string | null
  created_at?: string | null
  courier_name?: string | null
}

const normalizePayment = (
  method?: string | null,
  collectedBy?: string | null,
  subType?: string | null,
): PaymentKind => {
  const raw = (subType || collectedBy || method || "").toLowerCase().trim()
  if (!raw) return "cash"
  if (raw.includes("valu")) return "valu"
  if (raw === "visa_machine" || raw.includes("visa")) return "visa_machine"
  if (raw.includes("instapay")) return "instapay"
  if (raw.includes("wallet")) return "wallet"
  if (raw.includes("hand") || raw.includes("car") || raw.includes("emad")) return "on_hand"
  if (raw.includes("paymob") || raw.includes("card") || raw.includes("credit")) return "paymob"
  if (raw === "cod" || raw.includes("cash")) return "cash"
  return "other"
}

const paymentLabels: Record<PaymentKind, string> = {
  cash: "Cash",
  paymob: "Paymob / Card",
  valu: "ValU",
  visa_machine: "Visa Machine",
  instapay: "InstaPay",
  wallet: "Wallet",
  on_hand: "On Hand",
  other: "Other",
}

const formatCurrency = (value?: number | string | null) => {
  const numeric = Number(value || 0)
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(numeric)
}

const renderStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    delivered: "bg-green-100 text-green-700 border-green-200",
    return: "bg-orange-100 text-orange-700 border-orange-200",
    partial: "bg-blue-100 text-blue-700 border-blue-200",
    canceled: "bg-red-100 text-red-700 border-red-200",
    assigned: "bg-purple-100 text-purple-700 border-purple-200",
  }
  const style = styles[status] || "bg-gray-100 text-gray-700 border-gray-200"
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${style}`}>
      {status || "N/A"}
    </span>
  )
}

const buildDateRangeIso = (start: string, end: string) => {
  const startDate = new Date(`${start}T00:00:00`)
  const endDateInclusive = new Date(`${end}T23:59:59.999`)
  const endExclusive = new Date(endDateInclusive.getTime() + 1)
  return { startIso: startDate.toISOString(), endIso: endExclusive.toISOString() }
}

const Trach: React.FC = () => {
  const { user } = useAuth()
  const { language } = useLanguage()

  const today = new Date()
  const defaultEnd = today.toISOString().split("T")[0]
  const defaultStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [orders, setOrders] = useState<Order[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [liveTick, setLiveTick] = useState(Date.now())
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [quickOrder, setQuickOrder] = useState<Order | null>(null)
  const [filters, setFilters] = useState({
    start: defaultStart,
    end: defaultEnd,
    status: "all",
    payment: "all",
    courier: "all",
    query: "",
  })

  const fetchCouriers = useCallback(async () => {
    const { data, error } = await supabase.from("users").select("id, name, email").eq("role", "courier")
    if (!error) setCouriers(data || [])
  }, [])

  const fetchOrders = useCallback(async () => {
    if (!user || user.role !== "admin") return
    setLoading(true)
    try {
      const { startIso, endIso } = buildDateRangeIso(filters.start, filters.end)
      let query = supabase
        .from("orders")
        .select(
          `
          id, order_id, customer_name, address, mobile_number, status, payment_method, payment_status,
          payment_sub_type, collected_by, total_order_fees, delivery_fee, assigned_courier_id, assigned_at,
          updated_at, created_at,
          assigned_courier:users!orders_assigned_courier_id_fkey(id, name, email)
        `,
        )

      // When a courier is selected, only show orders assigned to that courier within the chosen day/range.
      if (filters.courier !== "all") {
        query = query
          .eq("assigned_courier_id", filters.courier)
          .gte("assigned_at", startIso)
          .lt("assigned_at", endIso)
      } else {
        query = query.or(
          `and(created_at.gte.${startIso},created_at.lt.${endIso}),` +
            `and(updated_at.gte.${startIso},updated_at.lt.${endIso}),` +
            `and(assigned_at.gte.${startIso},assigned_at.lt.${endIso})`,
        )
      }

      const { data, error } = await query.order("updated_at", { ascending: false })

      if (error) throw error

      const mapped = (data || []).map((o: any) => ({
        ...o,
        courier_name: o.assigned_courier?.name ?? null,
      }))
      setOrders(mapped)
    } catch (err) {
      console.error("Error loading tracking data:", err)
    } finally {
      setLoading(false)
    }
  }, [filters.end, filters.start, user])

  useEffect(() => {
    fetchCouriers()
  }, [fetchCouriers])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    const channel = supabase
      .channel("trach-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        setLiveTick(Date.now())
        fetchOrders()
      })
      .subscribe()

    return () => {
      channel.unsubscribe().catch(console.error)
    }
  }, [fetchOrders])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filters.status !== "all" && order.status !== filters.status) return false
      if (filters.payment !== "all") {
        const normalized = normalizePayment(order.payment_method, order.collected_by, order.payment_sub_type)
        if (normalized !== filters.payment) return false
      }
      if (filters.courier !== "all" && order.assigned_courier_id !== filters.courier) return false
      if (filters.query.trim()) {
        const q = filters.query.toLowerCase()
        const haystack = [
          order.order_id,
          order.customer_name,
          order.address,
          order.mobile_number,
          order.courier_name,
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
        if (!haystack.some((item) => item.includes(q))) return false
      }
      return true
    })
  }, [filters.courier, filters.payment, filters.query, filters.status, orders])

  const totals = useMemo(() => {
    const delivered = filteredOrders.filter((o) => o.status === "delivered").length
    const returns = filteredOrders.filter((o) => o.status === "return").length
    const partial = filteredOrders.filter((o) => o.status === "partial").length
    const totalValue = filteredOrders.reduce((acc, o) => acc + Number(o.total_order_fees || 0), 0)
    return {
      total: filteredOrders.length,
      delivered,
      returns,
      partial,
      totalValue,
    }
  }, [filteredOrders])

  const paymentBreakdown = useMemo(() => {
    const counts: Record<PaymentKind, number> = {
      cash: 0,
      paymob: 0,
      valu: 0,
      visa_machine: 0,
      instapay: 0,
      wallet: 0,
      on_hand: 0,
      other: 0,
    }
    filteredOrders.forEach((order) => {
      const key = normalizePayment(order.payment_method, order.collected_by, order.payment_sub_type)
      counts[key] += 1
    })
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
    return { counts, total }
  }, [filteredOrders])

  const handleSelectPayment = (value: string) => {
    setFilters((prev) => ({ ...prev, payment: value }))
  }

  const courierLeaderboard = useMemo(() => {
    const map = new Map<
      string,
      {
        courier: Courier | null
        count: number
        delivered: number
        value: number
      }
    >()

    filteredOrders.forEach((order) => {
      const key = order.assigned_courier_id || "unassigned"
      const entry =
        map.get(key) ||
        {
          courier:
            couriers.find((c) => c.id === order.assigned_courier_id) || order.assigned_courier || null,
          count: 0,
          delivered: 0,
          value: 0,
        }
      entry.count += 1
      if (order.status === "delivered") entry.delivered += 1
      entry.value += Number(order.total_order_fees || 0)
      map.set(key, entry)
    })

    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [couriers, filteredOrders])

  const statusOptions = [
    { value: "all", label: "All statuses" },
    { value: "assigned", label: "Assigned" },
    { value: "delivered", label: "Delivered" },
    { value: "partial", label: "Partial" },
    { value: "return", label: "Return" },
    { value: "canceled", label: "Canceled" },
  ]

  const paymentOptions = [
    { value: "all", label: "All payments" },
    ...Object.entries(paymentLabels).map(([value, label]) => ({ value, label })),
  ]

  const formatDate = (value?: string | null) => {
    if (!value) return "N/A"
    try {
      return new Date(value).toLocaleString(language === "ar" ? "ar-EG" : "en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return value
    }
  }

  // Always use LTR layout regardless of language (keep everything on the left)
  const isRTL = false

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-white/80 backdrop-blur shadow-lg rounded-2xl border border-slate-100 p-6 flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-semibold border border-emerald-100">
                <CircleDot className="w-4 h-4 animate-pulse" />
                Live feed updated
                <span className="text-xs text-emerald-500">{formatDate(new Date(liveTick).toISOString())}</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 mt-3 flex items-center gap-2">
                <Monitor className="w-7 h-7 text-blue-600" />
                Trach – Admin Tracking Board
              </h1>
              <p className="text-slate-600 mt-1">
                Track every assigned order in real time, see courier performance, and drill into payments instantly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchOrders}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh now
              </button>
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                <Calendar className="w-4 h-4" />
                <span className="font-semibold">{filters.start}</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{filters.end}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                title: "Orders in view",
                value: totals.total,
                icon: ClipboardIcon,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                title: "Delivered",
                value: totals.delivered,
                icon: CheckCircle2,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                title: "Partial / Return",
                value: totals.partial + totals.returns,
                icon: Activity,
                color: "text-orange-600",
                bg: "bg-orange-50",
              },
              {
                title: "Total value",
                value: formatCurrency(totals.totalValue),
                icon: Wallet,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="p-4 rounded-xl border border-slate-100 shadow-sm bg-gradient-to-br from-white to-slate-50 flex items-center gap-3"
              >
                <div className={`w-11 h-11 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{card.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/90 rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Filter className="w-4 h-4" />
            Refine view
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Date from</label>
              <input
                type="date"
                value={filters.start}
                max={filters.end}
                onChange={(e) => setFilters((prev) => ({ ...prev, start: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Date to</label>
              <input
                type="date"
                value={filters.end}
                min={filters.start}
                onChange={(e) => setFilters((prev) => ({ ...prev, end: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Payment</label>
              <select
                value={filters.payment}
                onChange={(e) => setFilters((prev) => ({ ...prev, payment: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none"
              >
                {paymentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Courier</label>
              <select
                value={filters.courier}
                onChange={(e) => setFilters((prev) => ({ ...prev, courier: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none"
              >
                <option value="all">All couriers</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-slate-500">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Order ID, customer, phone, address, courier..."
                  value={filters.query}
                  onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 bg-slate-50 focus:bg-white focus:border-blue-400 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/90 rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <BarChart3 className="w-4 h-4" />
                Payment methods
              </div>
              <span className="text-xs text-slate-500">{paymentBreakdown.total} orders</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(paymentLabels).map(([key, label]) => {
                const count = paymentBreakdown.counts[key as PaymentKind] || 0
                const pct = Math.round((count / paymentBreakdown.total) * 100)
                const isActive = filters.payment === key
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectPayment(key)}
                    className={`border rounded-xl p-3 text-left transition shadow-sm ${
                      isActive
                        ? "border-blue-200 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-100 bg-white hover:border-blue-100 hover:bg-blue-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-800">{label}</span>
                      <span className="text-xs text-slate-500">{pct}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${count ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-slate-200"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm font-semibold text-slate-800">{count}</div>
                    </div>
                    {isActive && <div className="mt-2 text-xs text-blue-600 font-semibold">Showing {label} orders</div>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 via-white to-blue-50 rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <TrendingUp className="w-4 h-4" />
              Performance glance
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Delivery success</p>
                  <p className="text-lg font-bold text-slate-900">
                    {totals.total ? Math.round((totals.delivered / totals.total) * 100) : 0}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Returns & partial</p>
                  <p className="text-lg font-bold text-slate-900">{totals.partial + totals.returns}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Value in view</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(totals.totalValue)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/90 rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <Users className="w-4 h-4" />
              Couriers leaderboard
            </div>
            <div className="text-xs text-slate-500">Click any card to filter by courier</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courierLeaderboard.length === 0 && (
              <div className="col-span-full text-center text-slate-500 py-6 border border-dashed border-slate-200 rounded-xl">
                No orders in the selected range.
              </div>
            )}
            {courierLeaderboard.map((entry) => (
              <button
                key={entry.courier?.id || "unassigned"}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    courier: entry.courier?.id || "unassigned",
                  }))
                }
                className="text-left border border-slate-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-md transition bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-slate-500">Courier</p>
                    <p className="text-lg font-bold text-slate-900">
                      {entry.courier?.name || "Unassigned"}
                    </p>
                    {entry.courier?.email && <p className="text-xs text-slate-500">{entry.courier.email}</p>}
                  </div>
                  <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
                    {entry.count} orders
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Delivered</p>
                    <p className="text-base font-semibold text-emerald-700">{entry.delivered}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Value</p>
                    <p className="text-base font-semibold text-slate-800">{formatCurrency(entry.value)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/95 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <ShoppingBag className="w-4 h-4" />
              Live orders
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-4 h-4" />
              Updated automatically
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {["Order", "Customer", "Courier", "Payment", "Status", "Value", "Updated", "Action"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={8} className="py-8">
                      <div className="flex items-center justify-center gap-3 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading live data...
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8">
                      <div className="text-center text-slate-500">No orders match the current filters.</div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredOrders.map((order) => {
                    const payment = normalizePayment(order.payment_method, order.collected_by, order.payment_sub_type)
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50 transition cursor-pointer"
                        onClick={() => setQuickOrder({ ...order, courier_name: order.courier_name })}
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{order.order_id}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <div className="font-medium">{order.customer_name || "Unknown"}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {order.address || "No address"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {order.courier_name || order.assigned_courier?.name || "Unassigned"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-indigo-500" />
                            <span>{paymentLabels[payment]}</span>
                          </div>
                          {order.payment_status && (
                            <span className="text-xs text-slate-500">Status: {order.payment_status}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{renderStatusBadge(order.status)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                          {formatCurrency(order.total_order_fees || order.delivery_fee)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(order.updated_at || order.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 hover:bg-blue-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedOrder({ ...order, courier_name: order.courier_name })
                            }}
                          >
                            View
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <OrderDetailModal
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        onUpdate={async () => {
          await fetchOrders()
          if (selectedOrder) {
            const { data } = await supabase
              .from('orders')
              .select('*')
              .eq('id', selectedOrder.id)
              .single()
            if (data) {
              setSelectedOrder(data as any)
            }
          }
        }} 
      />
      <QuickOrderCard order={quickOrder} onClose={() => setQuickOrder(null)} onDetails={(ord) => setSelectedOrder(ord)} />
    </div>
  )
}

const QuickOrderCard: React.FC<{
  order: Order | null
  onClose: () => void
  onDetails: (order: Order) => void
}> = ({ order, onClose, onDetails }) => {
  if (!order) return null
  const safeCurrency = formatCurrency(order.total_order_fees || order.delivery_fee)
  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md drop-shadow-2xl">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Order</p>
            <p className="text-lg font-bold text-slate-900">#{order.order_id}</p>
            <p className="text-sm text-slate-600">{order.customer_name || "Customer"}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-500" />
            <span>{order.courier_name || "Unassigned"}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-500" />
            <span>{paymentLabels[normalizePayment(order.payment_method, order.collected_by, order.payment_sub_type)]}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span className="line-clamp-2">{order.address || "No address"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Updated</span>
            <span className="text-xs font-semibold text-slate-800">
              {order.updated_at ? new Date(order.updated_at).toLocaleString() : "N/A"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {renderStatusBadge(order.status)}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Value</p>
            <p className="text-base font-bold text-slate-900">{safeCurrency}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => onDetails(order)}
          >
            Full details
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

const ClipboardIcon: React.FC<{ className?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
    <rect x="9" y="2" width="6" height="4" rx="1" ry="1" />
    <path d="M9 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4" />
  </svg>
)

export default Trach

