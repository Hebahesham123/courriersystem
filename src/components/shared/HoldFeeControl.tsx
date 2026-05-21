"use client"
import React, { useState } from "react"
import { Clock } from "lucide-react"
import { supabase } from "../../lib/supabase"

interface HoldFeeOrderShape {
  id: string
  currency?: string | null
  hold_fee?: number | null
  hold_fee_comment?: string | null
  hold_fee_added_at?: string | null
  hold_fee_removed_at?: string | null
  hold_fee_created_at?: string | null
}

interface Props {
  order: HoldFeeOrderShape
  isAdmin: boolean
  userId?: string | null
  onChange?: () => void
  compact?: boolean
}

// Inline hold-fee control that can be dropped into any order card/row.
// Admin can put an order on hold (hides it from daily views) or remove the hold
// (order reappears dated to hold_fee_added_at).
const HoldFeeControl: React.FC<Props> = ({ order, isAdmin, userId, onChange, compact = false }) => {
  const holdAmount = Number(order.hold_fee || 0)
  const isOnHold = holdAmount > 0 && !order.hold_fee_removed_at
  const currency = order.currency || "EGP"

  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState<string>(holdAmount > 0 ? String(holdAmount) : "")
  const [comment, setComment] = useState<string>(order.hold_fee_comment || "")
  const [saving, setSaving] = useState(false)

  if (!isAdmin) {
    // Couriers / non-admins only see a read-only badge when on hold
    if (!isOnHold) return null
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300">
        <Clock className="w-3.5 h-3.5" />
        On Hold: {currency} {holdAmount.toFixed(2)}
      </div>
    )
  }

  const heldOnDate = order.hold_fee_added_at
    ? new Date(order.hold_fee_added_at).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" })
    : null

  const beginEdit = () => {
    setAmount(holdAmount > 0 ? String(holdAmount) : "")
    setComment(order.hold_fee_comment || "")
    setEditing(true)
  }

  const apply = async () => {
    const amt = Number.parseFloat(amount) || 0
    if (amt <= 0) {
      alert("أدخل قيمة رسوم التعليق أكبر من صفر")
      return
    }
    setSaving(true)
    try {
      const nowIso = new Date().toISOString()
      const { error } = await supabase
        .from("orders")
        .update({
          hold_fee: amt,
          hold_fee_comment: comment || null,
          // Preserve original hold_fee_added_at if we're just updating an active hold
          hold_fee_added_at: order.hold_fee_added_at || nowIso,
          hold_fee_removed_at: null,
          hold_fee_created_by: userId || null,
          hold_fee_created_at: order.hold_fee_created_at || nowIso,
        })
        .eq("id", order.id)
      if (error) throw error
      setEditing(false)
      onChange?.()
    } catch (e: any) {
      alert(`Failed to apply hold: ${e?.message || "Unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm("إزالة رسوم التعليق؟ سيعود الطلب لليوم الذي تم تعليقه فيه.")) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          hold_fee: null,
          hold_fee_comment: null,
          // Keep hold_fee_added_at so daily views can reattribute the order
          hold_fee_removed_at: new Date().toISOString(),
        })
        .eq("id", order.id)
      if (error) throw error
      setEditing(false)
      onChange?.()
    } catch (e: any) {
      alert(`Failed to remove hold: ${e?.message || "Unknown error"}`)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="mt-2 p-3 rounded-xl border-2 border-orange-300 bg-orange-50 space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-700" />
          <span className="text-xs font-bold text-orange-900">رسوم التعليق</span>
        </div>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="المبلغ"
        />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          rows={2}
          placeholder="السبب (اختياري)"
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={saving}
            onClick={apply}
            className="flex-1 px-2 py-1.5 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
          >
            {saving ? "..." : "تطبيق"}
          </button>
          {isOnHold && (
            <button
              type="button"
              disabled={saving}
              onClick={remove}
              className="px-2 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              إزالة
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => setEditing(false)}
            className="px-2 py-1.5 text-xs font-bold rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            إلغاء
          </button>
        </div>
      </div>
    )
  }

  if (isOnHold) {
    return (
      <div className={`flex items-center justify-between gap-2 rounded-xl border-2 border-orange-300 bg-orange-50 ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-orange-700 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-orange-900 truncate">
              معلّق: {currency} {holdAmount.toFixed(2)}
              {heldOnDate && <span className="text-orange-700 font-normal mx-1">({heldOnDate})</span>}
            </div>
            {order.hold_fee_comment && (
              <div className="text-[10px] text-orange-800 truncate">{order.hold_fee_comment}</div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={beginEdit}
          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex-shrink-0"
        >
          تعديل
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={beginEdit}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-white hover:bg-orange-50 text-orange-700 font-semibold ${compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"}`}
    >
      <Clock className="w-3.5 h-3.5" />
      تعليق الطلب
    </button>
  )
}

export default HoldFeeControl
