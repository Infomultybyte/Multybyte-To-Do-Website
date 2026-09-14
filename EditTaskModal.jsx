import { useEffect, useState } from 'react'
import { TASK_INTERVALS, DEFAULT_TASK_INTERVAL } from '../utils/taskIntervals'

/**
 * `task` is the row being edited (or null when closed). `onSubmit(taskId,
 * updates)` should return { success, error } — see
 * useAdminTaskManagement.editTask. `task_name` and `task_interval` are
 * editable here; position changes go through the table's Up/Down
 * reorder controls instead, per spec ("Edit task: Task name, Position" —
 * position is still admin-editable overall, just via reorder rather
 * than a raw number field here, to keep row order always consistent
 * with what's actually stored). Interval is admin-only to change, same
 * as task_name — enforced at the database level (only admin write
 * policies exist on tasks.task_interval; see
 * supabase/admin_task_interval_hardening.sql), not just by this modal
 * only being reachable from the Admin Tasks page.
 */
export default function EditTaskModal({ task, onSubmit, onClose }) {
  const [taskName, setTaskName] = useState('')
  const [taskInterval, setTaskInterval] = useState(DEFAULT_TASK_INTERVAL)
  const [nameError, setNameError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (task) {
      setTaskName(task.task_name || '')
      setTaskInterval(task.task_interval || DEFAULT_TASK_INTERVAL)
      setNameError(null)
      setFormError(null)
    }
  }, [task])

  if (!task) return null

  function handleClose() {
    if (submitting) return
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!taskName.trim()) {
      setNameError('Task name is required.')
      return
    }
    setNameError(null)
    setSubmitting(true)
    setFormError(null)

    const result = await onSubmit(task.id, { taskName: taskName.trim(), taskInterval })

    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || 'Could not save this task.')
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
        aria-labelledby="edit-task-title"
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="edit-task-title" className="text-base font-bold text-slate-800">
          Edit Task
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Renaming a task does not affect its completion history for any past day.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Task name</span>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              autoFocus
              className={`w-full rounded-md border px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400 ${
                nameError ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Interval</span>
            <select
              value={taskInterval}
              onChange={(e) => setTaskInterval(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400"
            >
              {TASK_INTERVALS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
              {submitting ? 'Saving\u2026' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
