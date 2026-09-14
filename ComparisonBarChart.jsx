/**
 * Simple horizontal bar chart comparing completion % across a small set
 * of staff members, sorted highest-first. Deliberately plain (no
 * charting library) to match "simple professional charts... do not
 * overload the page" — this is a comparison aid, not a dashboard.
 *
 * Rows with no data that month (row.pct === null) are shown with an
 * empty/faded bar and a "No data" label instead of a fake 0% bar, so a
 * staff member with nothing assigned doesn't visually read as
 * "0% completed".
 */
export default function ComparisonBarChart({ rows }) {
  const sorted = [...rows].sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))

  return (
    <div className="space-y-3">
      {sorted.map((row) => {
        const hasData = row.pct !== null
        const barColor = !hasData
          ? 'bg-slate-100'
          : row.pct >= 80
          ? 'bg-lime-400'
          : row.pct >= 50
          ? 'bg-amber-400'
          : 'bg-red-400'

        return (
          <div key={row.staff.id} className="flex items-center gap-3">
            <p className="w-32 shrink-0 truncate text-sm font-medium text-slate-700" title={row.staff.full_name}>
              {row.staff.full_name}
            </p>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: hasData ? `${Math.min(100, Math.max(0, row.pct))}%` : '100%' }}
              />
            </div>
            <p className="w-16 shrink-0 text-right text-sm font-semibold text-slate-600">
              {hasData ? `${row.pct}%` : 'No data'}
            </p>
          </div>
        )
      })}
    </div>
  )
}
