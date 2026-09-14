import { memo } from 'react'
import { isToday, isSunday } from '../utils/dateUtils'

function ChevronUp() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M5 12.5 10 7.5 15 12.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const CheckboxCell = memo(function CheckboxCell({
  taskId,
  day,
  month,
  year,
  completed,
  state,
  error,
  onToggle,
  restrictToToday,
}) {
  const today = isToday(year, month, day)
  const isSaving = state === 'saving'
  const hasError = state === 'error'
  // Staff may only ever tick/untick TODAY's cell — not past history, and
  // not future dates. Past/future cells still display their completion
  // state (view-only) so history remains visible; they're just not
  // interactive. The database enforces this too (see
  // supabase/staff_checkin_date_lock.sql) so this can't be bypassed by
  // calling the API directly. Admin (restrictToToday={false}, from the
  // Admin Staff Detail page) is exempt from this — the matching
  // database-side exemption lives in
  // supabase/admin_todo_edit_any_date_hardening.sql.
  const isEditable = !restrictToToday || today
  const isDisabled = isSaving || !isEditable

  const title = hasError
    ? error
    : !isEditable
      ? completed
        ? 'Completed — only today can be changed'
        : 'Only today can be ticked'
      : undefined

  const sunday = isSunday(year, month, day)

  return (
    <td
      className={`border-b border-slate-100 p-0 text-center ${
        today ? 'bg-lime-50/70' : sunday ? 'bg-red-50/60' : ''
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-disabled={!isEditable}
        aria-label={`Day ${day}${completed ? ', completed' : ', not completed'}${
          isEditable ? '' : ', locked — only today can be changed'
        }`}
        disabled={isDisabled}
        onClick={() => isEditable && onToggle(taskId, day)}
        title={title}
        className={`group relative flex h-10 w-10 items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 ${
          isSaving ? 'cursor-wait' : !isEditable ? 'cursor-not-allowed' : ''
        } ${hasError ? 'ring-1 ring-inset ring-red-300' : ''}`}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-[4px] border transition-colors ${
            completed
              ? isEditable
                ? 'border-slate-700 bg-slate-700'
                : 'border-slate-300 bg-slate-400'
              : isEditable
                ? 'border-slate-300 bg-white group-hover:border-slate-400'
                : 'border-slate-200 bg-slate-50'
          }`}
        >
          {completed && (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none">
              <path
                d="M3.5 8.5L6.5 11.5L12.5 4.5"
                stroke={isEditable ? '#C6D30A' : '#ffffff'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>

        {isSaving && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-slate-400" />
        )}
        {hasError && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>
    </td>
  )
})

export default function TodoGrid({
  tasks,
  days,
  month,
  year,
  isCellCompleted,
  getCellState,
  getCellError,
  onToggle,
  // Staff usage leaves this at the default (true): only today's column
  // is interactive. The Admin Staff Detail page passes false so an
  // admin can correct/backfill any date on a staff member's behalf.
  restrictToToday = true,
  // Optional: when provided (Admin Staff Detail page only), Up/Down
  // arrows appear beside each task name so the admin can reorder this
  // staff member's tasks. Left undefined on the Staff dashboard, so
  // staff never see reorder controls. Purely a display-order control —
  // it never touches restrictToToday/isEditable, so which cells staff
  // can tick is unaffected either way.
  onMoveTask,
  busyTaskId,
}) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm table-auto">
        <thead>
          <tr>
            <th
              className="sticky left-0 z-10 w-[350px] min-w-[300px] border-b border-r border-slate-200 bg-slate-50 px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm"
              scope="col"
            >
              Task
            </th>
            {days.map((day) => {
              const today = isToday(year, month, day)
              const sunday = isSunday(year, month, day)
              return (
                <th
                  key={day}
                  scope="col"
                  className={`min-w-[44px] border-b border-slate-200 px-0 py-3.5 text-center text-xs font-semibold ${
                    today
                      ? 'bg-lime-50/70 text-slate-700'
                      : sunday
                        ? 'bg-red-50/60 text-red-600'
                        : 'text-slate-500'
                  }`}
                  title={sunday ? 'Sunday' : undefined}
                >
                  <span className="block leading-tight">{day}</span>
                  {sunday && (
                    <span className="block text-[9px] font-bold leading-tight text-red-500">
                      Sun
                    </span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            <tr key={task.id} className="group/row">
              <th
                scope="row"
                className="sticky left-0 z-10 w-[350px] min-w-[300px] whitespace-normal break-words border-b border-r border-slate-200 bg-white px-6 py-3 text-left text-sm font-medium text-slate-700 shadow-sm group-hover/row:bg-slate-50"
                title={task.task_name}
              >
                <div className="flex items-center gap-2">
                  {onMoveTask && (
                    <div className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        onClick={() => onMoveTask(task.id, -1)}
                        disabled={busyTaskId === task.id || index === 0}
                        aria-label={`Move ${task.task_name} up`}
                        className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronUp />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveTask(task.id, 1)}
                        disabled={busyTaskId === task.id || index === tasks.length - 1}
                        aria-label={`Move ${task.task_name} down`}
                        className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronDown />
                      </button>
                    </div>
                  )}
                  <span>{task.task_name}</span>
                  {/* Set by an admin when the task is added/edited — read-only here for Staff (and shown the same way to Admin on the Staff Detail view). */}
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    {task.task_interval || 'Daily'}
                  </span>
                </div>
              </th>
              {days.map((day) => (
                <CheckboxCell
                  key={day}
                  taskId={task.id}
                  day={day}
                  month={month}
                  year={year}
                  completed={isCellCompleted(task.id, day)}
                  state={getCellState(task.id, day)}
                  error={getCellError(task.id, day)}
                  onToggle={onToggle}
                  restrictToToday={restrictToToday}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}