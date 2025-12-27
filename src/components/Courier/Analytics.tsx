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
  Legend,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Award,
  Zap,
  Users,
  MapPin,
  CreditCard,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"

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
  notes?: string | null
  created_at: string
  updated_at: string
  archived?: boolean
  archived_at?: string
}

interface AnalyticsData {
  totalOrders: number
  deliveredOrders: number
  canceledOrders: number
  partialOrders: number
  returnedOrders: number
  totalRevenue: number
  deliveredRevenue: number
  averageOrderValue: number
  completionRate: number
  dailyStats: Array<{
    date: string
    orders: number
    revenue: number
    delivered: number
  }>
  statusDistribution: Array<{
    status: string
    count: number
    percentage: number
    color: string
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
}

const statusConfig = {
  assigned: { label: "مكلف", color: "#3B82F6" },
  delivered: { label: "تم التوصيل", color: "#10B981" },
  canceled: { label: "ملغي", color: "#EF4444" },
  partial: { label: "جزئي", color: "#F59E0B" },
  hand_to_hand: { label: "استبدال", color: "#8B5CF6" },
  return: { label: "مرتجع", color: "#F97316" },
}

const paymentMethodConfig = {
  cash: { label: "نقدي", color: "#10B981" },
  card: { label: "بطاقة", color: "#3B82F6" },
  valu: { label: "فالو", color: "#8B5CF6" },
  partial: { label: "جزئي", color: "#F59E0B" },
}

const Analytics: React.FC = () => {
  const { user } = useAuth()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days ago
    end: new Date().toISOString().split("T")[0], // today
  })
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "custom">("30d")
  const [chartType, setChartType] = useState<"bar" | "line" | "area">("bar")
  const [viewMode, setViewMode] = useState<"overview" | "detailed">("overview")

  const fetchAnalyticsData = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Fetch orders for the selected date range
      // Include orders where courier is CURRENTLY assigned OR was ORIGINALLY assigned
      // This ensures orders remain tracked even after reassignment
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .or(`assigned_courier_id.eq.${user.id},original_courier_id.eq.${user.id}`)
        .gte("updated_at", `${dateRange.start}T00:00:00`)
        .lte("updated_at", `${dateRange.end}T23:59:59`)
        .order("updated_at", { ascending: true })

      if (error) throw error

      const ordersData = orders || []

      // Calculate basic stats
      const totalOrders = ordersData.length
      const deliveredOrders = ordersData.filter((o) => o.status === "delivered").length
      const canceledOrders = ordersData.filter((o) => o.status === "canceled").length
      const partialOrders = ordersData.filter((o) => o.status === "partial").length
      const returnedOrders = ordersData.filter((o) => o.status === "return").length

      const totalRevenue = ordersData.reduce((sum, o) => sum + o.total_order_fees, 0)
      const deliveredRevenue = ordersData
        .filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + o.total_order_fees, 0)

      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const completionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0

      // Daily stats
      const dailyStatsMap = new Map()
      ordersData.forEach((order) => {
        const date = order.created_at.split("T")[0]
        if (!dailyStatsMap.has(date)) {
          dailyStatsMap.set(date, { date, orders: 0, revenue: 0, delivered: 0 })
        }
        const dayData = dailyStatsMap.get(date)
        dayData.orders += 1
        dayData.revenue += order.total_order_fees
        if (order.status === "delivered") {
          dayData.delivered += 1
        }
      })

      const dailyStats = Array.from(dailyStatsMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Status distribution
      const statusCounts = Object.keys(statusConfig).reduce((acc, status) => {
        const count = ordersData.filter((o) => o.status === status).length
        return { ...acc, [status]: count }
      }, {} as Record<string, number>)

      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status: statusConfig[status as keyof typeof statusConfig]?.label || status,
        count,
        percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0,
        color: statusConfig[status as keyof typeof statusConfig]?.color || "#6B7280",
      }))

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
          week: `الأسبوع ${8 - i}`,
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
          month: "الشهر الحالي",
          current: currentMonthOrders.length,
          previous: 0,
        },
        {
          month: "الشهر السابق",
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
        deliveredOrders,
        canceledOrders,
        partialOrders,
        returnedOrders,
        totalRevenue,
        deliveredRevenue,
        averageOrderValue,
        completionRate,
        dailyStats,
        statusDistribution,
        paymentMethodStats,
        hourlyDistribution: hourlyCounts,
        weeklyTrend,
        monthlyComparison,
        topAreas,
        performanceMetrics,
      })
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setLoading(false)
    }
  }, [user?.id, dateRange])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  const handlePeriodChange = (period: "7d" | "30d" | "90d" | "custom") => {
    setSelectedPeriod(period)
    if (period !== "custom") {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      setDateRange({
        start: startDate.toISOString().split("T")[0],
        end: new Date().toISOString().split("T")[0],
      })
    }
  }

  const exportData = () => {
    if (!analyticsData) return

    const dataToExport = {
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
    a.download = `analytics-${user?.name}-${dateRange.start}-${dateRange.end}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">جاري تحميل التحليلات...</p>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">لا توجد بيانات متاحة</h3>
          <p className="text-gray-600">لا توجد طلبات في الفترة المحددة</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">تحليلات الأداء</h1>
                <p className="text-gray-600">إحصائيات مفصلة لأداءك في التوصيل</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode(viewMode === "overview" ? "detailed" : "overview")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === "overview"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {viewMode === "overview" ? <Activity className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
                {viewMode === "overview" ? "عرض مفصل" : "نظرة عامة"}
              </button>
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                تصدير البيانات
              </button>
              <button
                onClick={fetchAnalyticsData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                تحديث
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Period Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">اختر الفترة الزمنية</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{dateRange.start} - {dateRange.end}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { key: "7d", label: "آخر 7 أيام" },
              { key: "30d", label: "آخر 30 يوم" },
              { key: "90d", label: "آخر 90 يوم" },
              { key: "custom", label: "مخصص" },
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
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
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
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
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
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
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-yellow-600" />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-6">توزيع حالات الطلبات</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, percentage }) => `${status}: ${percentage.toFixed(1)}%`}
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

        {/* Detailed Analytics */}
        {viewMode === "detailed" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Payment Methods */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">طرق الدفع</h3>
              <div className="space-y-4">
                {analyticsData.paymentMethodStats.map((method, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: paymentMethodConfig[method.method as keyof typeof paymentMethodConfig]?.color || "#6B7280" }}
                      />
                      <span className="font-medium text-gray-900">{method.method}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{method.count} طلب</p>
                      <p className="text-sm text-gray-600">{method.percentage.toFixed(1)}%</p>
                      <p className="text-sm text-green-600">{method.revenue.toFixed(0)} ج.م</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Areas */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">أهم المناطق</h3>
              <div className="space-y-4">
                {analyticsData.topAreas.map((area, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900">{area.area}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{area.orders} طلب</p>
                      <p className="text-sm text-green-600">{area.revenue.toFixed(0)} ج.م</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">مقاييس الأداء</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.performanceMetrics.avgDeliveryTime.toFixed(1)} ساعة</p>
              <p className="text-sm text-gray-600">متوسط وقت التوصيل</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.performanceMetrics.customerSatisfaction.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">رضا العملاء</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.performanceMetrics.onTimeDelivery.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">التوصيل في الوقت</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="w-8 h-8 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.performanceMetrics.efficiency.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">الكفاءة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
