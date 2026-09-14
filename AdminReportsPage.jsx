import { useMemo, useState } from 'react'
import { useAdminReports } from '../../hooks/useAdminReports'
import { useReportExport } from '../../hooks/useReportExport'
import { getCurrentMonthYear, formatMonthYear, buildMonthOptions } from '../../utils/dateUtils'
import MonthSelector from '../../components/MonthSelector'
import StaffSelector from '../../components/StaffSelector'
import DepartmentSelector from '../../components/DepartmentSelector'
import StatusSelector from '../../components/StatusSelector'
import StatCard from '../../components/StatCard'
import ReportsStaffTable from '../../components/ReportsStaffTable'
import ComparisonBarChart from '../../components/ComparisonBarChart'
import EmptyState from '../../components/EmptyState'

/**
 * Admin Reports (/admin/reports) — lets an Admin analyze Staff task
 * completion for a chosen month: a filterable performance table across
 * all staff, a per-staff monthly breakdown, and a side-by-side
 * comparison of a few chosen staff members.
 *
 * All three sections are computed from the same single month's worth of
 * data (useAdminReports) — filters (staff/department/status) only
 * decide which already-loaded rows are shown, so switching filters
 * never triggers a new Supabase round trip. Read-only: this page never
 * writes to tasks or task_completions. Admin-only access is enforced by
 * ProtectedRoute (App.jsx) plus profiles_select_admin_all /
 * tasks_select_admin_all / completions_select_admin_all RLS
 * (admin_dashboard_part2_hardening.sql) the whole way down — see
 * supabase/admin_reports_hardening.sql for why no new policy was
 * needed for this page.
 */
