import ProgressBar from './ProgressBar'

/**
 * Staff performance table for /admin/reports: Staff | Department |
 * Completed | Total | Completion %, exactly as specified. A row whose
 * `total` is 0 (no tasks assigned that staff member for the selected
 * month) shows "No tasks assigned" in place of a percentage instead of
 * a misleading 0% — that staff member genuinely has nothing to
 * measure, which is different from having measured 0% completion.
 */
export default function ReportsStaffTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Staff
            </th>
            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Department
            </th>
            <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Completed
            </th>
            <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total
            </th>
            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Completion %
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const hasData = row.pct !== null
            return (
              <tr key={row.staff.id}>
                <td className="px-4 py-3 font-medium text-slate-700">
                  {row.staff.full_name}
                  {row.staff.status === 'inactive' && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{row.staff.department || '\u2014'}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                  {hasData ? row.completed : '\u2014'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">{row.total}</td>
                <td className="px-4 py-3">
                  {hasData ? (
                    <div className="flex items-center gap-2">
                      <div className="w-24 shrink-0">
                        <ProgressBar percent={row.pct} size="sm" />
                      </div>
                      <span className="w-10 shrink-0 text-xs font-semibold text-slate-600">
                        {row.pct}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">No tasks assigned</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
