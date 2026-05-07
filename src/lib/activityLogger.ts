import { supabase } from "./supabase"

export interface LogActor {
  id?: string | null
  name?: string | null
  email?: string | null
  role?: string | null
}

export interface LogEntry {
  action: string
  entityType?: string
  entityId?: string | number | null
  entityLabel?: string | null
  details?: Record<string, unknown> | null
  actor?: LogActor | null
}

export const logActivity = async (entry: LogEntry): Promise<void> => {
  try {
    const actor = entry.actor || null
    const { error } = await supabase.from("activity_logs").insert({
      user_id: actor?.id ?? null,
      user_name: actor?.name ?? null,
      user_email: actor?.email ?? null,
      user_role: actor?.role ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId != null ? String(entry.entityId) : null,
      entity_label: entry.entityLabel ?? null,
      details: entry.details ?? null,
    })
    if (error) {
      console.warn("[activityLogger] Insert failed:", error.message, error)
    } else {
      console.log("[activityLogger] Logged:", entry.action, entry.entityLabel || entry.entityId)
    }
  } catch (err) {
    console.warn("[activityLogger] Exception:", err)
  }
}

export interface FieldChange {
  field: string
  before: unknown
  after: unknown
}

export const diffFields = <T extends Record<string, unknown>>(
  before: T | null | undefined,
  after: Partial<T>,
  fields?: (keyof T)[],
): FieldChange[] => {
  const keys = (fields ?? (Object.keys(after) as (keyof T)[])) as string[]
  const changes: FieldChange[] = []
  for (const key of keys) {
    const b = before ? (before as Record<string, unknown>)[key] : undefined
    const a = (after as Record<string, unknown>)[key]
    if (a !== undefined && JSON.stringify(b ?? null) !== JSON.stringify(a ?? null)) {
      changes.push({ field: key, before: b ?? null, after: a ?? null })
    }
  }
  return changes
}
