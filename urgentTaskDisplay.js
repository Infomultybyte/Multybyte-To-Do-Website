/**
 * Shared display constants for urgent/deadline tasks (urgent_tasks
 * table) — kept in one place so the Staff panel, Admin Staff Detail
 * panel, and Admin Dashboard feed all render status the same way.
 */
export const URGENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_process', label: 'In Process' },
  { value: 'completed', label: 'Completed' },
]

export const URGENT_STATUS_LABELS = {
  pending: 'Pending',
  in_process: 'In Process',
  completed: 'Completed',
}

export const URGENT_STATUS_BADGE_CLASSES = {
  pending: 'bg-slate-100 text-slate-600',
  in_process: 'bg-amber-100 text-amber-700',
  completed: 'bg-lime-100 text-lime-700',
}

/** Formats a YYYY-MM-DD or ISO timestamp the same way the app's
 * existing Extra Work sections already format dates. */
export function formatUrgentDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
