"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import {
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  Circle,
  Search,
  X,
  Phone,
  MapPin,
  Package,
  User as UserIcon,
  Warehouse,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"

// The five return categories the warehouse handles.
type CatKey = "return" | "canceled" | "hand_to_hand" | "exchange" | "receive_piece"
interface Cat {
  key: CatKey
  label: string
  chip: string
}
const CATEGORIES: Cat[] = [
  { key: "return", label: "مرتجع", chip: "bg-orange-100 text-orange-800 border-orange-300" },
  { key: "canceled", label: "ملغي", chip: "bg-red-100 text-red-800 border-red-300" },
  { key: "hand_to_hand", label: "يد بيد", chip: "bg-purple-100 text-purple-800 border-purple-300" },
  { key: "exchange", label: "تبديل", chip: "bg-blue-100 text-blue-800 border-blue-300" },
  { key: "receive_piece", label: "استلام قطعة", chip: "bg-teal-100 text-teal-800 border-teal-300" },
]
const CAT_BY_KEY: Record<CatKey, Cat> = CATEGORIES.reduce((a, c) => ({ ...a, [c.key]: c }), {} as any)

// Decide which single category an order belongs to (priority order).
const categoryOf = (o: any): CatKey | "other" => {
  if (o.receive_piece_or_exchange === "exchange") return "exchange"
  if (o.receive_piece_or_exchange === "receive_piece" || o.status === "receiving_part") return "receive_piece"
  if (o.status === "hand_to_hand") return "hand_to_hand"
  if (o.status === "canceled") return "canceled"
  if (o.status === "return") return "return"
  return "other"
}

