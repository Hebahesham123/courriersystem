"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"
import { useLanguage } from "../../contexts/LanguageContext"
import { Wrench, Search, RefreshCw, CheckCircle, Clock, PlayCircle, CornerUpLeft, UserPlus } from "lucide-react"

type RepairStatus = "assigned" | "received" | "in_process" | "returned"

// line_items may arrive as a JSON string or an array.
const parseItems = (raw: any): any[] => {
  if (!raw) return []
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

const itemQty = (it: any): number => Number(it?.quantity ?? it?.current_quantity ?? it?.qty ?? 1) || 1
const itemVariant = (it: any): string | null =>
  it?.variant_title && it.variant_title !== "Default Title" ? it.variant_title : null
const itemLabel = (it: any): string => {
  const v = itemVariant(it)
  return `${it?.title || it?.name || "Product"}${v ? ` - ${v}` : ""} × ${itemQty(it)}`
}

interface RepairUser {
  id: string
  name: string | null
  email: string | null
}

interface SearchRow {
  id: string
  order_id: string | null
  shopify_order_name: string | null
  customer_name: string | null
  customer_phone: string | null
  mobile_number: string | null
  line_items: any
  repair_assigned_to: string | null
  repair_status: RepairStatus | null
  repair_item: any
}

interface TrackRow {
  id: string
  order_id: string | null
  shopify_order_name: string | null
  customer_name: string | null
  customer_phone: string | null
  mobile_number: string | null
  repair_assigned_to: string | null
  repair_assigned_at: string | null
  repair_status: RepairStatus | null
  repair_note: string | null
  repair_item: any
  repair_admin_received: boolean | null
  repair_admin_received_at: string | null
  repair_admin_received_by: string | null
}

const RepairManagement: React.FC = () => {
  const { user } = useAuth()
  const { language } = useLanguage()
  const tl = (ar: string, en: string) => (language === "ar" ? ar : en)

  const [tab, setTab] = useState<"assign" | "tracking">("assign")
  const [repairUsers, setRepairUsers] = useState<RepairUser[]>([])
  const [targetUser, setTargetUser] = useState<string>("")

  const statusMeta: Record<RepairStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    assigned: { label: tl("مُسند", "Assigned"), color: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock },
    received: { label: tl("تم الاستلام", "Received"), color: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle },
    in_process: { label: tl("قيد التصليح", "In process"), color: "bg-amber-100 text-amber-700 border-amber-200", icon: PlayCircle },
    returned: { label: tl("تم الإرجاع", "Returned"), color: "bg-green-100 text-green-700 border-green-200", icon: CornerUpLeft },
  }

  const userName = user?.name || user?.email || "admin"

  // Look up the customer request matching an order id and snapshot its
  // comment / photos / video / notes, so the repair user sees the context —
  // regardless of which screen the admin assigned from.
  const stripHash = (s: any) => String(s || "").replace(/^#/, "").trim()
  const fetchRequestSnapshot = async (orderId: string | null): Promise<any> => {
    const raw = stripHash(orderId)
    if (!raw) return null
    const { data: reqs } = await supabase
      .from("requests")
      .select("id, order_id, comment, image_url, video_url, created_at")
      .ilike("order_id", `%${raw}%`)
      .order("created_at", { ascending: false })
      .limit(20)
    const matches = (reqs || []).filter((r: any) => stripHash(r.order_id) === raw)
    if (matches.length === 0) return null
    const req = matches.find((r: any) => r.comment || r.image_url || r.video_url) || matches[0]
    const { data: notes } = await supabase
      .from("request_notes")
      .select("note, image_url, author, created_at")
      .eq("request_id", req.id)
      .order("created_at", { ascending: true })
    return {
      comment: req.comment || null,
      image_url: req.image_url || null,
      video_url: req.video_url || null,
      notes: (notes || []).map((n: any) => ({ note: n.note || null, image_url: n.image_url || null, author: n.author || null })),
    }
  }

  // ---- load repair users ----------------------------------------------------
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from("users").select("id, name, email").eq("role", "repair").order("name")
      const list = (data || []) as RepairUser[]
      setRepairUsers(list)
      if (list.length && !targetUser) setTargetUser(list[0].id)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const userLabel = (id: string | null): string => {
    if (!id) return tl("غير مُسند", "Unassigned")
    const u = repairUsers.find((r) => r.id === id)
    return u?.name || u?.email || id.slice(0, 8)
  }

  // ---- ASSIGN tab -----------------------------------------------------------
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchRow[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  // Per-result item choice: "" = whole order, otherwise the item index (as string).
  const [itemChoice, setItemChoice] = useState<Record<string, string>>({})

  const runSearch = async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearched(true)
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_id, shopify_order_name, customer_name, customer_phone, mobile_number, line_items, repair_assigned_to, repair_status, repair_item",
      )
      .or(`order_id.ilike.%${q}%,shopify_order_name.ilike.%${q}%,customer_name.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(50)
    setResults(error ? [] : ((data || []) as SearchRow[]))
    setSearching(false)
  }

  const assign = async (row: SearchRow) => {
    if (!targetUser) {
      alert(tl("لا يوجد مستخدم تصليح. أنشئ حساب كريم أولاً.", "No repair user. Create Karim's account first."))
      return
    }
    // Build the chosen-item payload ("" => whole order).
    const items = parseItems(row.line_items)
    const choice = itemChoice[row.id] ?? ""
    let repairItem: any = null
    if (choice !== "") {
      const idx = Number(choice)
      const it = items[idx]
      if (it) {
        repairItem = {
          index: idx,
          title: it.title || it.name || null,
          variant_title: itemVariant(it),
          sku: it.sku || null,
          quantity: itemQty(it),
          product_id: it.product_id ?? null,
        }
      }
    }
    const repairRequest = await fetchRequestSnapshot(row.order_id)
    const { error } = await supabase
      .from("orders")
      .update({
        repair_assigned_to: targetUser,
        repair_status: "assigned",
        repair_assigned_at: new Date().toISOString(),
        repair_assigned_by: userName,
        repair_item: repairItem,
        repair_request: repairRequest,
        repair_admin_received: false,
        repair_admin_received_at: null,
        repair_admin_received_by: null,
      })
      .eq("id", row.id)
    if (error) {
      alert(tl("فشل الإسناد", "Failed to assign"))
      return
    }
    setResults((list) =>
      list.map((r) =>
        r.id === row.id ? { ...r, repair_assigned_to: targetUser, repair_status: "assigned", repair_item: repairItem } : r,
      ),
    )
  }

  const unassign = async (row: SearchRow) => {
    const { error } = await supabase
      .from("orders")
      .update({ repair_assigned_to: null, repair_status: null, repair_item: null, repair_request: null })
      .eq("id", row.id)
    if (error) {
      alert(tl("فشل الإلغاء", "Failed to unassign"))
      return
    }
    setResults((list) =>
      list.map((r) => (r.id === row.id ? { ...r, repair_assigned_to: null, repair_status: null, repair_item: null } : r)),
    )
  }

  // ---- TRACKING tab ---------------------------------------------------------
  const [track, setTrack] = useState<TrackRow[]>([])
  const [loadingTrack, setLoadingTrack] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | RepairStatus>("all")

  const loadTracking = async () => {
    setLoadingTrack(true)
    const { data } = await supabase
      .from("orders")
      .select(
        "id, order_id, shopify_order_name, customer_name, customer_phone, mobile_number, repair_assigned_to, repair_assigned_at, repair_status, repair_note, repair_item, repair_admin_received, repair_admin_received_at, repair_admin_received_by",
      )
      .not("repair_assigned_to", "is", null)
      .order("repair_assigned_at", { ascending: false })
      .limit(5000)
    setTrack((data || []) as TrackRow[])
    setLoadingTrack(false)
  }

  useEffect(() => {
    if (tab === "tracking") loadTracking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const toggleAdminReceived = async (row: TrackRow, next: boolean) => {
    setTrack((list) =>
      list.map((r) =>
        r.id === row.id
          ? { ...r, repair_admin_received: next, repair_admin_received_by: next ? userName : null }
          : r,
      ),
    )
    const { error } = await supabase
      .from("orders")
      .update({
        repair_admin_received: next,
        repair_admin_received_at: next ? new Date().toISOString() : null,
        repair_admin_received_by: next ? userName : null,
      })
      .eq("id", row.id)
    if (error) {
      setTrack((list) => list.map((r) => (r.id === row.id ? { ...r, repair_admin_received: !next } : r)))
      alert(tl("فشل التحديث", "Failed to update"))
    }
  }

  const trackFiltered = useMemo(
    () => (statusFilter === "all" ? track : track.filter((r) => (r.repair_status || "assigned") === statusFilter)),
    [track, statusFilter],
  )

  const trackCounts = useMemo(() => {
    const c: Record<string, number> = { all: track.length, assigned: 0, received: 0, in_process: 0, returned: 0 }
    for (const r of track) {
      const s = (r.repair_status || "assigned") as RepairStatus
      c[s] = (c[s] || 0) + 1
    }
    return c
  }, [track])

  // group tracking rows by repair user
  const grouped = useMemo(() => {
    const map = new Map<string, TrackRow[]>()
    for (const r of trackFiltered) {
      const key = r.repair_assigned_to || "unknown"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return Array.from(map.entries())
  }, [trackFiltered])

  const fmtDate = (iso: string | null): string => {
    if (!iso) return "—"
    try {
      return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    } catch {
      return "—"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-5" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-3 mb-3 flex flex-wrap items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Wrench className="w-5 h-5 text-purple-600" />
          </div>
          <div className="mr-auto">
            <h1 className="text-lg font-bold text-gray-900">{tl("التصليح", "Repair")}</h1>
            <p className="text-xs text-gray-500">{tl("إسناد الطلبات للتصليح ومتابعتها", "Assign orders for repair & track them")}</p>
          </div>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setTab("assign")}
              className={`px-3 py-1.5 text-sm ${tab === "assign" ? "bg-purple-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              {tl("إسناد", "Assign")}
            </button>
            <button
              onClick={() => setTab("tracking")}
              className={`px-3 py-1.5 text-sm ${tab === "tracking" ? "bg-purple-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              {tl("المتابعة", "Tracking")}
            </button>
          </div>
        </div>

        {tab === "assign" ? (
          <div className="bg-white rounded-xl shadow-sm p-4">
            {/* target repair user */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <label className="text-sm text-gray-600">{tl("إسناد إلى:", "Assign to:")}</label>
              <select
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              >
                {repairUsers.length === 0 && <option value="">{tl("لا يوجد مستخدم تصليح", "No repair user")}</option>}
                {repairUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[14rem]">
                <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 left-3" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder={tl("ابحث برقم الطلب أو اسم العميل...", "Search by order ID or customer name...")}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={runSearch}
                disabled={searching}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-60"
              >
                <Search className="w-4 h-4" />
                {tl("بحث", "Search")}
              </button>
            </div>

            {/* results */}
            <div className="mt-4">
              {searching ? (
                <div className="py-10 text-center text-gray-500">{tl("جارٍ البحث...", "Searching...")}</div>
              ) : searched && results.length === 0 ? (
                <div className="py-10 text-center text-gray-500">{tl("لا توجد نتائج", "No results")}</div>
              ) : (
                <div className="space-y-2">
                  {results.map((r) => {
                    const items = parseItems(r.line_items)
                    return (
                      <div key={r.id} className="flex flex-wrap items-center gap-3 border border-gray-100 rounded-lg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-purple-700">
                              #{r.order_id || r.shopify_order_name || r.id.slice(0, 8)}
                            </span>
                            {items.length > 0 && (
                              <span className="text-xs text-gray-400">
                                {items.length} {tl("منتج", "items")}
                              </span>
                            )}
                            {r.repair_assigned_to && r.repair_status && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusMeta[r.repair_status].color}`}>
                                {statusMeta[r.repair_status].label} · {userLabel(r.repair_assigned_to)}
                              </span>
                            )}
                            {r.repair_assigned_to && (
                              <span className="text-xs px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                                {r.repair_item ? `${tl("منتج:", "Item:")} ${r.repair_item.title || "-"}` : tl("الطلب كامل", "Whole order")}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-900 truncate">
                            {r.customer_name || tl("عميل غير معروف", "Unknown customer")}
                            {(r.customer_phone || r.mobile_number) && (
                              <span className="text-xs text-gray-500 ml-2" dir="ltr">
                                {r.customer_phone || r.mobile_number}
                              </span>
                            )}
                          </div>
                          {/* Pick which item to send when the order has more than one */}
                          {!r.repair_assigned_to && items.length > 1 && (
                            <select
                              value={itemChoice[r.id] ?? ""}
                              onChange={(e) => setItemChoice((m) => ({ ...m, [r.id]: e.target.value }))}
                              className="mt-1.5 w-full max-w-md px-2 py-1 border border-gray-200 rounded-lg text-xs"
                            >
                              <option value="">{tl("الطلب كامل (كل المنتجات)", "Whole order (all items)")}</option>
                              {items.map((it, i) => (
                                <option key={i} value={String(i)}>
                                  {itemLabel(it)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        {r.repair_assigned_to ? (
                          <button
                            onClick={() => unassign(r)}
                            className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            {tl("إلغاء الإسناد", "Unassign")}
                          </button>
                        ) : (
                          <button
                            onClick={() => assign(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-purple-600 text-white hover:bg-purple-700"
                          >
                            <UserPlus className="w-4 h-4" />
                            {tl("إسناد للتصليح", "Send to repair")}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* tracking filters */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
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
                    {label} <span className="font-semibold">{trackCounts[key] || 0}</span>
                  </button>
                )
              })}
              <button
                onClick={loadTracking}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                {tl("تحديث", "Refresh")}
              </button>
            </div>

            {loadingTrack ? (
              <div className="py-16 text-center text-gray-500">{tl("جارٍ التحميل...", "Loading...")}</div>
            ) : grouped.length === 0 ? (
              <div className="py-16 text-center text-gray-500">{tl("لا توجد طلبات تصليح", "No repair orders")}</div>
            ) : (
              <div className="space-y-4">
                {grouped.map(([uid, rows]) => (
                  <div key={uid} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <div className="font-semibold text-gray-800">{userLabel(uid === "unknown" ? null : uid)}</div>
                      <div className="text-xs text-gray-500">
                        {rows.length} {tl("طلب", "orders")}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {rows.map((r) => {
                        const s = (r.repair_status || "assigned") as RepairStatus
                        const M = statusMeta[s]
                        const isReturned = s === "returned"
                        return (
                          <div key={r.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm text-purple-700">
                                  #{r.order_id || r.shopify_order_name || r.id.slice(0, 8)}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${M.color}`}>{M.label}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                                  {r.repair_item ? `${tl("منتج:", "Item:")} ${r.repair_item.title || "-"}` : tl("الطلب كامل", "Whole order")}
                                </span>
                                {r.repair_admin_received && (
                                  <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                                    {tl("تم الاستلام من الأدمن", "Received back")}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-900 truncate">
                                {r.customer_name || tl("عميل غير معروف", "Unknown customer")}
                                {(r.customer_phone || r.mobile_number) && (
                                  <span className="text-xs text-gray-500 ml-2" dir="ltr">
                                    {r.customer_phone || r.mobile_number}
                                  </span>
                                )}
                              </div>
                              {r.repair_note && <div className="text-xs text-gray-500 mt-0.5 truncate">{r.repair_note}</div>}
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                {tl("أُسند:", "Assigned:")} {fmtDate(r.repair_assigned_at)}
                              </div>
                            </div>

                            {/* Admin "received back" — only meaningful once returned */}
                            <label
                              className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border cursor-pointer ${
                                isReturned ? "border-emerald-200 hover:bg-emerald-50 text-gray-700" : "border-gray-100 text-gray-300 cursor-not-allowed"
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={!isReturned}
                                checked={!!r.repair_admin_received}
                                onChange={(e) => toggleAdminReceived(r, e.target.checked)}
                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              {tl("استلمته", "Received")}
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default RepairManagement
