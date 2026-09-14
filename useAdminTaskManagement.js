import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAllStaffProfiles } from '../services/adminDashboardService'
import {
  getAdminTasksForMonth,
  createTask,
  updateTask,
  softDeleteTask,
  reorderTasks,
} from '../services/adminTaskService'

/**
 * Loads the Staff dropdown options once (every Staff profile, active or
 * inactive — an admin may still need to review/manage a deactivated
 * staff member's existing task list), then loads that staff member's
 * tasks for whichever month/year is selected. Add/Edit/Delete/Reorder
 * all update local state on success so the table reflects changes
 * immediately, without waiting on a full reload.
 */
export function useAdminTaskManagement(staffId, month, year) {
  const [staffOptions, setStaffOptions] = useState([])
  const [staffLoading, setStaffLoading] = useState(true)
  const [staffError, setStaffError] = useState(null)

  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState(null)

  const loadStaff = useCallback(async () => {
    setStaffLoading(true)
    setStaffError(null)
    const { profiles, error } = await getAllStaffProfiles()
    if (error) {
      setStaffError('Could not load staff list. Please try again.')
      setStaffLoading(false)
      return
    }
    setStaffOptions(profiles)
    setStaffLoading(false)
  }, [])

  const loadTasks = useCallback(async () => {
    if (!staffId) {
      setTasks([])
      setTasksLoading(false)
      return
    }
    setTasksLoading(true)
    setTasksError(null)
    const { tasks: rows, error } = await getAdminTasksForMonth(staffId, month, year)
    if (error) {
      setTasksError('Could not load tasks for this staff member. Please try again.')
      setTasks([])
      setTasksLoading(false)
      return
    }
    setTasks(rows)
    setTasksLoading(false)
  }, [staffId, month, year])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const selectedStaff = useMemo(
    () => staffOptions.find((s) => s.id === staffId) || null,
    [staffOptions, staffId]
  )

  async function addTask({ taskName, taskInterval }) {
    if (!staffId) return { success: false, error: 'Select a staff member first.' }
    const nextPosition = tasks.length
    const { task, error } = await createTask({
      staffId,
      taskName,
      taskInterval,
      month,
      year,
      position: nextPosition,
    })
    if (error) {
      return { success: false, error: error.message || 'Could not add this task.' }
    }
    setTasks((prev) => [...prev, task])
    return { success: true, task }
  }

  async function editTask(taskId, { taskName, taskInterval }) {
    const { task, error } = await updateTask(taskId, { taskName, taskInterval })
    if (error) {
      return { success: false, error: error.message || 'Could not save this task.' }
    }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)))
    return { success: true, task }
  }

  async function deleteTask(taskId) {
    const { error } = await softDeleteTask(taskId)
    if (error) {
      return { success: false, error: error.message || 'Could not delete this task.' }
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    return { success: true }
  }

  /** direction: -1 to move up (earlier), 1 to move down (later). */
  async function moveTask(taskId, direction) {
    const index = tasks.findIndex((t) => t.id === taskId)
    const targetIndex = index + direction
    if (index === -1 || targetIndex < 0 || targetIndex >= tasks.length) {
      return { success: true } // no-op at either end
    }

    const reordered = [...tasks]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    // Optimistic UI first, so the swap feels instant.
    setTasks(reordered)

    const { error } = await reorderTasks(reordered)
    if (error) {
      // Roll back and surface the failure.
      setTasks(tasks)
      return { success: false, error: 'Could not save the new order. Please try again.' }
    }

    // Keep local `position` values in sync with what was just persisted
    // (sequential 0..n-1 in display order) without a full reload.
    setTasks((prev) => prev.map((t, i) => ({ ...t, position: i })))
    return { success: true }
  }

  return {
    staffOptions,
    staffLoading,
    staffError,
    selectedStaff,
    tasks,
    tasksLoading,
    tasksError,
    addTask,
    editTask,
    deleteTask,
    moveTask,
    reloadTasks: loadTasks,
    reloadStaff: loadStaff,
  }
}
