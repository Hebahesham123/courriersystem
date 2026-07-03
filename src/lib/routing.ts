// ============================================================================
// Routing / geo helpers for the courier Route Map tab.
//
// Uses only free/open services (no API key):
//   - OSRM public server  -> real road route optimization + distance/ETA + geometry
//   - Nominatim public     -> geocoding of text addresses (cached in geocode_cache)
//   - Google Maps deep-links for turn-by-turn navigation in the courier's phone
//
// Live traffic is not available on these free services, so ETAs are adjusted
// with a Cairo rush-hour heuristic (see trafficMultiplier / trafficHint).
// ============================================================================

import { supabase } from "./supabase"

export interface LatLng {
  lat: number
  lng: number
}

// Fixed courier base: 24 Ahmed Wasfy Street, Almaza, Masr El Gedida (Heliopolis).
// Coordinates are a sensible default for Almaza/Ahmed Wasfy; refineStart() will
// try to sharpen them once via Nominatim (best-effort, non-blocking).
export const START: LatLng & { label: string } = {
  lat: 30.0958,
  lng: 31.366,
  label: "24 Ahmed Wasfy St, Almaza, Heliopolis",
}

const OSRM_BASE = "https://router.project-osrm.org"
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org"

// ----------------------------------------------------------------------------
// Distance (straight-line, km) — used for the nearest-neighbour fallback.
// ----------------------------------------------------------------------------
export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371 // km
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// ----------------------------------------------------------------------------
// Nearest-neighbour ordering from a fixed start. Returns the visiting order as
// indices into `points`. Used when OSRM is unavailable.
// ----------------------------------------------------------------------------
export function nearestNeighborOrder(start: LatLng, points: LatLng[]): number[] {
  const remaining = points.map((_, i) => i)
  const order: number[] = []
  let current = start
  while (remaining.length > 0) {
    let bestIdx = 0
    let bestDist = Infinity
    for (let k = 0; k < remaining.length; k++) {
      const d = haversine(current, points[remaining[k]])
      if (d < bestDist) {
        bestDist = d
        bestIdx = k
      }
    }
    const chosen = remaining.splice(bestIdx, 1)[0]
    order.push(chosen)
    current = points[chosen]
  }
  return order
}

export interface OsrmResult {
  // Visiting order as indices into the `points` array passed in (excludes start).
  order: number[]
  // Route geometry as [lat, lng] pairs, ready for a Leaflet <Polyline>.
  geometry: [number, number][]
  // Per-leg metrics, aligned to the visiting order (leg i = travel INTO stop i).
  // legs[i] is the leg arriving at the i-th visited stop; legs are in visiting order.
  legs: { distanceKm: number; durationMin: number }[]
  totalDistanceKm: number
  totalDurationMin: number
}

