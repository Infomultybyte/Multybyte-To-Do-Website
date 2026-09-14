import { useEffect, useState } from 'react'

/**
 * Shown to a staff member the moment they move an urgent task's status
 * to "Completed". The remark is entirely optional — leaving it blank
 * and confirming is a normal, expected path, not an error state.
 * `onSubmit(remark)` should return { success, error }.
 */
export default function CompleteUrgentTaskModal({ task, onSubmit, onCancel }) {
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (task) {
      setRemark('')
      setFormError(null)
    }
  }, [task])

  if (!task) return null

  function handleCancel() {
    if (submitting) return
    onCancel()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    const result = await onSubmit(remark.trim())

    setSubmitting(false)

    if (!result.success) {
      setFormError(result.error || 'Could not mark this task completed.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 bg-slate-900/40" aria-hidden="true" onClick={handleCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-urgent-task-title"
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="complete-urgent-task-title" className="text-base font-bold text-slate-800">
          Mark as Completed
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{task.task_name}</span> — you can add a
          remark for the admin, or leave it blank.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Remark <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              autoFocus
              rows={3}
              placeholder="Anything you'd like to mention about this task..."
              className="w-full rounded-md border border-slate-200 p-3 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400"
            />
          </label>

          {formError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleCancel}
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
              {submitting ? 'Saving\u2026' : 'Mark Completed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
