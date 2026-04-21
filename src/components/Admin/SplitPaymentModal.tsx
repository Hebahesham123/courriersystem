"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, DollarSign, CreditCard, Save, RefreshCw, Trash2 } from "lucide-react"
import { supabase } from "../../lib/supabase"

interface SplitPaymentModalProps {
  orderId: string
  orderTotal: number
  currentPrepaidAmount?: number | null
  currentPrepaidMethod?: string | null
  currentPrepaidAt?: string | null
  onClose: () => void
  onSaved?: () => void
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash / كاش" },
  { value: "paymob", label: "Paymob" },
  { value: "instapay", label: "Instapay" },
  { value: "valu", label: "Valu" },
  { value: "card", label: "Card / بطاقة" },
]

const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  orderId,
  orderTotal,
  currentPrepaidAmount,
  currentPrepaidMethod,
  currentPrepaidAt,
  onClose,
  onSaved,
}) => {
  const [amount, setAmount] = useState<string>(
    currentPrepaidAmount ? String(currentPrepaidAmount) : "",
  )
  const [method, setMethod] = useState<string>(currentPrepaidMethod || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAmount(currentPrepaidAmount ? String(currentPrepaidAmount) : "")
    setMethod(currentPrepaidMethod || "")
  }, [currentPrepaidAmount, currentPrepaidMethod])

  const parsedAmount = Number.parseFloat(amount) || 0
  const remaining = Math.max(0, orderTotal - parsedAmount)

  const handleSave = async () => {
    setError(null)

    if (parsedAmount <= 0) {
      setError("Amount must be greater than 0 / المبلغ يجب أن يكون أكبر من 0")
      return
    }
    if (parsedAmount > orderTotal) {
      setError("Amount cannot exceed order total / المبلغ لا يمكن أن يتجاوز إجمالي الطلب")
      return
    }
    if (!method) {
      setError("Please select a payment method / يرجى اختيار طريقة الدفع")
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          admin_prepaid_amount: parsedAmount,
          admin_prepaid_method: method,
          admin_prepaid_at: new Date().toISOString(),
          admin_prepaid_by: user?.id ?? null,
        })
        .eq("id", orderId)

      if (updateError) throw updateError

      onSaved?.()
      onClose()
    } catch (e: any) {
      setError(e?.message || "Failed to save / فشل الحفظ")
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    if (!window.confirm("Clear the prepaid split payment? / مسح الدفع المسبق؟")) return
    setSaving(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          admin_prepaid_amount: null,
          admin_prepaid_method: null,
          admin_prepaid_at: null,
          admin_prepaid_by: null,
        })
        .eq("id", orderId)
      if (updateError) throw updateError
      onSaved?.()
      onClose()
    } catch (e: any) {
      setError(e?.message || "Failed to clear / فشل المسح")
    } finally {
      setSaving(false)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-semibold">Split Payment / دفع مقسم</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
            <span className="text-sm text-gray-600 font-medium">Order total / إجمالي الطلب</span>
            <span className="text-lg font-bold text-gray-900">{orderTotal.toFixed(2)} EGP</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Amount already paid / المبلغ المدفوع
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max={orderTotal}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                EGP
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Payment method / طريقة الدفع
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white"
              >
                <option value="">-- Select / اختر --</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-center">
            <span className="text-sm text-gray-600 font-medium">
              Courier will collect / يحصل المندوب
            </span>
            <span className="text-xl font-bold text-green-600">{remaining.toFixed(2)} EGP</span>
          </div>

          {currentPrepaidAt && (
            <p className="text-xs text-gray-500">
              Last updated:{" "}
              {new Date(currentPrepaidAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 flex items-center justify-between gap-3">
          {currentPrepaidAmount ? (
            <button
              onClick={handleClear}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

export default SplitPaymentModal
