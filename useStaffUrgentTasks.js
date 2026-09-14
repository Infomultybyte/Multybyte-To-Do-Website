import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getUrgentTasksForStaff, updateUrgentTaskStatus } from '../services/urgentTaskService'

/**
 * Staff-facing hook for urgent/deadline tasks an admin has assigned to
 * the signed-in staff member. Separate from useStaffTodos (the regular
 * monthly grid) — these are one-off, deadline-driven tasks with their
 * own workflow status (pending -> in_process -> completed) that the
 * staff member drives themselves via a dropdown.
 *
 * `month`/`year` scope this to tasks whose deadline falls in that
 * calendar month — the same MonthSelector already on the Staff page
 * drives both the regular grid and this list, so a task due (and
 * completed) in September never lingers into an October view.
 */
export function useStaffUrgentTasks(staffId, month, year) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  const load = useCallback(async () => {
    if (!staffId) return
    setLoading(true)
    setLoadError(null)

    const { tasks: fetched, error } = await getUrgentTasksForStaff(staffId, month, year)
    if (error) {
      setLoadError('Could not load your urgent tasks. Please try again.')
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

  const updateStatus = useCallback(async (taskId, status, remark) => {
    const previous = tasksRef.current
    setBusyId(taskId)
    // Optimistic update so the dropdown feels instant.
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status, ...(remark !== undefined ? { staff_remark: remark } : {}) } : t
      )
    )

    const { task, error } = await updateUrgentTaskStatus(taskId, status, remark)
    setBusyId(null)

    if (error) {
      setTasks(previous) // roll back
      return { success: false, error: 'Could not update the status. Please try again.' }
    }

    setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)))
    return { success: true }
  }, [])

  // Active = not yet completed, most urgent (nearest deadline) first —
  // already the query's default order. Completed tasks are surfaced
  // separately (own list at the bottom of the Staff panel), most
  // recently completed first.
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
    busyId,
    updateStatus,
    reload: load,
  }
}
