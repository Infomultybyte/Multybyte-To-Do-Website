import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getTasksForMonth } from '../services/taskService'
import { getCompletionsForMonth, setTaskCompletion } from '../services/completionService'
import { toISODate, isToday } from '../utils/dateUtils'

/**
 * Cell key used to index completion state by task + day within the
 * currently loaded month. Not persisted anywhere — purely a local lookup key.
 */
function cellKey(taskId, day) {
  return `${taskId}::${day}`
}

/**
 * Loads a staff member's tasks and completions for a given month/year in
 * two batched queries (never one request per cell — see taskService /
 * completionService), and exposes a toggle function that writes straight
 * to Supabase (optimistic UI, rolled back on failure). Supabase is
 * always the source of truth — nothing here is cached in localStorage.
 *
 * toggleCompletion intentionally has a stable identity (no dependency on
 * the `cells` state) so that, combined with a memoized checkbox cell
 * component, toggling one cell does not force every other cell in a
 * large grid (50+ tasks x 31 days) to re-render.
 */
export function useStaffTodos(staffId, month, year) {
  const [tasks, setTasks] = useState([])
  const [cells, setCells] = useState({}) // cellKey -> { completed, savingState, error }
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  // Kept in sync with `cells` on every render so toggleCompletion can
  // read the latest value without depending on `cells` itself.
  const cellsRef = useRef(cells)
  cellsRef.current = cells

  const loadMonth = useCallback(async () => {
    if (!staffId) return

    setLoading(true)
    setLoadError(null)

    const { tasks: fetchedTasks, error: tasksError } = await getTasksForMonth(
      staffId,
      month,
      year
    )

    if (tasksError) {
      setLoadError('Could not load your tasks. Please try again.')
      setTasks([])
      setCells({})
      setLoading(false)
      return
    }

    const daysInMonth = new Date(year, month, 0).getDate()
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
      // Defense in depth: only today's cell is ever toggleable, enforced
      // here independently of the UI (which already disables the
      // button for non-today cells) and of the database trigger (see
      // supabase/staff_checkin_date_lock.sql). Guards against any future
      // caller of this hook bypassing the disabled button.
      if (!isToday(year, month, day)) {
        return
      }

      const key = cellKey(taskId, day)
      const previous = cellsRef.current[key]
      const nextCompleted = !previous?.completed

      // Optimistic update.
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
        // Roll back to the last known-good state and surface the error.
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

      // Briefly show "saved" feedback, then settle back to idle.
      setTimeout(() => {
        setCells((prev) => {
          const current = prev[key]
          if (!current || current.savingState !== 'saved') return prev
          return { ...prev, [key]: { ...current, savingState: 'idle' } }
        })
      }, 1200)
    },
    // Stable across renders: staffId/month/year only change when the
    // caller switches month, at which point loadMonth resets everything
    // anyway. `cells` is read via cellsRef, not as a dependency.
    [staffId, month, year]
  )

  const hasTasks = useMemo(() => tasks.length > 0, [tasks])

  return {
    tasks,
    hasTasks,
    loading,
    loadError,
    isCellCompleted,
    getCellState,
    getCellError,
    toggleCompletion,
    reload: loadMonth,
  }
}
