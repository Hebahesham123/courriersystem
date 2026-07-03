"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { List, arrayMove } from "react-movable"
import {
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Check,
  Clock,
  Crosshair,
  AlertTriangle,
  Route as RouteIcon,
  Loader2,
  Locate,
  Flag,
  ChevronLeft,
  ChevronRight,
  Timer,
  Gauge,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { whatsappSupabase } from "../../lib/whatsappSupabase"
import { useAuth } from "../../contexts/AuthContext"
import {
  START,
  type LatLng,
  osrmTrip,
  osrmRoute,
  nearestNeighborOrder,
  geocode,
  parseLatLng,
  saveManualGeocode,
  trafficHint,
  trafficMultiplier,
  googleMapsStopLink,
  googleMapsRouteLink,
  refineStart,
  fmtDistance,
  fmtDuration,
  clockAfter,
} from "../../lib/routing"

// Minutes a courier roughly spends at each stop (handover, payment, signature).
const SERVICE_MIN = 4

interface Stop {
  id: string // orders.id
  orderId: string // orders.order_id (human key)
  name: string
  phone: string | null
  address: string
  status: string
  lat: number | null
  lng: number | null
  coordSource: "manual" | "whatsapp" | "geocode" | "approx" | null
  manual: boolean
  done: boolean
  doneAt: string | null
  deliveryDate: string | null
  deliveryTime: string | null
}

interface SavedStop {
  order_id: string
  lat: number | null
  lng: number | null
  done?: boolean
  done_at?: string | null
  manual?: boolean
}

// The subset of `orders` columns this tab selects.
interface OrderRow {
  id: string
  order_id: string | number | null
  shopify_order_id: string | number | null
  customer_name: string | null
  customer_phone: string | null
  mobile_number: string | null
  address: string | null
  shipping_address: unknown
  billing_address: unknown
  shipping_city: string | null
  status: string
  assigned_at: string | null
  created_at: string | null
}

// ---- date / time helpers ---------------------------------------------------
const todayCairoYMD = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())

const toCairoYMD = (ts: string | null): string => {
  if (!ts) return ""
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts))
}

// Parse "3:00 PM" -> minutes since midnight. Returns null if unparseable.
const parseClock = (s: string): number | null => {
  const m = s.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  const ap = m[3]?.toLowerCase()
  if (ap === "pm" && h < 12) h += 12
  if (ap === "am" && h === 12) h = 0
  return h * 60 + min
}

// Parse "3:00 PM - 5:00 PM" -> { start, end } minutes since midnight.
const parseWindow = (s?: string | null): { start: number; end: number } | null => {
  if (!s) return null
  const parts = s.split(/[-–—]/)
  if (parts.length < 2) {
    const one = parseClock(parts[0] || "")
    return one == null ? null : { start: one, end: one + 120 }
  }
  const start = parseClock(parts[0])
  const end = parseClock(parts[1])
  if (start == null || end == null) return null
  return { start, end }
}

// ---- Leaflet custom markers (avoids the missing-icon bundler bug) ----------
const numberIcon = (n: number, done: boolean, active: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:${done ? "#16a34a" : active ? "#7c3aed" : "#2563eb"};
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:#fff;font-weight:700;font-size:13px;">${
        done ? "✓" : n
      }</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26],
  })

