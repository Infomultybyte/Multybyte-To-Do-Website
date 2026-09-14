import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getAllStaffProfiles,
  getTasksForAllStaff,
  getCompletionsForAllStaff,
} from '../services/reportsService'
import { getDaysInMonth, toISODate } from '../utils/dateUtils'

/**
 * Loads everything the Reports page needs for one month/year and
 * aggregates it client-side into one row per staff member (active AND
 * inactive — unlike useAdminDashboard, Reports itself offers an
 * Active/Inactive filter, so it needs both kinds of row available to
 * filter from).
 *
 * Same definitions as useAdminDashboard, since this is analyzing the
 * exact same underlying grid the Dashboard summarizes and the Staff
 * member fills in:
 *  - taskCount ("Total tasks") = number of tasks assigned to that staff
 *    member for the selected month (excludes soft-deleted tasks).
 *  - total ("Total possible task-days") = taskCount x days in the
 *    selected month — i.e. every checkable cell in their grid.
 *  - completed ("Completed task-days") = how many of those cells are
 *    marked completed=true.
 *  - incomplete ("Incomplete task-days") = total - completed.
 *  - pct ("Completion percentage") = completed / total, or null when
 *    total is 0 (no tasks assigned that month) so the page can show a
 *    real "no data" state instead of a fake 0%.
 *
 * Filtering by department/status/staff selection, comparison
 * selection, and the export-ready row shape are all left to the page —
 * this hook's job is only to fetch and compute the one full set of
 * per-staff numbers for the month, once.
 */
export function useAdminReports(month, year) {
  const [staff, setStaff] = useState([])
  const [taskCountByStaff, setTaskCountByStaff] = useState({})
  const [completedCountByStaff, setCompletedCountByStaff] = useState({})
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

    const nextTaskCount = {}
    for (const t of tasks) {
      nextTaskCount[t.staff_id] = (nextTaskCount[t.staff_id] || 0) + 1
    }

    const nextCompletedCount = {}
    for (const c of completions) {
      if (c.completed) {
        nextCompletedCount[c.staff_id] = (nextCompletedCount[c.staff_id] || 0) + 1
      }
    }

    setStaff(profiles)
    setTaskCountByStaff(nextTaskCount)
    setCompletedCountByStaff(nextCompletedCount)
    setLoading(false)
  }, [month, year])

  useEffect(() => {
    load()
  }, [load])

  const daysInMonth = getDaysInMonth(month, year)

  // One row per staff member for the selected month, before any of the
  // page's own department/status/staff filters are applied.
  const allRows = useMemo(() => {
    return staff.map((profile) => {
      const taskCount = taskCountByStaff[profile.id] || 0
      const total = taskCount * daysInMonth
      // Clamp defensively — see useAdminDashboard for why this can't
      // exceed `total` in practice but costs nothing to guard.
      const completed = Math.min(completedCountByStaff[profile.id] || 0, total)
      const incomplete = total - completed
      const pct = total > 0 ? Math.round((completed / total) * 100) : null

      return {
        staff: profile,
        taskCount,
        total,
        completed,
        incomplete,
        pct,
      }
    })
  }, [staff, taskCountByStaff, completedCountByStaff, daysInMonth])

  const departments = useMemo(() => {
    const set = new Set()
    for (const p of staff) {
      if (p.department) set.add(p.department)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [staff])

  return { allRows, departments, daysInMonth, loading, error, reload: load }
}