// ----------------------------------------------------------------------------
// OSRM Trip service: solves the (open) TSP with a fixed first point (`start`)
// and no return to origin. Returns optimized order + geometry + per-leg metrics.
// Throws on any failure so the caller can fall back to nearest-neighbour.
// ----------------------------------------------------------------------------
export async function osrmTrip(start: LatLng, points: LatLng[]): Promise<OsrmResult> {
  if (points.length === 0) {
    return { order: [], geometry: [], legs: [], totalDistanceKm: 0, totalDurationMin: 0 }
  }
  const coords = [start, ...points].map((p) => `${p.lng},${p.lat}`).join(";")
  const url =
    `${OSRM_BASE}/trip/v1/driving/${coords}` +
    `?source=first&roundtrip=false&geometries=geojson&overview=full&annotations=false`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM trip failed: ${res.status}`)
  const data = await res.json()
  if (data.code !== "Ok" || !data.trips?.length || !data.waypoints?.length) {
    throw new Error(`OSRM trip returned ${data.code}`)
  }

  // waypoints[i].waypoint_index = position of input point i within the optimized trip.
  // Input index 0 is `start`; input indices 1..N map to points[0..N-1].
  const N = points.length
  const orderByTripPos: number[] = new Array(N + 1).fill(-1)
  ;(data.waypoints as { waypoint_index: number }[]).forEach((w, inputIdx) => {
    orderByTripPos[w.waypoint_index] = inputIdx
  })
  // Walk trip positions 1..N (skip position 0 = start) → point index (inputIdx-1).
  const order: number[] = []
  for (let pos = 1; pos <= N; pos++) {
    const inputIdx = orderByTripPos[pos]
    if (inputIdx > 0) order.push(inputIdx - 1)
  }

  const trip = data.trips[0]
  const geometry: [number, number][] = (trip.geometry?.coordinates || []).map(
    (c: [number, number]) => [c[1], c[0]] as [number, number],
  )
  const legs = ((trip.legs || []) as { distance?: number; duration?: number }[]).map((l) => ({
    distanceKm: (l.distance || 0) / 1000,
    durationMin: (l.duration || 0) / 60,
  }))

  return {
    order,
    geometry,
    legs,
    totalDistanceKm: (trip.distance || 0) / 1000,
    totalDurationMin: (trip.duration || 0) / 60,
  }
}

// ----------------------------------------------------------------------------
// OSRM Route service: distance/ETA + geometry for a FIXED given sequence
// (start -> stops in the exact order provided). Used after a manual reorder or
// when replaying a saved route. Falls back to a straight-line estimate at an
// average city speed if OSRM is unavailable, so the UI still shows numbers.
// ----------------------------------------------------------------------------
const CITY_KMH = 22 // rough average driving speed inside Greater Cairo

function estimateRoute(start: LatLng, stops: LatLng[]): OsrmResult {
  const legs: { distanceKm: number; durationMin: number }[] = []
  const geometry: [number, number][] = [[start.lat, start.lng]]
  let prev = start
  let totalDistanceKm = 0
  let totalDurationMin = 0
  for (const s of stops) {
    const km = haversine(prev, s) * 1.3 // inflate straight-line to approximate roads
    const min = (km / CITY_KMH) * 60
    legs.push({ distanceKm: km, durationMin: min })
    totalDistanceKm += km
    totalDurationMin += min
    geometry.push([s.lat, s.lng])
    prev = s
  }
  return { order: stops.map((_, i) => i), geometry, legs, totalDistanceKm, totalDurationMin }
}

export async function osrmRoute(start: LatLng, stops: LatLng[]): Promise<OsrmResult> {
  if (stops.length === 0) {
    return { order: [], geometry: [[start.lat, start.lng]], legs: [], totalDistanceKm: 0, totalDurationMin: 0 }
  }
  const coords = [start, ...stops].map((p) => `${p.lng},${p.lat}`).join(";")
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?geometries=geojson&overview=full&annotations=false`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`OSRM route failed: ${res.status}`)
    const data = await res.json()
    if (data.code !== "Ok" || !data.routes?.length) throw new Error(`OSRM route ${data.code}`)
    const route = data.routes[0]
    const geometry: [number, number][] = (route.geometry?.coordinates || []).map(
      (c: [number, number]) => [c[1], c[0]] as [number, number],
    )
    const legs = ((route.legs || []) as { distance?: number; duration?: number }[]).map((l) => ({
      distanceKm: (l.distance || 0) / 1000,
      durationMin: (l.duration || 0) / 60,
    }))
    return {
      order: stops.map((_, i) => i),
      geometry,
      legs,
      totalDistanceKm: (route.distance || 0) / 1000,
      totalDurationMin: (route.duration || 0) / 60,
    }
  } catch {
    return estimateRoute(start, stops)
  }
}

// ----------------------------------------------------------------------------
// Geocoding (address text -> lat/lng) with a shared Supabase cache so each
// distinct address hits Nominatim at most once. Nominatim asks for <=1 req/s,
// so callers should await sequentially (geocodeMany handles the throttle).
// ----------------------------------------------------------------------------
export function normalizeAddressKey(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 400)
}

