"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"
import { useLanguage } from "../../contexts/LanguageContext"
import {
  Wrench,
  RefreshCw,
  Package,
  Phone,
  MapPin,
  CheckCircle,
  Clock,
  PlayCircle,
  CornerUpLeft,
  ChevronDown,
  ChevronUp,
  Paperclip,
  MessageSquare,
  Play,
} from "lucide-react"

type RepairStatus = "assigned" | "received" | "in_process" | "returned"

interface RepairOrder {
  id: string
  order_id: string | null
  shopify_order_name: string | null
  customer_name: string | null
  customer_phone: string | null
  mobile_number: string | null
  address: string | null
  shipping_address: any
  total_order_fees: number | null
  line_items: any
  product_images: any
  repair_status: RepairStatus | null
  repair_note: string | null
  repair_item: any
  repair_request: any
  repair_assigned_at: string | null
  repair_admin_received: boolean | null
  notes: string | null
  order_note: string | null
}

// Ordered flow of repair statuses.
const FLOW: RepairStatus[] = ["assigned", "received", "in_process", "returned"]

const parseItems = (raw: any): any[] => {
  if (!raw) return []
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
const imgSrc = (x: any): string | null => {
  if (!x) return null
  if (typeof x === "string") return x
  return x.image || x.src || x.url || x.image_url || null
}
const itemQty = (it: any): number => Number(it?.quantity ?? it?.current_quantity ?? it?.qty ?? 1) || 1
const itemVariant = (it: any): string | null =>
  it?.variant_title && it.variant_title !== "Default Title" ? it.variant_title : null

const pad = (n: number) => String(n).padStart(2, "0")
const dayKey = (iso: string | null): string => {
  if (!iso) return ""
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const todayKey = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const yesterdayKey = (): string => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const RepairOrders: React.FC = () => {
  const { user } = useAuth()
  const { language } = useLanguage()
  const tl = (ar: string, en: string) => (language === "ar" ? ar : en)

  const [orders, setOrders] = useState<RepairOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | RepairStatus>("all")
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Date filter — defaults to TODAY (by repair assignment date).
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "all" | "custom">("today")
  const [customDate, setCustomDate] = useState<string>(todayKey())

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
        "id, order_id, shopify_order_name, customer_name, customer_phone, mobile_number, address, shipping_address, total_order_fees, line_items, product_images, repair_status, repair_note, repair_item, repair_request, repair_assigned_at, repair_admin_received, notes, order_note",
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

  const toggleExpand = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  // Apply the date filter first, then status.
  const dateFiltered = useMemo(() => {
    if (datePreset === "all") return orders
    const target = datePreset === "today" ? todayKey() : datePreset === "yesterday" ? yesterdayKey() : customDate
    if (!target) return orders
    return orders.filter((o) => dayKey(o.repair_assigned_at) === target)
  }, [orders, datePreset, customDate])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: dateFiltered.length, assigned: 0, received: 0, in_process: 0, returned: 0 }
    for (const o of dateFiltered) {
      const s = (o.repair_status || "assigned") as RepairStatus
      c[s] = (c[s] || 0) + 1
    }
    return c
  }, [dateFiltered])

  const visible = useMemo(
    () => (statusFilter === "all" ? dateFiltered : dateFiltered.filter((o) => (o.repair_status || "assigned") === statusFilter)),
    [dateFiltered, statusFilter],
  )

  const productCount = (o: RepairOrder): number => (Array.isArray(o.line_items) ? o.line_items.length : parseItems(o.line_items).length)

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

        {/* Date filter (default today) */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {(["today", "yesterday", "all", "custom"] as const).map((p) => {
            const label =
              p === "today" ? tl("اليوم", "Today") : p === "yesterday" ? tl("أمس", "Yesterday") : p === "all" ? tl("الكل", "All") : tl("تاريخ محدد", "Pick date")
            const active = datePreset === p
            return (
              <button
                key={p}
                onClick={() => setDatePreset(p)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  active ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            )
          })}
          {datePreset === "custom" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
            />
          )}
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
              const items = parseItems(o.line_items)
              const images = parseItems(o.product_images)
              const imgByPid = new Map<string, string>()
              for (const im of images) {
                const u = imgSrc(im)
                if (u && im?.product_id) imgByPid.set(String(im.product_id), u)
              }
              const looseImgs = images.map(imgSrc).filter(Boolean) as string[]
              const repItem = o.repair_item || null
              const repReq = o.repair_request || null
              const reqNotes: any[] = Array.isArray(repReq?.notes) ? repReq.notes : []
              const hasReqMedia = !!(repReq && (repReq.comment || repReq.image_url || repReq.video_url || reqNotes.length > 0))
              const isOpen = expanded.has(o.id)
              const addr =
                o.address ||
                (typeof o.shipping_address === "string" ? o.shipping_address : o.shipping_address ? JSON.stringify(o.shipping_address) : "")

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
                        {hasReqMedia && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                            <Paperclip className="w-3.5 h-3.5" />
                            {tl("ملاحظة/مرفقات العميل", "Customer note / media")}
                          </span>
                        )}
                      </div>

                      {/* What to repair: a single item, or the whole order */}
                      <div className="mt-1.5">
                        {repItem ? (
                          <span className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200">
                            <Wrench className="w-3.5 h-3.5" />
                            {tl("المنتج للتصليح:", "Item to repair:")}{" "}
                            <span className="font-semibold">
                              {repItem.title || tl("منتج", "Product")}
                              {repItem.variant_title ? ` - ${repItem.variant_title}` : ""}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            {tl("الطلب كامل", "Whole order")}
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
                        {addr && (
                          <span className="inline-flex items-center gap-1 max-w-[22rem] truncate">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{addr}</span>
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

                    <button
                      onClick={() => toggleExpand(o.id)}
                      className="inline-flex items-center gap-1 text-sm text-purple-700 hover:text-purple-900"
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {isOpen ? tl("إخفاء التفاصيل", "Hide details") : tl("عرض التفاصيل", "View details")}
                    </button>
                  </div>

                  {/* Details */}
                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                      {typeof o.total_order_fees === "number" && (
                        <div className="text-sm text-gray-700">
                          {tl("الإجمالي", "Total")}: <span className="font-semibold">{o.total_order_fees}</span> {tl("ج.م", "EGP")}
                        </div>
                      )}

                      {(o.notes || o.order_note) && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium text-gray-700">{tl("ملاحظات الطلب:", "Order notes:")}</span> {o.notes || o.order_note}
                        </div>
                      )}

                      {/* Customer request (note / photos / video) */}
                      {hasReqMedia && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                          <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2 text-sm">
                            <MessageSquare className="w-4 h-4" /> {tl("طلب العميل", "Customer request")}
                          </div>
                          {repReq.comment && <div className="text-sm text-gray-800 whitespace-pre-wrap mb-2">{repReq.comment}</div>}
                          {(repReq.image_url || repReq.video_url) && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {repReq.image_url && (
                                <a href={repReq.image_url} target="_blank" rel="noreferrer" className="block">
                                  <img
                                    src={repReq.image_url}
                                    alt=""
                                    className="w-24 h-24 object-cover rounded border hover:brightness-95 cursor-zoom-in"
                                    onError={(e) => (e.currentTarget.style.display = "none")}
                                  />
                                </a>
                              )}
                              {repReq.video_url && (
                                <a
                                  href={repReq.video_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-24 h-24 rounded border bg-gray-900/80 text-white flex flex-col items-center justify-center gap-1 hover:bg-gray-900"
                                >
                                  <Play className="w-6 h-6" />
                                  <span className="text-[10px]">{tl("فيديو", "Video")}</span>
                                </a>
                              )}
                            </div>
                          )}
                          {reqNotes.length > 0 && (
                            <div className="space-y-1.5">
                              {reqNotes.map((n: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-xs bg-white rounded border border-amber-100 px-2 py-1.5">
                                  {n.image_url && (
                                    <a href={n.image_url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                                      <img
                                        src={n.image_url}
                                        alt=""
                                        className="w-10 h-10 object-cover rounded border hover:brightness-95 cursor-zoom-in"
                                        onError={(e) => (e.currentTarget.style.display = "none")}
                                      />
                                    </a>
                                  )}
                                  <div className="min-w-0">
                                    {n.note && <div className="text-gray-800">{n.note}</div>}
                                    {n.author && <div className="text-[10px] text-gray-400">{tl("بواسطة:", "By:")} {n.author}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Products */}
                      {(items.length > 0 || looseImgs.length > 0) && (
                        <div>
                          <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2 text-sm">
                            <Package className="w-4 h-4 text-gray-400" /> {tl("المنتجات", "Products")}
                          </div>
                          {items.length > 0 ? (
                            <div className="space-y-1.5">
                              {items.map((it: any, i: number) => {
                                const url = imgByPid.get(String(it.product_id)) || looseImgs[i] || null
                                const qty = itemQty(it)
                                const price = parseFloat(it.price) || 0
                                const variant = itemVariant(it)
                                const isRepairItem =
                                  repItem &&
                                  ((typeof repItem.index === "number" && repItem.index === i) ||
                                    (repItem.title && (it.title || it.name) && repItem.title === (it.title || it.name)))
                                return (
                                  <div
                                    key={i}
                                    className={`flex items-start gap-2.5 text-xs rounded-lg px-2.5 py-2 border ${
                                      isRepairItem ? "bg-purple-50 border-purple-300 ring-1 ring-purple-200" : "bg-gray-50 border-transparent"
                                    }`}
                                  >
                                    {url ? (
                                      <a href={url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                                        <img
                                          src={url}
                                          alt=""
                                          className="w-14 h-14 object-cover rounded border hover:brightness-95 cursor-zoom-in"
                                          onError={(e) => (e.currentTarget.style.display = "none")}
                                        />
                                      </a>
                                    ) : (
                                      <div className="w-14 h-14 rounded border bg-gray-100 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-900 leading-snug">
                                        {it.title || it.name || tl("منتج", "Product")}
                                        {isRepairItem && (
                                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-600 text-white">
                                            <Wrench className="w-3 h-3" />
                                            {tl("للتصليح", "To repair")}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                        {variant && (
                                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-medium">
                                            {variant}
                                          </span>
                                        )}
                                        {it.sku && (
                                          <span dir="ltr" className="text-[10px] text-gray-400">
                                            SKU: {it.sku}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0 text-left">
                                      <div className="text-gray-500">× {qty}</div>
                                      <div className="font-semibold text-gray-900 whitespace-nowrap">
                                        {price.toLocaleString("en-US")} {tl("ج.م", "EGP")}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              {looseImgs.slice(0, 8).map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt="" className="w-16 h-16 object-cover rounded border hover:brightness-95 cursor-zoom-in" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

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
                            active ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 border-gray-200 hover:bg-purple-50"
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
