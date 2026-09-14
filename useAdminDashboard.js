import { useCallback, useEffect, useState } from 'react'
import {
  getAllStaffProfiles,
  getTasksForAllStaff,
  getCompletionsForAllStaff,
  getCompletedOnDate,
} from '../services/adminDashboardService'
import { getCurrentMonthYear, getDaysInMonth, toISODate } from '../utils/dateUtils'

/**
 * Loads every piece of data the Admin Dashboard needs for one
 * month/year, then aggregates it client-side into:
 *  - company-wide stats (Total Staff, Active Staff, Total Tasks,
 *    Tasks completed today, Overall completion %)
 *  - one row per ACTIVE staff member (Staff overview table)
 *
 * Definitions used (there's no fixed spec for these, so they're chosen
 * to match how the Staff grid itself works — see TodoGrid/useStaffTodos):
 *  - A staff member's "Total" for the month = (number of tasks assigned
 *    to them that month) x (number of days in that month) — i.e. the
 *    number of checkable cells in their grid, same as what they see.
 *  - "Completed" = how many of those cells are marked completed=true.
 *  - Company-wide "Total Tasks" = the number of distinct task rows
 *    assigned to active staff for the selected month (not multiplied by
 *    days) — this answers "how many tasks exist this month", not "how
 *    many checkboxes exist".
 *  - "Overall completion %" = total completed cells / total possible
 *    cells across active staff for the selected month.
 *  - "Tasks completed today" always means today's real calendar date,
 *    regardless of which month/year is selected in the dropdown.
 *
 * Only ACTIVE staff are counted in Total Tasks, Overall completion %,
 * Tasks completed today, and the overview table — Total Staff and
 * Active Staff are the only two numbers that also account for inactive
 * accounts, since those two stats exist specifically to show the
 * active/inactive split.
 */
export function useAdminDashboard(month, year) {
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [profilesResult, tasksResult] = await Promise.all([
      getAllStaffProfiles(),
      getTasksForAllStaff(month, year),
    ])

    if (profilesResult.error) {
      setError('Could not load staff data. Please try again.')
      setLoading(false)
      return
    }
    if (tasksResult.error) {
      setError('Could not load task data. Please try again.')
      setLoading(false)
      return
    }

    const { profiles } = profilesResult
    const { tasks } = tasksResult

    const daysInMonth = getDaysInMonth(month, year)
    const startDate = toISODate(year, month, 1)
    const endDate = toISODate(year, month, daysInMonth)

    const { completions, error: completionsError } = await getCompletionsForAllStaff(
      startDate,
      endDate
    )

    if (completionsError) {
      setError('Could not load completion data. Please try again.')
      setLoading(false)
      return
    }

    const today = getCurrentMonthYear()
    const now = new Date()
    const todayISO = toISODate(today.year, today.month, now.getDate())

    const { completions: todayCompletions, error: todayError } = await getCompletedOnDate(
      todayISO
    )

    if (todayError) {
      setError('Could not load today\u2019s completions. Please try again.')
      setLoading(false)
      return
    }

    // --- aggregate ---
    const taskCountByStaff = {}
    for (const t of tasks) {
      taskCountByStaff[t.staff_id] = (taskCountByStaff[t.staff_id] || 0) + 1
    }

    const completedCountByStaff = {}
    for (const c of completions) {
      if (c.completed) {
        completedCountByStaff[c.staff_id] = (completedCountByStaff[c.staff_id] || 0) + 1
      }
    }

    const activeProfiles = profiles.filter((p) => p.status === 'active')

    const nextRows = activeProfiles.map((profile) => {
      const taskCount = taskCountByStaff[profile.id] || 0
      const total = taskCount * daysInMonth
      // Clamp defensively: completion rows are keyed per (staff, task,
      // date) so this can't exceed `total` in practice, but a clamp
      // costs nothing and guards against a stray/duplicate row.
      const completed = Math.min(completedCountByStaff[profile.id] || 0, total)
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0

      return { staff: profile, taskCount, total, completed, pct }
    })

    const activeStaffIds = new Set(activeProfiles.map((p) => p.id))

    const totalTasksThisMonth = nextRows.reduce((sum, r) => sum + r.taskCount, 0)
    const totalCells = nextRows.reduce((sum, r) => sum + r.total, 0)
    const completedCells = nextRows.reduce((sum, r) => sum + r.completed, 0)
    const overallCompletionPct = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0
    const tasksCompletedToday = todayCompletions.filter((c) => activeStaffIds.has(c.staff_id)).length

    setRows(nextRows)
    setStats({
      totalStaff: profiles.length,
      activeStaff: activeProfiles.length,
      totalTasks: totalTasksThisMonth,
      tasksCompletedToday,
      overallCompletionPct,
    })
    setLoading(false)
  }, [month, year])

  useEffect(() => {
    load()
  }, [load])

  return { rows, stats, loading, error, reload: load }
}
