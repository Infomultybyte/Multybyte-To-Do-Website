import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService'
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from '../utils/browserNotification'
import { isNotificationSoundMuted, playNotificationSound } from '../utils/notificationSound'

// How long a pop-up toast stays on screen before auto-dismissing.
const TOAST_DURATION_MS = 6000

/**
 * Notification-bell hook, shared by AdminLayout and StaffLayout.
 *
 * `notifications` holds only UNREAD items — once something is marked
 * read (one at a time, or all at once), it's removed from this list
 * entirely rather than left in a dimmed "read" state, so the bell always
 * shows exactly what still needs attention.
 *
 * Subscribes to realtime INSERTs scoped to `recipient_id = eq.<userId>`
 * so a new urgent-task assignment (Staff) or status update (Admin) shows
 * up the moment it happens, without a page refresh. Each newly-arrived
 * notification also: plays a chime (unless muted), shows a native OS
 * notification (regardless of which tab/window is focused, once
 * permission is granted), and adds a pop-up toast that auto-dismisses
 * after a few seconds. Because every signed-in tab runs its own copy of
 * this hook with its own realtime subscription, this fires independently
 * in EVERY open tab for that user — sign in on two tabs and both chime
 * and pop up, exactly like WhatsApp Web.
 *
 * `userId` is the profile id of whoever is signed in — pass null/
 * undefined before auth has finished loading and this simply stays
 * empty until a real id is available.
 */
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [toasts, setToasts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [notificationPermission, setNotificationPermission] = useState(() =>
    getBrowserNotificationPermission()
  )
  const toastTimers = useRef({})

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)

    const { notifications: fetched, error } = await getNotifications()
    if (error) {
      setLoadError('Could not load notifications.')
      setNotifications([])
      setLoading(false)
      return
    }

    setNotifications(fetched)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  // Best-effort attempt on mount — some browsers still allow this
  // without a click. `enableBrowserNotifications` below is the reliable
  // path, wired to an actual button so the browser treats it as a real
  // user gesture.
  useEffect(() => {
    if (!userId) return
    requestBrowserNotificationPermission().then(setNotificationPermission)
  }, [userId])

  const enableBrowserNotifications = useCallback(async () => {
    const result = await requestBrowserNotificationPermission()
    setNotificationPermission(result)
    return result
  }, [])

  const dismissToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId))
    if (toastTimers.current[toastId]) {
      clearTimeout(toastTimers.current[toastId])
      delete toastTimers.current[toastId]
    }
  }, [])

  // Realtime: prepend any newly-inserted notification addressed to this
  // user, and trigger sound/popup/toast for it. Scoped server-side via
  // the channel filter (not just a client check) so this never receives
  // another user's rows in the first place.
  useEffect(() => {
    if (!userId || !supabase) return undefined

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = payload.new
          setNotifications((prev) => [incoming, ...prev])

          if (!isNotificationSoundMuted()) {
            playNotificationSound()
          }
          showBrowserNotification(incoming.id, incoming.title, incoming.message)

          setToasts((prev) => [...prev, incoming])
          toastTimers.current[incoming.id] = setTimeout(() => {
            dismissToast(incoming.id)
          }, TOAST_DURATION_MS)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      Object.values(toastTimers.current).forEach(clearTimeout)
      toastTimers.current = {}
    }
  }, [userId, dismissToast])

  // Marking read removes it from the list entirely (see file-level doc).
  const markOneRead = useCallback(
    async (notificationId) => {
      const previous = notifications
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      dismissToast(notificationId)
      const { error } = await markNotificationRead(notificationId)
      if (error) {
        setNotifications(previous) // roll back — it wasn't actually marked read
        return { success: false }
      }
      return { success: true }
    },
    [notifications, dismissToast]
  )

  const markAllRead = useCallback(async () => {
    const previous = notifications
    setNotifications([])
    const { error } = await markAllNotificationsRead()
    if (error) {
      setNotifications(previous)
      return { success: false }
    }
    return { success: true }
  }, [notifications])

  const unreadCount = notifications.length

  return {
    notifications,
    toasts,
    dismissToast,
    unreadCount,
    loading,
    loadError,
    markOneRead,
    markAllRead,
    reload: load,
    notificationPermission,
    enableBrowserNotifications,
  }
}
