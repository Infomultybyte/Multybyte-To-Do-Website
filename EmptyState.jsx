/**
 * Shared "nothing to show" box. Used wherever Reports has zero real
 * data for the current filter/month combination — the caller decides
 * WHEN to render this (never both this and a table/stat row in the
 * same section), so a real 0% completion is never confused with "no
 * data exists at all".
 */
export default function EmptyState({ message = 'No task data available for this selection.' }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white px-8 py-12 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}
