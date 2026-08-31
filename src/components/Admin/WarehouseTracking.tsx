"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { RefreshCw, Warehouse, User as UserIcon, Clock, MessageSquare, Search, X, ChevronDown } from "lucide-react"
import { supabase } from "../../lib/supabase"

// Small category labeler (mirrors the warehouse Returns view).
const catLabel = (o: any): string => {
  if (o.receive_piece_or_exchange === "exchange") return "تبديل"
  if (o.receive_piece_or_exchange === "receive_piece" || o.status === "receiving_part") return "استلام قطعة"
  if (o.status === "hand_to_hand") return "يد بيد"
  if (o.status === "canceled") return "ملغي"
  if (o.status === "partial") return "جزئي"
  return o.status
}

interface Row {
  id: string
  order_id: string
  shopify_order_name?: string | null
  customer_name?: string | null
  status: string
  receive_piece_or_exchange?: string | null
  assigned_courier_id?: string | null
  warehouse_received_by?: string | null
  warehouse_received_at?: string | null
  warehouse_received_comment?: string | null
}

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const WarehouseTracking: React.FC = () => {
  const today = new Date()
  const [from, setFrom] = useState(isoDay(today))
  const [to, setTo] = useState(isoDay(today))
  const [rows, setRows] = useState<Row[]>([])
  const [couriers, setCouriers] = useState<Map<string, string>>(new Map())
  const [staff, setStaff] = useState<string[]>([]) // warehouse user names
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: cs }, { data: ws }] = await Promise.all([
        supabase.from("users").select("id, name").eq("role", "courier"),
        supabase.from("users").select("id, name, email").eq("role", "warehouse"),
      ])
      setCouriers(new Map((cs || []).map((u: any) => [String(u.id), u.name || "—"])))
      setStaff((ws || []).map((u: any) => u.name || u.email || "—"))

      const startIso = new Date(`${from}T00:00:00`).toISOString()
      const endIso = new Date(`${to}T23:59:59.999`).toISOString()

      const { data, error: err } = await supabase
        .from("orders")
        .select(
          "id, order_id, shopify_order_name, customer_name, status, receive_piece_or_exchange, assigned_courier_id, warehouse_received_by, warehouse_received_at, warehouse_received_comment",
        )
        .eq("warehouse_received", true)
        .gte("warehouse_received_at", startIso)
        .lte("warehouse_received_at", endIso)
        .order("warehouse_received_at", { ascending: false })
        .limit(20000)
      if (err) throw err
      setRows((data || []) as Row[])
    } catch (e: any) {
      setError(e?.message || "فشل تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.order_id, r.shopify_order_name, r.customer_name, r.warehouse_received_by]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [rows, search])

  // One group per warehouse user. Every warehouse staff member is listed (even
  // with 0 receipts); any received_by that doesn't match a known staff name is
  // appended so nothing is lost.
  const groups = useMemo(() => {
    const byUser = new Map<string, Row[]>()
    for (const name of staff) byUser.set(name, [])
    for (const r of filtered) {
      const u = r.warehouse_received_by || "—"
      if (!byUser.has(u)) byUser.set(u, [])
      byUser.get(u)!.push(r)
    }
    return Array.from(byUser.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [filtered, staff])

  const preset = (days: number) => {
    const now = new Date()
    setTo(isoDay(now))
    setFrom(isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days)))
  }

  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  const fmtTime = (iso?: string | null) => {
    if (!iso) return ""
    const d = new Date(iso)
    return d.toLocaleString("ar-EG", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  }

  const totalReceived = rows.length

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-sm">
            <Warehouse className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">المخزن — موظفو الاستلام</h1>
            <p className="text-sm text-gray-600">كل موظف مخزن وبداخله الطلبات التي استلمها ومتى</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 ml-2">{totalReceived} استلام</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs" />
          <span className="text-gray-400">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs" />
          <button onClick={() => preset(0)} className="text-xs px-2.5 py-1 rounded-full border bg-white text-gray-600 border-gray-300 hover:bg-gray-50">اليوم</button>
          <button onClick={() => preset(7)} className="text-xs px-2.5 py-1 rounded-full border bg-white text-gray-600 border-gray-300 hover:bg-gray-50">٧ أيام</button>
          <button onClick={() => preset(30)} className="text-xs px-2.5 py-1 rounded-full border bg-white text-gray-600 border-gray-300 hover:bg-gray-50">٣٠ يوم</button>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute top-2.5 right-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث برقم الطلب أو العميل أو اسم موظف المخزن..."
          className="w-full pr-9 pl-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute top-2.5 left-2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
      {loading && <div className="p-6 text-center text-sm text-gray-500">جاري التحميل...</div>}
      {!loading && groups.length === 0 && (
        <div className="p-6 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
          لا يوجد موظفو مخزن
        </div>
      )}

      <div className="space-y-3">
        {groups.map(([userName, list]) => {
          const open = expanded.has(userName)
          return (
            <div key={userName} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => toggle(userName)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? "" : "-rotate-90"}`} />
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="font-semibold text-gray-900">{userName}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${list.length > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                  {list.length} استلام
                </span>
              </button>

              {open && list.length > 0 && (
                <div className="overflow-x-auto border-t border-gray-100">
                  <table className="w-full text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500">
                        <th className="px-3 py-2 text-right">الطلب</th>
                        <th className="px-3 py-2 text-right">النوع</th>
                        <th className="px-3 py-2 text-right">العميل</th>
                        <th className="px-3 py-2 text-right">المندوب</th>
                        <th className="px-3 py-2 text-right">وقت الاستلام</th>
                        <th className="px-3 py-2 text-right">ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => (
                        <tr key={r.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-semibold text-gray-900">{r.shopify_order_name || r.order_id}</td>
                          <td className="px-3 py-2 text-gray-600">{catLabel(r)}</td>
                          <td className="px-3 py-2 text-gray-600 max-w-[160px] truncate">{r.customer_name || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{couriers.get(String(r.assigned_courier_id)) || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {fmtTime(r.warehouse_received_at)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 max-w-[220px] truncate">
                            {r.warehouse_received_comment ? (
                              <span className="inline-flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-gray-400" />
                                {r.warehouse_received_comment}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {open && list.length === 0 && (
                <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100">
                  لم يستلم أي طلب في هذه الفترة
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WarehouseTracking
