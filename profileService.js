import { supabase } from '../lib/supabaseClient'

/**
 * Fetches the profile row for a given auth user id.
 * RLS ensures a user can only ever fetch their own profile row.
 */
export async function getProfileById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, department, status, created_at, updated_at')
    .eq('id', userId)
    .single()

  return { profile: data ?? null, error }
}