const startIcon = L.divIcon({
  className: "",
  html: `<div style="width:34px;height:34px;border-radius:50%;background:#0f766e;border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;">
    <span style="color:#fff;font-size:16px;">🏁</span></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

const liveIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:20px;height:20px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:.35;
      animation:rmpulse 1.5s ease-out infinite;"></div>
    <div style="position:absolute;inset:5px;border-radius:50%;background:#2563eb;border:2px solid #fff;"></div>
    </div><style>@keyframes rmpulse{0%{transform:scale(.6);opacity:.6}100%{transform:scale(2.2);opacity:0}}</style>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

// Recenter the map to fit all provided points whenever they change.
const FitBounds: React.FC<{ points: LatLng[] }> = ({ points }) => {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
  }, [points, map])
  return null
}

// Captures a map click while the courier is dropping/adjusting a pin.
const ClickCatcher: React.FC<{ active: boolean; onPick: (p: LatLng) => void }> = ({ active, onPick }) => {
  useMapEvents({
    click(e) {
      if (active) onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

const RouteMap: React.FC = () => {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<string>(todayCairoYMD())
  const [start, setStart] = useState<LatLng>({ lat: START.lat, lng: START.lng })

  const [stops, setStops] = useState<Stop[]>([]) // in visiting order (located first, unlocated appended)
  const [loading, setLoading] = useState(true)
  const [geocoding, setGeocoding] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)

  // route metrics keyed to the current located order
  const [geometry, setGeometry] = useState<[number, number][]>([])
  const [legByStop, setLegByStop] = useState<Map<string, { km: number; min: number }>>(new Map())
  const [totalKm, setTotalKm] = useState(0)
  const [totalMin, setTotalMin] = useState(0)

  const [activeStopId, setActiveStopId] = useState<string | null>(null)
  const [pinStopId, setPinStopId] = useState<string | null>(null) // stop awaiting a map click

  // live GPS tracking
  const [tracking, setTracking] = useState(false)
  const [livePos, setLivePos] = useState<LatLng | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const traffic = useMemo(() => trafficHint(), [])
  const trafficMult = useMemo(() => trafficMultiplier(), [])

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqSeq = useRef(0) // guards against out-of-order async loads

  // Refine the fixed start once (best effort).
  useEffect(() => {
    let alive = true
    refineStart().then((p) => {
      if (alive) setStart(p)
    })
    return () => {
      alive = false
    }
  }, [])

  // ------------------------------------------------------------------ persist
  const persist = useCallback(
    (next: Stop[]) => {
      if (!user?.id) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        const payload: SavedStop[] = next.map((s) => ({
          order_id: s.orderId,
          lat: s.lat,
          lng: s.lng,
          done: s.done,
          done_at: s.doneAt,
          manual: s.manual,
        }))
        await supabase.from("courier_routes").upsert(
          { courier_id: user.id, route_date: selectedDate, stops: payload, updated_at: new Date().toISOString() },
          { onConflict: "courier_id,route_date" },
        )
      }, 700)
    },
    [user?.id, selectedDate],
  )

  // ------------------------------------------------------------------- load
  const load = useCallback(async () => {
    if (!user?.id) return
    const seq = ++reqSeq.current
    setLoading(true)
    setError(null)
    setUsedFallback(false)
    try {
      // 1) courier's orders for the selected date (assigned_at window, Cairo-tz filter)
      const startWin = new Date(`${selectedDate}T00:00:00Z`)
      startWin.setDate(startWin.getDate() - 1)
      const endWin = new Date(`${selectedDate}T23:59:59.999Z`)
      endWin.setDate(endWin.getDate() + 1)

      const [assignedRes, legacyRes] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, order_id, shopify_order_id, customer_name, customer_phone, mobile_number, address, shipping_address, billing_address, shipping_city, status, assigned_at, created_at",
          )
          .eq("assigned_courier_id", user.id)
          .not("assigned_at", "is", null)
          .gte("assigned_at", startWin.toISOString())
          .lte("assigned_at", endWin.toISOString()),
        supabase
          .from("orders")
          .select(
            "id, order_id, shopify_order_id, customer_name, customer_phone, mobile_number, address, shipping_address, billing_address, shipping_city, status, assigned_at, created_at",
          )
          .eq("assigned_courier_id", user.id)
          .is("assigned_at", null)
          .gte("created_at", startWin.toISOString())
          .lte("created_at", endWin.toISOString()),
      ])

      const rawAll = [
        ...((assignedRes.data as OrderRow[] | null) || []),
        ...((legacyRes.data as OrderRow[] | null) || []),
      ]
      // keep only rows whose effective Cairo date matches, and that are routable
      const dedup = new Map<string, OrderRow>()
      for (const o of rawAll) {
        const effDate = toCairoYMD(o.assigned_at || o.created_at)
        if (effDate !== selectedDate) continue
        if (o.status === "canceled") continue
        dedup.set(o.id, o)
      }
      const orders = Array.from(dedup.values())

      // 2) WhatsApp delivery windows (read-only project), keyed by several ids
      const winByKey = new Map<string, { date: string | null; time: string | null; loc: string | null }>()
      try {
        const { data: wa } = await whatsappSupabase
          .from("bb_whatsapp_orders")
          .select("order_id, customer_phone, delivery_date, delivery_time, delivery_location")
          .order("created_at", { ascending: false })
          .limit(2000)
        for (const w of wa || []) {
          const entry = { date: w.delivery_date, time: w.delivery_time, loc: w.delivery_location }
          if (w.order_id) winByKey.set("oid:" + String(w.order_id), entry)
          if (w.customer_phone) winByKey.set("ph:" + String(w.customer_phone), entry)
        }
      } catch {
        /* WhatsApp project optional — ignore if unreachable */
      }

      // 3) saved route for the date (order + done + manual pins)
      const { data: savedRow } = await supabase
        .from("courier_routes")
        .select("stops")
        .eq("courier_id", user.id)
        .eq("route_date", selectedDate)
        .maybeSingle()
      const saved = new Map<string, SavedStop>()
      const savedOrder: string[] = []
      if (savedRow?.stops && Array.isArray(savedRow.stops)) {
        for (const s of savedRow.stops as SavedStop[]) {
          if (!s?.order_id) continue
          saved.set(String(s.order_id), s)
          savedOrder.push(String(s.order_id))
        }
      }

      // 4) build stops with best-known coordinates (manual > whatsapp > none-yet)
      const buildAddress = (o: OrderRow): string => {
        const parts: string[] = []
        const a = o.address || o.shipping_address || o.billing_address
        if (a) parts.push(typeof a === "string" ? a : JSON.stringify(a))
        if (o.shipping_city) parts.push(String(o.shipping_city))
        return parts.join(", ")
      }

      const built: Stop[] = orders.map((o) => {
        const win =
          winByKey.get("oid:" + String(o.order_id)) ||
          (o.shopify_order_id ? winByKey.get("oid:" + String(o.shopify_order_id)) : undefined) ||
          (o.customer_phone ? winByKey.get("ph:" + String(o.customer_phone)) : undefined) ||
          (o.mobile_number ? winByKey.get("ph:" + String(o.mobile_number)) : undefined)

        const sv = saved.get(String(o.order_id))
        let lat: number | null = null
        let lng: number | null = null
        let coordSource: Stop["coordSource"] = null
        let manual = false

        if (sv?.manual && sv.lat != null && sv.lng != null) {
          lat = sv.lat
          lng = sv.lng
          coordSource = "manual"
          manual = true
        } else {
          const waLL = parseLatLng(win?.loc)
          if (waLL) {
            lat = waLL.lat
            lng = waLL.lng
            coordSource = "whatsapp"
          } else if (sv?.lat != null && sv?.lng != null) {
            lat = sv.lat
            lng = sv.lng
            coordSource = "geocode"
          }
        }

        return {
          id: o.id,
          orderId: String(o.order_id ?? o.id),
          name: o.customer_name || "—",
          phone: o.mobile_number || o.customer_phone || null,
          address: buildAddress(o),
          status: o.status,
          lat,
          lng,
          coordSource,
          manual,
          done: sv?.done ?? o.status === "delivered",
          doneAt: sv?.done_at ?? null,
          deliveryDate: win?.date ?? null,
          deliveryTime: win?.time ?? null,
        }
      })

      // order: saved order first (if any), then any new ones
      built.sort((a, b) => {
        const ia = savedOrder.indexOf(a.orderId)
        const ib = savedOrder.indexOf(b.orderId)
        if (ia === -1 && ib === -1) return 0
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
      })

      if (seq !== reqSeq.current) return
      setStops(built)
      setLoading(false)

      // 5) geocode the ones still missing coordinates (throttled)
      const needGeo = built.filter((s) => s.lat == null && s.address.trim().length > 0)
      if (needGeo.length > 0) {
        setGeocoding({ done: 0, total: needGeo.length })
        for (let i = 0; i < needGeo.length; i++) {
          if (seq !== reqSeq.current) return
          const hit = await geocode(needGeo[i].address)
          if (hit) {
            setStops((prev) =>
              prev.map((s) =>
                s.id === needGeo[i].id
                  ? { ...s, lat: hit.lat, lng: hit.lng, coordSource: hit.source === "approx" ? "approx" : "geocode" }
                  : s,
              ),
            )
          }
          setGeocoding({ done: i + 1, total: needGeo.length })
        }
        setGeocoding(null)
        // persist the freshly-resolved coordinates so we don't re-geocode next time
        if (seq === reqSeq.current) setStops((prev) => (persist(prev), prev))
      }

      // 6) if there was no saved order at all, auto-optimize once
      if (savedOrder.length === 0) {
        setTimeout(() => optimizeRef.current?.(), 300)
      }
    } catch (e) {
      if (seq === reqSeq.current) {
        setError(e instanceof Error ? e.message : "تعذر تحميل الطلبات")
        setLoading(false)
      }
    }
  }, [user?.id, selectedDate, persist])

  useEffect(() => {
    load()
  }, [load])

  // located stops, in current order
  const located = useMemo(() => stops.filter((s) => s.lat != null && s.lng != null), [stops])
  const unlocated = useMemo(() => stops.filter((s) => s.lat == null || s.lng == null), [stops])

  // recompute route metrics (geometry + legs + totals) for the current order
  const locatedKey = useMemo(() => located.map((s) => `${s.id}:${s.lat},${s.lng}`).join("|"), [located])
  useEffect(() => {
    let alive = true
    if (located.length === 0) {
      setGeometry([])
      setLegByStop(new Map())
      setTotalKm(0)
      setTotalMin(0)
      return
    }
    ;(async () => {
      const pts = located.map((s) => ({ lat: s.lat!, lng: s.lng! }))
      const r = await osrmRoute(start, pts)
      if (!alive) return
      const map = new Map<string, { km: number; min: number }>()
      located.forEach((s, i) => {
        const leg = r.legs[i]
        if (leg) map.set(s.id, { km: leg.distanceKm, min: leg.durationMin })
      })
      setGeometry(r.geometry)
      setLegByStop(map)
      setTotalKm(r.totalDistanceKm)
      setTotalMin(r.totalDurationMin)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locatedKey, start.lat, start.lng])

  // ---- optimize (OSRM trip; nearest-neighbour fallback) --------------------
  const optimize = useCallback(async () => {
    const loc = stops.filter((s) => s.lat != null && s.lng != null)
    if (loc.length < 2) return
    setOptimizing(true)
    setUsedFallback(false)
    const pts = loc.map((s) => ({ lat: s.lat!, lng: s.lng! }))
    let order: number[]
    try {
      const trip = await osrmTrip(start, pts)
      order = trip.order.length === pts.length ? trip.order : nearestNeighborOrder(start, pts)
      if (trip.order.length !== pts.length) setUsedFallback(true)
    } catch {
      order = nearestNeighborOrder(start, pts)
      setUsedFallback(true)
    }
    const reordered = order.map((i) => loc[i])
    const next = [...reordered, ...stops.filter((s) => s.lat == null || s.lng == null)]
    setStops(next)
    persist(next)
    setOptimizing(false)
  }, [stops, start, persist])

  const optimizeRef = useRef<typeof optimize>()
  useEffect(() => {
    optimizeRef.current = optimize
  }, [optimize])

  // ---- manual reorder (drag) ----------------------------------------------
  const onReorder = (oldIndex: number, newIndex: number) => {
    const reordered = arrayMove(located, oldIndex, newIndex)
    const next = [...reordered, ...unlocated]
    setStops(next)
    persist(next)
  }

  // ---- done toggle ---------------------------------------------------------
  const toggleDone = (id: string) => {
    const next = stops.map((s) =>
      s.id === id ? { ...s, done: !s.done, doneAt: !s.done ? new Date().toISOString() : null } : s,
    )
    setStops(next)
    persist(next)
  }

  // ---- manual pin ----------------------------------------------------------
  const onPickPin = async (p: LatLng) => {
    if (!pinStopId) return
    const target = stops.find((s) => s.id === pinStopId)
    const next = stops.map((s) =>
      s.id === pinStopId ? { ...s, lat: p.lat, lng: p.lng, coordSource: "manual" as const, manual: true } : s,
    )
    setStops(next)
    persist(next)
    if (target?.address) saveManualGeocode(target.address, p)
    setPinStopId(null)
  }

  // ---- live tracking -------------------------------------------------------
  const toggleTracking = () => {
    if (tracking) {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      setTracking(false)
      return
    }
    if (!("geolocation" in navigator)) {
      setError("المتصفح لا يدعم تحديد الموقع")
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setLivePos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("تعذر الوصول للموقع — تأكد من تفعيل صلاحية الموقع"),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    )
    setTracking(true)
  }
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  // ---- ETA / lateness per located stop ------------------------------------
  const etaBase = useMemo(() => {
    // Start "now" for today, else 9:00 AM on the chosen date (Cairo).
    if (selectedDate === todayCairoYMD()) return new Date()
    return new Date(`${selectedDate}T07:00:00Z`) // ~09:00 Cairo
  }, [selectedDate])

  const routeRows = useMemo(() => {
    let cumMin = 0
    return located.map((s) => {
      const leg = legByStop.get(s.id)
      const legMin = (leg?.min ?? 0) * trafficMult
      cumMin += legMin
      const arrivalClock = clockAfter(etaBase, cumMin)
      const arrivalMinOfDay = (() => {
        const d = new Date(etaBase.getTime() + cumMin * 60000)
        const hm = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Africa/Cairo",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(d)
        const [h, m] = hm.split(":").map(Number)
        return h * 60 + m
      })()
      const win = parseWindow(s.deliveryTime)
      const late = !!win && !s.done && arrivalMinOfDay > win.end
      const early = !!win && !s.done && arrivalMinOfDay < win.start
      cumMin += SERVICE_MIN
      return {
        stop: s,
        legKm: leg?.km ?? 0,
        legMin,
        arrivalClock,
        late,
        early,
        window: win,
      }
    })
  }, [located, legByStop, trafficMult, etaBase])

  const doneCount = stops.filter((s) => s.done).length
  const finishClock = clockAfter(etaBase, totalMin * trafficMult + located.length * SERVICE_MIN)
  const lateCount = routeRows.filter((r) => r.late).length

  const mapCenter: [number, number] = located.length
    ? [located[0].lat!, located[0].lng!]
    : [start.lat, start.lng]
  const fitPoints: LatLng[] = [start, ...located.map((s) => ({ lat: s.lat!, lng: s.lng! }))]

  const shiftDate = (delta: number) => {
    const d = new Date(`${selectedDate}T12:00:00Z`)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  // ------------------------------------------------------------------ render
  return (
    <div className="p-3 sm:p-5 max-w-[1400px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <RouteIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">خريطة الطريق</h1>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Flag className="w-3 h-3" /> البداية: {START.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-200 shadow-sm p-1">
            <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="اليوم السابق">
              <ChevronRight className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-semibold text-gray-800 bg-transparent outline-none px-1"
            />
            <button onClick={() => shiftDate(1)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="اليوم التالي">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Traffic banner */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
            traffic.level === "heavy"
              ? "bg-red-50 text-red-700 border-red-200"
              : traffic.level === "moderate"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
          <Gauge className="w-4 h-4 flex-shrink-0" />
          <span>{traffic.text}</span>
        </div>

        {/* Stats + actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard icon={MapPin} label="عدد الطلبات" value={`${stops.length}`} sub={`${doneCount} تم`} />
          <StatCard icon={RouteIcon} label="المسافة" value={fmtDistance(totalKm)} />
          <StatCard
            icon={Timer}
            label="الوقت المقدّر"
            value={fmtDuration(totalMin * trafficMult + located.length * SERVICE_MIN)}
            sub={`ينتهي ~${finishClock}`}
          />
          <StatCard
            icon={AlertTriangle}
            label="خارج الموعد"
            value={`${lateCount}`}
            danger={lateCount > 0}
            sub={lateCount > 0 ? "راجع الترتيب" : "الكل بالموعد"}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={optimize}
            disabled={optimizing || located.length < 2}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-semibold shadow hover:opacity-90 disabled:opacity-50"
          >
            {optimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            رتّب حسب الأقرب
          </button>
          <a
            href={googleMapsRouteLink(
              start,
              located.filter((s) => !s.done).map((s) => ({ lat: s.lat!, lng: s.lng! })),
            )}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow ${
              located.some((s) => !s.done)
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-gray-200 text-gray-400 pointer-events-none"
            }`}
          >
            <Navigation className="w-4 h-4" /> تنقّل للكل
          </a>
          <button
            onClick={toggleTracking}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow border ${
              tracking ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Locate className="w-4 h-4" /> {tracking ? "التتبّع يعمل" : "تتبّع موقعي"}
          </button>
        </div>

        {geocoding && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> جارٍ تحديد مواقع العناوين ({geocoding.done}/
            {geocoding.total})…
          </div>
        )}
        {usedFallback && (
          <div className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> تم الترتيب تقريبياً (خدمة الطرق غير متاحة الآن).
          </div>
        )}
        {pinStopId && (
          <div className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 flex items-center gap-1">
            <Crosshair className="w-3.5 h-3.5" /> اضغط على الخريطة لتحديد موقع هذا الطلب.
            <button className="underline mr-2" onClick={() => setPinStopId(null)}>
              إلغاء
            </button>
          </div>
        )}
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}
      </div>

      {/* Body: map + list */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Map */}
        <div className="lg:col-span-3 h-[420px] lg:h-[640px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
          <MapContainer center={mapCenter} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={fitPoints} />
            <ClickCatcher active={!!pinStopId} onPick={onPickPin} />
            <Marker position={[start.lat, start.lng]} icon={startIcon}>
              <Popup>نقطة البداية — {START.label}</Popup>
            </Marker>
            {located.map((s, i) => (
              <Marker
                key={s.id}
                position={[s.lat!, s.lng!]}
                icon={numberIcon(i + 1, s.done, activeStopId === s.id)}
                eventHandlers={{ click: () => setActiveStopId(s.id) }}
              >
                <Popup>
                  <div className="text-right" dir="rtl">
                    <div className="font-bold">
                      {i + 1}. {s.name}
                    </div>
                    <div className="text-xs text-gray-600">{s.address}</div>
                    {s.deliveryTime && <div className="text-xs text-blue-600 mt-1">⏰ {s.deliveryTime}</div>}
                    <a
                      href={googleMapsStopLink({ lat: s.lat!, lng: s.lng! })}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-600 underline mt-1 inline-block"
                    >
                      افتح في خرائط جوجل
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
            {geometry.length > 1 && (
              <Polyline positions={geometry} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.7 }} />
            )}
            {livePos && (
              <Marker position={[livePos.lat, livePos.lng]} icon={liveIcon}>
                <Popup>موقعك الحالي</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Stop list */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> جارٍ التحميل…
            </div>
          ) : located.length === 0 && unlocated.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
              <MapPin className="w-8 h-8 mb-2 opacity-50" />
              لا توجد طلبات في هذا اليوم.
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <RouteIcon className="w-3.5 h-3.5" /> اسحب لإعادة الترتيب يدوياً
              </div>
              <List
                values={routeRows}
                onChange={({ oldIndex, newIndex }) => onReorder(oldIndex, newIndex)}
                renderList={({ children, props }) => (
                  <ul {...props} className="space-y-2">
                    {children}
                  </ul>
                )}
                renderItem={({ value: row, props, index }) => {
                  const s = row.stop
                  const active = activeStopId === s.id
                  return (
                    <li
                      {...props}
                      className={`list-none bg-white rounded-xl border p-3 shadow-sm cursor-grab ${
                        s.done
                          ? "border-green-200 opacity-70"
                          : active
                            ? "border-purple-400 ring-2 ring-purple-100"
                            : row.late
                              ? "border-red-200"
                              : "border-gray-200"
                      }`}
                      onClick={() => setActiveStopId(s.id)}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            s.done ? "bg-green-600" : "bg-blue-600"
                          }`}
                        >
                          {s.done ? <Check className="w-4 h-4" /> : (index ?? 0) + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-gray-900 text-sm truncate">{s.name}</span>
                            <span className="text-[11px] text-gray-400 flex-shrink-0">#{s.orderId}</span>
                          </div>
                          <div className="text-xs text-gray-500 truncate mt-0.5" title={s.address}>
                            {s.address || "—"}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">
                              <RouteIcon className="w-3 h-3" /> {fmtDistance(row.legKm)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">
                              <Clock className="w-3 h-3" /> ~{row.arrivalClock}
                            </span>
                            {s.deliveryTime && (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5 ${
                                  row.late
                                    ? "bg-red-100 text-red-700"
                                    : row.early
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                ⏰ {s.deliveryTime}
                                {row.late ? " (متأخر)" : row.early ? " (مبكر)" : ""}
                              </span>
                            )}
                            {s.coordSource === "manual" && (
                              <span className="text-[11px] bg-purple-100 text-purple-700 rounded px-1.5 py-0.5">
                                موقع يدوي
                              </span>
                            )}
                            {s.coordSource === "approx" && (
                              <span
                                className="text-[11px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5"
                                title="لم نتمكن من تحديد العنوان بدقة — الموقع تقريبي، اضغط تعديل الموقع لضبطه"
                              >
                                موقع تقريبي
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-2">
                            <a
                              href={googleMapsStopLink({ lat: s.lat!, lng: s.lng! })}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2 py-1"
                            >
                              <Navigation className="w-3 h-3" /> تنقّل
                            </a>
                            {s.phone && (
                              <a
                                href={`tel:${s.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg px-2 py-1"
                              >
                                <Phone className="w-3 h-3" /> اتصال
                              </a>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setPinStopId(s.id)
                              }}
                              className="flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg px-2 py-1"
                            >
                              <Crosshair className="w-3 h-3" /> تعديل الموقع
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleDone(s.id)
                              }}
                              className={`flex items-center gap-1 text-[11px] font-medium rounded-lg px-2 py-1 mr-auto ${
                                s.done
                                  ? "text-gray-600 bg-gray-100 hover:bg-gray-200"
                                  : "text-green-700 bg-green-50 hover:bg-green-100"
                              }`}
                            >
                              <Check className="w-3 h-3" /> {s.done ? "تراجع" : "تم"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                }}
              />

              {/* Unlocated stops needing a manual pin */}
              {unlocated.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-amber-700 flex items-center gap-1 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> طلبات بدون موقع محدد ({unlocated.length}) — حدد
                    مكانها على الخريطة
                  </div>
                  <ul className="space-y-2">
                    {unlocated.map((s) => (
                      <li key={s.id} className="bg-amber-50 rounded-xl border border-amber-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-gray-900 text-sm truncate">{s.name}</span>
                          <span className="text-[11px] text-gray-400">#{s.orderId}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">{s.address || "لا يوجد عنوان"}</div>
                        <button
                          onClick={() => setPinStopId(s.id)}
                          className="mt-2 flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg px-2 py-1"
                        >
                          <Crosshair className="w-3 h-3" /> تحديد الموقع على الخريطة
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const StatCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  danger?: boolean
}> = ({ icon: Icon, label, value, sub, danger }) => (
  <div className={`bg-white rounded-xl border p-3 shadow-sm ${danger ? "border-red-200" : "border-gray-200"}`}>
    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <div className={`text-lg font-bold mt-0.5 ${danger ? "text-red-600" : "text-gray-900"}`}>{value}</div>
    {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
  </div>
)

export default RouteMap
