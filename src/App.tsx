"use client"

import type React from "react"
import { useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext"
import LoginForm from "./components/Auth/LoginForm"
import Header from "./components/Layout/Header"
import Sidebar from "./components/Layout/Sidebar"
import Summary from "./components/Dashboard/Summary"
import UploadOrders from "./components/Admin/UploadOrders"
import OrdersManagement from "./components/Admin/OrdersManagement"
import OrdersList from "./components/Courier/OrdersList"
import CourierYourSheet from "./components/Courier/YourSheet"
import Analytics from "./components/Courier/TestAnalytics"
import RouteMap from "./components/Courier/RouteMap"
import AdminAnalytics from "./components/Admin/AdminAnalytics"
import CouriersManagement from "./components/Admin/CouriersManagement"
import CourierFeesManagement from "./components/Admin/CourierFeesManagement"
import Reports from "./components/Admin/reports"
import AdminCouriersSheet from "./components/Admin/AdminCouriersSheet"
import RequestsManagement from "./components/Admin/RequestsManagement"
import CourierActivitySummary from "./components/Admin/CourierActivitySummary"
import CourierTracking from "./components/Admin/CourierTracking"
import CourierTrackingDetail from "./components/Admin/CourierTrackingDetail"
import Tracking from "./components/Admin/Tracking"
import Trach from "./components/Admin/Trach"
import ReceivePieceOrExchange from "./components/Admin/ReceivePieceOrExchange"
import Calendar from "./components/Admin/Calendar"
import ActivityLogs from "./components/Admin/ActivityLogs"
import DailySettlement from "./components/Admin/DailySettlement"
import WarehouseReturns from "./components/Warehouse/WarehouseReturns"
import WarehouseTracking from "./components/Admin/WarehouseTracking"
import { activateDueScheduledOrders } from "./lib/scheduling"

// Landing route for a given role.
const homeFor = (role?: string): string =>
  role === "admin" ? "/admin" : role === "warehouse" ? "/warehouse/returns" : "/courier"

// Shown when the user is authenticated but their role could not be loaded yet
// (e.g. a transient token/profile failure). Avoids an infinite redirect loop and
// gives a way out.
const ProfilePending: React.FC = () => {
  const { signOut } = useAuth()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-gray-700 text-lg">جاري تحميل بيانات الحساب...</div>
      <p className="text-sm text-gray-500 max-w-sm">
        إذا استمرت هذه الشاشة، سجّل الخروج ثم الدخول مرة أخرى.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm"
        >
          إعادة المحاولة
        </button>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900 text-sm"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role || "")) {
    // Role not resolved yet → show a recovery screen instead of redirecting to a
    // role-home that would bounce right back here (infinite loop / white page).
    if (!user.role) return <ProfilePending />
    return <Navigate to={homeFor(user.role)} replace />
  }
  return <>{children}</>
}

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen bg-gray-50 w-full overflow-x-hidden">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0 w-full">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  </div>
)

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth()

  // When someone opens the app, activate any orders that were scheduled for a day
  // that has now arrived (flip "scheduled" -> "assigned" so the confirmation
  // webhook starts seeing them). The DB cron job does this server-side too.
  useEffect(() => {
    if (user) {
      activateDueScheduledOrders()
    }
  }, [user?.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading session...</div>
      </div>
    )
  }

  return (
    <Routes>
      {!user ? (
        <>
          <Route path="/login" element={<LoginForm />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Navigate to={homeFor(user.role)} replace />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <Summary />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <OrdersManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/requests"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <RequestsManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <AdminAnalytics />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/upload"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <UploadOrders />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/couriers"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <CouriersManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courier-fees"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <CourierFeesManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/couriers-sheet"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <AdminCouriersSheet />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <Reports />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activity-summary"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <CourierActivitySummary />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courier-tracking"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <CourierTracking />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courier-tracking/:courierId"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <CourierTrackingDetail />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tracking"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <Tracking />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/trach"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <Trach />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/calendar"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <Calendar />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settlement"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <DailySettlement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <ActivityLogs />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/receive-piece-exchange"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <ReceivePieceOrExchange onBack={() => window.history.back()} />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courier"
            element={
              <ProtectedRoute allowedRoles={["courier"]}>
                <AppLayout>
                  <Summary />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courier/orders"
            element={
              <ProtectedRoute allowedRoles={["courier"]}>
                <AppLayout>
                  <OrdersList />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courier/orders/:orderId"
            element={
              <ProtectedRoute allowedRoles={["courier"]}>
                <AppLayout>
                  <OrdersList />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courier/yoursheet"
            element={
              <ProtectedRoute allowedRoles={["courier"]}>
                <AppLayout>
                  <CourierYourSheet />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courier/analytics"
            element={
              <ProtectedRoute allowedRoles={["courier"]}>
                <AppLayout>
                  <Analytics />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courier/maps"
            element={
              <ProtectedRoute allowedRoles={["courier"]}>
                <AppLayout>
                  <RouteMap />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse/returns"
            element={
              <ProtectedRoute allowedRoles={["warehouse", "admin"]}>
                <AppLayout>
                  <WarehouseReturns />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/warehouse-tracking"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <WarehouseTracking />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={homeFor(user.role)} replace />} />
        </>
      )}
    </Routes>
  )
}

const AppWrapper = () => {
  const { language } = useLanguage()

  useEffect(() => {
    // Always use LTR direction regardless of language (keep everything on the left)
    document.documentElement.setAttribute("dir", "ltr")
    document.documentElement.lang = language
  }, [language])

  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <AppWrapper />
    </AuthProvider>
  </LanguageProvider>
)

export default App
