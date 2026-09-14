/**
 * Shown instead of the app when Supabase environment variables are
 * missing or invalid, so a misconfigured deployment (e.g. a Vercel
 * project without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY set)
 * fails with a clear, actionable message rather than a blank white
 * screen with only a console error nobody sees.
 */
export default function ConfigErrorScreen({ message }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-paper px-6">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
          <span className="text-lg font-bold text-red-600" aria-hidden="true">
            !
          </span>
        </div>
        <h1 className="text-lg font-bold text-slate-800">Configuration problem</h1>
        <p className="mt-2 text-sm text-slate-600">
          {message || 'This app is missing required configuration and cannot start.'}
        </p>
        <p className="mt-4 text-xs text-slate-400">
          If you are a staff member seeing this, please contact your administrator —
          this is not something you can fix from here.
        </p>
      </div>
    </div>
  )
}
