/**
 * Single KPI card used across the top of the Admin Dashboard. Purely
 * presentational — the caller is responsible for making sure `value`
 * only ever reflects real, already-loaded data (see AdminDashboardPage,
 * which never renders these until loading is finished).
 */
export default function StatCard({ label, value, accent = false }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ? 'text-lime-600' : 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  )
}
