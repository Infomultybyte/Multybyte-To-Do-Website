import { supabase } from '../lib/supabaseClient'

const TASK_COLUMNS = 'id, staff_id, task_name, month, year, position'
const COMPLETION_COLUMNS = 'task_id, staff_id, completion_date, completed, completed_at'

/**
 * Fetches every (non soft-deleted) task assigned to any of `staffIds`
 * for one specific month/year — one call per month the export covers
 * (see useReportExport), scoped to admin-only "tasks_select_admin_all"
 * RLS exactly like every other admin read in this codebase. Returns []
 * immediately for an empty staffIds array rather than sending
 * `.in('staff_id', [])`, which Supabase would otherwise happily
 * evaluate as "no rows" anyway, but there's no reason to round-trip
 * for a selection that's already known to be empty.
 */
export async function getTasksForExport(staffIds, month, year) {
  if (!staffIds.length) return { tasks: [], error: null }

  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_COLUMNS)
    .in('staff_id', staffIds)
    .eq('month', month)
    .eq('year', year)
    .is('deleted_at', null)
    .order('position', { ascending: true })

  return { tasks: data ?? [], error }
}

/**
 * Fetches every completion row for any of `staffIds` within one
 * month's inclusive date range. Scoped to admin-only
 * "completions_select_admin_all" RLS, same as the rest of Reports.
 */
export async function getCompletionsForExport(staffIds, startDate, endDate) {
  if (!staffIds.length) return { completions: [], error: null }

  const { data, error } = await supabase
    .from('task_completions')
    .select(COMPLETION_COLUMNS)
    .in('staff_id', staffIds)
    .gte('completion_date', startDate)
    .lte('completion_date', endDate)

  return { completions: data ?? [], error }
}
