"use client"
import type React from "react"
import { useState, useRef } from "react"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  Loader2,
  Check,
  Info,
  ArrowRight,
  Users,
  Phone,
  CreditCard,
  Hash,
  MapPin,
  FileText,
  DollarSign,
} from "lucide-react"
import * as XLSX from "xlsx"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../contexts/LanguageContext"

interface OrderData {
  order_id: string
  customer_name: string
  address: string
  billing_city: string
  mobile_number: string
  total_order_fees: number
  payment_method: "cash" | "card" | "valu" | "partial" | "paid" | "paymob"
  payment_status: "paid" | "pending" | "cod" // New field to track payment status
  financial_status?: string // New field for financial status
  status?: string // Order status (pending, assigned, delivered, etc.)
  notes?: string
}

// Improved payment method normalization with Paymob and other gateways
const normalizePayment = (
  value: string,
): { method: "cash" | "card" | "valu" | "partial" | "paid" | "paymob"; status: "paid" | "pending" | "cod" } => {
  const v = value?.toLowerCase() || ""

  // Check for Paymob and installment payment methods (these are always paid and should be categorized as paymob)
  if (v.includes("paymob") || v.includes("pay mob")) return { method: "paymob", status: "paid" }
  if (v.includes("visa") || v.includes("credit") || v.includes("mastercard") || v.includes("master")) 
    return { method: "paymob", status: "paid" }
  if (v.includes("sympl")) return { method: "paymob", status: "paid" }
  if (v.includes("installment") || v.includes("installments")) return { method: "paymob", status: "paid" }
  
  // Check for ValU (separate from Paymob)
  if (v.includes("valu")) return { method: "valu", status: "paid" }
  
  // Check for other specific payment methods
  if (v.includes("card") && !v.includes("visa") && !v.includes("mastercard") && !v.includes("credit")) 
    return { method: "card", status: "paid" }
  if (v.includes("partial")) return { method: "partial", status: "paid" }

  // Check for other payment gateways (these are always paid)
  if (v.includes("fawry")) return { method: "paid", status: "paid" }
  if (v.includes("paypal")) return { method: "paid", status: "paid" }
  if (v.includes("stripe")) return { method: "paid", status: "paid" }
  if (v.includes("square")) return { method: "paid", status: "paid" }
  if (v.includes("razorpay")) return { method: "paid", status: "paid" }
  if (v.includes("instapay")) return { method: "paid", status: "paid" }
  if (v.includes("vodafone cash") || v.includes("vodafonecash")) return { method: "paid", status: "paid" }
  if (v.includes("orange cash") || v.includes("orangecash")) return { method: "paid", status: "paid" }
  if (v.includes("etisalat cash") || v.includes("etisalatcash")) return { method: "paid", status: "paid" }
  if (v.includes("we pay") || v.includes("wepay")) return { method: "paid", status: "paid" }

  // Check for payment status indicators
  if (v.includes("paid") || v.includes("completed") || v.includes("success") || v.includes("successful")) {
    return { method: "paid", status: "paid" }
  }

  // Check for cash on delivery indicators
  if (v.includes("cod") || v.includes("cash on delivery")) {
    return { method: "cash", status: "cod" }
  }

  // Check for pending indicators
  if (v.includes("pending") || v.includes("processing") || v.includes("awaiting")) {
    return { method: "cash", status: "pending" }
  }

  // Check for failed/cancelled payments
  if (v.includes("failed") || v.includes("cancelled") || v.includes("canceled") || v.includes("declined")) {
    return { method: "cash", status: "cod" } // Treat failed payments as COD
  }

  // Default to cash on delivery for empty or unrecognized values
  if (!v || v.includes("cash")) {
    return { method: "cash", status: "cod" }
  }

  // For any other case, assume it's paid (better to err on the side of paid)
  return { method: "paid", status: "paid" }
}

