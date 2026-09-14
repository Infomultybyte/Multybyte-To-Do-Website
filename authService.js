import { supabase } from '../lib/supabaseClient'

/**
 * Signs a user in with email + password via Supabase Auth.
 * Returns { data, error } as provided by supabase-js.
 */
export async function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

/**
 * Signs the current user out and clears the local session.
 */
export async function signOut() {
  return supabase.auth.signOut()
}

/**
 * Returns the current session, if any.
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  return { session: data?.session ?? null, error }
}

/**
 * Changes the currently signed-in user's own password. Requires an
 * active session (which the caller already has, since this is only
 * ever invoked from within the authenticated app) — no service role or
 * edge function needed, because Supabase lets a signed-in user change
 * their own password directly.
 */
export async function updatePassword(newPassword) {
  return supabase.auth.updateUser({ password: newPassword })
}

/**
 * Subscribes to auth state changes (sign in, sign out, token refresh).
 * Returns the subscription so the caller can unsubscribe on unmount.
 */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return data.subscription
}
