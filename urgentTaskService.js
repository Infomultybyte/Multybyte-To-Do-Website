import { supabase } from '../lib/supabaseClient'
import { getDaysInMonth, toISODate } from '../utils/dateUtils'

const URGENT_TASK_COLUMNS =
  'id, staff_id, task_name, deadline, admin_remark, staff_remark, status, completed_at, created_by, created_at, updated_at'

/**
 * Fetches one staff member's urgent (deadline) tasks, most urgent
 * first. Used by both the Staff dashboard (own rows, via
 * urgent_tasks_select_own) and the Admin Staff Detail page (any
 * staffId, via urgent_tasks_select_admin_all) — same query, different
 * RLS policy makes it valid depending on who's asking.
 *
 * When `month`/`year` are given, only tasks whose deadline falls in
 * that calendar month are returned — an urgent task belongs to the
 * month it was due in, the same way regular tasks belong to the
 * month/year they're assigned for, so it shouldn't reappear when
 * browsing a different month via the page's existing MonthSelector.
 */
export async function getUrgentTasksForStaff(staffId, month, year) {
  let query = supabase
    .from('urgent_tasks')
    .select(URGENT_TASK_COLUMNS)
    .eq('staff_id', staffId)

  if (month && year) {
    const daysInMonth = getDaysInMonth(month, year)
    const startDate = toISODate(year, month, 1)
    const endDate = toISODate(year, month, daysInMonth)
    query = query.gte('deadline', startDate).lte('deadline', endDate)
  }

  const { data, error } = await query
    .order('deadline', { ascending: true })
    .order('created_at', { ascending: false })

  return { tasks: data ?? [], error }
}

/**
 * Creates a new urgent task for a staff member. Admin-only at the
 * database level (urgent_tasks_insert_admin) — staff_id must also
 * belong to a real Staff profile, enforced by is_staff_profile().
 * `status` always starts at its column default ('pending') and is
 * never set here; only the staff member (or an admin override) moves
 * it forward from that point.
 */
export async function createUrgentTask({ staffId, taskName, deadline, adminRemark }) {
  const { data, error } = await supabase
    .from('urgent_tasks')
    .insert({
      staff_id: staffId,
      task_name: taskName,
      deadline,
      ...(adminRemark !== undefined && adminRemark !== '' ? { admin_remark: adminRemark } : {}),
    })
    .select(URGENT_TASK_COLUMNS)
    .single()

  return { task: data ?? null, error }
}

/**
 * Updates the workflow status of an urgent task (pending / in_process /
 * completed). Used by the Staff dashboard for their own tasks, and
 * available to an admin as an override on any task — both paths go
 * through the same RLS-checked UPDATE; completed_at is stamped/cleared
 * automatically by the database trigger (see supabase/urgent_tasks.sql),
 * never set from here.
 *
 * `remark` is optional and only meant to be passed when moving a task
 * to 'completed' — the Staff UI asks "add a remark? (optional)" at
 * that moment and lets it be left blank. Omitting the argument
 * entirely (e.g. a plain pending/in_process change) leaves whatever
 * staff_remark already exists untouched.
 */
export async function updateUrgentTaskStatus(taskId, status, remark) {
  const updates = { status }
  if (remark !== undefined) {
    updates.staff_remark = remark
  }

  const { data, error } = await supabase
    .from('urgent_tasks')
    .update(updates)
    .eq('id', taskId)
    .select(URGENT_TASK_COLUMNS)
    .single()

  return { task: data ?? null, error }
}

/**
 * Recently completed urgent tasks across EVERY staff member, for the
 * Admin Dashboard's company-wide "completed urgent work" feed. Admin
 * SELECT policy (urgent_tasks_select_admin_all) is what makes the
 * cross-staff read valid; the embedded `staff:profiles(full_name)`
 * select relies on the staff_id -> profiles foreign key and is itself
 * subject to the admin's existing profiles_select_admin_all policy.
 * The FK is named explicitly (urgent_tasks_staff_id_fkey) because
 * `created_by` is a SECOND foreign key from this table to profiles —
 * without the hint, PostgREST can't tell which relationship to embed.
 */
export async function getRecentCompletedUrgentTasks(limit = 10) {
  const { data, error } = await supabase
    .from('urgent_tasks')
    .select(`${URGENT_TASK_COLUMNS}, staff:profiles!urgent_tasks_staff_id_fkey(full_name)`)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit)

  return { tasks: data ?? [], error }
}
