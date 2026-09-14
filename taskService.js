import { supabase } from '../lib/supabaseClient'

/**
 * Fetches a staff member's tasks for a given month/year, ordered by their
 * manual `position`.
 */
export async function getTasksForMonth(staffId, month, year) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, staff_id, task_name, task_interval, month, year, position, created_at, updated_at')
    .eq('staff_id', staffId)
    .eq('month', parseInt(month, 10))
    .eq('year', parseInt(year, 10))
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching tasks:', error)
  }

  return { tasks: data ?? [], error }
}
