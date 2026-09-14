import { useEffect, useState } from 'react'
import { getTodayIST, toISODate } from '../utils/dateUtils'

/**
 * `onSubmit({ taskName, deadline, adminRemark })` should return
 * { success, error } — see useAdminStaffUrgentTasks.addUrgentTask.
 * Only reachable from the Admin Staff Detail page, where `staffLabel`
 * is already fixed by the selected staff member (shown here read-only
 * for confirmation, the same way AddTaskModal shows staff/month).
 */
export default function AddUrgentTaskModal({ open, staffLabel, onSubmit, onClose }) {
  const [taskName, setTaskName] = useState('')
  const [deadline, setDeadline] = useState('')
  const [adminRemark, setAdminRemark] = useState('')
  const [nameError, setNameError] = useState(null)
  const [deadlineError, setDeadlineError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const today = getTodayIST()
  const todayISO = toISODate(today.year, today.month, today.day)

  useEffect(() => {
    if (open) {
      setTaskName('')
      setDeadline('')
      setAdminRemark('')
      setNameError(null)
      setDeadlineError(null)
      setFormError(null)
    }
  }, [open])

  if (!open) return null

  function handleClose() {
    if (submitting) return
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()

    let hasError = false
    if (!taskName.trim()) {
      setNameError('Task name is required.')
      hasError = true
    } else {
      setNameError(null)
    }
    if (!deadline) {
      setDeadlineError('Deadline is required.')
      hasError = true
    } else {
      setDeadlineError(null)
    }
    if (hasError) return

    setSubmitting(true)
    setFormError(null)

    const result = await onSubmit({
      taskName: taskName.trim(),
      deadline,
      adminRemark: adminRemark.trim(),
    })

    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || 'Could not assign this task.')
      return
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 bg-slate-900/40" aria-hidden="true" onClick={handleClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-urgent-task-title"
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="add-urgent-task-title" className="text-base font-bold text-slate-800">
          Assign Urgent Task
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          For <span className="font-medium text-slate-700">{staffLabel}</span>. This is a
          one-off, deadline-driven task, separate from their regular monthly checklist.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Task name</span>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              autoFocus
              placeholder="e.g. Prepare the client proposal"
              className={`w-full rounded-md border px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400 ${
                nameError ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Deadline &mdash; complete before this date
            </span>
            <input
              type="date"
              value={deadline}
              min={todayISO}
              onChange={(e) => setDeadline(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400 ${
                deadlineError ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {deadlineError && <p className="mt-1 text-xs text-red-600">{deadlineError}</p>}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Remark <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              value={adminRemark}
              onChange={(e) => setAdminRemark(e.target.value)}
              rows={3}
              placeholder="Any instructions or context for this task..."
              className="w-full rounded-md border border-slate-200 p-3 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400"
            />
          </label>

          {formError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-slate-700 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Assigning\u2026' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
