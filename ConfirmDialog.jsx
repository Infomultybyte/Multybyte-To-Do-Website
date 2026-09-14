/**
 * Minimal confirm/cancel modal. Deliberately generic (title/message/
 * confirmLabel are all props) so it isn't tied to any one action —
 * Staff Management uses it specifically before deactivating an account.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  confirming = false,
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const confirmClasses =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600'
      : 'bg-slate-700 hover:bg-slate-800 focus-visible:outline-slate-700'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="fixed inset-0 bg-slate-900/40"
        aria-hidden="true"
        onClick={confirming ? undefined : onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="confirm-dialog-title" className="text-base font-bold text-slate-800">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className={`rounded-md px-3.5 py-2 text-sm font-semibold text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${confirmClasses}`}
          >
            {confirming ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
