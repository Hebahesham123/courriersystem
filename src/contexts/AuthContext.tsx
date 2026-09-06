"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"
import { CheckCircle, XCircle, Activity, TrendingUp, HandMetal } from "lucide-react"

interface AuthUser extends User {
  role?: "admin" | "courier" | "warehouse"
  name?: string
}

interface Notification {
  id: string
  message: string
  timestamp: Date
  type: "update" | "new" | "status_change" | "order_edit"
  orderId?: string
  courierName?: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  notifications: Notification[]
  soundEnabled: boolean
  showNotifications: boolean
  addNotification: (
    message: string,
    type: "update" | "new" | "status_change" | "order_edit",
    orderId?: string,
    courierId?: string | null,
  ) => Promise<void>
  clearAllNotifications: () => void
  playNotificationSound: () => void
  setShowNotifications: (show: boolean) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Minimal status config for notification messages
const statusConfigForNotifications: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  assigned: { label: "مكلف", icon: Activity },
  delivered: { label: "تم التوصيل", icon: CheckCircle },
  canceled: { label: "ملغي", icon: XCircle },
  partial: { label: "جزئي", icon: Activity },
  hand_to_hand: { label: "استبدال", icon: HandMetal },
  return: { label: "مرتجع", icon: TrendingUp },
}

