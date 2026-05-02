"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalIcon, X, UserPlus, Phone, Clock, MapPin } from "lucide-react"
import { whatsappSupabase, type WhatsAppOrder } from "../../lib/whatsappSupabase"
import { supabase } from "../../lib/supabase"

interface Courier {
  id: string
  name: string
}

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
const WEEKDAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
const MONTHS_EN_SHORT: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

// Parse "Sun 26 Apr" → Date (year inferred from current year, rolled forward if in the past by >6 months)
const parseDeliveryDate = (s?: string | null): Date | null => {
  if (!s) return null
  const cleaned = s.trim().replace(/[^\w\s]/g, "")
  const parts = cleaned.split(/\s+/)
  // Find the day (number) and month (3-letter)
  let day: number | null = null
  let month: number | null = null
  for (const p of parts) {
    if (!isNaN(Number(p))) day = Number(p)
    const m = p.toLowerCase().slice(0, 3)
    if (MONTHS_EN_SHORT[m] !== undefined) month = MONTHS_EN_SHORT[m]
  }
  if (day === null || month === null) return null
  const now = new Date()
  let year = now.getFullYear()
  // If parsed date is more than 6 months in the past, roll to next year
  const candidate = new Date(year, month, day)
  const diffDays = (candidate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays < -180) year += 1
  return new Date(year, month, day)
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

// Parse "(lat,lng)" → { lat, lng }
const parseLatLng = (loc?: string | null): { lat: number; lng: number } | null => {
  if (!loc) return null
  const m = loc.match(/\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?/)
  if (!m) return null
  const lat = parseFloat(m[1])
  const lng = parseFloat(m[2])
  if (isNaN(lat) || isNaN(lng)) return null
  return { lat, lng }
}

// Common Greater Cairo neighborhoods → city. Each entry is a regex matched
// case-insensitively against the address text (English + Arabic).
const GIZA_KEYWORDS = [
  /giza/i, /\bال?جيزة\b|\bجيزه\b/,
  /dokki|الدقي|دقي/i,
  /mohandes(s)?in|المهندسين|مهندسين/i,
  /agouza|العجوزة|عجوزة/i,
  /imbaba|إمبابة|امبابة/i,
  /\bharam\b|الهرم|هرم/i,
  /faisal|فيصل/i,
  /\b6(th)?\s*(of\s*)?october\b|6\s*أكتوبر|السادس\s*من\s*أكتوبر|اكتوبر/i,
  /sheikh\s*zayed|الشيخ\s*زايد|زايد/i,
  /smart\s*village|القرية\s*الذكية/i,
  /boulaq\s*dakrour|بولاق\s*الدكرور/i,
  /warraq|الوراق/i,
  /pyramids|الأهرام|اهرام/i,
  /badrasheen|البدرشين/i,
  /hawamdeya|الحوامدية/i,
]
const CAIRO_KEYWORDS = [
  /cairo/i, /\bال?قاهرة\b|\bقاهره\b/,
  /nasr\s*city|مدينة\s*نصر|نصر\s*سيتي/i,
  /heliopolis|مصر\s*الجديدة|هليوبوليس/i,
  /maadi|المعادي|معادي/i,
  /zamalek|الزمالك|زمالك/i,
  /downtown|وسط\s*البلد/i,
  /shubra|شبرا/i,
  /helwan|حلوان/i,
  /\b5(th)?\s*settlement\b|التجمع\s*الخامس|تجمع\s*خامس/i,
  /new\s*cairo|القاهرة\s*الجديدة/i,
  /\brehab\b|الرحاب/i,
  /madinaty|مدينتي/i,
  /\bobour\b|العبور/i,
  /shorouk|الشروق/i,
  /mokattam|المقطم|مقطم/i,
  /ain\s*shams|عين\s*شمس/i,
  /\bmarg\b|المرج/i,
  /tagamoa|تجمع/i,
  /administrative\s*capital|العاصمة\s*الإدارية/i,
  /badr\s*city|مدينة\s*بدر/i,
  /sayeda\s*zeinab|السيدة\s*زينب/i,
  /abbasia|العباسية|عباسية/i,
  /sayeda\s*aisha|السيدة\s*عائشة/i,
]

const matchAny = (re: RegExp[], s: string) => re.some((r) => r.test(s))

// Try text matching for city/neighborhood names.
const detectCityFromText = (s?: string | null): "cairo" | "giza" | null => {
  if (!s) return null
  // Giza first because some Cairo keywords (e.g., "cairo") could also match
  // strings that mention both — but prefer the more specific neighborhood.
  if (matchAny(GIZA_KEYWORDS, s)) return "giza"
  if (matchAny(CAIRO_KEYWORDS, s)) return "cairo"
  return null
}

// Determine city using either coordinates or address text.
// Falls back to text scan if coords aren't usable. If nothing matches but we
// have any signal at all (location coords or address text), default to Cairo —
// this matches the business reality that all delivery zones are Greater Cairo.
const detectCity = (
  primary?: string | null,
  ...fallbacks: (string | null | undefined)[]
): "cairo" | "giza" | null => {
  const tryAll = [primary, ...fallbacks]
  // Try coordinates first
  for (const s of tryAll) {
    const p = parseLatLng(s || null)
    if (p && p.lat >= 29.7 && p.lat <= 30.4 && p.lng >= 30.8 && p.lng <= 31.85) {
      return p.lng >= 31.22 ? "cairo" : "giza"
    }
  }
  // Then text fallback
  for (const s of tryAll) {
    const t = detectCityFromText(s)
    if (t) return t
  }
  // Default to Cairo if we have any address/location signal but couldn't classify.
  // (All deliveries are in Greater Cairo, so the safer default is Cairo.)
  for (const s of tryAll) {
    if (s && String(s).trim().length > 0) return "cairo"
  }
  return null
}

const cityLabelAr = (c: "cairo" | "giza" | null): string =>
  c === "cairo" ? "القاهرة" : c === "giza" ? "الجيزة" : "—"

const cityClasses = (c: "cairo" | "giza" | null): string =>
  c === "cairo"
    ? "bg-blue-100 text-blue-800 border-blue-300"
    : c === "giza"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : "bg-gray-100 text-gray-700 border-gray-300"

// Extract a "d-<number>" deposit amount from any note text. Returns the number or null.
const extractDDeposit = (note?: string | null): number | null => {
  if (!note) return null
  const m = note.match(/(?:^|[^a-zA-Z0-9])[dD]-(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : null
}

const Calendar: React.FC = () => {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [waOrders, setWaOrders] = useState<WhatsAppOrder[]>([])
  // Map of shopify_order_id (or order_id) → address from the main orders table
  const [addressByOrderId, setAddressByOrderId] = useState<Map<string, string>>(new Map())
  // Map of shopify_order_id (or order_id) → deposit amount detected from note (d-<num>)
  const [depositByOrderId, setDepositByOrderId] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<WhatsAppOrder | null>(null)
  const [dayList, setDayList] = useState<{ key: string; label: string; orders: WhatsAppOrder[] } | null>(null)
  const [zoneFilter, setZoneFilter] = useState<"all" | "cairo" | "giza" | "unknown">("all")
  const [depositFilter, setDepositFilter] = useState<"all" | "with" | "without">("all")
  const [matchedOrder, setMatchedOrder] = useState<any | null>(null)
  const [matching, setMatching] = useState(false)
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [chosenCourier, setChosenCourier] = useState("")
  const [chosenDate, setChosenDate] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await whatsappSupabase
        .from("bb_whatsapp_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000)
      if (error) throw error
      const list = (data || []) as WhatsAppOrder[]
      setWaOrders(list)

      // Fetch address (text) for these orders from the main orders table.
      // Used for city detection and display alongside the location coordinates.
      const ids = Array.from(new Set(list.map((o) => o.order_id).filter(Boolean))) as string[]
      const phones = Array.from(new Set(list.map((o) => o.customer_phone).filter(Boolean))) as string[]
      if (ids.length > 0 || phones.length > 0) {
        // Run two/three lookups in parallel: by shopify_order_id, by order_id (text),
        // and by customer_phone (last-resort fallback for orders that don't have a
        // matching shopify_order_id).
        const sel = "order_id, shopify_order_id, customer_phone, address, shipping_address, billing_address, shipping_city, billing_city, order_note, notes, admin_prepaid_amount"
        const [a, b, c] = await Promise.all([
          ids.length > 0
            ? supabase.from("orders").select(sel).in("shopify_order_id", ids)
            : Promise.resolve({ data: [] as any[] }),
          ids.length > 0
            ? supabase.from("orders").select(sel).in("order_id", ids)
            : Promise.resolve({ data: [] as any[] }),
          phones.length > 0
            ? supabase.from("orders").select(sel).in("customer_phone", phones)
            : Promise.resolve({ data: [] as any[] }),
        ])
        const matched = [...(a.data || []), ...(b.data || []), ...(c.data || [])]
        const map = new Map<string, string>()
        const depositMap = new Map<string, number>()
        for (const r of matched) {
          const a = (r as any).address || (r as any).shipping_address || (r as any).billing_address
          // Combine all available text — address + city fields — so detectCityFromText
          // can pick up either a neighborhood OR a bare "Cairo"/"Giza" city field.
          const parts: string[] = []
          if (a) parts.push(typeof a === "string" ? a : JSON.stringify(a))
          if ((r as any).shipping_city) parts.push(String((r as any).shipping_city))
          if ((r as any).billing_city) parts.push(String((r as any).billing_city))
          if (parts.length > 0) {
            const text = parts.join(" | ")
            if ((r as any).shopify_order_id) map.set(String((r as any).shopify_order_id), text)
            if ((r as any).order_id) map.set(String((r as any).order_id), text)
            if ((r as any).customer_phone) map.set("phone:" + String((r as any).customer_phone), text)
          }
          // Detect deposit: prefer admin_prepaid_amount if set, otherwise parse "d-<num>" from notes
          let dep: number | null = null
          const adminPrepaid = Number((r as any).admin_prepaid_amount || 0)
          if (adminPrepaid > 0) dep = adminPrepaid
          if (dep === null) dep = extractDDeposit((r as any).order_note) ?? extractDDeposit((r as any).notes)
          if (dep !== null && dep > 0) {
            if ((r as any).shopify_order_id) depositMap.set(String((r as any).shopify_order_id), dep)
            if ((r as any).order_id) depositMap.set(String((r as any).order_id), dep)
            if ((r as any).customer_phone) depositMap.set("phone:" + String((r as any).customer_phone), dep)
          }
        }
        setAddressByOrderId(map)
        setDepositByOrderId(depositMap)
      }
    } catch (e: any) {
      setError(e?.message || "Failed to fetch WhatsApp orders")
    } finally {
      setLoading(false)
    }
  }

  const fetchCouriers = async () => {
    const { data } = await supabase.from("users").select("id, name").eq("role", "courier")
    setCouriers((data as Courier[]) || [])
  }

  useEffect(() => {
    fetchData()
    fetchCouriers()
  }, [])

  // Group orders by the customer's chosen delivery date — skip rows without one.
  const ordersByDay = useMemo(() => {
    const map = new Map<string, WhatsAppOrder[]>()
    for (const o of waOrders) {
      // Only include orders where the customer chose BOTH a date and a time
      const d = parseDeliveryDate(o.delivery_date)
      const t = (o.delivery_time || "").trim()
      if (!d || !t) continue
      // Apply zone filter
      const city = detectCity(o.delivery_location, addressByOrderId.get(String(o.order_id)) || (o.customer_phone ? addressByOrderId.get("phone:" + o.customer_phone) : null))
      if (zoneFilter !== "all") {
        if (zoneFilter === "unknown" && city !== null) continue
        if (zoneFilter === "cairo" && city !== "cairo") continue
        if (zoneFilter === "giza" && city !== "giza") continue
      }
      // Apply deposit filter
      const dep =
        depositByOrderId.get(String(o.order_id)) ||
        (o.customer_phone ? depositByOrderId.get("phone:" + o.customer_phone) : 0) ||
        0
      if (depositFilter === "with" && !(dep > 0)) continue
      if (depositFilter === "without" && dep > 0) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(o)
    }
    // Sort each day's entries by time window start so they appear chronologically
    const parseTime = (t?: string | null): number => {
      if (!t) return 9999
      const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
      if (!m) return 9999
      let h = Number(m[1])
      const min = Number(m[2])
      const ampm = (m[3] || "").toUpperCase()
      if (ampm === "PM" && h < 12) h += 12
      if (ampm === "AM" && h === 12) h = 0
      return h * 60 + min
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => parseTime(a.delivery_time) - parseTime(b.delivery_time))
    }
    return map
  }, [waOrders, zoneFilter, depositFilter, addressByOrderId, depositByOrderId])

  // Build the month grid (6 rows × 7 cols starting on Sunday)
  const grid = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const startDay = firstOfMonth.getDay() // 0=Sun
    const start = new Date(firstOfMonth)
    start.setDate(start.getDate() - startDay)
    const cells: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      cells.push(d)
    }
    return cells
  }, [cursor])

  const openOrder = async (o: WhatsAppOrder) => {
    setSelected(o)
    setMatchedOrder(null)
    setAssignError(null)
    setAssignSuccess(null)
    setChosenCourier("")
    // Pre-fill the assignment date with the customer's preferred delivery date
    const d = parseDeliveryDate(o.delivery_date)
    setChosenDate(
      d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : ""
    )
    if (!o.order_id) return
    setMatching(true)
    try {
      const { data } = await supabase
        .from("orders")
        .select("id, order_id, customer_name, customer_phone, total_order_fees, status, assigned_courier_id, address, base_order_id, shopify_order_id")
        .or(`shopify_order_id.eq.${o.order_id},order_id.eq.${o.order_id}`)
        .limit(5)
      // Prefer a base order (no base_order_id) so the assign flow creates a fresh date-suffixed copy
      const base = (data || []).find((r: any) => r.base_order_id == null) || (data || [])[0] || null
      setMatchedOrder(base)
    } finally {
      setMatching(false)
    }
  }

  const closeModal = () => {
    setSelected(null)
    setMatchedOrder(null)
  }

  // Lightweight assign-to-courier flow that mirrors OrdersManagement.handleAssignOrders
  const doAssign = async () => {
    if (!matchedOrder || !chosenCourier) {
      setAssignError("اختر مندوب")
      return
    }
    setAssigning(true)
    setAssignError(null)
    setAssignSuccess(null)
    try {
      let assignmentDate: Date
      if (chosenDate) {
        const [yy, mm, dd] = chosenDate.split("-").map(Number)
        assignmentDate = new Date(yy, (mm || 1) - 1, dd || 1, 12, 0, 0, 0)
      } else {
        assignmentDate = new Date()
      }
      const nowIso = assignmentDate.toISOString()
      const dayNum = assignmentDate.getDate()

      const order = matchedOrder
      const isShopifyOrder = order.shopify_order_id != null
      const isBaseOrder = order.base_order_id == null

      if (isShopifyOrder && isBaseOrder) {
        const baseOrderId = order.order_id
        const dateSuffix = String(dayNum).padStart(2, "0")
        const newOrderId = `${baseOrderId}-${dateSuffix}`

        // If a date-suffixed copy already exists, delete it so we re-create cleanly
        const { data: existing } = await supabase
          .from("orders")
          .select("id")
          .eq("order_id", newOrderId)
          .eq("base_order_id", order.id)
          .maybeSingle()
        if (existing) {
          await supabase.from("orders").delete().eq("id", existing.id)
        }

        // Fetch the full base row to copy fields cleanly
        const { data: full } = await supabase
          .from("orders")
          .select("*")
          .eq("id", order.id)
          .single()
        if (!full) throw new Error("Order not found")

        const newOrderData: any = {
          order_id: newOrderId,
          base_order_id: full.id,
          shopify_order_id: null,
          customer_name: full.customer_name,
          customer_email: full.customer_email,
          customer_phone: full.customer_phone,
          customer_id: full.customer_id,
          mobile_number: full.mobile_number,
          address: full.address,
          billing_address: full.billing_address,
          shipping_address: full.shipping_address,
          billing_city: full.billing_city,
          shipping_city: full.shipping_city,
          billing_country: full.billing_country,
          shipping_country: full.shipping_country,
          billing_zip: full.billing_zip,
          shipping_zip: full.shipping_zip,
          total_order_fees: full.total_order_fees,
          subtotal_price: full.subtotal_price,
          total_tax: full.total_tax,
          total_discounts: full.total_discounts,
          total_shipping_price: full.total_shipping_price,
          currency: full.currency,
          payment_method: full.payment_method,
          payment_status: full.payment_status,
          financial_status: full.financial_status,
          payment_gateway_names: full.payment_gateway_names,
          line_items: full.line_items,
          product_images: full.product_images,
          order_tags: full.order_tags,
          order_note: full.order_note,
          customer_note: full.customer_note,
          notes: full.notes,
          shipping_method: full.shipping_method,
          tracking_number: full.tracking_number,
          tracking_url: full.tracking_url,
          fulfillment_status: full.fulfillment_status,
          shopify_created_at: full.shopify_created_at,
          shopify_updated_at: full.shopify_updated_at,
          shopify_cancelled_at: full.shopify_cancelled_at,
          shopify_closed_at: full.shopify_closed_at,
          assigned_courier_id: chosenCourier,
          status: "assigned",
          assigned_at: nowIso,
          updated_at: nowIso,
          created_at: nowIso,
          delivery_fee: null,
          partial_paid_amount: null,
          collected_by: null,
          payment_sub_type: null,
          internal_comment: null,
          archived: full.archived || false,
          receive_piece_or_exchange: full.receive_piece_or_exchange,
          original_courier_id: full.original_courier_id || full.assigned_courier_id || chosenCourier,
        }
        const { data: newOrder, error: insertErr } = await supabase
          .from("orders")
          .insert(newOrderData)
          .select()
          .single()
        if (insertErr) throw insertErr

        // Copy items
        const { data: items } = await supabase.from("order_items").select("*").eq("order_id", full.id)
        if (items && items.length > 0) {
          const newItems = items.map((it: any) => {
            const copy: any = { ...it, order_id: newOrder.id, created_at: nowIso, updated_at: nowIso }
            delete copy.id
            return copy
          })
          await supabase.from("order_items").insert(newItems)
        }
        // Unassign base order
        await supabase
          .from("orders")
          .update({ assigned_courier_id: null, status: "pending", assigned_at: null })
          .eq("id", full.id)
      } else {
        await supabase
          .from("orders")
          .update({
            assigned_courier_id: chosenCourier,
            status: "assigned",
            updated_at: nowIso,
            assigned_at: nowIso,
            original_courier_id: order.original_courier_id || order.assigned_courier_id || chosenCourier,
          })
          .eq("id", order.id)
      }
      setAssignSuccess("تم التعيين بنجاح")
      setTimeout(() => closeModal(), 1200)
    } catch (e: any) {
      setAssignError(e?.message || "فشل التعيين")
    } finally {
      setAssigning(false)
    }
  }

  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))

  return (
    <div className="p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <CalIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">تقويم تأكيدات العملاء</h1>
            <p className="text-sm text-gray-600">من نظام واتساب — مواعيد التسليم المؤكدة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
            title="الشهر السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm">
            اليوم
          </button>
          <button
            onClick={goNext}
            className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
            title="الشهر التالي"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-800 font-semibold text-sm">
            {MONTHS_AR[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Zone filter */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-700">المنطقة:</span>
        {([
          { key: "all", label: "الكل", classes: "bg-gray-100 text-gray-800 border-gray-300" },
          { key: "cairo", label: "القاهرة", classes: "bg-blue-100 text-blue-800 border-blue-300" },
          { key: "giza", label: "الجيزة", classes: "bg-amber-100 text-amber-800 border-amber-300" },
          { key: "unknown", label: "غير محدد", classes: "bg-rose-100 text-rose-800 border-rose-300" },
        ] as const).map((opt) => {
          const active = zoneFilter === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => setZoneFilter(opt.key)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                active ? opt.classes + " ring-2 ring-offset-1 ring-indigo-400 font-semibold" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Deposit filter */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-700">المقدم:</span>
        {([
          { key: "all", label: "الكل", classes: "bg-gray-100 text-gray-800 border-gray-300" },
          { key: "with", label: "💰 بمقدم", classes: "bg-purple-100 text-purple-800 border-purple-400" },
          { key: "without", label: "بدون مقدم", classes: "bg-gray-100 text-gray-700 border-gray-300" },
        ] as const).map((opt) => {
          const active = depositFilter === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => setDepositFilter(opt.key)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                active ? opt.classes + " ring-2 ring-offset-1 ring-indigo-400 font-semibold" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {WEEKDAYS_AR.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-bold text-gray-700">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth()
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            const dayOrders = ordersByDay.get(key) || []
            const isToday = sameDay(d, today)
            return (
              <div
                key={i}
                className={`min-h-[110px] border-b border-l border-gray-100 p-1.5 flex flex-col gap-1 ${
                  inMonth ? "bg-white" : "bg-gray-50/60"
                } ${isToday ? "ring-2 ring-inset ring-indigo-300" : ""}`}
              >
                <div
                  className={`text-xs font-semibold ${
                    inMonth ? (isToday ? "text-indigo-700" : "text-gray-700") : "text-gray-400"
                  }`}
                >
                  {d.getDate()}
                </div>
                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                  {dayOrders.slice(0, 3).map((o) => {
                    const city = detectCity(o.delivery_location, addressByOrderId.get(String(o.order_id)) || (o.customer_phone ? addressByOrderId.get("phone:" + o.customer_phone) : null))
                    const dep =
                      depositByOrderId.get(String(o.order_id)) ||
                      (o.customer_phone ? depositByOrderId.get("phone:" + o.customer_phone) : 0) ||
                      0
                    // Deposit overrides the city color so it stands out
                    const klass = dep > 0
                      ? "bg-purple-100 text-purple-900 border-purple-400 ring-1 ring-purple-300"
                      : cityClasses(city)
                    return (
                      <button
                        key={o.id}
                        onClick={() => openOrder(o)}
                        className={`text-right truncate text-[11px] px-1.5 py-1 rounded border hover:brightness-95 ${klass}`}
                        title={`${o.customer_name || ""} ${o.delivery_time || ""} ${cityLabelAr(city)}${dep > 0 ? ` · مقدم ${dep}` : ""}`}
                      >
                        <span className="font-semibold">{o.order_name || o.order_id}</span>
                        {o.delivery_time && <span className="opacity-70"> · {o.delivery_time.split(" - ")[0]}</span>}
                        {dep > 0 ? (
                          <span className="opacity-90 font-semibold"> · 💰{dep}</span>
                        ) : (
                          city && <span className="opacity-80"> · {cityLabelAr(city)}</span>
                        )}
                      </button>
                    )
                  })}
                  {dayOrders.length > 3 && (
                    <button
                      onClick={() =>
                        setDayList({
                          key,
                          label: `${WEEKDAYS_AR[d.getDay()]} ${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`,
                          orders: dayOrders,
                        })
                      }
                      className="text-[10px] text-indigo-700 hover:underline text-right"
                    >
                      +{dayOrders.length - 3} أخرى
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day list modal: shows ALL orders for a single day */}
      {dayList && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDayList(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{dayList.label}</h3>
                <p className="text-xs text-indigo-100">{dayList.orders.length} طلب مؤكد</p>
              </div>
              <button onClick={() => setDayList(null)} className="p-1 rounded-full hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {dayList.orders.map((o) => {
                const city = detectCity(o.delivery_location, addressByOrderId.get(String(o.order_id)) || (o.customer_phone ? addressByOrderId.get("phone:" + o.customer_phone) : null))
                const dep =
                  depositByOrderId.get(String(o.order_id)) ||
                  (o.customer_phone ? depositByOrderId.get("phone:" + o.customer_phone) : 0) ||
                  0
                return (
                  <button
                    key={o.id}
                    onClick={() => {
                      setDayList(null)
                      openOrder(o)
                    }}
                    className={`w-full text-right p-3 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                      dep > 0
                        ? "bg-purple-50 border-purple-300 hover:bg-purple-100"
                        : "bg-white border-gray-200 hover:bg-emerald-50 hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {o.order_name || o.order_id}
                        </span>
                        {dep > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border font-semibold bg-purple-100 text-purple-800 border-purple-400">
                            💰 مقدم {dep}
                          </span>
                        )}
                        {city && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cityClasses(city)}`}>
                            {cityLabelAr(city)}
                          </span>
                        )}
                        {o.status && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                            {o.status}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {o.customer_name || "—"}
                        {o.customer_phone && (
                          <span dir="ltr" className="mx-1 text-gray-400">· {o.customer_phone}</span>
                        )}
                      </div>
                      {(() => {
                        const addr = addressByOrderId.get(String(o.order_id)) || (o.customer_phone ? addressByOrderId.get("phone:" + o.customer_phone) : null)
                        return addr ? (
                          <div className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{addr}</span>
                          </div>
                        ) : null
                      })()}
                    </div>
                    {o.delivery_time && (
                      <div className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {o.delivery_time}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Detail / Assign Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{selected.customer_name || "عميل"}</h3>
                <p className="text-xs text-indigo-100">
                  {selected.order_name || selected.order_id}
                </p>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {selected.customer_phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span dir="ltr">{selected.customer_phone}</span>
                </div>
              )}
              {selected.delivery_date && (
                <div className="flex items-center gap-2 text-gray-700">
                  <CalIcon className="w-4 h-4 text-gray-400" />
                  <span>{selected.delivery_date}</span>
                </div>
              )}
              {selected.delivery_time && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{selected.delivery_time}</span>
                </div>
              )}
              {(() => {
                const addr =
                  addressByOrderId.get(String(selected.order_id)) ||
                  (selected.customer_phone ? addressByOrderId.get("phone:" + selected.customer_phone) : null)
                const city = detectCity(selected.delivery_location, addr)
                return (
                  <>
                    {addr && (
                      <div className="flex items-start gap-2 text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs leading-relaxed">{addr}</span>
                      </div>
                    )}
                    {selected.delivery_location && (
                      <div className="flex items-center gap-2 text-gray-700 flex-wrap">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <a
                          href={(() => {
                            const m = selected.delivery_location.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
                            return m ? `https://www.google.com/maps?q=${m[1]},${m[2]}` : "#"
                          })()}
                          target="_blank"
                          rel="noreferrer"
                          dir="ltr"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {selected.delivery_location}
                        </a>
                        {city && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cityClasses(city)}`}>
                            {cityLabelAr(city)}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}
              {selected.status && (
                <div className="text-xs">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                    {selected.status}
                  </span>
                </div>
              )}

              {/* Assign section */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                {matching ? (
                  <p className="text-xs text-gray-500">جاري البحث عن الطلب...</p>
                ) : matchedOrder ? (
                  <>
                    <div className="text-xs text-gray-600 mb-2">
                      تم العثور على الطلب: <span className="font-semibold">{matchedOrder.order_id}</span>
                      {matchedOrder.assigned_courier_id && (
                        <span className="mx-1 text-orange-600">(معيّن لمندوب حالياً)</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={chosenCourier}
                        onChange={(e) => setChosenCourier(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">اختر المندوب</option>
                        {couriers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={chosenDate}
                        onChange={(e) => setChosenDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    {assignError && (
                      <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                        {assignError}
                      </div>
                    )}
                    {assignSuccess && (
                      <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                        {assignSuccess}
                      </div>
                    )}
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={closeModal}
                        className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={doAssign}
                        disabled={assigning || !chosenCourier}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {assigning ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                        تعيين
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                    لم يتم العثور على هذا الطلب في النظام (order_id: {selected.order_id}). تأكد من مزامنة Shopify.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
