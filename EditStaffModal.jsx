import { useEffect, useState } from 'react'

// Guards against ever rendering a raw error OBJECT as JSX text (which
// crashes React with "Objects are not valid as a React child"). Some
// call sites return { message: '...' } instead of a plain string —
// this makes formError safe no matter which shape shows up.
function toMessage(err) {
  if (!err) return null
  if (typeof err === 'string') return err
  if (typeof err === 'object' && typeof err.message === 'string') return err.message
  return 'An unexpected error occurred.'
}

export default function EditStaffModal({ staff, onSubmit, onClose }) {
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('active')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [nameError, setNameError] = useState(null)

  useEffect(() => {
    if (staff) {
      setFullName(staff.full_name || '')
      setDepartment(staff.department || '')
      setDesignation(staff.designation || '')
      setEmail(staff.email || '')
      setPassword('')
      setStatus(staff.status || 'active')
      setFormError(null)
      setNameError(null)
    }
  }, [staff])

  if (!staff) return null

  function handleClose() {
    if (submitting) return
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fullName.trim()) {
      setNameError('Full name is required.')
      return
    }
    setNameError(null)
    setSubmitting(true)
    setFormError(null)

    try {
      const updates = {
        full_name: fullName.trim(),
        department: department.trim(),
        designation: designation.trim(),
        status,
      }

      if (email.trim() && email.trim() !== staff.email) {
        updates.email = email.trim()
      }
      if (password.trim()) {
        updates.password = password.trim()
      }

      const result = await onSubmit(staff.id, updates)
      setSubmitting(false)

      if (!result || !result.success) {
        setFormError(toMessage(result?.error) || 'Could not save these changes.')
        return
      }

      onClose()
    } catch (err) {
      setSubmitting(false)
      setFormError(err.message || 'An unexpected error occurred.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 bg-slate-900/40" aria-hidden="true" onClick={handleClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-staff-title"
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 id="edit-staff-title" className="text-base font-bold text-slate-800">
          Edit Staff & Credentials
        </h2>
        <p className="mt-1 text-sm text-slate-500">Editing account for {staff.email}</p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Full name</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400 ${
                nameError ? 'border-red-300' : 'border-slate-200'
              }`}
            />
            {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Email Address (ID)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">New Password (leave blank to keep current)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Department</span>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Designation</span>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. CEO, Manager"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400"
            />
            <p className="mt-1 text-xs text-slate-400">
              Controls sort order in the staff list — CEO first, then Admin, then everyone else.
            </p>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}