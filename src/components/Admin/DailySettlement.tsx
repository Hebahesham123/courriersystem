"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { Download, RefreshCw, FileSpreadsheet } from "lucide-react"
import { supabase } from "../../lib/supabase"

// ---------------------------------------------------------------------------
// Daily courier settlement — one row per courier per day, grouped day by day.
// The Success / Un Success / Total figures replicate the Dashboard Summary
// accounting so the numbers match that screen (and the accountant's sheet):
//   Total       = order value (+ fees collected on canceled orders)
//   Success     = إجمالي مُسلّم فعليًا  (what the courier actually collected)
//   Un Success  = إجمالي غير مُسلّم    (value not delivered / not collected)
//   Balance     = (Success + Un Success) − Total  → 0 when reconciled
// Paymob / Debit / Credit are intentionally omitted.
// ---------------------------------------------------------------------------

// ---- pure accounting helpers (copied from Dashboard/Summary.tsx) ----------
const toNumber = (v: any): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const normalizePartial = (v: any): number => Math.abs(toNumber(v))

const parseOnther = (o: any): any[] | null => {
  if (o.payment_sub_type === "onther" && o.onther_payments) {
    try {
      const a = typeof o.onther_payments === "string" ? JSON.parse(o.onther_payments) : o.onther_payments
      return Array.isArray(a) ? a : null
    } catch {
      return null
    }
  }
  return null
}

const getCourierOrderAmount = (o: any): number => {
  const partialPaid = normalizePartial(o.partial_paid_amount)
  if (o.status === "hand_to_hand") return 0
  if (o.status === "partial") return partialPaid
  if (partialPaid > 0) return partialPaid
  if (o.status === "delivered" || o.status === "hand_to_hand") {
    return Math.max(0, toNumber(o.total_order_fees) - toNumber(o.admin_prepaid_amount))
  }
  if (o.status === "return") return 0
  return 0
}

const getTotalCourierAmount = (o: any): number => {
  const partialPaid = normalizePartial(o.partial_paid_amount)
  const deliveryAmount = toNumber(o.delivery_fee)
  const holdFee = toNumber(o.hold_fee)
  const adminFee = toNumber(o.admin_delivery_fee)
  const extraFee = toNumber(o.extra_fee)

  if (o.status === "partial") return partialPaid + deliveryAmount - holdFee - adminFee - extraFee
  if (o.status === "hand_to_hand") return Math.max(0, partialPaid + deliveryAmount - holdFee - adminFee - extraFee)

  let orderAmount = 0
  if (o.status === "canceled" || o.status === "return") {
    orderAmount = 0
  } else {
    const arr = parseOnther(o)
    orderAmount = arr ? arr.reduce((s, it) => s + toNumber(it.amount), 0) : getCourierOrderAmount(o)
  }
  return orderAmount + deliveryAmount - holdFee - adminFee - extraFee
}

const getPartialCollected = (o: any): number =>
  normalizePartial(o.partial_paid_amount) +
  toNumber(o.delivery_fee) -
  toNumber(o.hold_fee) -
  toNumber(o.admin_delivery_fee) -
  toNumber(o.extra_fee)

// ---- payment-method buckets (Paymob kept internally but NOT displayed) ----
type Bucket = "cash" | "visa" | "wallet" | "instapay" | "sympl" | "paymob" | "valu" | "gift_card" | "other"
const ALL_BUCKETS: Bucket[] = ["cash", "visa", "wallet", "instapay", "sympl", "paymob", "valu", "gift_card", "other"]
// Displayed columns — no Paymob, per request.
const DISPLAY_BUCKETS: Bucket[] = ["cash", "visa", "wallet", "instapay", "sympl", "valu", "gift_card", "other"]
const BUCKET_LABEL: Record<Bucket, string> = {
  cash: "Cash",
  visa: "Visa",
  wallet: "Wallet",
  instapay: "Instapay",
  sympl: "sympl",
  paymob: "Paymob",
  valu: "Valu",
  gift_card: "Gift Card",
  other: "Other",
}

