/**
 * Dropdown for filtering Reports by staff account status. Separate from
 * the department/staff filters since "status" here always means the
 * three fixed values below — never a data-driven list.
 */
export default function StatusSelector({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="status-select" className="text-sm font-medium text-slate-600">
        Status
      </label>
      <select
        id="status-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-w-[130px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  )
}
