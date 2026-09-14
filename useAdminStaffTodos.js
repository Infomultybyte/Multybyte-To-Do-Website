import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAdminTasksForMonth, reorderTasks } from '../services/adminTaskService'
import { getCompletionsForMonth, setTaskCompletion } from '../services/completionService'
import { getDaysInMonth, toISODate } from '../utils/dateUtils'

/**
 * Admin-facing mirror of useStaffTodos (src/hooks/useStaffTodos.js) for
 * the Staff Detail page (/admin/staff/:staffId) — same shape, same
 * optimistic-update/rollback behavior, same cell-keying scheme, kept as
 * its own hook (rather than a shared/parameterized one) to match this
 * codebase's existing staff/admin module separation (taskService vs
 * adminTaskService, useStaffManagement vs useAdminDashboard, etc.).
 *
 * The one real difference: tasks are loaded via
 * adminTaskService.getAdminTasksForMonth (admin-scoped RLS, works for
 * ANY staffId) instead of taskService.getTasksForMonth (staff's own
 * rows only). Completions are read/written through the exact same
 * completionService functions the Staff UI uses — those were already
 * parameterized by staffId, not tied to auth.uid(), so admin write
 * access only required new RLS policies (admin_staff_detail_hardening.sql),
 * not new application code.
 *
 * Also computes the month's completion summary (completed/total/pct)
 * for the header stat cards, using the same "total cells = tasks x
 * days in month" definition already established by useAdminDashboard.
 */
function cellKey(taskId, day) {
  return `${taskId}::${day}`
}

export function useAdminStaffTodos(staffId, month, year) {
  const [tasks, setTasks] = useState([])
  const [cells, setCells] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const cellsRef = useRef(cells)
  cellsRef.current = cells

  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  const loadMonth = useCallback(async () => {
    if (!staffId) return

    setLoading(true)
    setLoadError(null)

    const { tasks: fetchedTasks, error: tasksError } = await getAdminTasksForMonth(
      staffId,
      month,
      year
    )

    if (tasksError) {
      setLoadError('Could not load this staff member\u2019s tasks. Please try again.')
      setTasks([])
      setCells({})
      setLoading(false)
      return
    }

    const daysInMonth = getDaysInMonth(month, year)
    const startDate = toISODate(year, month, 1)
    const endDate = toISODate(year, month, daysInMonth)

    const { completions, error: completionsError } = await getCompletionsForMonth(
      staffId,
      startDate,
      endDate
    )

    if (completionsError) {
      setLoadError('Could not load completion history. Please try again.')
      setTasks(fetchedTasks)
      setCells({})
      setLoading(false)
      return
    }

    const nextCells = {}
    for (const completion of completions) {
      const day = Number(completion.completion_date.slice(-2))
      nextCells[cellKey(completion.task_id, day)] = {
        completed: completion.completed,
        savingState: 'idle',
        error: null,
      }
    }

    setTasks(fetchedTasks)
    setCells(nextCells)
    setLoading(false)
  }, [staffId, month, year])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  const isCellCompleted = useCallback(
    (taskId, day) => Boolean(cells[cellKey(taskId, day)]?.completed),
    [cells]
  )

  const getCellState = useCallback(
    (taskId, day) => cells[cellKey(taskId, day)]?.savingState || 'idle',
    [cells]
  )

  const getCellError = useCallback(
    (taskId, day) => cells[cellKey(taskId, day)]?.error || null,
    [cells]
  )

  const toggleCompletion = useCallback(
    async (taskId, day) => {
      const key = cellKey(taskId, day)
      const previous = cellsRef.current[key]
      const nextCompleted = !previous?.completed

      setCells((prev) => ({
        ...prev,
        [key]: { completed: nextCompleted, savingState: 'saving', error: null },
      }))

      const completionDate = toISODate(year, month, day)
      const { error } = await setTaskCompletion({
        staffId,
        taskId,
        completionDate,
        completed: nextCompleted,
      })

      if (error) {
        setCells((prev) => ({
          ...prev,
          [key]: {
            completed: Boolean(previous?.completed),
            savingState: 'error',
            error: 'Could not save. Try again.',
          },
        }))
        return
      }

      setCells((prev) => ({
        ...prev,
        [key]: { completed: nextCompleted, savingState: 'saved', error: null },
      }))

      setTimeout(() => {
        setCells((prev) => {
          const current = prev[key]
          if (!current || current.savingState !== 'saved') return prev
          return { ...prev, [key]: { ...current, savingState: 'idle' } }
        })
      }, 1200)
    },
    [staffId, month, year]
  )

  // Lets the admin reorder this staff member's task rows from the Staff
  // Detail grid, the same way Admin > Tasks already does (see
  // useAdminTaskManagement.moveTask) — same optimistic-swap-then-persist
  // approach, reusing the same reorderTasks service call so both screens
  // stay consistent about what "position" means.
  const moveTask = useCallback(
    async (taskId, direction) => {
      const current = tasksRef.current
      const index = current.findIndex((t) => t.id === taskId)
      const targetIndex = index + direction
      if (index === -1 || targetIndex < 0 || targetIndex >= current.length) {
        return { success: true } // no-op at either end
      }

      const reordered = [...current]
      const [moved] = reordered.splice(index, 1)
      reordered.splice(targetIndex, 0, moved)

      // Optimistic UI first, so the swap feels instant.
      setTasks(reordered)

      const { error } = await reorderTasks(reordered)
      if (error) {
        // Roll back and surface the failure.
        setTasks(current)
        return { success: false, error: 'Could not save the new order. Please try again.' }
      }

      // Keep local `position` values in sync with what was just persisted
      // (sequential 0..n-1 in display order) without a full reload.
      setTasks((prev) => prev.map((t, i) => ({ ...t, position: i })))
      return { success: true }
    },
    []
  )

  const hasTasks = useMemo(() => tasks.length > 0, [tasks])

  // Completion summary for the header: total checkable cells this
  // month (tasks x days in month) vs how many are marked completed.
  const stats = useMemo(() => {
    const daysInMonth = getDaysInMonth(month, year)
    const total = tasks.length * daysInMonth
    const completed = Object.values(cells).filter((c) => c.completed).length
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, total, pct }
  }, [tasks, cells, month, year])

  return {
    tasks,
    hasTasks,
    loading,
    loadError,
    isCellCompleted,
    getCellState,
    getCellError,
    toggleCompletion,
    moveTask,
    stats,
    reload: loadMonth,
  }
}
