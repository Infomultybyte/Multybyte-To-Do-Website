import { useCallback, useEffect, useMemo, useState } from 'react'
import { listStaff, createStaff, updateStaff, deleteStaff } from '../services/staffManagementService'

/**
 * Loads the full Staff roster once, then filters it in memory by the
 * search box (name/email/department) — see staffManagementService for
 * why this stays client-side. Create/update calls go straight to
 * Supabase (via the service layer) and update local state on success
 * so the table reflects changes immediately, without waiting on a full
 * reload.
 */
export function useStaffManagement() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { staff: rows, error: err } = await listStaff()
    if (err) {
      setError('Could not load staff. Please try again.')
      setLoading(false)
      return
    }
    setStaff(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return staff
    return staff.filter((s) =>
      [s.full_name, s.email, s.department].some((value) =>
        (value || '').toLowerCase().includes(term)
      )
    )
  }, [staff, search])

  async function addStaff(payload) {
    try {
      const { profile, error: err } = await createStaff(payload)
      if (err) {
        return { success: false, error: err.message }
      }
      if (profile) {
        setStaff((prev) => [profile, ...prev.filter((s) => s.id !== profile.id)])
      } else {
        // The Edge Function created the account but the create call
        // itself didn't return the row back (shouldn't normally happen) —
        // fall back to a full reload so the table still ends up correct.
        await load()
      }
      return { success: true, profile }
    } catch (err) {
      return { success: false, error: err?.message || 'Could not create the staff account.' }
    }
  }

  async function saveStaff(staffId, updates) {
    try {
      const { profile, error: err } = await updateStaff(staffId, updates)
      if (err) {
        return { success: false, error: err.message || 'Could not update this staff member.' }
      }
      setStaff((prev) => prev.map((s) => (s.id === staffId ? { ...s, ...profile } : s)))
      return { success: true, profile }
    } catch (err) {
      return { success: false, error: err?.message || 'Could not update this staff member.' }
    }
  }

  async function changeStatus(staffId, status) {
    return saveStaff(staffId, { status })
  }

  /**
   * Permanently removes a staff member (Auth account + profile + all
   * their tasks/history, via cascade on the backend). On success, drops
   * the row from local state immediately rather than waiting on reload.
   */
  async function removeStaff(staffId) {
    const { success, error: err } = await deleteStaff(staffId)
    if (!success) {
      return { success: false, error: err?.message || 'Could not delete this staff member.' }
    }
    setStaff((prev) => prev.filter((s) => s.id !== staffId))
    return { success: true }
  }

  return {
    staff: filteredStaff,
    totalCount: staff.length,
    loading,
    error,
    search,
    setSearch,
    addStaff,
    saveStaff,
    changeStatus,
    removeStaff,
    reload: load,
  }
}
