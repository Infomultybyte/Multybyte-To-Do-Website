import { useNavigate } from 'react-router-dom'
import ProgressBar from './ProgressBar'

/**
 * Derives a human status label from real numbers only (task count +
 * completion %) — never a stored/fake field. Thresholds match the
 * ProgressBar color bands so the badge and bar always agree.
 */
function getStatusInfo(taskCount, pct) {
  if (taskCount === 0) {
    return { label: 'No tasks', className: 'bg-slate-100 text-slate-500' }
  }
  if (pct >= 80) {
    return { label: 'On track', className: 'bg-lime-100 text-lime-700' }
  }
  if (pct >= 50) {
    return { label: 'In progress', className: 'bg-amber-100 text-amber-700' }
  }
  return { label: 'Behind', className: 'bg-red-100 text-red-700' }
}

export default function StaffOverviewTable({ rows, monthLabel }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Staff
            </th>
            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Department
            </th>
            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Month
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
            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const status = getStatusInfo(row.taskCount, row.pct)
            return (
              <tr
                key={row.staff.id}
                role="link"
                tabIndex={0}
                aria-label={`View ${row.staff.full_name}'s to-do list`}
                onClick={() => navigate(`/admin/staff/${row.staff.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/admin/staff/${row.staff.id}`)
                  }
                }}
                className="cursor-pointer transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
              >
                <td className="px-4 py-3 font-medium text-slate-700">{row.staff.full_name}</td>
                <td className="px-4 py-3 text-slate-500">{row.staff.department || '\u2014'}</td>
                <td className="px-4 py-3 text-slate-500">{monthLabel}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">{row.completed}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">{row.total}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 shrink-0">
                      <ProgressBar percent={row.pct} size="sm" />
                    </div>
                    <span className="w-10 shrink-0 text-xs font-semibold text-slate-600">
                      {row.pct}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
