import { useEffect } from 'react'

/**
 * `notice`: { type: 'success' | 'error', message: string } | null
 * Auto-dismisses after 4s (5s for errors, so there's time to read them);
 * `onDismiss` also fires on manual close.
 */
export default function Toast({ notice, onDismiss }) {
  useEffect(() => {
    if (!notice) return undefined
    const timeout = setTimeout(onDismiss, notice.type === 'error' ? 5000 : 4000)
    return () => clearTimeout(timeout)
  }, [notice, onDismiss])

  if (!notice) return null

  const isError = notice.type === 'error'

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 sm:justify-end sm:px-6">
      <div
        role="status"
        className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${
          isError
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-lime-200 bg-lime-50 text-lime-800'
        }`}
      >
        <span className="mt-0.5 text-sm">{isError ? '⚠' : '✓'}</span>
        <p className="text-sm font-medium">{notice.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-1 shrink-0 text-sm text-current opacity-60 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
