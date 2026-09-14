import { useEffect, useState } from 'react'
import { TASK_INTERVALS, DEFAULT_TASK_INTERVAL } from '../utils/taskIntervals'

/**
 * `onSubmit({ taskName, taskInterval })` should return { success, error }
 * — see useAdminTaskManagement.addTask. Staff/month/year are fixed by
 * whatever's currently selected on the page (shown here read-only for
 * confirmation) — this modal collects the task name and how often it
 * recurs (Interval); position is assigned automatically (appended to
 * the end of the current list). Only an admin ever reaches this modal
 * (Admin Tasks page), so Interval is admin-set here the same way
 * task_name is — the database enforces that too (only admin write
 * policies exist on tasks.task_interval; see
 * supabase/admin_task_interval_hardening.sql).
 */
export default function AddTaskModal({ open, staffLabel, monthLabel, onSubmit, onClose }) {
  const [taskName, setTaskName] = useState('')
  const [taskInterval, setTaskInterval] = useState(DEFAULT_TASK_INTERVAL)
  const [nameError, setNameError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (open) {
      setTaskName('')
      setTaskInterval(DEFAULT_TASK_INTERVAL)
      setNameError(null)
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
    if (!taskName.trim()) {
      setNameError('Task name is required.')
      return
    }
    setNameError(null)
    setSubmitting(true)
    setFormError(null)

    const result = await onSubmit({ taskName: taskName.trim(), taskInterval })

    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || 'Could not add this task.')
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
        aria-labelledby="add-task-title"
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="add-task-title" className="text-base font-bold text-slate-800">
          Add Task
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          For <span className="font-medium text-slate-700">{staffLabel}</span> &mdash;{' '}
          {monthLabel}. It will be added to the end of their task list.
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
              {submitting ? 'Adding\u2026' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
