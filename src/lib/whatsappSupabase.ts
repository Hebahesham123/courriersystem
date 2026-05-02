import { createClient } from "@supabase/supabase-js"

// Separate Supabase project that holds WhatsApp customer confirmations
// (table: bb_whatsapp_orders). Read-only from this app.
const url = "https://zfwgidlskmpecvzbbstk.supabase.co"
const anonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpmd2dpZGxza21wZWN2emJic3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTA1ODMsImV4cCI6MjA5MTY2NjU4M30.ykNtefyYGNe5i3Uqps2S5oHOIbMObBefZ2-BIP6utTw"

export const whatsappSupabase = createClient(url, anonKey, {
  auth: { persistSession: false },
})

export interface WhatsAppOrder {
  id: number
  created_at: string
  order_id: string
  order_name: string | null
  customer_phone: string | null
  customer_name: string | null
  delivery_date: string | null // e.g. "Sun 26 Apr"
  delivery_time: string | null // e.g. "3:00 PM - 5:00 PM"
  delivery_location: string | null
  conversation_id: string | null
  status: string | null
  updated_at: string | null
}
