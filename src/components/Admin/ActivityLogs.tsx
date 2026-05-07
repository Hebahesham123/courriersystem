import React, { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"
import { ClipboardList, RefreshCw, Search, User as UserIcon, Calendar, Filter } from "lucide-react"

interface LogRow {
  id: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
  user_role: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  entity_label: string | null
  details: Record<string, unknown> | null
  created_at: string
}

const PAGE_SIZE = 50

const ActivityLogs: React.FC = () => {
  const { user } = useAuth()
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [userFilter, setUserFilter] = useState("")
  const todayLocal = (() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  })()
  const [fromDate, setFromDate] = useState(todayLocal)
  const [toDate, setToDate] = useState(todayLocal)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

      if (actionFilter) query = query.ilike("action", `%${actionFilter}%`)
      if (userFilter) query = query.or(`user_name.ilike.%${userFilter}%,user_email.ilike.%${userFilter}%`)
      if (fromDate) {
        // Parse as local midnight (avoids UTC offset chopping off early-morning logs)
        const [y, m, d] = fromDate.split("-").map(Number)
        const start = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
        query = query.gte("created_at", start.toISOString())
      }
      if (toDate) {
        const [y, m, d] = toDate.split("-").map(Number)
        const end = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999)
        query = query.lte("created_at", end.toISOString())
      }

      const { data, error } = await query
      if (error) throw error
      const rows = (data || []) as LogRow[]
      setHasMore(rows.length > PAGE_SIZE)
      setLogs(rows.slice(0, PAGE_SIZE))
    } catch (err: any) {
      console.warn("[ActivityLogs] Fetch error:", err)
      setErrorMsg(err?.message || String(err))
      setLogs([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  const insertTestLog = async () => {
    const { logActivity } = await import("../../lib/activityLogger")
    await logActivity({
      action: "test_log",
      entityType: "diagnostic",
      entityId: "manual-test",
      entityLabel: "Manual test entry",
      details: { note: "Inserted from Logs page test button" },
      actor: user ? { id: (user as any).id, name: (user as any).name, email: (user as any).email, role: (user as any).role } : null,
    })
    await fetchLogs()
  }

  useEffect(() => {
    fetchLogs()
  }, [page, actionFilter, userFilter, fromDate, toDate])

  // Whitelist of fields we care about — anything else (Shopify raw, line_items,
  // internal flags, timestamps) is considered noise and hidden from the log view.
  const FIELD_LABELS: Record<string, string> = {
    status: "الحالة",
    order_id: "رقم الطلب",
    customer_name: "اسم العميل",
    mobile_number: "رقم الهاتف",
    address: "العنوان",
    total_order_fees: "إجمالي الطلب",
    payment_method: "طريقة الدفع",
    payment_sub_type: "نوع الدفع الفرعي",
    collected_by: "تم التحصيل بواسطة",
    onther_payments: "تفاصيل الدفع المقسم",
    partial_paid_amount: "المبلغ الجزئي",
    delivery_fee: "رسوم التوصيل",
    admin_delivery_fee: "رسوم توصيل (إدارة)",
    extra_fee: "رسوم إضافية",
    hold_fee: "رسوم الحجز",
    hold_fee_comment: "تعليق رسوم الحجز",
    admin_prepaid_amount: "المدفوع مسبقاً (الإدارة)",
    admin_prepaid_method: "طريقة الدفع المسبق",
    assigned_courier_id: "المندوب المعيّن",
    archived: "مؤرشف",
    internal_comment: "ملاحظة داخلية",
    notes: "ملاحظات",
    receive_piece_or_exchange: "استلام/استبدال",
    notes_admin: "ملاحظات الإدارة",
  }
  const VISIBLE_FIELDS = new Set(Object.keys(FIELD_LABELS))

  const hasMeaningfulChange = (l: LogRow): boolean => {
    if (l.action !== "update_order") return true
    const changes = (l.details as any)?.changes
    if (!Array.isArray(changes)) return true
    return changes.some((c: any) => VISIBLE_FIELDS.has(c.field))
  }

  const filtered = useMemo(() => {
    const meaningful = logs.filter(hasMeaningfulChange)
    if (!search.trim()) return meaningful
    const q = search.toLowerCase()
    return meaningful.filter((l) =>
      [l.action, l.entity_type, l.entity_id, l.entity_label, l.user_name, l.user_email, JSON.stringify(l.details || {})]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
    )
  }, [search, logs])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const renderValue = (v: unknown): string => {
    if (v === null || v === undefined) return "—"
    if (typeof v === "boolean") return v ? "نعم" : "لا"
    if (typeof v === "string") {
      if (v.length === 0) return "—"
      return v.length > 120 ? v.slice(0, 120) + "…" : v
    }
    if (typeof v === "number") return String(v)
    const json = JSON.stringify(v)
    return json.length > 120 ? json.slice(0, 120) + "…" : json
  }

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details || Object.keys(details).length === 0) return null
    if (Array.isArray((details as any).changes)) {
      const changes = (details as any).changes as { field: string; before: unknown; after: unknown }[]
      const visible = changes.filter((c) => VISIBLE_FIELDS.has(c.field))
      const debugInfo = (details as any)._debug
      return (
        <div className="space-y-1.5">
          {visible.length === 0 && (
            <span className="text-xs text-gray-400">— لا توجد تغييرات مهمة —</span>
          )}
          {visible.map((c, idx) => (
            <div key={idx} className="text-xs flex flex-wrap items-center gap-1.5 bg-gray-50 rounded px-2 py-1">
              <span className="font-bold text-gray-800">{FIELD_LABELS[c.field] || c.field}:</span>
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 line-through font-mono text-[11px]">
                {renderValue(c.before)}
              </span>
              <span className="text-gray-400">←</span>
              <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-bold font-mono text-[11px]">
                {renderValue(c.after)}
              </span>
            </div>
          ))}
          {debugInfo && (
            <details className="text-[10px] text-gray-500 border-t pt-1">
              <summary className="cursor-pointer">debug</summary>
              <pre className="bg-yellow-50 p-1 rounded font-mono whitespace-pre-wrap break-words">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )
    }
    return (
      <pre className="text-xs text-gray-700 bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-40">
        {JSON.stringify(details, null, 2)}
      </pre>
    )
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="p-6 text-center text-gray-500">هذه الصفحة متاحة للمدير فقط.</div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-xl w-12 h-12 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">سجل النشاط</h1>
              <p className="text-sm text-gray-600">جميع التعديلات التي أجراها المستخدمون</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={insertTestLog}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
            >
              اختبار: أضف سجل تجريبي
            </button>
            <button
              onClick={fetchLogs}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </button>
          </div>
        </div>
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-mono break-all">
            خطأ: {errorMsg}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Search className="w-3 h-3" /> بحث في النتائج
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="أي كلمة..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> نوع الإجراء
              </label>
              <input
                type="text"
                value={actionFilter}
                onChange={(e) => {
                  setPage(0)
                  setActionFilter(e.target.value)
                }}
                placeholder="مثال: update_order"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <UserIcon className="w-3 h-3" /> المستخدم
              </label>
              <input
                type="text"
                value={userFilter}
                onChange={(e) => {
                  setPage(0)
                  setUserFilter(e.target.value)
                }}
                placeholder="اسم أو إيميل"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-blue-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> من
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setPage(0)
                    setFromDate(e.target.value)
                  }}
                  className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1">إلى</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setPage(0)
                    setToDate(e.target.value)
                  }}
                  className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-blue-400"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">لا توجد سجلات</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-right font-semibold">التاريخ والوقت</th>
                    <th className="px-3 py-2 text-right font-semibold">المستخدم</th>
                    <th className="px-3 py-2 text-right font-semibold">الإجراء</th>
                    <th className="px-3 py-2 text-right font-semibold">العنصر</th>
                    <th className="px-3 py-2 text-right font-semibold">التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50 align-top">
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono text-xs">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-gray-900">{log.user_name || "—"}</div>
                        {log.user_email && <div className="text-xs text-gray-500">{log.user_email}</div>}
                        {log.user_role && (
                          <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            {log.user_role}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {log.entity_type && (
                          <div className="text-xs text-gray-600">{log.entity_type}</div>
                        )}
                        {log.entity_label && (
                          <div className="font-semibold text-gray-900">{log.entity_label}</div>
                        )}
                        {log.entity_id && (
                          <div className="text-xs text-gray-500 font-mono">#{log.entity_id}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-md">{formatDetails(log.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-sm text-gray-600">صفحة {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore || loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      </div>
    </div>
  )
}

export default ActivityLogs
