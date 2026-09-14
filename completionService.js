import { supabase } from '../lib/supabaseClient'

/**
 * Fetches every completion row for the given staff member within a
 * month's date range (inclusive). Returns a plain array; the caller is
 * responsible for indexing it by task_id + completion_date.
 */
export async function getCompletionsForMonth(staffId, startDate, endDate) {
  const { data, error } = await supabase
    .from('task_completions')
    .select('id, task_id, staff_id, completion_date, completed, completed_at, updated_at')
    .eq('staff_id', staffId)
    .gte('completion_date', startDate)
    .lte('completion_date', endDate)

  return { completions: data ?? [], error }
}

/**
 * Sets a task's completion state for a specific date. Uses upsert against
 * the (staff_id, task_id, completion_date) unique constraint so the same
 * checkbox can be toggled repeatedly without ever creating duplicate rows.
 *
 * Returns { completion, error }. On error, the caller should NOT assume
 * the change was persisted.
 */
export async function setTaskCompletion({ staffId, taskId, completionDate, completed }) {
  const payload = {
    staff_id: staffId,
    task_id: taskId,
    completion_date: completionDate,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  }

  const { data, error } = await supabase
    .from('task_completions')
    .upsert(payload, { onConflict: 'staff_id,task_id,completion_date' })
    .select('id, task_id, staff_id, completion_date, completed, completed_at, updated_at')
    .single()

  return { completion: data ?? null, error }
}