const getStatusLabel = (status: string) => {
  return statusConfigForNotifications[status]?.label || status
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  // Tracks which auth user id we've already loaded a profile for, so we don't
  // re-fetch (and re-render) on every token refresh — which was causing a
  // subscribe/refresh loop that hit the auth rate limit (429).
  const handledUserIdRef = useRef<string | null>(null)

  // Debug function (for console logging)
  const addDebugInfo = (info: string) => {
    console.log(`[DEBUG] ${info}`)
  }

  // Initialize audio context
  useEffect(() => {
    const initAudio = () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        addDebugInfo("Audio context initialized successfully")
      } catch (error) {
        console.error("Failed to initialize audio context:", error)
        addDebugInfo("Failed to initialize audio context")
      }
    }

    // Initialize on user interaction
    const handleUserInteraction = () => {
      if (!audioContextRef.current) {
        initAudio()
      }
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("keydown", handleUserInteraction)
    }

    document.addEventListener("click", handleUserInteraction)
    document.addEventListener("keydown", handleUserInteraction)

    return () => {
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("keydown", handleUserInteraction)
    }
  }, [])

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) {
      addDebugInfo("Sound disabled, skipping notification sound")
      return
    }

    try {
      if (!audioContextRef.current) {
        addDebugInfo("Audio context not available")
        return
      }

      const ctx = audioContextRef.current

      // Resume context if suspended
      if (ctx.state === "suspended") {
        ctx.resume()
      }

      // Create a simple chime sound
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      gainNode.gain.setValueAtTime(0.7, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

      oscillator.frequency.setValueAtTime(880, ctx.currentTime)
      oscillator.frequency.linearRampToValueAtTime(1320, ctx.currentTime + 0.1)
      oscillator.frequency.linearRampToValueAtTime(0, ctx.currentTime + 0.2)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.2)

      addDebugInfo("Notification sound played successfully")
    } catch (error) {
      console.error("Error playing notification sound:", error)
      addDebugInfo(`Error playing sound: ${error}`)
    }
  }, [soundEnabled])

  const getCourierName = useCallback(async (courierId: string | null): Promise<string> => {
    if (!courierId) return "غير محدد"

    try {
      const { data, error } = await supabase.from("users").select("name").eq("id", courierId).single()

      if (error) throw error
      return data?.name || "غير محدد"
    } catch (error) {
      console.error("Error fetching courier name for notification:", error)
      return "غير محدد"
    }
  }, [])

  const addNotification = useCallback(
    async (
      message: string,
      type: "update" | "new" | "status_change" | "order_edit",
      orderId?: string,
      courierId?: string | null,
    ) => {
      const courierName = courierId ? await getCourierName(courierId) : "غير محدد"

      const notification: Notification = {
        id: Date.now().toString(),
        message,
        timestamp: new Date(),
        type,
        orderId,
        courierName,
      }

      addDebugInfo(`Adding notification: ${message} (Courier: ${courierName})`)

      setNotifications((prev) => [notification, ...prev])
      playNotificationSound()
    },
    [getCourierName, playNotificationSound],
  )

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
    addDebugInfo("All notifications cleared")
  }, [])

  useEffect(() => {
    let mounted = true

    const getInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        console.log("Initial Session:", data)
        const session = data?.session

        if (!mounted) return

        if (session?.user) {
          handledUserIdRef.current = session.user.id
          setTimeout(() => fetchUserProfileWithRetry(session.user), 300)
        } else {
          // Only log out if user is not a courier
          setUser((prev) => {
            if (prev?.role === "courier") {
              // Don't auto-logout courier
              return prev
            }
            return null
          })
          setLoading(false)
        }
      } catch (err) {
        console.error("Session error:", err)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (session?.user) {
        // Skip re-fetching the profile on token refreshes for the same user —
        // only fetch when the signed-in user actually changes. This prevents a
        // render/refresh loop that was tripping the auth rate limit (429).
        if (handledUserIdRef.current === session.user.id) return
        handledUserIdRef.current = session.user.id
        setTimeout(() => fetchUserProfileWithRetry(session.user), 300)
      } else {
        handledUserIdRef.current = null
        setUser((prev) => {
          if (prev?.role === "courier") {
            // Don't auto-logout courier
            return prev
          }
          return null
        })
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (authUser: User, attempt = 0) => {
    try {
      console.log("Fetching profile for user:", authUser.id, attempt ? `(retry ${attempt})` : "")

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 15000),
      )

      // maybeSingle() returns { data: null } for 0 rows instead of a 406 error.
      const queryPromise = supabase.from("users").select("role, name").eq("id", authUser.id).maybeSingle()

      const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as any

      if (!error && data) {
        console.log("Profile data:", data)
        setUser({ ...authUser, role: data.role, name: data.name })
        setLoading(false)
        return
      }

      // No row (or a transient error). On initial load the auth token may not be
      // attached yet, so the request hits RLS as anonymous and returns nothing
      // even though the row exists — retry a few times before giving up.
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 400))
        return fetchUserProfile(authUser, attempt + 1)
      }

      if (error) console.warn("Error loading profile after retries:", error)
      else console.log("User not found in users table, using basic auth user")
      setUser({ ...authUser, role: undefined, name: authUser.email?.split("@")[0] })
      setLoading(false)
    } catch (err) {
      console.error("Profile fetch error:", err)
      // A timeout or network error — retry a couple of times, then fall back.
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 400))
        return fetchUserProfile(authUser, attempt + 1)
      }
      setUser({ ...authUser, role: undefined, name: authUser.email?.split("@")[0] })
      setLoading(false)
    }
  }

  // Retry wrapper for fetchUserProfile
  const fetchUserProfileWithRetry = async (authUser: User, retries = 2) => {
    try {
      await fetchUserProfile(authUser)
    } catch (err: any) {
      if (retries > 0 && err?.message === "Profile fetch timeout") {
        // Wait 300ms and retry
        setTimeout(() => fetchUserProfileWithRetry(authUser, retries - 1), 300)
      } else {
        // If out of retries or different error, set user with basic info
        setUser({
          ...authUser,
          role: undefined,
          name: authUser.email?.split("@")[0],
        })
        setLoading(false)
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
  }

  // Keep the latest addNotification in a ref so the realtime subscription below
  // doesn't need it as a dependency (which would re-subscribe every render).
  const addNotificationRef = useRef(addNotification)
  addNotificationRef.current = addNotification

  // Targeted subscription for important order changes only (for notifications)
  useEffect(() => {
    if (!user?.id) return // Only subscribe when user is logged in

    addDebugInfo("Setting up targeted order subscription for notifications")

    const globalSubscription = supabase
      .channel("important_orders_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        async (payload: any) => {
          addDebugInfo(
            `New order detected: ${payload.new?.order_id} - ${payload.new?.customer_name}`,
          )

          try {
            // Only notify for new orders, not edits
            await addNotificationRef.current(
              `طلب جديد #${payload.new.order_id} - ${payload.new.customer_name}`,
              "new",
              payload.new.order_id,
              payload.new.assigned_courier_id,
            )
          } catch (error) {
            console.error("Error processing new order notification:", error)
            addDebugInfo(`Error processing new order notification: ${error}`)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: "status=neq.status", // Only trigger when status actually changes
        },
        async (payload: any) => {
          addDebugInfo(
            `Status change detected for order: ${payload.new?.order_id}`,
          )

          try {
            const oldStatus = payload.old?.status as string | undefined
            const newStatus = payload.new?.status as string

            if (oldStatus !== newStatus) {
              const oldLabel = getStatusLabel(oldStatus || "غير محدد")
              const newLabel = getStatusLabel(newStatus)
              await addNotificationRef.current(
                `تغيير حالة الطلب #${payload.new.order_id} من ${oldLabel} إلى ${newLabel}`,
                "status_change",
                payload.new.order_id,
                payload.new.assigned_courier_id,
              )
            }
          } catch (error) {
            console.error("Error processing status change notification:", error)
            addDebugInfo(`Error processing status change notification: ${error}`)
          }
        },
      )
      .subscribe((status) => {
        addDebugInfo(`Targeted subscription status: ${status}`)
      })

    return () => {
      addDebugInfo("Unsubscribing from targeted order changes")
      globalSubscription.unsubscribe()
    }
    // Only re-subscribe when the signed-in user actually changes (not on every render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const contextValue: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    notifications,
    soundEnabled,
    showNotifications,
    addNotification,
    clearAllNotifications,
    playNotificationSound,
    setShowNotifications,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
