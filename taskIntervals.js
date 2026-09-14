/**
 * The fixed set of recurrence intervals a task can be assigned, in the
 * order they should appear in any Interval dropdown. Kept in one place
 * so the Add/Edit Task modals, the Admin task table, and the Staff
 * dashboard badge all agree on the same labels — and stay in sync with
 * the database check constraint on tasks.task_interval (see
 * supabase/admin_task_interval_hardening.sql).
 */
export const TASK_INTERVALS = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'One Time']

export const DEFAULT_TASK_INTERVAL = 'Daily'
