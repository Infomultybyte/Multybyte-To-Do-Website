import { useCallback, useEffect, useState } from 'react'
import { getRecentCompletedUrgentTasks } from '../services/urgentTaskService'

/**
 * Company-wide feed of recently-completed urgent/deadline tasks, for
 * the Admin Dashboard. Shown the same way regular Extra Work
 * submissions are surfaced elsewhere in Admin — a quick "what did
 * people just finish" glance across every staff member, not scoped to
 * one person or one month.
 */
export function useAdminUrgentTasksFeed(limit = 10) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)

    const { tasks: fetched, error } = await getRecentCompletedUrgentTasks(limit)
    if (error) {
      setLoadError('Could not load recently completed urgent tasks.')
      setTasks([])
      setLoading(false)
      return
    }

    setTasks(fetched)
    setLoading(false)
  }, [limit])

  useEffect(() => {
    load()
  }, [load])

  return { tasks, loading, loadError, reload: load }
}
