import { supabase } from '../lib/supabaseClient'

const STAFF_COLUMNS = 'id, full_name, email, department, designation, status, created_at, role'

/**
 * supabase.functions.invoke() gives you a generic
 * "Edge Function returned a non-2xx status code" in `error.message`
 * when a function responds with an error status — it does NOT read the
 * JSON body our functions actually send back (e.g.
 * `{ error: 'A user with this email already exists.' }`). The real
 * message lives on `error.context`, which is the raw fetch Response,
 * so it has to be read out manually. Falls back to the generic message
 * if the body isn't JSON for some reason (e.g. the function isn't
 * deployed and Supabase's own 404 HTML page came back instead).
 */
async function extractFunctionErrorMessage(error, fallback) {
  if (!error) return fallback
  try {
    if (error.context && typeof error.context.json === 'function') {
      const body = await error.context.clone().json()
      if (body?.error) return body.error
    }
  } catch {
    // Response body wasn't JSON (e.g. function not deployed) — fall through.
  }
  return error.message || fallback
}

// Staff list ordering: CEO first, then Admin, then everyone else. This
// is a designation HIERARCHY, distinct from the `role` column (which
// only ever holds 'staff' or 'admin') — `designation` is a free-text
// title an admin sets per staff member (e.g. 'CEO', 'Manager', 'Sales
// Executive'). Anything not explicitly ranked falls into the same
// "everyone else" bucket and is then sorted alphabetically by its own
// designation, then by name, so the order is always deterministic
// rather than the previous created_at ordering that looked random to
// an admin scanning for a specific person.
const DESIGNATION_RANK = {
  ceo: 0,
  admin: 1,
}
const UNRANKED = 2

function designationRank(designation) {
  const key = (designation || '').trim().toLowerCase()
  return key in DESIGNATION_RANK ? DESIGNATION_RANK[key] : UNRANKED
}

function sortByDesignation(rows) {
  return [...rows].sort((a, b) => {
    const rankDiff = designationRank(a.designation) - designationRank(b.designation)
    if (rankDiff !== 0) return rankDiff

    const designationDiff = (a.designation || '').localeCompare(b.designation || '')
    if (designationDiff !== 0) return designationDiff

    return (a.full_name || '').localeCompare(b.full_name || '')
  })
}

/**
 * Fetches every Staff profile (role = 'staff'), active or inactive,
 * ordered by designation hierarchy (CEO, then Admin, then everyone
 * else alphabetically) rather than raw creation order.
 */
export async function listStaff() {
  const { data, error } = await supabase
    .from('profiles')
    .select(STAFF_COLUMNS)
    .eq('role', 'staff')

  return { staff: error ? [] : sortByDesignation(data ?? []), error }
}

/**
 * Updates one Staff member's editable fields. `updates` may include any
 * of `full_name`, `department`, `designation`, `status`.
 */
export async function updateStaff(staffId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', staffId)
    .eq('role', 'staff')
    .select(STAFF_COLUMNS)
    .single()

  return { profile: data ?? null, error }
}

/**
 * Creates a brand-new Staff account (Auth user + profile) via the
 * admin-create-staff Edge Function.
 *
 * This used to call `supabase.auth.signUp()` directly from the browser.
 * That doesn't work safely for an admin creating OTHER people's
 * accounts: when the email already exists, Supabase's signUp() often
 * returns a "fake success" (no error, a stub user object, empty
 * `identities`) rather than a clean error — which then made this code
 * upsert a profile with garbage/duplicate data and crash the page
 * instead of showing "this email already exists". Routing through the
 * same admin-create-staff function that already does this safely
 * (admin-only, real duplicate-email detection, matches
 * admin-update-staff's pattern) fixes both problems at once.
 */
export async function createStaff({ full_name, email, password, department, designation, status }) {
  const { data, error } = await supabase.functions.invoke('admin-create-staff', {
    body: {
      full_name,
      email: email.trim(),
      password,
      department: department || '',
      status: status === 'active' || status === true ? 'active' : 'inactive',
    },
  })

  if (error) {
    const message = await extractFunctionErrorMessage(error, 'Could not create the staff account.')
    return { profile: null, error: { message } }
  }
  if (data?.error) {
    return { profile: null, error: { message: data.error } }
  }

  return { profile: data?.profile ?? null, error: null }
}

/**
 * Updates a staff member's login credentials (email and/or password) via Supabase Edge Function.
 */
export async function updateStaffCredentials(staffId, { email, password }) {
  const { data, error } = await supabase.functions.invoke('admin-update-staff', {
    body: { staffId, email, password }
  })
  
  if (error) {
    const message = await extractFunctionErrorMessage(error, 'Could not update credentials.')
    return { success: false, error: { message } }
  }
  if (data?.error) return { success: false, error: { message: data.error } }
  
  return { success: true }
}

/**
 * PERMANENTLY deletes a Staff member's login account via the
 * admin-delete-staff Edge Function. This cannot go through the
 * regular Supabase client (deleting an Auth user needs the service
 * role key), and it cannot be undone — the account, their tasks, and
 * their completion history are all gone once this succeeds (see the
 * `on delete cascade` foreign keys in supabase/schema.sql).
 */
export async function deleteStaff(staffId) {
  const { data, error } = await supabase.functions.invoke('admin-delete-staff', {
    body: { staffId }
  })

  if (error) {
    const message = await extractFunctionErrorMessage(error, 'Could not delete this staff account.')
    return { success: false, error: { message } }
  }
  if (data?.error) return { success: false, error: { message: data.error } }

  return { success: true }
}
