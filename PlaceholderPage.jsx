/**
 * Generic "not built yet" page, reused by the Staff, Tasks, and Reports
 * sidebar destinations for this foundation pass. Deliberately has no
 * data, no fake content, and no Supabase queries — just proof the route
 * and layout exist and are reachable.
 */
export default function PlaceholderPage({ title, description }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Admin
      </p>
      <h1 className="mt-1 text-xl font-bold text-slate-800">{title}</h1>

      <div className="mt-8 rounded-lg border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  )
}
