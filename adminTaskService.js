import { supabase } from '../lib/supabaseClient'

const TASK_COLUMNS =
  'id, staff_id, task_name, task_interval, month, year, position, created_at, updated_at'

/**
 * Fetches one staff member's tasks for a given month/year, for the
 * Admin Task Management table. Mirrors taskService.getTasksForMonth
 * (same shape, same ordering) but lives in its own admin-facing module
 * since it's reached only from /admin/tasks, via the
 * "tasks_select_admin_all" RLS policy (admin_dashboard_part2_hardening.sql)
 * rather than the staff "own rows" policy. `deleted_at is null` is
 * filtered explicitly — soft-deleted tasks (see
 * admin_task_management_hardening.sql) never reappear here even though
 * the admin SELECT policy itself doesn't hide them at the row level.
 */
export async function getAdminTasksForMonth(staffId, month, year) {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_COLUMNS)
    .eq('staff_id', staffId)
    .eq('month', month)
    .eq('year', year)
    .is('deleted_at', null)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  return { tasks: data ?? [], error }
}

/**
 * Creates a new task for a staff member/month/year. Allowed for an
 * active admin by "tasks_insert_admin", which also checks the target
 * staff_id actually belongs to a Staff (not Admin) profile
 * (admin_task_management_hardening.sql). `taskInterval` (Daily / Weekly
 * / Monthly / Quarterly / One Time) is admin-only, same as task_name —
 * see admin_task_interval_hardening.sql; defaults to 'Daily' at the
 * database level if omitted.
 */
export async function createTask({ staffId, taskName, taskInterval, month, year, position }) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      staff_id: staffId,
      task_name: taskName,
      ...(taskInterval !== undefined ? { task_interval: taskInterval } : {}),
      month,
      year,
      position,
    })
    .select(TASK_COLUMNS)
    .single()

  return { task: data ?? null, error }
}

/**
 * Edits an existing task's name, interval, and/or position only. This
 * never touches staff_id/month/year — the database itself would reject
 * those columns from the browser even if we tried (only task_name,
 * task_interval, position, deleted_at are grantable; see
 * admin_task_management_hardening.sql and
 * admin_task_interval_hardening.sql) — which is what keeps an edit from
 * ever silently reassigning a task's historical completion records to a
 * different staff member or month.
 */
export async function updateTask(taskId, { taskName, taskInterval, position }) {
  const updates = {}
  if (taskName !== undefined) updates.task_name = taskName
  if (taskInterval !== undefined) updates.task_interval = taskInterval
  if (position !== undefined) updates.position = position

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .is('deleted_at', null)
    .select(TASK_COLUMNS)
    .single()

  return { task: data ?? null, error }
}

/**
 * Soft-deletes a task by setting deleted_at, instead of a real SQL
 * DELETE. The task row and every task_completions row that references
 * it are left completely untouched in the database — deleting a task
 * never removes or corrupts historical completion data for any past
 * month. The browser has no DELETE grant on `tasks` at all (see
 * admin_task_management_hardening.sql), so a real row delete is not
 * possible even if this were bypassed.
 */
export async function softDeleteTask(taskId) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', taskId)
    .is('deleted_at', null)
    .select(TASK_COLUMNS)
    .single()

  return { task: data ?? null, error }
}

/**
 * Persists a new position for every task in `orderedTasks` (already
 * reordered client-side) whose position actually changed. Runs as
 * individual UPDATEs (not a bulk upsert) so this only ever exercises
 * the UPDATE policy/grant path — never the INSERT branch an upsert's
 * ON CONFLICT DO UPDATE would also have to satisfy.
 */
export async function reorderTasks(orderedTasks) {
  const updates = orderedTasks
    .map((task, index) => ({ id: task.id, position: index, unchanged: task.position === index }))
    .filter((t) => !t.unchanged)

  if (updates.length === 0) {
    return { error: null }
  }

  const results = await Promise.all(
    updates.map(({ id, position }) =>
      supabase.from('tasks').update({ position }).eq('id', id).is('deleted_at', null)
    )
  )

  const failed = results.find((r) => r.error)
  return { error: failed?.error ?? null }
}