// Normalize a raw method to Summary's canonical keys (copied verbatim from
// Dashboard/Summary.tsx so the breakdown matches that screen exactly).
type NormMethod = "cash" | "paymob" | "valu" | "visa_machine" | "instapay" | "wallet" | "on_hand" | "other"
const normalizePaymentMethod = (method = ""): NormMethod => {
  const m = method.toLowerCase().trim()
  if (m.includes("car") || m.includes("emad") || m.includes("cae")) return "on_hand"
  if (m.includes("valu") || m.includes("paymob.valu")) return "valu"
  if (m === "visa_machine" || m === "visa machine" || m.includes("visa_machine") || m.includes("visa machine")) return "visa_machine"
  if (m === "instapay") return "instapay"
  if (m === "wallet") return "wallet"
  if (m === "on_hand" || m === "on hand") return "on_hand"
  if (m === "paymob" || m.includes("paymob") || m.includes("pay mob") || m.includes("باي موب")) return "paymob"
  if (m.includes("visa") || m.includes("mastercard") || m.includes("card") || m.includes("credit") || m.includes("debit")) return "paymob"
  if (m === "cash" || m === "cod" || m.includes("cash on delivery") || m === "cash_on_delivery") return "cash"
  return "other"
}

// Map a normalized method onto one of the displayed sheet columns.
const bucketFromNormalized = (norm: NormMethod): Bucket => {
  switch (norm) {
    case "on_hand":
    case "cash":
      return "cash"
    case "visa_machine":
      return "visa"
    case "wallet":
      return "wallet"
    case "instapay":
      return "instapay"
    case "valu":
      return "valu"
    case "paymob":
      return "paymob" // captured but not displayed
    default:
      return "other"
  }
}

// Allocate each order's collected amount to a payment-method bucket, following
// Summary.flattenOrdersForPaymentSummary (onther split, prepaid merge, cash-on-hand
// and paymob/valu-delivered inclusion). Returns amounts keyed by display bucket.
const computePaymentBuckets = (orders: any[]): Record<Bucket, number> => {
  const byBucket = emptyBuckets()
  const add = (norm: NormMethod, amount: number) => {
    byBucket[bucketFromNormalized(norm)] += amount
  }
  for (const o of orders) {
    if (toNumber(o.hold_fee) > 0) continue // active hold — excluded from breakdown

    if (o.payment_sub_type === "onther" && o.onther_payments) {
      const arr = parseOnther(o)
      if (arr) {
        const splitPrepaidAmt = toNumber(o.admin_prepaid_amount)
        const splitPrepaidMethodNorm = o.admin_prepaid_method ? normalizePaymentMethod(o.admin_prepaid_method) : null
        for (const item of arr) {
          const norm = normalizePaymentMethod(item.method)
          let amt = parseFloat(item.amount) || 0
          if (splitPrepaidAmt > 0 && splitPrepaidMethodNorm === norm) amt += splitPrepaidAmt
          if (amt > 0) add(norm, amt)
        }
      }
    } else {
      const sourceMethod =
        o.payment_sub_type && o.payment_sub_type !== "onther" ? o.payment_sub_type : o.collected_by || o.payment_method
      const norm = normalizePaymentMethod(sourceMethod)
      let amt = getTotalCourierAmount(o)
      const prepaidAmt = toNumber(o.admin_prepaid_amount)
      const prepaidMethodNorm = o.admin_prepaid_method ? normalizePaymentMethod(o.admin_prepaid_method) : null
      if (prepaidAmt > 0 && prepaidMethodNorm && prepaidMethodNorm === norm) amt += prepaidAmt

      const paymentMethodLower = (o.payment_method || "").toLowerCase()
      const collectedByLower = (o.collected_by || "").toLowerCase()
      const explicitSubType = !!(o.payment_sub_type && o.payment_sub_type !== "onther")
      const isPaymob = norm === "paymob" || (!explicitSubType && (paymentMethodLower.includes("paymob") || collectedByLower === "paymob"))
      const isValu = norm === "valu" || (!explicitSubType && (paymentMethodLower.includes("valu") || collectedByLower === "valu"))
      const isPaymobValuDelivered = (isPaymob || isValu) && o.status === "delivered"

      if (amt > 0 || norm === "on_hand" || isPaymobValuDelivered) {
        const finalAmount = isPaymobValuDelivered && amt === 0 ? toNumber(o.total_order_fees) : amt
        const finalMethod: NormMethod = isPaymobValuDelivered ? (isValu ? "valu" : "paymob") : norm
        add(finalMethod, finalAmount)
      }
    }

    // Cross-method prepaid (deposit paid in a different method than the main payment)
    const xPrepaidAmt = toNumber(o.admin_prepaid_amount)
    if (xPrepaidAmt > 0 && o.admin_prepaid_method && o.status !== "return") {
      const xPrepaidMethod = normalizePaymentMethod(o.admin_prepaid_method)
      const xMainSource =
        o.payment_sub_type && o.payment_sub_type !== "onther" ? o.payment_sub_type : o.collected_by || o.payment_method
      const xMainNormalized = normalizePaymentMethod(xMainSource)
      const isSameMethodMerge = o.payment_sub_type !== "onther" && xPrepaidMethod === xMainNormalized
      let alreadyInOnther = false
      if (o.payment_sub_type === "onther") {
        const arr = parseOnther(o)
        if (arr) alreadyInOnther = arr.some((it: any) => normalizePaymentMethod(it.method) === xPrepaidMethod)
      }
      if (!isSameMethodMerge && !alreadyInOnther) add(xPrepaidMethod, xPrepaidAmt)
    }
  }
  return byBucket
}

