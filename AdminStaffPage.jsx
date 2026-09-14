import { useState, useEffect } from 'react'
import { useStaffManagement } from '../../hooks/useStaffManagement'
import StaffManagementTable from '../../components/StaffManagementTable'
import AddStaffModal from '../../components/AddStaffModal'
import EditStaffModal from '../../components/EditStaffModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import Toast from '../../components/Toast'
import { updateStaffCredentials } from '../../services/staffManagementService'
import { supabase } from '../../lib/supabaseClient'
import { getCurrentMonthYear, formatMonthYear } from '../../utils/dateUtils'

export default function AdminStaffPage() {
  const {
    staff,
    totalCount,
    loading,
    error,
    search,
    setSearch,
    addStaff,
    saveStaff,
    changeStatus,
    removeStaff,
    reload,
  } = useStaffManagement()

  const [addOpen, setAddOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [deactivating, setDeactivating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState(null)

  // Extra Work Review Modal State for Admin
  const [reviewStaff, setReviewStaff] = useState(null)
  const [extraWorkList, setExtraWorkList] = useState([])
  const [extraWorkLoading, setExtraWorkLoading] = useState(false)
  const initial = getCurrentMonthYear()
  const [reviewMonth, setReviewMonth] = useState(initial.month)
  const [reviewYear, setReviewYear] = useState(initial.year)

  const hasStaff = staff.length > 0

  useEffect(() => {
    async function fetchStaffExtraWorks() {
      if (!reviewStaff) return
      setExtraWorkLoading(true)
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('staff_id', reviewStaff.id)
        .eq('month', reviewMonth)
        .eq('year', reviewYear)
        .ilike('task_name', '%[Extra Work%')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setExtraWorkList(data)
      } else {
        setExtraWorkList([])
      }
      setExtraWorkLoading(false)
    }
    fetchStaffExtraWorks()
  }, [reviewStaff, reviewMonth, reviewYear])

  async function handleAddStaff(payload) {
    const result = await addStaff(payload)
    if (result.success) {
      setNotice({ type: 'success', message: `${payload.full_name} was added as Staff.` })
    }
    return result
  }

  async function handleSaveStaff(staffId, updates) {
    const credentialUpdates = {}
    if (updates.email) credentialUpdates.email = updates.email
    if (updates.password) credentialUpdates.password = updates.password

    if (Object.keys(credentialUpdates).length > 0) {
      const credResult = await updateStaffCredentials(staffId, credentialUpdates)
      if (!credResult.success) {
        const message = credResult.error?.message || 'Could not update credentials.'
        setNotice({ type: 'error', message })
        return { success: false, error: message }
      }
    }

    const result = await saveStaff(staffId, {
      full_name: updates.full_name,
      department: updates.department,
      designation: updates.designation,
      status: updates.status,
    })

    if (result.success) {
      setNotice({ type: 'success', message: 'Staff details and credentials updated successfully.' })
    }
    return result
  }

  function handleToggleStatus(row) {
    if (row.status === 'active') {
      setDeactivateTarget(row)
      return
    }
    runStatusChange(row, 'active')
  }

  async function runStatusChange(row, nextStatus) {
    setBusyId(row.id)
    const result = await changeStatus(row.id, nextStatus)
    setBusyId(null)

    if (!result.success) {
      setNotice({ type: 'error', message: result.error || 'Could not update this account.' })
      return
    }
    setNotice({
      type: 'success',
      message:
        nextStatus === 'active'
          ? `${row.full_name} is now active.`
          : `${row.full_name} has been deactivated.`,
    })
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return
    setDeactivating(true)
    await runStatusChange(deactivateTarget, 'inactive')
    setDeactivating(false)
    setDeactivateTarget(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setBusyId(deleteTarget.id)
    const result = await removeStaff(deleteTarget.id)
    setDeleting(false)
    setBusyId(null)
    setDeleteTarget(null)

    if (!result.success) {
      setNotice({ type: 'error', message: result.error || 'Could not delete this staff member.' })
      return
    }
    setNotice({ type: 'success', message: `${deleteTarget.full_name} and all of their data have been permanently deleted.` })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Admin</p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">Staff Management</h1>
        </div>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-md bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          + Add Staff
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or department"
            className="w-full rounded-md border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400"
          />
        </div>
        <p className="text-xs text-slate-400">
          {staff.length} of {totalCount} staff
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
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
            <p className="text-sm text-slate-500">{'Loading staff\u2026'}</p>
          </div>
        </div>
      )}

      {!loading && !error && !hasStaff && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
          <p className="text-sm text-slate-500">
            {totalCount === 0
              ? 'No staff accounts yet. Add one to get started.'
              : 'No staff match your search.'}
          </p>
        </div>
      )}

      {!loading && !error && hasStaff && (
        <div className="space-y-4">
          <StaffManagementTable
            rows={staff}
            busyId={busyId}
            onEdit={setEditingStaff}
            onToggleStatus={handleToggleStatus}
            onDelete={setDeleteTarget}
          />

          {/* Admin Extra Work Review Section */}
          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-1">Review Staff Extra Work Submissions</h2>
            <p className="text-xs text-slate-500 mb-4">Select a staff member and month to review extra tasks submitted outside regular checklists.</p>

            <div className="flex flex-wrap gap-4 mb-4">
              <div className="w-full sm:w-72">
                <label className="block text-xs font-medium text-slate-700 mb-1">Select Staff Member</label>
                <select
                  value={reviewStaff?.id || ''}
                  onChange={(e) => {
                    const found = staff.find(s => s.id === e.target.value)
                    setReviewStaff(found || null)
                  }}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                >
                  <option value="">-- Choose Staff --</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                  ))}
                </select>
              </div>

              <div className="w-40">
                <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
                <select
                  value={reviewMonth}
                  onChange={(e) => setReviewMonth(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-32">
                <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
                <input
                  type="number"
                  value={reviewYear}
                  onChange={(e) => setReviewYear(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                />
              </div>
            </div>

            {reviewStaff ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">
                  Submissions for {reviewStaff.full_name} ({formatMonthYear(reviewMonth, reviewYear)})
                </h3>

                {extraWorkLoading ? (
                  <p className="text-xs text-slate-400 italic">Loading submissions...</p>
                ) : extraWorkList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No extra work submitted by this staff member for this period.</p>
                ) : (
                  <div className="space-y-3">
                    {extraWorkList.map((item) => (
                      <div key={item.id} className="p-3 rounded-md border border-slate-200 bg-slate-50">
                        <p className="text-xs font-semibold text-slate-400 mb-1">
                          Task ID / Record: {item.id}
                        </p>
                        <p className="text-sm text-slate-800 whitespace-normal break-words font-medium">
                          {item.task_name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Please select a staff member above to view their submitted extra work.</p>
            )}
          </div>
        </div>
      )}

      <AddStaffModal open={addOpen} onSubmit={handleAddStaff} onClose={() => setAddOpen(false)} />

      <EditStaffModal
        staff={editingStaff}
        onSubmit={handleSaveStaff}
        onClose={() => setEditingStaff(null)}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Deactivate this staff member?"
        message={
          deactivateTarget
            ? `${deactivateTarget.full_name} will no longer be able to log in. Their existing tasks and history are kept and can be restored by activating the account again.`
            : ''
        }
        confirmLabel="Deactivate"
        confirming={deactivating}
        tone="danger"
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Permanently delete this staff member?"
        message={
          deleteTarget
            ? `This will permanently delete ${deleteTarget.full_name}'s login and ALL of their data — every task and completion record. This cannot be undone. If you just want to stop them from logging in but keep their history, use Deactivate instead.`
            : ''
        }
        confirmLabel="Delete permanently"
        confirming={deleting}
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Toast notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  )
}