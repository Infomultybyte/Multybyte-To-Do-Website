/**
 * Dropdown for filtering Reports by department. `departments` is a
 * flat list of distinct, non-empty department strings — the caller
 * (useAdminReports) derives it from whichever staff profiles actually
 * exist, so this never hard-codes a department list that could drift
 * from real data.
 */
export default function DepartmentSelector({ departments, value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="department-select" className="text-sm font-medium text-slate-600">
        Department
      </label>
      <select
        id="department-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-w-[170px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="all">All Departments</option>
        {departments.map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </select>
    </div>
  )
}
