import { supabase } from '../lib/supabaseClient'

/**
 * Fetches every Staff profile (role = 'staff'), active or inactive.
 * Admin RLS ("profiles_select_admin_all") allows this for an
 * authenticated admin; a staff caller would only ever get their own row
 * back from the database regardless of this query.
 */
export async function getAllStaffProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, department, status, role')
    .eq('role', 'staff')
    .order('full_name', { ascending: true })

  return { profiles: data ?? [], error }
}

/**
 * Fetches the id + staff_id of every task assigned for a given
 * month/year, across all staff. Used to count how many tasks each staff
 * member has this month — we don't need task_name here, so it's left
 * out to keep the payload small. Excludes soft-deleted tasks
 * (deleted_at is not null — see admin_task_management_hardening.sql)
 * so a task an admin removed from Task Management doesn't keep
 * inflating this month's counts.
 */
export async function getTasksForAllStaff(month, year) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, staff_id')
    .eq('month', month)
    .eq('year', year)
    .is('deleted_at', null)

  return { tasks: data ?? [], error }
}

/**
 * Fetches every completion row (any staff) whose completion_date falls
 * within the given inclusive range. Used to compute completed/total per
 * staff for the selected month.
 */
export async function getCompletionsForAllStaff(startDate, endDate) {
  const { data, error } = await supabase
    .from('task_completions')
    .select('staff_id, completion_date, completed')
    .gte('completion_date', startDate)
    .lte('completion_date', endDate)

  return { completions: data ?? [], error }
}

/**
 * Fetches every completed=true completion row for one specific calendar
 * date (any staff). Used for the "Tasks completed today" stat — this is
 * always today's real-world date, independent of whichever month/year
 * the Admin has selected in the dashboard's month selector.
 */
export async function getCompletedOnDate(date) {
  const { data, error } = await supabase
    .from('task_completions')
    .select('staff_id')
    .eq('completion_date', date)
    .eq('completed', true)

  return { completions: data ?? [], error }
}