// Parse "(lat,lng)" / "lat, lng" strings (WhatsApp delivery_location). Mirrors
// the parser used in Admin/Calendar.tsx.
export function parseLatLng(loc?: string | null): LatLng | null {
  if (!loc) return null
  const m = loc.match(/\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?/)
  if (!m) return null
  const lat = parseFloat(m[1])
  const lng = parseFloat(m[2])
  if (isNaN(lat) || isNaN(lng)) return null
  // Sanity check: keep it inside a rough Greater-Cairo / Egypt box.
  if (lat < 22 || lat > 32 || lng < 24 || lng > 37) return null
  return { lat, lng }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export interface GeocodeHit extends LatLng {
  displayName?: string
  source: string // 'nominatim' | 'manual' | 'delivery_location' | 'approx'
}

// ----------------------------------------------------------------------------
// Greater-Cairo neighborhood centroids. Nominatim frequently fails on the messy,
// free-form Egyptian addresses we get (house numbers, floor/apartment tokens,
// mixed Arabic/English), so when a precise lookup fails we snap the stop to the
// centroid of its detected area — good enough to place it in the right zone and
// order the route roughly; the courier fine-tunes the pin. Regex is matched
// case-insensitively against the raw address (English + Arabic spellings).
// ----------------------------------------------------------------------------
const AREA_CENTROIDS: { re: RegExp; lat: number; lng: number; label: string }[] = [
  { re: /heliopolis|مصر\s*الجديدة|هليوبوليس|almaza|الماظة|الماظه|روكسي|roxy|كوربة|korba/i, lat: 30.0917, lng: 31.345, label: "مصر الجديدة" },
  { re: /nasr\s*city|مدينة\s*نصر|نصر\s*سيتي|عباس\s*العقاد|مكرم\s*عبيد/i, lat: 30.0566, lng: 31.33, label: "مدينة نصر" },
  { re: /\bmaadi\b|المعادي|معادي|زهراء\s*المعادي/i, lat: 29.96, lng: 31.257, label: "المعادي" },
  { re: /mokattam|المقطم|مقطم/i, lat: 30.013, lng: 31.308, label: "المقطم" },
  { re: /zamalek|الزمالك|زمالك/i, lat: 30.061, lng: 31.22, label: "الزمالك" },
  { re: /downtown|وسط\s*البلد|طلعت\s*حرب|رمسيس|ramsis|ramses/i, lat: 30.0444, lng: 31.2357, label: "وسط البلد" },
  { re: /\b5(th)?\s*settlement\b|التجمع\s*الخامس|تجمع\s*خامس|new\s*cairo|القاهرة\s*الجديدة|tagamoa|تجمع/i, lat: 30.03, lng: 31.47, label: "التجمع / القاهرة الجديدة" },
  { re: /\brehab\b|الرحاب/i, lat: 30.06, lng: 31.49, label: "الرحاب" },
  { re: /madinaty|مدينتي/i, lat: 30.1, lng: 31.64, label: "مدينتي" },
  { re: /shorouk|الشروق/i, lat: 30.12, lng: 31.62, label: "الشروق" },
  { re: /\bobour\b|العبور/i, lat: 30.228, lng: 31.46, label: "العبور" },
  { re: /nozha|النزهة|النزهه/i, lat: 30.105, lng: 31.34, label: "النزهة" },
  { re: /ain\s*shams|عين\s*شمس/i, lat: 30.13, lng: 31.33, label: "عين شمس" },
  { re: /\bmarg\b|المرج/i, lat: 30.156, lng: 31.335, label: "المرج" },
  { re: /matareya|المطرية|المطريه/i, lat: 30.12, lng: 31.31, label: "المطرية" },
  { re: /shubra|شبرا/i, lat: 30.11, lng: 31.244, label: "شبرا" },
  { re: /helwan|حلوان/i, lat: 29.85, lng: 31.334, label: "حلوان" },
  { re: /abbasia|العباسية|عباسية|abbassia/i, lat: 30.069, lng: 31.283, label: "العباسية" },
  { re: /sayeda\s*zeinab|السيدة\s*زينب|السيده\s*زينب/i, lat: 30.029, lng: 31.235, label: "السيدة زينب" },
  { re: /dokki|الدقي|دقي/i, lat: 30.038, lng: 31.211, label: "الدقي" },
  { re: /mohandes(s)?in|المهندسين|مهندسين/i, lat: 30.058, lng: 31.2, label: "المهندسين" },
  { re: /agouza|العجوزة|عجوزة/i, lat: 30.054, lng: 31.205, label: "العجوزة" },
  { re: /imbaba|إمبابة|امبابة/i, lat: 30.077, lng: 31.207, label: "إمبابة" },
  { re: /\bharam\b|الهرم|هرم/i, lat: 29.993, lng: 31.149, label: "الهرم" },
  { re: /faisal|فيصل/i, lat: 29.997, lng: 31.156, label: "فيصل" },
  { re: /\b6(th)?\s*(of\s*)?october\b|6\s*أكتوبر|السادس\s*من\s*أكتوبر|اكتوبر|أكتوبر/i, lat: 29.936, lng: 30.927, label: "6 أكتوبر" },
  { re: /sheikh\s*zayed|الشيخ\s*زايد|زايد/i, lat: 30.04, lng: 30.97, label: "الشيخ زايد" },
  { re: /giza|الجيزة|جيزه/i, lat: 30.013, lng: 31.209, label: "الجيزة" },
]

// Detect a Greater-Cairo area from address text and return its centroid.
// Falls back to central Cairo when text exists but no area matches (all
// deliveries are Greater Cairo, so this is a safe default).
export function areaCentroid(text?: string | null): GeocodeHit | null {
  if (!text || !text.trim()) return null
  for (const a of AREA_CENTROIDS) {
    if (a.re.test(text)) return { lat: a.lat, lng: a.lng, displayName: a.label, source: "approx" }
  }
  return { lat: 30.0444, lng: 31.2357, displayName: "القاهرة (تقريبي)", source: "approx" }
}

// Build a short list of query variants to try against Nominatim, from most
// specific to least, so a clean tail like "Maadi, Cairo" can still hit when the
// full messy string doesn't.
function queryVariants(address: string): string[] {
  const out: string[] = [address]
  const segs = address
    .split(/[,\-–—|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
  if (segs.length >= 2) {
    const tail = segs.slice(-2).join(", ")
    if (!out.includes(tail)) out.push(`${tail}, Egypt`)
  }
  return out
}

// One Nominatim call for a single query string. Returns a hit or null.
async function nominatimOnce(q: string): Promise<GeocodeHit | null> {
  try {
    const url = `${NOMINATIM_BASE}/search?format=json&limit=1&countrycodes=eg&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { Accept: "application/json" } })
    if (!res.ok) return null
    const arr = await res.json()
    if (!Array.isArray(arr) || arr.length === 0) return null
    const hit = arr[0]
    const lat = parseFloat(hit.lat)
    const lng = parseFloat(hit.lon)
    if (isNaN(lat) || isNaN(lng)) return null
    return { lat, lng, displayName: hit.display_name, source: "nominatim" }
  } catch {
    return null
  }
}

// Persist a geocode result (best-effort; ignores errors, e.g. table missing).
async function cacheGeocode(key: string, hit: GeocodeHit): Promise<void> {
  await supabase
    .from("geocode_cache")
    .upsert(
      { address_key: key, lat: hit.lat, lng: hit.lng, display_name: hit.displayName || null, source: hit.source },
      { onConflict: "address_key" },
    )
}

// Resolve an address to coordinates. Strategy:
//   1) shared cache
//   2) Nominatim on a few query variants (full address, then a cleaned tail)
//   3) area-centroid fallback (source 'approx') so the stop still maps to the
//      right zone — the courier can then drag the pin to the exact spot.
// Always returns a point when the address has any usable text.
export async function geocode(address: string): Promise<GeocodeHit | null> {
  const key = normalizeAddressKey(address)
  if (!key) return null

  // 1) cache
  const { data: cached } = await supabase
    .from("geocode_cache")
    .select("lat, lng, display_name, source")
    .eq("address_key", key)
    .maybeSingle()
  if (cached && cached.lat != null && cached.lng != null) {
    return { lat: cached.lat, lng: cached.lng, displayName: cached.display_name, source: cached.source }
  }

  // 2) precise lookup across variants (throttled between network calls)
  const variants = queryVariants(address)
  for (let i = 0; i < variants.length; i++) {
    if (i > 0) await sleep(1100) // respect Nominatim ~1 req/s between variants
    const hit = await nominatimOnce(variants[i])
    if (hit) {
      await cacheGeocode(key, hit)
      return hit
    }
  }

  // 3) approximate area centroid (still placed on the map, flagged as approx)
  const approx = areaCentroid(address)
  if (approx) {
    await cacheGeocode(key, approx)
    return approx
  }
  return null
}

// Geocode a batch sequentially, respecting Nominatim's ~1 req/s policy.
// Cached hits don't count against the rate limit, so we only sleep after a
// live network lookup. Reports progress via the optional callback.
export async function geocodeMany(
  addresses: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, GeocodeHit>> {
  const out = new Map<string, GeocodeHit>()
  const unique = Array.from(new Set(addresses.map((a) => a).filter(Boolean)))
  for (let i = 0; i < unique.length; i++) {
    const addr = unique[i]
    const key = normalizeAddressKey(addr)

    // check cache first (no throttle needed)
    const { data: cached } = await supabase
      .from("geocode_cache")
      .select("lat, lng, display_name, source")
      .eq("address_key", key)
      .maybeSingle()
    if (cached && cached.lat != null && cached.lng != null) {
      out.set(addr, { lat: cached.lat, lng: cached.lng, displayName: cached.display_name, source: cached.source })
      onProgress?.(i + 1, unique.length)
      continue
    }

    const hit = await geocode(addr)
    if (hit) out.set(addr, hit)
    onProgress?.(i + 1, unique.length)
    await sleep(1100) // stay under Nominatim's 1 req/s
  }
  return out
}

// Persist a manual pin the courier dropped, so it becomes the cached answer.
export async function saveManualGeocode(address: string, point: LatLng): Promise<void> {
  const key = normalizeAddressKey(address)
  if (!key) return
  await supabase.from("geocode_cache").upsert(
    { address_key: key, lat: point.lat, lng: point.lng, display_name: null, source: "manual" },
    { onConflict: "address_key" },
  )
}

// ----------------------------------------------------------------------------
// "Road rush" traffic heuristic for Greater Cairo. There is no free live-traffic
// feed for OSM, so we scale free-flow ETAs by time of day.
// ----------------------------------------------------------------------------
export type TrafficLevel = "light" | "moderate" | "heavy"

// Current hour in Afric/Cairo (0-23), independent of the browser timezone.
export function cairoHour(d: Date = new Date()): number {
  const s = d.toLocaleString("en-US", { timeZone: "Africa/Cairo", hour: "2-digit", hour12: false })
  const h = parseInt(s, 10)
  return isNaN(h) ? d.getHours() : h % 24
}

export function trafficLevel(d: Date = new Date()): TrafficLevel {
  const h = cairoHour(d)
  // Heavy: morning 7-10 & evening 15-20 (school run + rush + after-work)
  if ((h >= 7 && h < 10) || (h >= 15 && h < 20)) return "heavy"
  // Moderate shoulders around the peaks
  if ((h >= 10 && h < 15) || (h >= 20 && h < 22) || (h >= 6 && h < 7)) return "moderate"
  return "light"
}

export function trafficMultiplier(d: Date = new Date()): number {
  switch (trafficLevel(d)) {
    case "heavy":
      return 1.4
    case "moderate":
      return 1.2
    default:
      return 1.0
  }
}

export function trafficHint(d: Date = new Date()): { level: TrafficLevel; text: string } {
  const level = trafficLevel(d)
  if (level === "heavy")
    return {
      level,
      text: "🚦 وقت الذروة — الطرق مزدحمة الآن، أضفنا ~40% لوقت الوصول. حاول تبدأ بالطلبات الأقرب.",
    }
  if (level === "moderate")
    return { level, text: "🚗 ازدحام متوسط — أضفنا ~20% لوقت الوصول المتوقع." }
  return { level, text: "✅ الطرق سالكة الآن — أوقات الوصول قريبة من الطبيعي." }
}

// ----------------------------------------------------------------------------
// Google Maps deep links (open the phone's Google Maps app for navigation).
// ----------------------------------------------------------------------------
export function googleMapsStopLink(p: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`
}

// Full multi-stop route: origin = start, destination = last stop, rest = waypoints.
export function googleMapsRouteLink(start: LatLng, stops: LatLng[]): string {
  if (stops.length === 0) return googleMapsStopLink(start)
  const dest = stops[stops.length - 1]
  const waypoints = stops.slice(0, -1).map((s) => `${s.lat},${s.lng}`).join("|")
  let url =
    `https://www.google.com/maps/dir/?api=1&origin=${start.lat},${start.lng}` +
    `&destination=${dest.lat},${dest.lng}&travelmode=driving`
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`
  return url
}

// ----------------------------------------------------------------------------
// Best-effort one-time refinement of the START coordinates via Nominatim.
// Returns refined coords or the default if lookup fails. Callers may ignore.
// ----------------------------------------------------------------------------
export async function refineStart(): Promise<LatLng> {
  try {
    const hit = await geocode("24 Ahmed Wasfy Street, Almaza, Heliopolis, Cairo, Egypt")
    if (hit && hit.lat > 29.8 && hit.lat < 30.3 && hit.lng > 31.2 && hit.lng < 31.6) {
      return { lat: hit.lat, lng: hit.lng }
    }
  } catch {
    /* ignore — fall back to the default constant */
  }
  return { lat: START.lat, lng: START.lng }
}

// Small helpers for ETA formatting.
export function fmtDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} م`
  return `${km.toFixed(1)} كم`
}

export function fmtDuration(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} د`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} س ${r} د` : `${h} س`
}

// Add minutes to a Date, returning the clock time in Africa/Cairo as "h:mm AM/PM".
export function clockAfter(base: Date, addMinutes: number): string {
  const d = new Date(base.getTime() + addMinutes * 60000)
  return d.toLocaleString("en-US", {
    timeZone: "Africa/Cairo",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
