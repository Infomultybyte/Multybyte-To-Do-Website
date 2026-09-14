import { buildMonthOptions } from '../utils/dateUtils'

/**
 * Dropdown for choosing which month's grid to view. Options are generated
 * dynamically from today's date (never hard-coded) and include a short
 * window of upcoming months as well as past ones, so a month with
 * pre-assigned future tasks is reachable — the page's empty state
 * handles any future month that has nothing in it yet.
 */
export default function MonthSelector({ month, year, onChange, disabled }) {
  const options = buildMonthOptions(12)

  function handleChange(e) {
    const [nextMonth, nextYear] = e.target.value.split('-').map(Number)
    onChange(nextMonth, nextYear)
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="month-select" className="text-sm font-medium text-slate-600">
        Month
      </label>
      <select
        id="month-select"
        value={`${month}-${year}`}
        onChange={handleChange}
        disabled={disabled}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((opt) => (
          <option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
