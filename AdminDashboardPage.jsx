import { useState } from 'react'
import { useAdminDashboard } from '../../hooks/useAdminDashboard'
import { useAdminUrgentTasksFeed } from '../../hooks/useAdminUrgentTasksFeed'
import { getCurrentMonthYear, formatMonthYear } from '../../utils/dateUtils'
import MonthSelector from '../../components/MonthSelector'
import StatCard from '../../components/StatCard'
import StaffOverviewTable from '../../components/StaffOverviewTable'
import AdminUrgentTaskFeed from '../../components/AdminUrgentTaskFeed'

/**
 * Admin Dashboard — overview of Staff task completion, built entirely
 * from Supabase (profiles/tasks/task_completions, via admin-only SELECT
 * RLS policies — see admin_dashboard_part2_hardening.sql). There is no
 * demo/fake data path anywhere in this page: stats and the table only
 * ever render once `loading` is false and `error` is null.
 */
export default function AdminDashboardPage() {
  const initial = getCurrentMonthYear()
  const [month, setMonth] = useState(initial.month)
  const [year, setYear] = useState(initial.year)

  const { rows, stats, loading, error, reload } = useAdminDashboard(month, year)
  const {
    tasks: recentUrgentTasks,
    loading: urgentFeedLoading,
    loadError: urgentFeedError,
    reload: reloadUrgentFeed,
  } = useAdminUrgentTasksFeed()

  const monthLabel = formatMonthYear(month, year)
  const hasStaff = rows.length > 0

  function handleMonthChange(nextMonth, nextYear) {
    setMonth(nextMonth)
    setYear(nextYear)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Dashboard
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">
            Welcome, Admin
          </h1>
        </div>

        <MonthSelector month={month} year={year} onChange={handleMonthChange} disabled={loading} />
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
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
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
            <p className="text-sm text-slate-500">{'Loading dashboard\u2026'}</p>
          </div>
        </div>
      )}

      {!loading && !error && stats && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total Staff" value={stats.totalStaff} />
            <StatCard label="Active Staff" value={stats.activeStaff} />
            <StatCard label="Total Tasks" value={stats.totalTasks} />
            <StatCard label="Completed Today" value={stats.tasksCompletedToday} />
            <StatCard
              label="Overall Completion"
              value={`${stats.overallCompletionPct}%`}
              accent
            />
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                {'Staff overview \u2014 '}
                {monthLabel}
              </h2>
              <p className="text-xs text-slate-400">{rows.length} active staff</p>
            </div>

            {!hasStaff && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
                <p className="text-sm text-slate-500">
                  No active staff members found.
                </p>
              </div>
            )}

            {hasStaff && <StaffOverviewTable rows={rows} monthLabel={monthLabel} />}
          </div>

          <div className="mt-8">
            <AdminUrgentTaskFeed
              tasks={recentUrgentTasks}
              loading={urgentFeedLoading}
              loadError={urgentFeedError}
              onRetry={reloadUrgentFeed}
            />
          </div>
        </>
      )}
    </div>
  )
}
