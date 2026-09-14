/**
 * Dropdown for choosing which staff member's tasks to manage. Includes
 * inactive staff (labeled) since an admin may still need to edit or
 * clean up an existing task list for a deactivated account — the
 * dropdown itself never hides anyone, only the Staff Management page's
 * "Active"/"Inactive" toggle controls login access.
 *
 * `includeAll` adds a leading "All Staff" option (value `"all"`) for
 * pages like Reports where "no one staff member selected" is itself a
 * valid, meaningful choice — the default (false) keeps every other
 * caller (Task Management, Staff Detail) exactly as before, where a
 * real staff id is always required.
 */
export default function StaffSelector({ staff, value, onChange, disabled, includeAll = false }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="staff-select" className="text-sm font-medium text-slate-600">
        Staff
      </label>
      <select
        id="staff-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className="min-w-[180px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {includeAll ? (
          <option value="all">All Staff</option>
        ) : (
          <option value="" disabled>
            Select a staff member
          </option>
        )}
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name}
            {s.status === 'inactive' ? ' (Inactive)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
