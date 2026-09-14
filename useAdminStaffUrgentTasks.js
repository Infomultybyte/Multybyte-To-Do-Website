import { useCallback, useEffect, useMemo, useState } from 'react'
import { getUrgentTasksForStaff, createUrgentTask } from '../services/urgentTaskService'

/**
 * Admin-facing mirror of useStaffUrgentTasks for the Staff Detail page
 * (/admin/staff/:staffId) — same data (urgent_tasks_select_admin_all
 * makes the cross-staff read valid), plus the ability to ASSIGN a new
 * urgent/deadline task to this staff member. Status itself stays
 * staff-driven: the admin sees the current status here, but changing it
 * is intentionally a staff-only action from their own dashboard.
 *
 * `month`/`year` scope this to tasks whose deadline falls in that
 * calendar month, matching the page's existing MonthSelector — a task
 * due (and completed) in September never lingers into an October view.
 */
export function useAdminStaffUrgentTasks(staffId, month, year) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const load = useCallback(async () => {
    if (!staffId) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)

    const { tasks: fetched, error } = await getUrgentTasksForStaff(staffId, month, year)
    if (error) {
      setLoadError('Could not load urgent tasks for this staff member. Please try again.')
      setTasks([])
      setLoading(false)
      return
    }

    setTasks(fetched)
    setLoading(false)
  }, [staffId, month, year])

  useEffect(() => {
    load()
  }, [load])

  async function addUrgentTask({ taskName, deadline, adminRemark }) {
    if (!staffId) return { success: false, error: 'Select a staff member first.' }
    const { task, error } = await createUrgentTask({ staffId, taskName, deadline, adminRemark })
    if (error) {
      return { success: false, error: error.message || 'Could not assign this task.' }
    }
    // Only reflect it in the currently-displayed list if its deadline
    // actually falls in the month/year being viewed — otherwise it
    // would show up here despite getUrgentTasksForStaff's own month
    // filter excluding it on the next reload/navigation.
    const deadlineYear = Number(deadline.slice(0, 4))
    const deadlineMonth = Number(deadline.slice(5, 7))
    if (!month || !year || (deadlineMonth === month && deadlineYear === year)) {
      setTasks((prev) => [task, ...prev])
    }
    return { success: true, task }
  }

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== 'completed'), [tasks])
  const completedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'completed')
        .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0)),
    [tasks]
  )

  return {
    activeTasks,
    completedTasks,
    hasTasks: tasks.length > 0,
    loading,
    loadError,
    addUrgentTask,
    reload: load,
  }
}
