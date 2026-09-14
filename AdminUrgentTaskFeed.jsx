import { formatUrgentDate } from '../utils/urgentTaskDisplay'

/**
 * Admin Dashboard widget: recently completed urgent/deadline tasks
 * across every staff member, shown the same way the rest of Admin
 * surfaces "extra work" — a quick feed, not scoped to one staff member
 * or month. The same tasks also appear in that staff member's own
 * section on the Admin Staff Detail page (UrgentTasksPanel there).
 */
export default function AdminUrgentTaskFeed({ tasks, loading, loadError, onRetry }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-800">Recently Completed Urgent Tasks</h2>
      <p className="mb-4 text-xs text-slate-500">
        Deadline tasks staff have marked completed, across all staff members.
      </p>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 font-semibold underline underline-offset-2 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400 italic">
          No urgent tasks have been completed yet.
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-md border border-lime-100 bg-lime-50/40 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{task.task_name}</p>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  {task.staff?.full_name || 'Unknown staff'}
                </span>
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
      )}
    </div>
  )
}
