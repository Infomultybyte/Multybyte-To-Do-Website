import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import NotificationToastStack from './NotificationToastStack'
import {
  NOTIFICATION_TYPE_BADGE_CLASSES,
  NOTIFICATION_TYPE_LABELS,
  formatNotificationTimestamp,
} from '../utils/notificationDisplay'
import { isNotificationSoundMuted, setNotificationSoundMuted } from '../utils/notificationSound'

/**
 * Bell icon + unread badge + dropdown list, plus the pop-up toast stack
 * for newly-arrived notifications (sound + native OS popup live inside
 * useNotifications, which this component just renders the results of).
 * Shared by AdminLayout and StaffLayout — which events an admin vs. a
 * staff member actually see is decided entirely server-side (RLS:
 * recipient_id = auth.uid(), fanned out by the notify_urgent_task_*
 * triggers in supabase/notifications.sql), so this component itself has
 * no admin/staff branching.
 */
export default function NotificationBell() {
  const { profile } = useAuth()
  const {
    notifications,
    toasts,
    dismissToast,
    unreadCount,
    loading,
    markOneRead,
    markAllRead,
    notificationPermission,
    enableBrowserNotifications,
  } = useNotifications(profile?.id)
  const [open, setOpen] = useState(false)
  const [muted, setMuted] = useState(() => isNotificationSoundMuted())
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  function handleItemClick(notification) {
    markOneRead(notification.id)
  }

  function handleToastOpen(toast) {
    markOneRead(toast.id)
    setOpen(true)
  }

  function toggleMuted() {
    const next = !muted
    setMuted(next)
    setNotificationSoundMuted(next)
  }

  // Only worth showing when there's actually something the user can do:
  // 'default' means the browser hasn't asked yet (our button can still
  // trigger the prompt); 'denied' means they said no and JS can no
  // longer re-prompt, so point them at their browser's own site settings
  // instead of showing a button that would silently do nothing.
  const showEnablePrompt = notificationPermission === 'default'
  const showDeniedNotice = notificationPermission === 'denied'

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-lg border border-slate-100 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700">Notifications</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleMuted}
                className="text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                {muted ? 'Unmute sound' : 'Mute sound'}
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {showEnablePrompt && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <p className="text-xs text-slate-500">
                Get a pop-up even when this tab isn&rsquo;t open.
              </p>
              <button
                type="button"
                onClick={enableBrowserNotifications}
                className="shrink-0 rounded-md bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Enable
              </button>
            </div>
          )}
          {showDeniedNotice && (
            <p className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
              Desktop pop-ups are blocked for this site — enable them from your
              browser&rsquo;s site settings to see notifications outside this tab.
            </p>
          )}

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Loading&hellip;</p>
            )}

            {!loading && notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                You&rsquo;re all caught up — no notifications yet.
              </p>
            )}

            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleItemClick(notification)}
                className="block w-full border-b border-slate-50 bg-lime-50/60 px-4 py-3 text-left last:border-b-0 transition-colors hover:bg-lime-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      NOTIFICATION_TYPE_BADGE_CLASSES[notification.type] ||
                      'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {NOTIFICATION_TYPE_LABELS[notification.type] || 'Update'}
                  </span>
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-lime-500" aria-hidden="true" />
                </div>
                <p className="mt-1.5 text-sm text-slate-700">{notification.message}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatNotificationTimestamp(notification.created_at)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <NotificationToastStack toasts={toasts} onDismiss={dismissToast} onOpen={handleToastOpen} />
    </div>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M6 9.5a6 6 0 1 1 12 0c0 3.5 1.25 5 2 5.75H4c.75-.75 2-2.25 2-5.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.5a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
