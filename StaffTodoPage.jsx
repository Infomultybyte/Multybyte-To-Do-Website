import { useState } from 'react'
import StaffLayout from '../layouts/StaffLayout'
import { useAuth } from '../hooks/AuthContext'
import { useStaffTodos } from '../hooks/useStaffTodos'
import { useStaffUrgentTasks } from '../hooks/useStaffUrgentTasks'
import {
  getCurrentMonthYear,
  getDayNumbers,
  formatMonthYear,
  getTodayIST,
} from '../utils/dateUtils'
import MonthSelector from '../components/MonthSelector'
import TodoGrid from '../components/TodoGrid'
import UrgentTasksPanel from '../components/UrgentTasksPanel'
import { supabase } from '../lib/supabaseClient'

export default function StaffTodoPage() {
  const { profile } = useAuth()
  const initial = getCurrentMonthYear()
  const [month, setMonth] = useState(initial.month)
  const [year, setYear] = useState(initial.year)

  const [extraWorkText, setExtraWorkText] = useState('')
  const [submittingExtra, setSubmittingExtra] = useState(false)
  const [extraNotice, setExtraNotice] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const {
    tasks,
    loading,
    loadError,
    isCellCompleted,
    getCellState,
    getCellError,
    toggleCompletion,
    reload,
  } = useStaffTodos(profile?.id, month, year)

  const {
    activeTasks: activeUrgentTasks,
    completedTasks: completedUrgentTasks,
    loading: urgentLoading,
    loadError: urgentLoadError,
    busyId: urgentBusyId,
    updateStatus: updateUrgentStatus,
    reload: reloadUrgentTasks,
  } = useStaffUrgentTasks(profile?.id, month, year)

  const days = getDayNumbers(month, year)
  const current = getCurrentMonthYear()
  const isViewingCurrentMonth = month === current.month && year === current.year

  function handleMonthChange(nextMonth, nextYear) {
    setMonth(nextMonth)
    setYear(nextYear)
  }

  async function handleExtraWorkSubmit(e) {
    e.preventDefault()
    if (!extraWorkText.trim() || !profile?.id) return

    setSubmittingExtra(true)
    setExtraNotice(null)

    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    const { error } = await supabase.from('tasks').insert([
      {
        staff_id: profile.id,
        task_name: `[Extra Work - ${dateStr}]: ${extraWorkText.trim()}`,
        month: month,
        year: year,
        is_extra_work: true,
      }
    ])

    setSubmittingExtra(false)

    if (error) {
      setExtraNotice({ type: 'error', text: 'Failed to submit: ' + error.message })
    } else {
      setExtraNotice({ type: 'success', text: 'Extra work sent directly to Admin!' })
      setExtraWorkText('')
      reload()
    }
  }

  // Filter tasks using both the newly added `is_extra_work` column and the text fallback
  const regularTasks = tasks.filter(t => !t.is_extra_work && !t.task_name?.includes('[Extra Work'))
  const extraWorkList = tasks.filter(t => t.is_extra_work || t.task_name?.includes('[Extra Work'))
  const hasRegularTasks = regularTasks.length > 0

  return (
    <StaffLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            To-Do
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">
            Welcome, {profile?.full_name || 'there'}
          </h1>
        </div>

        <MonthSelector month={month} year={year} onChange={handleMonthChange} disabled={loading} />
      </div>

      <div className="mb-6">
        <UrgentTasksPanel
          activeTasks={activeUrgentTasks}
          completedTasks={completedUrgentTasks}
          loading={urgentLoading}
          loadError={urgentLoadError}
          onRetry={reloadUrgentTasks}
          onStatusChange={updateUrgentStatus}
          busyId={urgentBusyId}
          monthLabel={formatMonthYear(month, year)}
        />
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={reload}
            className="shrink-0 font-semibold underline underline-offset-2 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
            <p className="text-sm text-slate-500">Loading tasks…</p>
          </div>
        </div>
      )}

      {!loading && !loadError && !hasRegularTasks && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
          <p className="text-sm text-slate-500">
            No regular tasks assigned for {formatMonthYear(month, year)}.
          </p>
        </div>
      )}

      {!loading && !loadError && hasRegularTasks && (
        <>
          <p className="mb-3 text-xs text-slate-500">
            {isViewingCurrentMonth ? (
              <>
                You can only tick or untick <span className="font-semibold text-slate-600">today</span>{' '}
                ({getTodayIST().day} {formatMonthYear(month, year)}). Other days show your
                history and can&apos;t be changed.
              </>
            ) : (
              <>
                Viewing history for {formatMonthYear(month, year)} — read-only. Switch to the
                current month to update today&apos;s tasks.
              </>
            )}
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
          />
        </>
      )}

      {/* Extra Work Dropdown Section */}
      <div className="mt-8 bg-white rounded-lg shadow border border-slate-200 overflow-hidden max-w-2xl">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <div>
            <h3 className="text-sm font-bold text-slate-800">Submitted Extra Works</h3>
            <p className="text-xs text-slate-500">View all extra tasks submitted for {formatMonthYear(month, year)} ({extraWorkList.length})</p>
          </div>
          <span className={`transform transition-transform text-slate-500 font-bold ${dropdownOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {dropdownOpen && (
          <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
            {extraWorkList.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No extra work submitted for this month yet.</p>
            ) : (
              extraWorkList.map((item) => (
                <div key={item.id} className="p-3 rounded border border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-400 mb-1">
                    Submitted on: {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                  </p>
                  <p className="text-sm text-slate-800 whitespace-normal break-words">
                    {item.task_name}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Extra Work Submission Form */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow border border-slate-200 max-w-2xl">
        <h3 className="text-md font-bold text-slate-800 mb-1">Submit New Extra Work</h3>
        <p className="text-xs text-slate-500 mb-4">
          Completed any tasks outside your regular checklist? Submit them here for immediate admin review.
        </p>

        <form onSubmit={handleExtraWorkSubmit} className="space-y-3">
          <textarea
            value={extraWorkText}
            onChange={(e) => setExtraWorkText(e.target.value)}
            placeholder="Describe the extra work completed..."
            rows={3}
            className="w-full rounded-md border border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-slate-400"
          />

          <button
            type="submit"
            disabled={submittingExtra}
            className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {submittingExtra ? 'Submitting...' : 'Submit to Admin'}
          </button>

          {extraNotice && (
            <p className={`text-xs mt-2 ${extraNotice.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {extraNotice.text}
            </p>
          )}
        </form>
      </div>
    </StaffLayout>
  )
}