export default function AdminReportsPage() {
  const initial = getCurrentMonthYear()
  const [month, setMonth] = useState(initial.month)
  const [year, setYear] = useState(initial.year)

  const [staffFilter, setStaffFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [compareIds, setCompareIds] = useState([])
  const [exportMonths, setExportMonths] = useState([{ month: initial.month, year: initial.year }])

  const { allRows, departments, loading, error, reload } = useAdminReports(month, year)
  const { status: exportStatus, error: exportError, runExport } = useReportExport()

  const monthLabel = formatMonthYear(month, year)

  // All staff eligible for the Staff selector dropdown, independent of
  // the current department/status filters — narrowing those shouldn't
  // also hide someone from being pickable in the Staff dropdown itself.
  const staffOptions = useMemo(() => allRows.map((r) => r.staff), [allRows])

  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (statusFilter !== 'all' && r.staff.status !== statusFilter) return false
      if (departmentFilter !== 'all' && r.staff.department !== departmentFilter) return false
      if (staffFilter !== 'all' && r.staff.id !== staffFilter) return false
      return true
    })
  }, [allRows, statusFilter, departmentFilter, staffFilter])

  const hasFilteredData = filteredRows.some((r) => r.pct !== null)

  // The Monthly Report section only makes sense once one specific staff
  // member is chosen (comparing several people's daily breakdowns at
  // once isn't useful) — with "All Staff" selected it's simply omitted.
  const singleStaffRow =
    staffFilter !== 'all' ? filteredRows.find((r) => r.staff.id === staffFilter) || null : null

  const compareRows = useMemo(
    () => filteredRows.filter((r) => compareIds.includes(r.staff.id)),
    [filteredRows, compareIds]
  )

  function toggleCompare(staffId) {
    setCompareIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    )
  }

  function handleMonthChange(nextMonth, nextYear) {
    setMonth(nextMonth)
    setYear(nextYear)
    // A new month invalidates any in-progress comparison selection —
    // silently carrying it over could compare two people across two
    // different months' worth of data without saying so.
    setCompareIds([])
    // The export month picker defaults back to just the newly-selected
    // month too, for the same reason — any additional months the admin
    // had added for a multi-month export were chosen relative to the
    // old primary month and shouldn't silently carry over.
    setExportMonths([{ month: nextMonth, year: nextYear }])
  }

  const exportMonthOptions = useMemo(() => buildMonthOptions(), [])

  function toggleExportMonth(optMonth, optYear) {
    setExportMonths((prev) => {
      const exists = prev.some((p) => p.month === optMonth && p.year === optYear)
      if (exists) {
        // Always keep at least one month selected — an export needs a
        // scope, and an empty month list isn't a meaningful choice.
        if (prev.length === 1) return prev
        return prev.filter((p) => !(p.month === optMonth && p.year === optYear))
      }
      return [...prev, { month: optMonth, year: optYear }]
    })
  }

  const exportStaffList = useMemo(() => filteredRows.map((r) => r.staff), [filteredRows])

  async function handleExport() {
    if (!exportStaffList.length) return
    await runExport({ staffList: exportStaffList, monthYearPairs: exportMonths })
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Admin</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Analyze Staff task completion for {monthLabel}.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading || exportStatus === 'preparing' || exportStaffList.length === 0}
          className="shrink-0 rounded-md bg-lime-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exportStatus === 'preparing' ? 'Preparing Excel\u2026' : 'Export Excel'}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <StaffSelector
          staff={staffOptions}
          value={staffFilter}
          onChange={(v) => setStaffFilter(v || 'all')}
          disabled={loading}
          includeAll
        />
        <DepartmentSelector
          departments={departments}
          value={departmentFilter}
          onChange={setDepartmentFilter}
          disabled={loading}
        />
        <StatusSelector value={statusFilter} onChange={setStatusFilter} disabled={loading} />
        <MonthSelector month={month} year={year} onChange={handleMonthChange} disabled={loading} />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-slate-600">
          Months to include in export
        </p>
        <div className="flex flex-wrap gap-2">
          {exportMonthOptions.map((opt) => {
            const selected = exportMonths.some(
              (p) => p.month === opt.month && p.year === opt.year
            )
            return (
              <button
                key={`${opt.month}-${opt.year}`}
                type="button"
                onClick={() => toggleExportMonth(opt.month, opt.year)}
                disabled={loading}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Export covers {exportStaffList.length} staff member
          {exportStaffList.length === 1 ? '' : 's'} (per the filters above) across{' '}
          {exportMonths.length} month{exportMonths.length === 1 ? '' : 's'}.
        </p>
      </div>

      {exportStatus === 'error' && exportError && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{exportError}</span>
          <button
            type="button"
            onClick={handleExport}
            className="shrink-0 font-semibold underline underline-offset-2 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={reload}
            className="shrink-0 font-semibold underline underline-offset-2 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-6 flex items-center justify-center rounded-lg border border-slate-200 bg-white py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
            <p className="text-sm text-slate-500">Loading reports&hellip;</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Staff performance</h2>
            {filteredRows.length === 0 || !hasFilteredData ? (
              <EmptyState />
            ) : (
              <ReportsStaffTable rows={filteredRows} />
            )}
          </section>

          {staffFilter !== 'all' && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">
                Monthly report &mdash; {singleStaffRow?.staff.full_name || 'Staff'} &middot;{' '}
                {monthLabel}
              </h2>
              {!singleStaffRow || singleStaffRow.pct === null ? (
                <EmptyState />
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <StatCard label="Total tasks" value={singleStaffRow.taskCount} />
                  <StatCard label="Total possible task-days" value={singleStaffRow.total} />
                  <StatCard label="Completed task-days" value={singleStaffRow.completed} />
                  <StatCard label="Incomplete task-days" value={singleStaffRow.incomplete} />
                  <StatCard label="Completion %" value={`${singleStaffRow.pct}%`} accent />
                </div>
              )}
            </section>
          )}

          <section className="mt-8">
            <h2 className="mb-1 text-sm font-semibold text-slate-700">Compare staff</h2>
            <p className="mb-3 text-xs text-slate-400">
              Pick two or more staff members to compare their {monthLabel} completion.
            </p>

            {filteredRows.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap gap-2">
                  {filteredRows.map((row) => {
                    const selected = compareIds.includes(row.staff.id)
                    return (
                      <button
                        key={row.staff.id}
                        type="button"
                        onClick={() => toggleCompare(row.staff.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          selected
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {row.staff.full_name}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-5">
                  {compareRows.length < 2 ? (
                    <p className="text-sm text-slate-400">
                      Select at least two staff members above to see a comparison.
                    </p>
                  ) : (
                    <ComparisonBarChart rows={compareRows} />
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
