export default function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-paper">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  )
}
