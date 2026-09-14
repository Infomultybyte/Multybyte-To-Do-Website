/**
 * Shared display constants/helpers for in-app notifications
 * (notifications table) — kept in one place so the Admin and Staff
 * notification bells render events the same way.
 */

export const NOTIFICATION_TYPE_BADGE_CLASSES = {
  urgent_task_assigned: 'bg-slate-100 text-slate-600',
  urgent_task_in_process: 'bg-amber-100 text-amber-700',
  urgent_task_completed: 'bg-lime-100 text-lime-700',
}

export const NOTIFICATION_TYPE_LABELS = {
  urgent_task_assigned: 'Assigned',
  urgent_task_in_process: 'In Process',
  urgent_task_completed: 'Completed',
}

/**
 * Formats a notification's `created_at` timestamp as both a date and a
 * time (e.g. "Sep 14, 2026, 3:45 PM") — unlike formatUrgentDate
 * (date-only, for deadlines), a notification's exact arrival time
 * matters too, since several can land on the same day.
 */
export function formatNotificationTimestamp(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