// Financial status normalization function
const normalizeFinancialStatus = (value: string): string => {
  const v = value?.toLowerCase() || ""
  
  // Check for paid status
  if (v.includes("paid") || v.includes("completed") || v.includes("success") || v.includes("successful") || v.includes("fulfilled")) {
    return "paid"
  }
  
  // Check for partial payment
  if (v.includes("partial") || v.includes("partially") || v.includes("incomplete")) {
    return "partial"
  }
  
  // Check for pending status
  if (v.includes("pending") || v.includes("processing") || v.includes("awaiting") || v.includes("authorized")) {
    return "pending"
  }
  
  // Check for overdue status
  if (v.includes("overdue") || v.includes("late") || v.includes("delayed") || v.includes("past due")) {
    return "overdue"
  }
  
  // Check for refunded status
  if (v.includes("refunded") || v.includes("refund") || v.includes("returned") || v.includes("cancelled")) {
    return "refunded"
  }
  
  // Check for disputed status
  if (v.includes("disputed") || v.includes("dispute") || v.includes("chargeback") || v.includes("fraud")) {
    return "disputed"
  }
  
  // Default to pending for empty or unrecognized values
  return "pending"
}

const UploadOrders: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [preview, setPreview] = useState<OrderData[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  // Enhanced translate function
  const translate = (key: string, param?: any) => {
    const translations: Record<string, string | ((param?: any) => string)> = {
      uploadOrders: "Upload Orders / رفع الطلبات",
      uploadExcel: "Upload Excel File / رفع ملف إكسل",
      loading: "Loading... / جاري التحميل...",
      uploading: "Uploading... / جاري الرفع...",
      processing: "Processing file... / جاري معالجة الملف...",
      orderId: "Order ID / رقم الطلب",
      customerName: "Customer Name / اسم العميل",
      mobile: "Mobile / الهاتف",
      address: "Address / العنوان",
      billingCity: "Billing City / مدينة الفاتورة",
      totalAmount: "Total Amount / المبلغ الكلي",
      paymentMethod: "Payment Method / طريقة الدفع",
      paymentStatus: "Payment Status / حالة الدفع",
      notes: "Notes / ملاحظات",
      errorReadingFile: "Error reading file. Please check the format. / خطأ في قراءة الملف، يرجى التحقق من التنسيق.",
      successfullyUploaded: (count: number) => `Successfully uploaded ${count} orders! / تم رفع ${count} طلب بنجاح!`,
      errorUploading: "Error uploading orders / خطأ أثناء رفع الطلبات",
      selected: "Selected File / الملف المختار",
      dragDropText:
        "Drag and drop your Excel file here, or click to browse / اسحب وأفلت ملف الإكسل هنا، أو اضغط للتصفح",
      supportedFormats: "Supported formats: .xlsx, .xls / الصيغ المدعومة",
      fileSize: "File size / حجم الملف",
      totalOrders: "Total Orders / إجمالي الطلبات",
      validOrders: "Valid Orders / الطلبات الصحيحة",
      invalidOrders: "Invalid Orders / الطلبات غير الصحيحة",
      previewFirst: "Preview (First 5 rows) / معاينة (أول 5 صفوف)",
      removeFile: "Remove File / إزالة الملف",
      uploadNow: "Upload Now / رفع الآن",
      cancel: "Cancel / إلغاء",
      viewAll: "View All / عرض الكل",
      validationErrors: "Validation Errors / أخطاء التحقق",
      shopifyInstructions:
        "Upload a Shopify-exported Excel file. We extract order name, customer, phone, total, payment, and notes.",
      shopifyInstructionsAr:
        "ارفع ملف إكسل مُصدَّر من Shopify. سنستخرج اسم الطلب والعميل والهاتف والإجمالي والدفع والملاحظات.",
      cash: "Cash (COD) / نقداً عند التسليم",
      card: "Card / بطاقة",
      valu: "ValU / فاليو",
      partial: "Partial / جزئي",
      paid: "Paid Online / مدفوع إلكترونياً",
      paymob: "Paymob / بايموب",
      fawry: "Fawry / فوري",
      vodafonecash: "Vodafone Cash / فودافون كاش",
      orangecash: "Orange Cash / أورانج كاش",
      instapay: "InstaPay / إنستاباي",
      pending: "Pending / معلق",
      cod: "Cash on Delivery / الدفع عند التسليم",
    }
    const val = translations[key]
    if (typeof val === "function") {
      return param !== undefined ? val(param) : val()
    }
    return val || key
  }

  const validateOrders = (orders: OrderData[]): string[] => {
    const errors: string[] = []
    orders.forEach((order, index) => {
      if (!order.order_id) errors.push(`Row ${index + 1}: Missing order ID`)
      if (!order.customer_name) errors.push(`Row ${index + 1}: Missing customer name`)
      if (!order.mobile_number) errors.push(`Row ${index + 1}: Missing mobile number`)
      if (order.total_order_fees <= 0) errors.push(`Row ${index + 1}: Invalid total amount`)
    })
    return errors
  }

  const parseOrders = (jsonData: any[]): OrderData[] => {
    return jsonData.map((row: any) => {
      const paymentInfo = normalizePayment(row["Payment Method"] || "")
      
      // Extract financial status from Excel - try multiple possible column names
      let financialStatus = ""
      if (row["Financial Status"]) {
        financialStatus = String(row["Financial Status"])
      } else if (row["FinancialStatus"]) {
        financialStatus = String(row["FinancialStatus"])
      } else if (row["Payment Status"]) {
        financialStatus = String(row["Payment Status"])
      } else if (row["PaymentStatus"]) {
        financialStatus = String(row["PaymentStatus"])
      }
      
      // Normalize financial status values
      const normalizedFinancialStatus = normalizeFinancialStatus(financialStatus)
      
      return {
        order_id: String(row["Name"] || ""),
        customer_name: String(row["Shipping Name"] || row["Billing Name"] || "Unknown"),
        address: String(row["Shipping Address1"] || row["Shipping Street"] || row["Billing Address1"] || "N/A"),
        billing_city: String(row["Billing City"] || "N/A"),
        mobile_number: String(row["Phone"] || row["Shipping Phone"] || row["Billing Phone"] || "N/A"),
        total_order_fees: Number(row["Total"] || 0),
        payment_method: paymentInfo.method,
        payment_status: paymentInfo.status,
        financial_status: normalizedFinancialStatus,
        status: "pending", // Default status for uploaded orders
        notes: String(row["Notes"] || ""),
      }
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
      processFile(droppedFile)
    } else {
      setMessage({ type: "error", text: "Please upload a valid Excel file (.xlsx or .xls)" })
    }
  }

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setMessage(null)
    setValidationErrors([])
    setUploadProgress(0)

    try {
      setMessage({ type: "info", text: translate("processing") })
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      const orders = parseOrders(jsonData)
      const errors = validateOrders(orders)

      setValidationErrors(errors)
      setPreview(orders.slice(0, 5))
      setMessage(null)
    } catch (error) {
      setMessage({ type: "error", text: translate("errorReadingFile") })
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    processFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setMessage(null)
    setUploadProgress(0)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      const orders = parseOrders(jsonData)

      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i)
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      const { error } = await supabase.from("orders").insert(orders)

      if (error) throw error

      setMessage({ type: "success", text: translate("successfullyUploaded", orders.length) })
      setFile(null)
      setPreview([])
      setValidationErrors([])
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (error) {
      setMessage({ type: "error", text: translate("errorUploading") })
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const removeFile = () => {
    setFile(null)
    setPreview([])
    setValidationErrors([])
    setMessage(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getPaymentMethodBadge = (method: string) => {
    const colors = {
      cash: "bg-orange-100 text-orange-800 border-orange-200",
      card: "bg-blue-100 text-blue-800 border-blue-200",
      valu: "bg-purple-100 text-purple-800 border-purple-200",
      partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
      paid: "bg-green-100 text-green-800 border-green-200",
      paymob: "bg-green-100 text-green-800 border-green-200",
    }
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[method as keyof typeof colors] || colors.paid}`}
      >
        {translate(method)}
      </span>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const colors = {
      paid: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      cod: "bg-orange-100 text-orange-800 border-orange-200",
    }
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.pending}`}
      >
        {translate(status)}
      </span>
    )
  }

  const getFinancialStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-200">
          غير محدد
        </span>
      )
    }
    
    const colors = {
      paid: "bg-green-100 text-green-800 border-green-200",
      partial: "bg-blue-100 text-blue-800 border-blue-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      overdue: "bg-red-100 text-red-800 border-red-200",
      refunded: "bg-purple-100 text-purple-800 border-purple-200",
      disputed: "bg-orange-100 text-orange-800 border-orange-200",
    }
    
    const displayStatus = {
      paid: "مدفوع بالكامل",
      partial: "مدفوع جزئياً",
      pending: "معلق",
      overdue: "متأخر",
      refunded: "مسترد",
      disputed: "متنازع عليه",
    }
    
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.pending}`}
      >
        {displayStatus[status as keyof typeof displayStatus] || status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{translate("uploadOrders")}</h1>
              <p className="text-gray-600 mt-1">
                {translate("shopifyInstructions")}
                <br />
                <span className="text-sm">{translate("shopifyInstructionsAr")}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border-green-200"
                : message.type === "error"
                  ? "bg-red-50 text-red-800 border-red-200"
                  : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === "success" && <CheckCircle className="w-5 h-5" />}
              {message.type === "error" && <AlertCircle className="w-5 h-5" />}
              {message.type === "info" && <Info className="w-5 h-5" />}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              {!file ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center">
                    <div className={`p-4 rounded-full mb-4 ${isDragOver ? "bg-blue-100" : "bg-gray-100"}`}>
                      <FileSpreadsheet className={`w-12 h-12 ${isDragOver ? "text-blue-600" : "text-gray-400"}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{translate("dragDropText")}</h3>
                    <p className="text-sm text-gray-500 mb-6">{translate("supportedFormats")}: .xlsx, .xls</p>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      <Upload className="w-5 h-5" />
                      {translate("uploadExcel")}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* File Info */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <FileSpreadsheet className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{file.name}</h3>
                          <p className="text-sm text-gray-500">
                            {translate("fileSize")}: {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeFile}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <h4 className="font-semibold text-red-800">{translate("validationErrors")}</h4>
                      </div>
                      <ul className="space-y-1 text-sm text-red-700">
                        {validationErrors.slice(0, 5).map((error, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                            {error}
                          </li>
                        ))}
                        {validationErrors.length > 5 && (
                          <li className="text-red-600 font-medium">+{validationErrors.length - 5} more errors...</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {loading && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        <span className="font-medium text-blue-800">{translate("uploading")}</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-blue-600 mt-2">{uploadProgress}% complete</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleUpload}
                      disabled={loading || validationErrors.length > 0}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {translate("uploading")}
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          {translate("uploadNow")}
                        </>
                      )}
                    </button>
                    <button
                      onClick={removeFile}
                      disabled={loading}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
                    >
                      {translate("cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Stats Cards */}
            {preview.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">File Statistics</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">{translate("totalOrders")}</span>
                    </div>
                    <span className="text-lg font-bold text-blue-900">{preview.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Paid Orders</span>
                    </div>
                    <span className="text-lg font-bold text-green-900">
                      {preview.filter((order) => order.payment_status === "paid").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">COD Orders</span>
                    </div>
                    <span className="text-lg font-bold text-orange-900">
                      {preview.filter((order) => order.payment_status === "cod").length}
                    </span>
                  </div>
                  {validationErrors.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-medium text-red-800">{translate("invalidOrders")}</span>
                      </div>
                      <span className="text-lg font-bold text-red-900">{validationErrors.length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">Payment Detection</h3>
              </div>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-0.5 text-blue-600" />
                  <span>
                    <strong>Paymob (Paid):</strong> Paymob, Visa, Credit, Mastercard, Sympl, Installment
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-0.5 text-blue-600" />
                  <span>
                    <strong>ValU (Paid):</strong> ValU payments
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-0.5 text-blue-600" />
                  <span>
                    <strong>Other Paid:</strong> Fawry, Card, Vodafone Cash, Orange Cash, InstaPay, PayPal, Stripe
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-0.5 text-blue-600" />
                  <span>
                    <strong>Paid Status:</strong> Contains "paid", "completed", "success", "successful"
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-0.5 text-blue-600" />
                  <span>
                    <strong>COD:</strong> Contains "cod", "cash on delivery", or empty/cash
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-0.5 text-blue-600" />
                  <span>
                    <strong>Pending:</strong> Contains "pending", "processing", "awaiting"
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-0.5 text-blue-600" />
                  <span>
                    <strong>Failed Payments:</strong> Treated as COD - "failed", "cancelled", "declined"
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Table */}
        {preview.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  {translate("previewFirst")}
                </h3>
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1">
                  {translate("viewAll")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        {translate("orderId")}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {translate("customerName")}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {translate("mobile")}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {translate("address")}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {translate("billingCity")}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {translate("totalAmount")}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {translate("paymentMethod")}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {translate("paymentStatus")}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        الحالة المالية
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((order, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">#{order.order_id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{order.customer_name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{order.mobile_number}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                        <span className="text-sm text-gray-900 truncate block">{order.address}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{order.billing_city}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-green-600">
                          EGP {order.total_order_fees.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getPaymentMethodBadge(order.payment_method)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getPaymentStatusBadge(order.payment_status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getFinancialStatusBadge(order.financial_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadOrders
