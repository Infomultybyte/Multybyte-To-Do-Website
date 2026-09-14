import { useState } from 'react'
import { isPastDeadline } from '../utils/dateUtils'
import {
  URGENT_STATUS_OPTIONS,
  URGENT_STATUS_BADGE_CLASSES,
  URGENT_STATUS_LABELS,
  formatUrgentDate,
} from '../utils/urgentTaskDisplay'
import CompleteUrgentTaskModal from './CompleteUrgentTaskModal'

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        URGENT_STATUS_BADGE_CLASSES[status] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {URGENT_STATUS_LABELS[status] || status}
    </span>
  )
}

/**
 * Shared "Urgent Tasks" panel used by both the Staff dashboard
 * (StaffTodoPage — status editable via `onStatusChange`) and the Admin
 * Staff Detail page (AdminStaffDetailPage — `onStatusChange` omitted,
 * so status renders as a read-only badge; admin sees the same status
 * staff sets, but changing it is a staff-only action). Active
 * (pending/in_process) tasks are listed first, sorted by nearest
 * deadline; completed tasks are always a separate list underneath.
 *
 * Moving a task to "Completed" (only possible where `onStatusChange`
 * is provided, i.e. the Staff dashboard) never fires immediately —
 * CompleteUrgentTaskModal asks first, so the staff member can add an
 * optional remark or just confirm with none.
 */
export default function UrgentTasksPanel({
  activeTasks,
  completedTasks,
  loading,
  loadError,
  onRetry,
  onStatusChange,
  busyId,
  addAction,
  monthLabel,
}) {
  const hasAny = activeTasks.length > 0 || completedTasks.length > 0
  const [completingTask, setCompletingTask] = useState(null)

  function handleStatusSelect(task, nextStatus) {
    if (nextStatus === 'completed') {
      setCompletingTask(task)
      return
    }
    onStatusChange(task.id, nextStatus)
  }

  async function handleConfirmComplete(remark) {
    const result = await onStatusChange(completingTask.id, 'completed', remark)
    if (result.success) {
      setCompletingTask(null)
    }
    return result
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Urgent Tasks</h3>
          <p className="text-xs text-slate-500">
            Deadline-driven tasks assigned outside the regular monthly checklist
            {monthLabel ? ` — ${monthLabel}` : ''}.
          </p>
        </div>
        {addAction}
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{loadError}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 font-semibold underline underline-offset-2 hover:text-red-800"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
        </div>
      ) : !hasAny ? (
        <p className="py-6 text-center text-xs text-slate-400 italic">
          No urgent tasks{monthLabel ? ` for ${monthLabel}` : ''}.
        </p>
      ) : (
        <div className="space-y-5">
          {activeTasks.length > 0 && (
            <div className="space-y-3">
              {activeTasks.map((task) => {
                const overdue = isPastDeadline(task.deadline) && task.status !== 'completed'
                return (
                  <div
                    key={task.id}
                    className="rounded-md border border-slate-200 bg-slate-50/50 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{task.task_name}</p>
                      {onStatusChange ? (
                        <select
                          value={task.status}
                          disabled={busyId === task.id}
                          onChange={(e) => handleStatusSelect(task, e.target.value)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {URGENT_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge status={task.status} />
                      )}
                    </div>
                    <p className={`mt-1 text-xs font-medium ${overdue ? 'text-red-600' : 'text-slate-500'}`}>
                      Deadline: {formatUrgentDate(task.deadline)}
                      {overdue ? ' — overdue' : ''}
                    </p>
                    {task.admin_remark && (
                      <p className="mt-2 whitespace-normal break-words text-xs text-slate-600">
                        <span className="font-semibold text-slate-500">Admin remark: </span>
                        {task.admin_remark}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Completed
              </h4>
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <div key={task.id} className="rounded-md border border-lime-100 bg-lime-50/40 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{task.task_name}</p>
                      <StatusBadge status={task.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Deadline: {formatUrgentDate(task.deadline)} &middot; Completed:{' '}
                      {formatUrgentDate(task.completed_at)}
                    </p>
                    {task.admin_remark && (
                      <p className="mt-2 whitespace-normal break-words text-xs text-slate-600">
                        <span className="font-semibold text-slate-500">Admin remark: </span>
                        {task.admin_remark}
                      </p>
                    )}
                    {task.staff_remark && (
                      <p className="mt-1 whitespace-normal break-words text-xs text-slate-600">
                        <span className="font-semibold text-slate-500">Staff remark: </span>
                        {task.staff_remark}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {onStatusChange && (
        <CompleteUrgentTaskModal
          task={completingTask}
          onSubmit={handleConfirmComplete}
          onCancel={() => setCompletingTask(null)}
        />
      )}
    </div>
  )
}
