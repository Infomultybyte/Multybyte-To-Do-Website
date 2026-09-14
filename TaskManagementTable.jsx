/**
 * Table of one staff member's tasks for one month/year. Position is
 * shown as its 1-based display rank (always matching row order — the
 * underlying `position` value is an implementation detail the Admin
 * never needs to see or edit directly, only reorder via Up/Down).
 * `busyId` marks a single row as mid-action so its buttons disable
 * without freezing the whole table.
 */
export default function TaskManagementTable({ rows, busyId, onEdit, onDelete, onMove }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            {['Position', 'Task', 'Interval', ''].map((label, i) => (
              <th
                key={label || i}
                className={`border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                  label === '' ? 'text-right' : 'text-left'
                }`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => {
            const isBusy = busyId === row.id
            return (
              <tr key={row.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="w-5 font-medium text-slate-700">{index + 1}</span>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => onMove(row.id, -1)}
                        disabled={isBusy || index === 0}
                        aria-label={`Move ${row.task_name} up`}
                        className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronUp />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMove(row.id, 1)}
                        disabled={isBusy || index === rows.length - 1}
                        aria-label={`Move ${row.task_name} down`}
                        className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronDown />
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">{row.task_name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {row.task_interval || 'Daily'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      disabled={isBusy}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      disabled={isBusy}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isBusy ? '\u2026' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ChevronUp() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M5 12.5 10 7.5 15 12.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
