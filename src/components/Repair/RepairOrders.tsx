"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"
import { useLanguage } from "../../contexts/LanguageContext"
import { Wrench, RefreshCw, Package, Phone, MapPin, CheckCircle, Clock, PlayCircle, CornerUpLeft } from "lucide-react"

type RepairStatus = "assigned" | "received" | "in_process" | "returned"

interface RepairOrder {
  id: string
  order_id: string | null
  shopify_order_name: string | null
  customer_name: string | null
  customer_phone: string | null
  mobile_number: string | null
  address: string | null
  shipping_address: string | null
  total_order_fees: number | null
  line_items: any
  product_images: any
  repair_status: RepairStatus | null
  repair_note: string | null
  repair_assigned_at: string | null
  repair_admin_received: boolean | null
  notes: string | null
  order_note: string | null
}

// Ordered flow of repair statuses.
const FLOW: RepairStatus[] = ["assigned", "received", "in_process", "returned"]

const RepairOrders: React.FC = () => {
  const { user } = useAuth()
  const { language } = useLanguage()
  const tl = (ar: string, en: string) => (language === "ar" ? ar : en)

  const [orders, setOrders] = useState<RepairOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | RepairStatus>("all")
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})

  const statusMeta: Record<RepairStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    assigned: { label: tl("مُسند", "Assigned"), color: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock },
    received: { label: tl("تم الاستلام", "Received"), color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle },
    in_process: { label: tl("قيد التصليح", "In process"), color: "bg-amber-100 text-amber-700 border-amber-200", icon: PlayCircle },
    returned: { label: tl("تم الإرجاع", "Returned"), color: "bg-green-100 text-green-700 border-green-200", icon: CornerUpLeft },
  }

  const fetchOrders = async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_id, shopify_order_name, customer_name, customer_phone, mobile_number, address, shipping_address, total_order_fees, line_items, product_images, repair_status, repair_note, repair_assigned_at, repair_admin_received, notes, order_note",
      )
      .eq("repair_assigned_to", user.id)
      .order("repair_assigned_at", { ascending: false })
      .limit(5000)

    if (error) {
      setError(tl("فشل تحميل الطلبات", "Failed to load orders"))
      setOrders([])
    } else {
      setOrders((data || []) as RepairOrder[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const updateStatus = async (order: RepairOrder, next: RepairStatus) => {
    const prev = order.repair_status
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, repair_status: next } : o)))
    const { error } = await supabase.from("orders").update({ repair_status: next }).eq("id", order.id)
    if (error) {
      // revert
      setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, repair_status: prev } : o)))
      alert(tl("فشل تحديث الحالة", "Failed to update status"))
    }
  }

  const saveNote = async (order: RepairOrder) => {
    const text = noteDraft[order.id] ?? order.repair_note ?? ""
    const { error } = await supabase.from("orders").update({ repair_note: text }).eq("id", order.id)
    if (error) {
      alert(tl("فشل حفظ الملاحظة", "Failed to save note"))
      return
    }
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, repair_note: text } : o)))
    setNoteDraft((d) => {
      const n = { ...d }
      delete n[order.id]
      return n
    })
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length, assigned: 0, received: 0, in_process: 0, returned: 0 }
    for (const o of orders) {
      const s = (o.repair_status || "assigned") as RepairStatus
      c[s] = (c[s] || 0) + 1
    }
    return c
  }, [orders])

  const visible = useMemo(
    () => (statusFilter === "all" ? orders : orders.filter((o) => (o.repair_status || "assigned") === statusFilter)),
    [orders, statusFilter],
  )

  const productCount = (o: RepairOrder): number => {
    if (Array.isArray(o.line_items)) return o.line_items.length
    return 0
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-5" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-3 mb-3 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Wrench className="w-5 h-5 text-purple-600" />
          </div>
          <div className="mr-auto">
            <h1 className="text-lg font-bold text-gray-900">{tl("طلبات التصليح", "Repair Orders")}</h1>
            <p className="text-xs text-gray-500">{tl("الطلبات المُسندة إليك للتصليح", "Orders assigned to you for repair")}</p>
          </div>
          <button
            onClick={fetchOrders}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            {tl("تحديث", "Refresh")}
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(["all", "assigned", "received", "in_process", "returned"] as const).map((key) => {
            const label = key === "all" ? tl("الكل", "All") : statusMeta[key].label
            const active = statusFilter === key
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  active ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label} <span className="font-semibold">{counts[key] || 0}</span>
              </button>
            )
          })}
        </div>

        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

        {loading ? (
          <div className="py-16 text-center text-gray-500">{tl("جارٍ التحميل...", "Loading...")}</div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-gray-500">{tl("لا توجد طلبات", "No orders")}</div>
        ) : (
          <div className="space-y-3">
            {visible.map((o) => {
              const current = (o.repair_status || "assigned") as RepairStatus
              const Meta = statusMeta[current]
              const StatusIcon = Meta.icon
              return (
                <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-purple-700">
                          #{o.order_id || o.shopify_order_name || o.id.slice(0, 8)}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${Meta.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {Meta.label}
                        </span>
                        {o.repair_admin_received && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {tl("استلمه الأدمن", "Admin received")}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 text-sm font-medium text-gray-900 truncate">
                        {o.customer_name || tl("عميل غير معروف", "Unknown customer")}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        {(o.customer_phone || o.mobile_number) && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            <span dir="ltr">{o.customer_phone || o.mobile_number}</span>
                          </span>
                        )}
                        {(o.address || o.shipping_address) && (
                          <span className="inline-flex items-center gap-1 max-w-[22rem] truncate">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{o.address || o.shipping_address}</span>
                          </span>
                        )}
                        {productCount(o) > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" />
                            {productCount(o)} {tl("منتج", "items")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status flow buttons */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {FLOW.map((s) => {
                      const active = current === s
                      const M = statusMeta[s]
                      return (
                        <button
                          key={s}
                          onClick={() => updateStatus(o, s)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                            active
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-purple-50"
                          }`}
                        >
                          {M.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Repair note */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={noteDraft[o.id] ?? o.repair_note ?? ""}
                      onChange={(e) => setNoteDraft((d) => ({ ...d, [o.id]: e.target.value }))}
                      placeholder={tl("ملاحظة التصليح (اختياري)...", "Repair note (optional)...")}
                      className="flex-1 min-w-[12rem] px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => saveNote(o)}
                      className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 text-white hover:bg-gray-900"
                    >
                      {tl("حفظ", "Save")}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default RepairOrders
