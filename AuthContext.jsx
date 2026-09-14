import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  getSession,
  onAuthStateChange,
  signInWithPassword,
  signOut as authSignOut,
} from '../services/authService'
import { getProfileById } from '../services/profileService'

const AuthContext = createContext(undefined)

/**
 * Wraps the app and exposes: session, profile, loading state, and
 * signIn/signOut actions. A single source of truth for "who is logged in
 * and are they an active staff member".
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  async function loadProfile(userId) {
    const { profile: fetchedProfile, error } = await getProfileById(userId)
    if (error) {
      // A missing/failed profile fetch usually means the profiles row
      // hasn't been created yet, or RLS denied access.
      setProfile(null)
      return null
    }
    setProfile(fetchedProfile)
    return fetchedProfile
  }
  useEffect(() => {
    let isMounted = true

    async function init() {
      const { session: currentSession } = await getSession()
      if (!isMounted) return
      setSession(currentSession)
      if (currentSession?.user?.id) {
        await loadProfile(currentSession.user.id)
      }
      if (isMounted) setLoading(false)
    }

    init()

    const subscription = onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user?.id) {
        await loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  async function signIn(email, password) {
    setAuthError(null)
    const { data, error } = await signInWithPassword(email, password)

    if (error) {
      setAuthError(error.message)
      return { success: false, error: error.message }
    }

    const userId = data?.user?.id
    const fetchedProfile = userId ? await loadProfile(userId) : null

    if (!fetchedProfile) {
      setAuthError('We could not find a user profile for this account.')
      await authSignOut()
      setSession(null)
      setProfile(null)
      return { success: false, error: 'No profile found for this account.' }
    }

    if (fetchedProfile.status !== 'active') {
      setAuthError('This account is inactive. Contact your administrator.')
      await authSignOut()
      setSession(null)
      setProfile(null)
      return { success: false, error: 'This account is inactive.' }
    }

    return { success: true }
  }

  async function signOut() {
    await authSignOut()
    setSession(null)
    setProfile(null)
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      authError,
      isActiveStaff: profile?.status === 'active' && profile?.role === 'staff',
      isActiveAdmin: profile?.status === 'active' && profile?.role === 'admin',
      // Where a signed-in, active profile belongs by default. Null for a
      // signed-in-but-not-yet-loaded/invalid profile, so callers can tell
      // "not ready yet" apart from "definitely nowhere to send them".
      homePath:
        profile?.status === 'active'
          ? profile?.role === 'admin'
            ? '/admin/dashboard'
            : profile?.role === 'staff'
              ? '/staff/todo'
              : null
          : null,
      signIn,
      signOut,
    }),
    [session, profile, loading, authError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
