"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Package,
  Users,
  Upload,
  Truck,
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
  X,
  Menu,
  BarChart3,
  Settings,
  MessageSquare,
  Bell,
  Shield,
  DollarSign,
  ClipboardList,
  History,
  Monitor,
  RefreshCw,
  Globe,
  Calendar,
  Map as MapIcon,
  Warehouse,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useLanguage } from "../../contexts/LanguageContext"

interface MenuItem {
  path: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
  badge?: number
  description?: string
}

interface UserProfile {
  name?: string
  email?: string
  role?: string
  avatar?: string
}

const Sidebar: React.FC = () => {
  const { user,  } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications] = useState() // Example notification count

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Always keep sidebar visible (desktop) by default for all users
  useEffect(() => {
    // On desktop (lg breakpoint), sidebar should always be visible
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true)
      }
    }
    
    // Set initial state
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  // Pick the text for the current language.
  const tl = (ar: string, en: string) => (language === "ar" ? ar : en)

  const adminMenuItems: MenuItem[] = [
    {
      path: "/admin",
      icon: Home,
      label: tl("لوحة التحكم", "Dashboard"),
      color: "text-blue-400",
      description: tl("نظرة عامة على النظام", "System overview"),
    },
    {
      path: "/admin/orders",
      icon: Package,
      label: tl("الطلبات", "Orders"),
      color: "text-green-400",
      description: tl("إدارة ومتابعة الطلبات", "Manage & track orders"),
    },
    {
      path: "/admin/couriers",
      icon: Users,
      label: tl("المناديب", "Couriers"),
      color: "text-orange-400",
      description: tl("إدارة المندوبين", "Manage couriers"),
    },
    {
      path: "/admin/trach",
      icon: Monitor,
      label: tl("المتابعة المباشرة", "Live Tracking"),
      color: "text-cyan-400",
      description: tl("تتبع مباشر وتحليلات للمندوبين", "Live tracking & analytics"),
    },
    {
      path: "/admin/courier-fees",
      icon: DollarSign,
      label: tl("رسوم المندوبين", "Courier Fees"),
      color: "text-green-600",
      description: tl("إدارة الرسوم اليومية لكل مندوب", "Daily fees per courier"),
    },
    {
      path: "/admin/couriers-sheet",
      icon: FileText,
      label: tl("جداول المندوبين", "Couriers Sheet"),
      color: "text-indigo-400",
      description: tl("عرض جداول الطلبات لكل مندوب", "Order sheets per courier"),
    },
    {
      path: "/admin/reports",
      icon: FileText,
      label: tl("التقارير", "Reports"),
      color: "text-pink-400",
      description: tl("تقارير الأداء والإحصائيات", "Performance reports & stats"),
    },
    {
      path: "/admin/settlement",
      icon: DollarSign,
      label: tl("المحاسبة اليومية", "Daily Settlement"),
      color: "text-emerald-400",
      description: tl("تحصيل كل مندوب يومياً حسب طريقة الدفع", "Daily collection per courier by method"),
    },
    {
      path: "/warehouse/returns",
      icon: Warehouse,
      label: tl("المرتجعات (المخزن)", "Returns (Warehouse)"),
      color: "text-slate-300",
      description: tl("جزئي / ملغي / يد بيد / تبديل / استلام قطعة لكل مندوب", "Partial / canceled / exchange / receive per courier"),
    },
    {
      path: "/admin/warehouse-tracking",
      icon: Warehouse,
      label: tl("المخزن", "Warehouse"),
      color: "text-slate-400",
      description: tl("تتبع استلام موظفي المخزن للمرتجعات", "Warehouse staff receipt tracking"),
    },
    {
      path: "/admin/analytics",
      icon: BarChart3,
      label: tl("التحليلات", "Analytics"),
      color: "text-orange-400",
      description: tl("تحليلات مفصلة لجميع المندوبين", "Detailed analytics for all couriers"),
    },
    {
      path: "/admin/requests",
      icon: MessageSquare,
      label: tl("طلبات العملاء", "Customer Requests"),
      color: "text-yellow-400",
      description: tl("إدارة طلبات العملاء العامة", "Manage customer requests"),
    },
    {
      path: "/admin/upload",
      icon: Upload,
      label: tl("رفع الطلبات", "Upload Orders"),
      color: "text-purple-400",
      description: tl("رفع ملفات الطلبات", "Upload order files"),
    },
    {
      path: "/admin/receive-piece-exchange",
      icon: RefreshCw,
      label: tl("استلام قطعة أو تبديل", "Receive / Exchange"),
      color: "text-purple-600",
      description: tl("إدارة طلبات الاستلام والتبديل", "Manage receive & exchange"),
    },
    {
      path: "/admin/calendar",
      icon: Calendar,
      label: tl("تقويم العملاء", "Customer Calendar"),
      color: "text-indigo-400",
      description: tl("مواعيد التسليم المؤكدة من واتساب", "Confirmed delivery dates from WhatsApp"),
    },
    {
      path: "/admin/logs",
      icon: History,
      label: tl("السجلات", "Logs"),
      color: "text-rose-400",
      description: tl("سجل التعديلات لكل المستخدمين", "Change log for all users"),
    },
  ]

  const courierMenuItems: MenuItem[] = [
    {
      path: "/courier",
      icon: Home,
      label: tl("لوحة التحكم", "Dashboard"),
      color: "text-blue-400",
      description: tl("نظرة عامة على طلباتي", "Overview of my orders"),
    },
    {
      path: "/courier/orders",
      icon: Truck,
      label: tl("طلباتي", "Orders"),
      color: "text-green-400",
      description: tl("طلبات التوصيل المخصصة لي", "My assigned deliveries"),
    },
    {
      path: "/courier/maps",
      icon: MapIcon,
      label: tl("خريطة الطريق", "Route Map"),
      color: "text-teal-400",
      description: tl("ترتيب الطلبات حسب الأقرب والتنقّل", "Nearest-first ordering & navigation"),
    },
    {
      path: "/courier/yoursheet",
      icon: FileText,
      label: tl("ورقة الطلبات", "My Sheet"),
      color: "text-purple-400",
      description: tl("جدول الطلبات الخاص بي", "My orders sheet"),
    },
    {
      path: "/courier/analytics",
      icon: BarChart3,
      label: tl("التحليلات", "Analytics"),
      color: "text-orange-400",
      description: tl("تحليلات مفصلة لأداء التوصيل", "Detailed delivery analytics"),
    },
  ]

  const warehouseMenuItems: MenuItem[] = [
    {
      path: "/warehouse/returns",
      icon: Warehouse,
      label: tl("المرتجعات", "Returns"),
      color: "text-slate-300",
      description: tl("استلام المرتجعات لكل مندوب", "Receive returns per courier"),
    },
  ]

  const menuItems =
    user?.role === "admin" ? adminMenuItems : user?.role === "warehouse" ? warehouseMenuItems : courierMenuItems

  const getUserInitials = (name?: string): string => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserRole = (): string => {
    const roleTranslations: Record<string, { ar: string; en: string }> = {
      admin: { ar: "مدير النظام", en: "System Admin" },
      courier: { ar: "مندوب توصيل", en: "Delivery Courier" },
      warehouse: { ar: "المخزن", en: "Warehouse" },
    }
    const r = roleTranslations[user?.role as string]
    return r ? (language === "ar" ? r.ar : r.en) : user?.role || (language === "ar" ? "مستخدم" : "User")
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <>
      {/* Mobile Menu Toggle Button - on the right (sidebar side) */}
      <button
        className="fixed top-4 right-4 z-50 p-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-lg transition-all duration-200 lg:hidden"
        onClick={toggleSidebar}
        aria-label="فتح القائمة الجانبية"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-label="إغلاق القائمة الجانبية"
        />
      )}

      {/* Sidebar Container - Always on the RIGHT side, always visible on desktop */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-72 sm:w-80"
        } ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } lg:translate-x-0 lg:static lg:block`}
        dir="ltr"
        role="navigation"
        aria-label={language === "ar" ? "القائمة الرئيسية" : "Main Menu"}
      >
        {/* Header Section */}
        <div className="relative">
          {/* Collapse Button */}
          <button
            onClick={toggleCollapse}
            className="absolute -left-4 top-8 bg-gray-800 hover:bg-gray-700 text-white rounded-full p-2 shadow-lg border border-gray-600 z-10 transition-all duration-200 hidden lg:flex items-center justify-center"
            aria-label={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Close Button (Mobile) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 text-white bg-gray-700 hover:bg-gray-600 p-2 rounded-xl lg:hidden transition-colors duration-200"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo Section - Enhanced */}
          <div className="p-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
            <div className="flex items-center">
              <div className="relative">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
              </div>
              {!isCollapsed && (
                <div className="ml-3 flex-1">
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    CourierPro
                  </h1>
                  <p className="text-xs text-gray-400 mt-0.5">{language === "ar" ? "نظام إدارة التوصيل" : "Delivery Management System"}</p>
                </div>
              )}
            </div>
          </div>

          {/* Profile Section - Enhanced */}
          <div className="p-3 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/30 to-gray-900/30">
            <div className="flex items-center">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-lg shadow-purple-500/20">
                  {getUserInitials(user?.name)}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
              </div>
              {!isCollapsed && (
                <div className="ml-2.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-sm font-semibold text-white truncate">{user?.name || "مستخدم"}</div>
                    {user?.role === "admin" && <Shield className="w-3.5 h-3.5 text-yellow-400" />}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{getUserRole()}</div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Menu - Enhanced */}
        <nav className="flex-1 overflow-y-auto p-3" role="menu">
          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 transform scale-[1.02] border border-blue-400/30"
                      : "text-gray-300 hover:bg-gray-800/60 hover:text-white hover:transform hover:scale-[1.01] border border-transparent hover:border-gray-700"
                  }`}
                  title={isCollapsed ? item.label : item.description}
                  role="menuitem"
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 via-purple-400 to-pink-400 rounded-r-full shadow-lg shadow-blue-400/50"
                    />
                  )}

                  {/* Icon */}
                  <div className={`flex-shrink-0 relative ${isActive ? "text-white" : item.color} transition-transform group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                    {/* Badge */}
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </div>

                  {/* Label and Description */}
                  {!isCollapsed && (
                    <div className="ml-3 flex-1 min-w-0">
                      <div className={`truncate font-semibold ${isActive ? "text-white" : "text-gray-200"}`}>{item.label}</div>
                      {item.description && (
                        <div className={`text-xs truncate mt-0.5 ${isActive ? "text-blue-100" : "text-gray-400"}`}>{item.description}</div>
                      )}
                    </div>
                  )}

                  {/* Notification Badge for specific items */}
                  {item.path === "/admin" && !!notifications && notifications > 0 && !isCollapsed && (
                    <div className="flex items-center gap-1">
                      <Bell className="w-4 h-4 text-yellow-400" />
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold shadow-lg">
                        {notifications}
                      </span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer Section - Enhanced */}
        <div className="p-3 border-t border-gray-700/50 bg-gradient-to-r from-gray-800/30 to-gray-900/30 space-y-2">
          {/* Language Toggle Button - Always visible */}
          <button
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              isCollapsed 
                ? "justify-center" 
                : "justify-between"
            } ${
              language === "ar"
                ? "bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30"
                : "bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 hover:text-white border border-gray-700/50"
            }`}
            title={isCollapsed ? (language === "en" ? "العربية" : "English") : undefined}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {!isCollapsed && (
                <span className="text-sm font-medium">
                  {language === "en" ? "العربية" : "English"}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/20">
                {language === "en" ? "EN" : "AR"}
              </span>
            )}
          </button>

          {!isCollapsed && (
            <div className="p-2.5 bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-lg border border-gray-700/50">
              <div className="text-xs text-gray-400 mb-1.5 font-medium">
                {language === "ar" ? "حالة النظام" : "System Status"}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                <span className="text-xs text-green-400 font-semibold">
                  {language === "ar" ? "متصل" : "Online"}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