const emptyBuckets = (): Record<Bucket, number> =>
  ALL_BUCKETS.reduce((acc, b) => ({ ...acc, [b]: 0 }), {} as Record<Bucket, number>)

interface Row {
  date: string
  courierId: string
  courierName: string
  orders: number
  success: number
  unsuccess: number
  total: number
  balance: number
  byBucket: Record<Bucket, number>
}

const localDay = (isoStr?: string | null): string | null => {
  if (!isoStr) return null
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const fmt = (n: number) => (n ? Math.round(n).toLocaleString() : "")

// Compute the accounting figures for one courier-day's set of orders.
const computeGroup = (orders: any[]): Omit<Row, "date" | "courierId" | "courierName"> => {
  const metric = (status: string) => {
    const os = orders.filter((o) => (o.status || "") === status)
    const originalValue = os.reduce((a, o) => a + toNumber(o.total_order_fees), 0)
    const courierCollected = os.reduce(
      (a, o) => a + (status === "partial" ? getPartialCollected(o) : getTotalCourierAmount(o)),
      0,
    )
    return { count: os.length, originalValue, courierCollected, orders: os }
  }

  let pending = metric("pending")
  let assigned = metric("assigned")
  const delivered = metric("delivered")
  const canceled = metric("canceled")
  const partial = metric("partial")
  const returned = metric("return")
  const receivingPart = metric("receiving_part")
  const handToHand = metric("hand_to_hand")

  // Per-courier view: treat pending as assigned (same as Summary).
  if (pending.count > 0) {
    assigned = {
      count: assigned.count + pending.count,
      originalValue: assigned.originalValue + pending.originalValue,
      courierCollected: assigned.courierCollected + pending.courierCollected,
      orders: [...assigned.orders, ...pending.orders],
    }
    pending = { count: 0, originalValue: 0, courierCollected: 0, orders: [] }
  }

  const sumPrepaid = (os: any[]) => os.reduce((s, o) => s + toNumber(o.admin_prepaid_amount), 0)

  // إجمالي غير مُسلّم (exact same formula as Summary's "غير مُسلّم" card)
  let unsuccess = 0
  unsuccess += Math.max(0, canceled.originalValue - sumPrepaid(canceled.orders))
  unsuccess += Math.max(0, partial.originalValue - partial.courierCollected - sumPrepaid(partial.orders))
  unsuccess += Math.max(0, handToHand.originalValue - handToHand.courierCollected - sumPrepaid(handToHand.orders))
  unsuccess += Math.max(0, receivingPart.originalValue - receivingPart.courierCollected - sumPrepaid(receivingPart.orders))
  unsuccess += assigned.originalValue
  unsuccess += returned.originalValue

  // إجمالي مُسلّم فعليًا (Success) — Summary formula: courier-collected + admin deposit,
  // over the "collected" statuses, excluding orders with an active hold fee.
  const noHold = (o: any) => toNumber(o.hold_fee) <= 0
  const collectedStatuses = new Set(["delivered", "partial", "receiving_part", "hand_to_hand", "canceled", "return"])
  const prepaidStatuses = new Set(["delivered", "partial", "receiving_part", "hand_to_hand", "canceled"])
  const courierTotal = orders
    .filter((o) => collectedStatuses.has(o.status) && noHold(o))
    .reduce((s, o) => s + getTotalCourierAmount(o), 0)
  const prepaidTotal = orders
    .filter((o) => prepaidStatuses.has(o.status) && noHold(o))
    .reduce((s, o) => s + toNumber(o.admin_prepaid_amount), 0)
  const success = courierTotal + prepaidTotal

  // Total = order value (full total_order_fees) + fees collected on canceled orders.
  const orderValue = orders.reduce((s, o) => s + toNumber(o.total_order_fees), 0)
  const total = orderValue + canceled.courierCollected

  // Balance = (Success + Un Success) − Total; 0 when reconciled, else the difference.
  const balance = success + unsuccess - total

  // Payment-method split (same logic as Summary). Paymob captured but not displayed.
  const byBucket = computePaymentBuckets(orders)

  return { orders: orders.length, success, unsuccess, total, balance, byBucket }
}

const DailySettlement: React.FC = () => {
  const today = new Date()
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const [startDate, setStartDate] = useState(iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)))
  const [endDate, setEndDate] = useState(iso(today))
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const fetchAndCompute = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: users } = await supabase.from("users").select("id, name").eq("role", "courier")
      const nameById = new Map<string, string>((users || []).map((u: any) => [String(u.id), u.name || "—"]))

      const startISO = new Date(`${startDate}T00:00:00`).toISOString()
      const endISO = new Date(`${endDate}T23:59:59.999`).toISOString()

      // Same order-set as the Summary screen: primary by assigned_at, plus a
      // legacy fallback for old orders that have no assigned_at.
      const [{ data: prim, error: e1 }, { data: leg, error: e2 }] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .not("assigned_courier_id", "is", null)
          .gte("assigned_at", startISO)
          .lte("assigned_at", endISO),
        supabase
          .from("orders")
          .select("*")
          .not("assigned_courier_id", "is", null)
          .is("assigned_at", null)
          .gte("created_at", startISO)
          .lte("created_at", endISO),
      ])
      if (e1) throw e1
      if (e2) throw e2

      const byId = new Map<string, any>()
      for (const o of prim || []) byId.set(String(o.id), o)
      for (const o of leg || []) if (!byId.has(String(o.id))) byId.set(String(o.id), o)

      // Group orders per (day, courier)
      const groups = new Map<string, { date: string; courierId: string; orders: any[] }>()
      for (const o of byId.values()) {
        const day = localDay(o.assigned_at) || localDay(o.created_at)
        if (!day || day < startDate || day > endDate) continue
        const courierId = String(o.assigned_courier_id)
        const key = `${day}__${courierId}`
        if (!groups.has(key)) groups.set(key, { date: day, courierId, orders: [] })
        groups.get(key)!.orders.push(o)
      }

      const result: Row[] = []
      for (const g of groups.values()) {
        result.push({
          date: g.date,
          courierId: g.courierId,
          courierName: nameById.get(g.courierId) || g.courierId.slice(0, 8),
          ...computeGroup(g.orders),
        })
      }
      result.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.courierName.localeCompare(b.courierName)))
      setRows(result)
      setLoaded(true)
    } catch (e: any) {
      setError(e?.message || "فشل تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAndCompute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const days = useMemo(() => {
    const g = new Map<string, Row[]>()
    for (const r of rows) {
      if (!g.has(r.date)) g.set(r.date, [])
      g.get(r.date)!.push(r)
    }
    return Array.from(g.entries())
  }, [rows])

  const dayTotal = (list: Row[]) => {
    const t = { orders: 0, success: 0, unsuccess: 0, total: 0, balance: 0, byBucket: emptyBuckets() }
    for (const r of list) {
      t.orders += r.orders
      t.success += r.success
      t.unsuccess += r.unsuccess
      t.total += r.total
      t.balance += r.balance
      for (const b of ALL_BUCKETS) t.byBucket[b] += r.byBucket[b]
    }
    return t
  }

  const downloadExcel = () => {
    const header = [
      "Date",
      "Name",
      "Orders",
      "Success",
      "Un Success",
      "Total",
      "Balance",
      ...DISPLAY_BUCKETS.map((b) => BUCKET_LABEL[b]),
    ]
    const aoa: (string | number)[][] = [header]
    for (const [day, list] of days) {
      for (const r of list) {
        aoa.push([
          day,
          r.courierName,
          r.orders,
          Math.round(r.success),
          Math.round(r.unsuccess),
          Math.round(r.total),
          Math.round(r.balance),
          ...DISPLAY_BUCKETS.map((b) => Math.round(r.byBucket[b]) || ""),
        ])
      }
      const t = dayTotal(list)
      aoa.push([
        `TOTAL ${day}`,
        "",
        t.orders,
        Math.round(t.success),
        Math.round(t.unsuccess),
        Math.round(t.total),
        Math.round(t.balance),
        ...DISPLAY_BUCKETS.map((b) => Math.round(t.byBucket[b]) || ""),
      ])
      aoa.push([])
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Settlement")
    XLSX.writeFile(wb, `courier-settlement_${startDate}_to_${endDate}.xlsx`)
  }

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">المحاسبة اليومية للمندوبين</h1>
            <p className="text-sm text-gray-600">كل المندوبين، يوماً بيوم — نفس أرقام لوحة الملخص</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <span className="text-gray-400">→</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <button onClick={fetchAndCompute} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
          <button onClick={downloadExcel} disabled={loading || rows.length === 0} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
            <Download className="w-4 h-4" />
            تحميل Excel
          </button>
        </div>
      </div>

      {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      {loaded && rows.length === 0 && !loading && (
        <div className="p-6 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">لا توجد طلبات في هذه الفترة</div>
      )}

      <div className="space-y-6">
        {days.map(([day, list]) => {
          const t = dayTotal(list)
          return (
            <div key={day} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 font-semibold text-gray-800">{day}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="px-2 py-2 text-right">Name</th>
                      <th className="px-2 py-2 text-right">Orders</th>
                      <th className="px-2 py-2 text-right bg-yellow-50">Success</th>
                      <th className="px-2 py-2 text-right">Un Success</th>
                      <th className="px-2 py-2 text-right bg-emerald-50">Total</th>
                      <th className="px-2 py-2 text-right">Balance</th>
                      {DISPLAY_BUCKETS.map((b) => (
                        <th key={b} className="px-2 py-2 text-right">{BUCKET_LABEL[b]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.courierId} className="border-t border-gray-100">
                        <td className="px-2 py-1.5 font-medium text-gray-900">{r.courierName}</td>
                        <td className="px-2 py-1.5 text-right">{r.orders}</td>
                        <td className="px-2 py-1.5 text-right bg-yellow-50 font-semibold">{fmt(r.success)}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(r.unsuccess)}</td>
                        <td className="px-2 py-1.5 text-right bg-emerald-50 font-semibold">{fmt(r.total)}</td>
                        <td className={`px-2 py-1.5 text-right ${Math.round(r.balance) !== 0 ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                          {Math.round(r.balance) === 0 ? "0" : fmt(r.balance)}
                        </td>
                        {DISPLAY_BUCKETS.map((b) => (
                          <td key={b} className="px-2 py-1.5 text-right">{fmt(r.byBucket[b])}</td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                      <td className="px-2 py-1.5">TOTAL</td>
                      <td className="px-2 py-1.5 text-right">{t.orders}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(t.success)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(t.unsuccess)}</td>
                      <td className="px-2 py-1.5 text-right">{fmt(t.total)}</td>
                      <td className="px-2 py-1.5 text-right">{Math.round(t.balance) === 0 ? "0" : fmt(t.balance)}</td>
                      {DISPLAY_BUCKETS.map((b) => (
                        <td key={b} className="px-2 py-1.5 text-right">{fmt(t.byBucket[b])}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DailySettlement
