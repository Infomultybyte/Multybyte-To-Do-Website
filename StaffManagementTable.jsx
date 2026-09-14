function formatCreatedDate(iso) {
  if (!iso) return '\u2014'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '\u2014'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function StatusBadge({ status }) {
  const isActive = status === 'active'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive ? 'bg-lime-100 text-lime-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

/**
 * `busyId` marks a row as mid-action (status toggle in flight) so its
 * Actions buttons disable without freezing the whole table.
 */
export default function StaffManagementTable({ rows, busyId, onEdit, onToggleStatus, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            {['Name', 'Designation', 'Email', 'Status', 'Created', ''].map((label, i) => (
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
          {rows.map((row) => {
            const isBusy = busyId === row.id
            return (
              <tr key={row.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{row.full_name}</td>
                <td className="px-4 py-3 text-slate-500">{row.designation || '\u2014'}</td>
                <td className="px-4 py-3 text-slate-500">{row.email}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-slate-500">{formatCreatedDate(row.created_at)}</td>
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
                      onClick={() => onToggleStatus(row)}
                      disabled={isBusy}
                      className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        row.status === 'active'
                          ? 'border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50'
                          : 'border-lime-200 text-lime-700 hover:border-lime-300 hover:bg-lime-50'
                      }`}
                    >
                      {isBusy ? '\u2026' : row.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      disabled={isBusy}
                      className="rounded-md border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
