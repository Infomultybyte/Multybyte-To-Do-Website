/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} full_name
 * @property {string} email
 * @property {'staff'|'admin'} role
 * @property {string} department
 * @property {'active'|'inactive'} status
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} staff_id
 * @property {string} task_name
 * @property {'Daily'|'Weekly'|'Monthly'|'Quarterly'|'One Time'} task_interval
 *   How often the task recurs. Admin-only to set/change (see
 *   supabase/admin_task_interval_hardening.sql); shown read-only next to
 *   the task name on the Staff dashboard.
 * @property {number} month
 * @property {number} year
 * @property {number} position
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string|null} deleted_at Soft-delete marker (Admin Task
 *   Management). Non-null means the task is deleted and hidden from
 *   both the Staff grid and Admin task lists; its task_completions
 *   history is left intact for historical reporting.
 */

/**
 * @typedef {Object} TaskCompletion
 * @property {string} id
 * @property {string} task_id
 * @property {string} staff_id
 * @property {string} completion_date
 * @property {boolean} completed
 * @property {string|null} completed_at
 * @property {string} updated_at
 */

export {}
