import { useState } from 'react'

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

const EMPTY_FORM = {
  full_name: '',
  email: '',
  password: '',
  department: '',
  designation: '',
  status: 'active',
}

function validate(form) {
  const errors = {}
  if (!form.full_name.trim()) errors.full_name = 'Full name is required.'
  if (!form.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (!form.password) {
    errors.password = 'Password is required.'
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  }
  return errors
}

/**
 * `onSubmit(payload)` should return { success, error } — see
 * useStaffManagement.addStaff. Kept dumb about *how* the account gets
 * created; it just calls the prop and shows the result.
 */
export default function AddStaffModal({ open, onSubmit, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  if (!open) return null

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleClose() {
    if (submitting) return
    setForm(EMPTY_FORM)
    setErrors({})
    setFormError(null)
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setFormError(null)

    try {
      const result = await onSubmit({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        department: form.department.trim(),
        designation: form.designation.trim(),
        status: form.status,
      })

      setSubmitting(false)

      if (!result.success) {
        setFormError(toMessage(result.error) || 'Could not create the staff account.')
        return
      }

      setForm(EMPTY_FORM)
      onClose()
    } catch (err) {
      setSubmitting(false)
      setFormError(err?.message || 'An unexpected error occurred. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div
        className="fixed inset-0 bg-slate-900/40"
        aria-hidden="true"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-staff-title"
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="add-staff-title" className="text-base font-bold text-slate-800">
          Add Staff
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Creates a Supabase Auth account and profile. The new staff member can sign
          in immediately with the password you set below.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <Field label="Full name" error={errors.full_name}>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              className={inputClass(errors.full_name)}
              autoComplete="name"
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={inputClass(errors.email)}
              autoComplete="email"
            />
          </Field>

          <Field label="Password" error={errors.password} hint="At least 8 characters.">
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className={inputClass(errors.password)}
              autoComplete="new-password"
            />
          </Field>

          <Field label="Department" optional>
            <input
              type="text"
              value={form.department}
              onChange={(e) => update('department', e.target.value)}
              className={inputClass()}
            />
          </Field>

          <Field label="Designation" optional hint="e.g. CEO, Manager — controls where they sort in the staff list.">
            <input
              type="text"
              value={form.designation}
              onChange={(e) => update('designation', e.target.value)}
              className={inputClass()}
            />
          </Field>

          <fieldset className="flex items-center justify-between rounded-md border border-slate-200 px-3.5 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Active</p>
              <p className="text-xs text-slate-400">Inactive accounts cannot log in.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={form.status === 'active'}
                onChange={(e) => update('status', e.target.checked ? 'active' : 'inactive')}
              />
              <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-lime-400" />
              <div className="absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </label>
          </fieldset>

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
              {submitting ? 'Creating…' : 'Create Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function inputClass(error) {
  return `w-full rounded-md border px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400 ${
    error ? 'border-red-300' : 'border-slate-200'
  }`
}

function Field({ label, error, hint, optional, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
        {label}
        {optional && <span className="text-xs font-normal text-slate-400">Optional</span>}
      </span>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  )
}
