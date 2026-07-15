import { supabase } from "./supabase"

// Scheduled-assignment helpers.
//
// When an admin assigns an order to a courier for a FUTURE day (tomorrow or any
// coming day — not today), we must NOT let the order look "assigned" yet, because
// an external system watches the orders table for status = "assigned" and fires the
// customer confirmation webhook. Instead we mark it as "scheduled" so the webhook
// ignores it, and automatically flip it to "assigned" when its day arrives.

/**
 * True when `assignmentDate` falls on a calendar day strictly after today
 * (compared by local date only, ignoring the time of day).
 */
export function isFutureAssignmentDate(assignmentDate: Date): boolean {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(
    assignmentDate.getFullYear(),
    assignmentDate.getMonth(),
    assignmentDate.getDate(),
  ).getTime()
  return target > today
}

/**
 * Status to write when assigning an order:
 *  - future day  -> "scheduled" (kept hidden from the confirmation webhook)
 *  - today/past  -> "assigned"  (normal flow, webhook picks it up)
 */
export function assignmentStatusFor(assignmentDate: Date): "assigned" | "scheduled" {
  return isFutureAssignmentDate(assignmentDate) ? "scheduled" : "assigned"
}

/**
 * Client-side catch-up: flip any "scheduled" orders whose day has arrived to
 * "assigned" so the external confirmation webhook starts seeing them. Safe to call
 * on app load / login. The database cron job does the same thing server-side; this
 * just makes activation immediate while an admin is using the dashboard.
 *
 * Returns the number of orders activated.
 */
export async function activateDueScheduledOrders(): Promise<number> {
  const now = new Date()
  // Everything scheduled up to the end of today (local) is now due.
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString()

  const { data, error } = await supabase
    .from("orders")
    .update({ status: "assigned", updated_at: new Date().toISOString() })
    .eq("status", "scheduled")
    .lte("assigned_at", endOfToday)
    .select("id")

  if (error) {
    console.error("Failed to activate due scheduled orders:", error)
    return 0
  }
  return data?.length ?? 0
}
