import { createPortal } from 'react-dom'
import { NOTIFICATION_TYPE_BADGE_CLASSES, NOTIFICATION_TYPE_LABELS } from '../utils/notificationDisplay'

/**
 * Pop-up toasts for notifications that just arrived over realtime — the
 * "WhatsApp Web" part of the notification system, separate from the
 * generic success/error <Toast /> used for form actions elsewhere.
 * Rendered via a portal straight onto document.body so it always sits in
 * the same corner of the viewport regardless of where the relatively-
 * positioned NotificationBell trigger lives in the page.
 */
export default function NotificationToastStack({ toasts, onDismiss, onOpen }) {
  if (typeof document === 'undefined' || toasts.length === 0) return null

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 max-w-[90vw] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3.5 shadow-xl"
          style={{ animation: 'notification-toast-in 0.18s ease-out' }}
        >
          <div className="min-w-0 flex-1">
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                NOTIFICATION_TYPE_BADGE_CLASSES[toast.type] || 'bg-slate-100 text-slate-600'
              }`}
            >
              {NOTIFICATION_TYPE_LABELS[toast.type] || 'Update'}
            </span>
            <button
              type="button"
              onClick={() => onOpen(toast)}
              className="mt-1.5 block w-full text-left text-sm text-slate-700 hover:text-slate-900"
            >
              {toast.message}
            </button>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 text-sm text-slate-400 hover:text-slate-600"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}
