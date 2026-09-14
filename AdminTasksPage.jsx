import { useState } from 'react'
import { useAdminTaskManagement } from '../../hooks/useAdminTaskManagement'
import { getCurrentMonthYear, formatMonthYear } from '../../utils/dateUtils'
import StaffSelector from '../../components/StaffSelector'
import MonthSelector from '../../components/MonthSelector'
import TaskManagementTable from '../../components/TaskManagementTable'
import AddTaskModal from '../../components/AddTaskModal'
import EditTaskModal from '../../components/EditTaskModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import Toast from '../../components/Toast'

/**
 * Admin Task Management (/admin/tasks). An admin picks a Staff member,
 * month, and year, then manages that staff member's task list for that
 * month: add, rename, reorder, and (soft-)delete. Every write goes
 * through admin-only RLS (admin_task_management_hardening.sql) — this
 * page never assumes the frontend route guard is the real protection.
 */
export default function AdminTasksPage() {
  const initial = getCurrentMonthYear()
  const [staffId, setStaffId] = useState(null)
  const [month, setMonth] = useState(initial.month)
  const [year, setYear] = useState(initial.year)

  const {
    staffOptions,
    staffLoading,
    staffError,
    selectedStaff,
    tasks,
    tasksLoading,
    tasksError,
    addTask,
    editTask,
    deleteTask,
    moveTask,
    reloadTasks,
  } = useAdminTaskManagement(staffId, month, year)

  const [addOpen, setAddOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState(null)

  const monthLabel = formatMonthYear(month, year)
  const hasStaffSelected = Boolean(staffId)
  const hasTasks = tasks.length > 0

  function handleMonthChange(nextMonth, nextYear) {
    setMonth(nextMonth)
    setYear(nextYear)
  }

  async function handleAddTask(payload) {
    const result = await addTask(payload)
    if (result.success) {
      setNotice({ type: 'success', message: `"${payload.taskName}" was added.` })
    }
    return result
  }

  async function handleEditTask(taskId, updates) {
    const result = await editTask(taskId, updates)
    if (result.success) {
      setNotice({ type: 'success', message: 'Task updated.' })
    }
    return result
  }

  async function handleMove(taskId, direction) {
    setBusyId(taskId)
    const result = await moveTask(taskId, direction)
    setBusyId(null)
    if (!result.success) {
      setNotice({ type: 'error', message: result.error || 'Could not reorder tasks.' })
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteTask(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)

    if (!result.success) {
      setNotice({ type: 'error', message: result.error || 'Could not delete this task.' })
      return
    }
    setNotice({ type: 'success', message: `"${deleteTarget.task_name}" was deleted.` })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Admin</p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">Tasks</h1>
        </div>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={!hasStaffSelected}
          className="rounded-md bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          + Add Task
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3.5">
        <StaffSelector
          staff={staffOptions}
          value={staffId}
          onChange={setStaffId}
          disabled={staffLoading}
        />
        <MonthSelector month={month} year={year} onChange={handleMonthChange} />
      </div>

      {staffError && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{staffError}</span>
        </div>
      )}

      {!hasStaffSelected && !staffLoading && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
          <p className="text-sm text-slate-500">
            Select a staff member above to view and manage their tasks.
          </p>
        </div>
      )}

      {hasStaffSelected && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              {selectedStaff?.full_name || 'Staff'} &mdash; {monthLabel}
            </h2>
            <p className="text-xs text-slate-400">
              {tasks.length} task{tasks.length === 1 ? '' : 's'}
            </p>
          </div>

          {tasksError && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{tasksError}</span>
              <button
                type="button"
                onClick={reloadTasks}
                className="shrink-0 font-semibold underline underline-offset-2 hover:text-red-800"
              >
                Retry
              </button>
            </div>
          )}

          {tasksLoading && (
            <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
                <p className="text-sm text-slate-500">{'Loading tasks\u2026'}</p>
              </div>
            </div>
          )}

          {!tasksLoading && !tasksError && !hasTasks && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
              <p className="text-sm text-slate-500">
                No tasks assigned for {monthLabel} yet. Add one to get started.
              </p>
            </div>
          )}

          {!tasksLoading && !tasksError && hasTasks && (
            <TaskManagementTable
              rows={tasks}
              busyId={busyId}
              onEdit={setEditingTask}
              onDelete={setDeleteTarget}
              onMove={handleMove}
            />
          )}
        </>
      )}

      <AddTaskModal
        open={addOpen}
        staffLabel={selectedStaff?.full_name || ''}
        monthLabel={monthLabel}
        onSubmit={handleAddTask}
        onClose={() => setAddOpen(false)}
      />

      <EditTaskModal task={editingTask} onSubmit={handleEditTask} onClose={() => setEditingTask(null)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this task?"
        message={
          deleteTarget
            ? `"${deleteTarget.task_name}" will be removed from ${selectedStaff?.full_name || 'this staff member'}'s list for ${monthLabel} and every future month view. Because completion history is linked to this task in the database, that history is kept (not shown or erased) rather than deleted, so past reporting for ${monthLabel} and earlier months stays accurate. This cannot be undone from this screen.`
            : ''
        }
        confirmLabel="Delete"
        confirming={deleting}
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Toast notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  )
}
