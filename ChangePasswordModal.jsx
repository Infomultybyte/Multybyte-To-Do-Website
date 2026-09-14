import { useState } from 'react'
import { useAuth } from '../hooks/AuthContext'
import { signInWithPassword, updatePassword } from '../services/authService'

const MIN_PASSWORD_LENGTH = 8

/**
 * Self-service "change my own password" modal, shared by both the Admin
 * and Staff sections. Requires the user's CURRENT password before
 * allowing a change — re-verified via a fresh sign-in call — so that a
 * session left open on a shared office laptop can't be used to lock out
 * the real account owner. On success, calls `onSuccess()` so the caller
 * (a layout) can show a toast without this modal needing its own.
 */
export default function ChangePasswordModal({ onClose, onSuccess }) {
  const { profile } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  function handleClose() {
    if (submitting) return
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    if (!currentPassword) {
      setFormError('Enter your current password.')
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation do not match.')
      return
    }
    if (newPassword === currentPassword) {
      setFormError('New password must be different from your current password.')
      return
    }
    if (!profile?.email) {
      setFormError('Could not determine your account email. Please refresh and try again.')
      return
    }

    setSubmitting(true)

    // Re-verify the current password by attempting a real sign-in with
    // it, rather than trusting the form input, before changing anything.
    const { error: reauthError } = await signInWithPassword(profile.email, currentPassword)

    if (reauthError) {
      setSubmitting(false)
      setFormError('Current password is incorrect.')
      return
    }

    const { error: updateError } = await updatePassword(newPassword)
    setSubmitting(false)

    if (updateError) {
      setFormError(updateError.message || 'Could not update your password. Try again.')
      return
    }

    onSuccess?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 bg-slate-900/40" aria-hidden="true" onClick={handleClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="change-password-title" className="text-base font-bold text-slate-800">
          Change Password
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Update the password for {profile?.email}.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Current password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              New password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              disabled={submitting}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Confirm new password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
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
              {submitting ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
