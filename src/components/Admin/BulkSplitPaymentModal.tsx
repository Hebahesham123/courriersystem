"use client"
import type React from "react"
import { useState } from "react"
import { createPortal } from "react-dom"
import { X, DollarSign, CreditCard, Save, RefreshCw, Trash2 } from "lucide-react"
import { supabase } from "../../lib/supabase"

interface BulkSplitPaymentModalProps {
  orderIds: string[]
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

const BulkSplitPaymentModal: React.FC<BulkSplitPaymentModalProps> = ({ orderIds, onClose, onSaved }) => {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("")
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedAmount = parseFloat(amount) || 0

  const handleSave = async () => {
    setError(null)
    if (parsedAmount <= 0) {
      setError("المبلغ يجب أن يكون أكبر من 0")
      return
    }
    if (!method) {
      setError("يرجى اختيار طريقة الدفع")
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
        .in("id", orderIds)
      if (updateError) throw updateError
      onSaved?.()
      onClose()
    } catch (e: any) {
      setError(e?.message || "فشل الحفظ")
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    if (!window.confirm(`مسح الدفع المسبق من ${orderIds.length} طلب؟`)) return
    setClearing(true)
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
        .in("id", orderIds)
      if (updateError) throw updateError
      onSaved?.()
      onClose()
    } catch (e: any) {
      setError(e?.message || "فشل المسح")
    } finally {
      setClearing(false)
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
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">تعيين دفع مسبق جماعي</h3>
              <p className="text-xs text-emerald-100">{orderIds.length} طلب محدد</p>
            </div>
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
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
            سيتم تطبيق نفس المبلغ وطريقة الدفع على جميع الـ <strong>{orderIds.length}</strong> طلبات المحددة.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              المبلغ المدفوع مسبقاً (لكل طلب)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                EGP
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              طريقة الدفع
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base bg-white"
              >
                <option value="">-- اختر طريقة الدفع --</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 flex items-center justify-between gap-3">
          <button
            onClick={handleClear}
            disabled={saving || clearing}
            className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {clearing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            مسح الكل
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving || clearing}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium transition disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving || clearing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "جاري الحفظ..." : `حفظ للـ ${orderIds.length} طلب`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

export default BulkSplitPaymentModal
