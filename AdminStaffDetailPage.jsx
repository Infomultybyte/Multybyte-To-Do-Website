import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { getCurrentMonthYear, getDayNumbers, formatMonthYear } from '../../utils/dateUtils'
import MonthSelector from '../../components/MonthSelector'
import TodoGrid from '../../components/TodoGrid'
import Toast from '../../components/Toast'
import UrgentTasksPanel from '../../components/UrgentTasksPanel'
import AddUrgentTaskModal from '../../components/AddUrgentTaskModal'
import { useAdminStaffTodos } from '../../hooks/useAdminStaffTodos'
import { useAdminStaffUrgentTasks } from '../../hooks/useAdminStaffUrgentTasks'

export default function AdminStaffDetailView() {
  const { staffId } = useParams()
  const navigate = useNavigate()
  
  const [staffProfile, setStaffProfile] = useState(null)
  const initial = getCurrentMonthYear()
  const [month, setMonth] = useState(initial.month)
  const [year, setYear] = useState(initial.year)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [busyTaskId, setBusyTaskId] = useState(null)
  const [notice, setNotice] = useState(null)
  const [addUrgentOpen, setAddUrgentOpen] = useState(false)

  // Fetch profile details
  useState(() => {
    async function loadProfile() {
      if (!staffId) return
      const { data } = await supabase.from('profiles').select('*').eq('id', staffId).single()
      if (data) setStaffProfile(data)
    }
    loadProfile()
  }, [staffId])

  // Admin-scoped hook: unlike the Staff dashboard's useStaffTodos, this
  // has NO today-only restriction — an admin may tick/untick any past,
  // present, or future date on a staff member's behalf. Enforced by RLS
  // (admin_staff_detail_hardening.sql) and the matching database
  // exemption in admin_todo_edit_any_date_hardening.sql.
  const {
    tasks,
    loading,
    loadError,
    isCellCompleted,
    getCellState,
    getCellError,
    toggleCompletion,
    moveTask,
    reload,
  } = useAdminStaffTodos(staffId, month, year)

  const {
    activeTasks: activeUrgentTasks,
    completedTasks: completedUrgentTasks,
    loading: urgentLoading,
    loadError: urgentLoadError,
    addUrgentTask,
    reload: reloadUrgentTasks,
  } = useAdminStaffUrgentTasks(staffId, month, year)

  const days = getDayNumbers(month, year)

  async function handleAddUrgentTask(payload) {
    const result = await addUrgentTask(payload)
    if (result.success) {
      setNotice({ type: 'success', message: `"${payload.taskName}" was assigned to this staff member.` })
    }
    return result
  }

  async function handleMoveTask(taskId, direction) {
    setBusyTaskId(taskId)
    const result = await moveTask(taskId, direction)
    setBusyTaskId(null)
    if (!result.success) {
      setNotice({ type: 'error', message: result.error || 'Could not reorder tasks.' })
    }
  }

  // Filter tasks using both the `is_extra_work` column and text fallback
  const regularTasks = tasks.filter(t => !t.is_extra_work && !t.task_name?.includes('[Extra Work'))
  const extraWorkListFiltered = tasks.filter(t => t.is_extra_work || t.task_name?.includes('[Extra Work'))
  const hasRegularTasks = regularTasks.length > 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 inline-block"
          >
            ← Back to Staff List
          </button>
          <h1 className="text-xl font-bold text-slate-800">
            {staffProfile?.full_name ? `${staffProfile.full_name}'s Task Dashboard` : 'Staff Dashboard'}
          </h1>
          <p className="text-xs text-slate-500">{staffProfile?.email} | {staffProfile?.department || 'No Department'}</p>
        </div>

        <MonthSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} disabled={loading} />
      </div>

      <UrgentTasksPanel
        activeTasks={activeUrgentTasks}
        completedTasks={completedUrgentTasks}
        loading={urgentLoading}
        loadError={urgentLoadError}
        onRetry={reloadUrgentTasks}
        monthLabel={formatMonthYear(month, year)}
        addAction={
          <button
            type="button"
            onClick={() => setAddUrgentOpen(true)}
            className="shrink-0 rounded-md bg-slate-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
          >
            + Assign Urgent Task
          </button>
        }
      />

      {loadError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 flex justify-between items-center">
          <span>{loadError}</span>
          <button onClick={reload} className="underline font-semibold">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
        </div>
      ) : !hasRegularTasks ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
          <p className="text-sm text-slate-500">No regular tasks assigned for {formatMonthYear(month, year)}.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">
            As an admin, you can tick or untick <span className="font-semibold text-slate-600">any date</span> —
            past, present, or future — on this staff member&apos;s behalf. Staff themselves can only update today.
            Use the arrows beside a task name to reorder this staff member&apos;s tasks, and note that{' '}
            <span className="font-semibold text-red-500">Sundays</span> are highlighted in red — staff can still
            tick their tasks on Sundays as usual.
          </p>
          <TodoGrid
            tasks={regularTasks}
            days={days}
            month={month}
            year={year}
            isCellCompleted={isCellCompleted}
            getCellState={getCellState}
            getCellError={getCellError}
            onToggle={toggleCompletion}
            restrictToToday={false}
            onMoveTask={handleMoveTask}
            busyTaskId={busyTaskId}
          />
        </>
      )}

      {/* Admin Extra Work Dropdown Section */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden max-w-2xl">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <div>
            <h3 className="text-sm font-bold text-slate-800">Submitted Extra Works</h3>
            <p className="text-xs text-slate-500">
              View extra tasks submitted for {formatMonthYear(month, year)} ({extraWorkListFiltered.length})
            </p>
          </div>
          <span className={`transform transition-transform text-slate-500 font-bold ${dropdownOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {dropdownOpen && (
          <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
            {extraWorkListFiltered.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No extra work submitted by this staff member for this month.</p>
            ) : (
              extraWorkListFiltered.map((item) => (
                <div key={item.id} className="p-3 rounded border border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    Submitted on: {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                  </p>
                  <p className="text-sm text-slate-800 whitespace-normal break-words font-medium">
                    {item.task_name}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <AddUrgentTaskModal
        open={addUrgentOpen}
        staffLabel={staffProfile?.full_name || 'this staff member'}
        onSubmit={handleAddUrgentTask}
        onClose={() => setAddUrgentOpen(false)}
      />

      <Toast notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  )
}