const parseItems = (raw: any): any[] => {
  if (!raw) return []
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

interface Order {
  id: string
  order_id: string
  shopify_order_name?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  mobile_number?: string | null
  address?: string | null
  shipping_address?: any
  total_order_fees?: number | null
  status: string
  assigned_courier_id?: string | null
  receive_piece_or_exchange?: string | null
  line_items?: any
  product_images?: any
  notes?: string | null
  order_note?: string | null
  warehouse_received?: boolean | null
  warehouse_received_at?: string | null
  warehouse_received_by?: string | null
  created_at?: string | null
}

const WarehouseReturns: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [couriers, setCouriers] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState<CatKey | "all">("all")
  const [receivedFilter, setReceivedFilter] = useState<"all" | "received" | "pending">("all")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<Order | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: us } = await supabase.from("users").select("id, name").eq("role", "courier")
      setCouriers(new Map((us || []).map((u: any) => [String(u.id), u.name || "—"])))

      // Lean list query — the heavy line_items/product_images are fetched only
      // when a detail modal is opened.
      const { data, error: err } = await supabase
        .from("orders")
        .select(
          "id, order_id, shopify_order_name, customer_name, customer_phone, mobile_number, address, shipping_address, total_order_fees, status, assigned_courier_id, receive_piece_or_exchange, notes, order_note, warehouse_received, warehouse_received_at, warehouse_received_by, created_at",
        )
        .or(
          "status.in.(return,canceled,hand_to_hand,receiving_part),receive_piece_or_exchange.in.(receive_piece,exchange)",
        )
        .not("assigned_courier_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(20000)
      if (err) throw err
      setOrders((data || []) as Order[])
    } catch (e: any) {
      setError(e?.message || "فشل تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const matchesFilters = (o: Order): boolean => {
    const cat = categoryOf(o)
    if (cat === "other") return false
    if (catFilter !== "all" && cat !== catFilter) return false
    if (receivedFilter === "received" && !o.warehouse_received) return false
    if (receivedFilter === "pending" && o.warehouse_received) return false
    const q = search.trim().toLowerCase()
    if (q) {
      const hay = [o.order_id, o.shopify_order_name, o.customer_name, o.customer_phone, o.mobile_number, o.address]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }

  // Group filtered orders by courier
  const byCourier = useMemo(() => {
    const map = new Map<string, Order[]>()
    for (const o of orders) {
      if (!matchesFilters(o)) continue
      const cid = String(o.assigned_courier_id)
      if (!map.has(cid)) map.set(cid, [])
      map.get(cid)!.push(o)
    }
    return Array.from(map.entries()).sort((a, b) =>
      (couriers.get(a[0]) || "").localeCompare(couriers.get(b[0]) || ""),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, couriers, search, catFilter, receivedFilter])

  const totals = useMemo(() => {
    let total = 0
    let received = 0
    for (const o of orders) {
      if (categoryOf(o) === "other") continue
      total++
      if (o.warehouse_received) received++
    }
    return { total, received }
  }, [orders])

  const toggleReceived = async (o: Order) => {
    const next = !o.warehouse_received
    setSavingId(o.id)
    // optimistic
    setOrders((prev) =>
      prev.map((x) =>
        x.id === o.id
          ? {
              ...x,
              warehouse_received: next,
              warehouse_received_at: next ? new Date().toISOString() : null,
              warehouse_received_by: next ? user?.name || user?.email || "warehouse" : null,
            }
          : x,
      ),
    )
    try {
      const { error: err } = await supabase
        .from("orders")
        .update({
          warehouse_received: next,
          warehouse_received_at: next ? new Date().toISOString() : null,
          warehouse_received_by: next ? user?.name || user?.email || "warehouse" : null,
        })
        .eq("id", o.id)
      if (err) throw err
    } catch (e: any) {
      // revert on failure
      setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, warehouse_received: o.warehouse_received } : x)))
      setError("تعذّر حفظ الاستلام: " + (e?.message || ""))
    } finally {
      setSavingId(null)
    }
  }

  const toggleExpand = (cid: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(cid) ? next.delete(cid) : next.add(cid)
      return next
    })

  return (
    <div className="p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-sm">
            <Warehouse className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">المرتجعات — المخزن</h1>
            <p className="text-sm text-gray-600">مرتجع · ملغي · يد بيد · تبديل · استلام قطعة — لكل مندوب</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <span className="font-bold text-emerald-700">{totals.received}</span>
            <span className="text-gray-400"> / {totals.total} تم استلامه</span>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCatFilter("all")}
          className={`text-xs px-3 py-1 rounded-full border ${catFilter === "all" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
        >
          الكل
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCatFilter(c.key)}
            className={`text-xs px-3 py-1 rounded-full border ${catFilter === c.key ? c.chip + " ring-2 ring-offset-1 ring-gray-400 font-semibold" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
          >
            {c.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-gray-300" />
        {(["all", "pending", "received"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setReceivedFilter(r)}
            className={`text-xs px-3 py-1 rounded-full border ${receivedFilter === r ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
          >
            {r === "all" ? "الحالة: الكل" : r === "pending" ? "لم يُستلم" : "تم الاستلام"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute top-2.5 right-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف..."
          className="w-full pr-9 pl-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute top-2.5 left-2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      {loading && <div className="p-6 text-center text-sm text-gray-500">جاري التحميل...</div>}

      {!loading && byCourier.length === 0 && (
        <div className="p-6 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
          لا توجد طلبات مطابقة
        </div>
      )}

      {/* Couriers */}
      <div className="space-y-3">
        {byCourier.map(([cid, list]) => {
          const open = expanded.has(cid)
          const received = list.filter((o) => o.warehouse_received).length
          return (
            <div key={cid} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleExpand(cid)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? "" : "-rotate-90"}`} />
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="font-semibold text-gray-900">{couriers.get(cid) || cid.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{list.length} طلب</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {received} مستلم
                  </span>
                </div>
              </button>

              {open && (
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {list.map((o) => {
                    const cat = categoryOf(o) as CatKey
                    const c = CAT_BY_KEY[cat]
                    const rec = !!o.warehouse_received
                    return (
                      <div key={o.id} className={`flex items-center gap-3 px-4 py-2.5 ${rec ? "bg-emerald-50/40" : ""}`}>
                        {/* Received checkmark */}
                        <button
                          onClick={() => toggleReceived(o)}
                          disabled={savingId === o.id}
                          title={rec ? "تم الاستلام — اضغط للإلغاء" : "تحديد كمُستلَم"}
                          className="flex-shrink-0"
                        >
                          {savingId === o.id ? (
                            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                          ) : rec ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400" />
                          )}
                        </button>
                        {/* Order summary — click to open details */}
                        <button onClick={() => setDetail(o)} className="flex-1 min-w-0 text-right">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">
                              {o.shopify_order_name || o.order_id}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${c.chip}`}>
                              {c.label}
                            </span>
                            {rec && o.warehouse_received_by && (
                              <span className="text-[10px] text-emerald-700">✓ {o.warehouse_received_by}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {o.customer_name || "—"}
                            {(o.customer_phone || o.mobile_number) && (
                              <span dir="ltr" className="mx-1 text-gray-400">
                                · {o.customer_phone || o.mobile_number}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {detail && (
        <OrderDetail order={detail} courierName={couriers.get(String(detail.assigned_courier_id)) || "—"} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}

// ── Read-only order detail for the warehouse ────────────────────────────────
const OrderDetail: React.FC<{ order: Order; courierName: string; onClose: () => void }> = ({
  order,
  courierName,
  onClose,
}) => {
  const [proofs, setProofs] = useState<{ id: string; image_data: string }[]>([])
  const [items, setItems] = useState<any[]>([])
  const [images, setImages] = useState<any[]>([])
  useEffect(() => {
    supabase
      .from("order_proofs")
      .select("id, image_data")
      .eq("order_id", order.id)
      .then(({ data }) => setProofs((data as any) || []))
    // Fetch the heavy product fields on demand (kept out of the list query)
    supabase
      .from("orders")
      .select("line_items, product_images")
      .eq("id", order.id)
      .maybeSingle()
      .then(({ data }) => {
        setItems(parseItems(data?.line_items))
        setImages(parseItems(data?.product_images))
      })
  }, [order.id])

  const cat = categoryOf(order) as CatKey
  const c = CAT_BY_KEY[cat]
  const addr =
    order.address ||
    (typeof order.shipping_address === "string" ? order.shipping_address : JSON.stringify(order.shipping_address || ""))

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{order.shopify_order_name || order.order_id}</h3>
            <p className="text-xs text-slate-200">{order.customer_name || "عميل"}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm overflow-y-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded border font-semibold ${c?.chip}`}>{c?.label || order.status}</span>
            {order.warehouse_received && (
              <span className="text-xs px-2 py-1 rounded border font-semibold bg-emerald-100 text-emerald-800 border-emerald-300">
                ✓ تم الاستلام {order.warehouse_received_by ? `— ${order.warehouse_received_by}` : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <span>المندوب: {courierName}</span>
          </div>
          {(order.customer_phone || order.mobile_number) && (
            <div className="flex items-center gap-2 text-gray-700">
              <Phone className="w-4 h-4 text-gray-400" />
              <span dir="ltr">{order.customer_phone || order.mobile_number}</span>
            </div>
          )}
          {addr && (
            <div className="flex items-start gap-2 text-gray-700">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs leading-relaxed">{addr}</span>
            </div>
          )}
          {typeof order.total_order_fees === "number" && (
            <div className="text-gray-700">
              الإجمالي: <span className="font-semibold">{order.total_order_fees} ج.م</span>
            </div>
          )}

          {/* Products */}
          {(items.length > 0 || images.length > 0) && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
                <Package className="w-4 h-4 text-gray-400" /> المنتجات
              </div>
              <div className="space-y-1.5">
                {items.map((it: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5">
                    <span className="truncate">{it.title || it.name || it.sku || "منتج"}</span>
                    <span className="text-gray-500 flex-shrink-0">× {it.quantity ?? it.qty ?? 1}</span>
                  </div>
                ))}
              </div>
              {images.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {images.slice(0, 6).map((src: any, i: number) => (
                    <img key={i} src={typeof src === "string" ? src : src?.src} alt="" className="w-14 h-14 object-cover rounded border" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Courier proof images */}
          {proofs.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <div className="text-gray-700 font-semibold mb-2">إثبات المندوب</div>
              <div className="flex gap-2 flex-wrap">
                {proofs.map((p) => (
                  <img key={p.id} src={p.image_data} alt="proof" className="w-20 h-20 object-cover rounded border" />
                ))}
              </div>
            </div>
          )}

          {(order.notes || order.order_note) && (
            <div className="pt-2 border-t border-gray-200 text-xs text-gray-600">
              <span className="font-semibold text-gray-700">ملاحظات: </span>
              {order.notes || order.order_note}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WarehouseReturns
