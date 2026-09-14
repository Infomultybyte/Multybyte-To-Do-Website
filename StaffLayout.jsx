import { useState } from 'react'
import { useAuth } from '../hooks/AuthContext'
import Logo from '../components/Logo'
import ChangePasswordModal from '../components/ChangePasswordModal'
import NotificationBell from '../components/NotificationBell'
import Toast from '../components/Toast'
import { APP_VERSION } from '../version'

export default function StaffLayout({ children }) {
  const { profile, signOut } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [notice, setNotice] = useState(null)

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
    // AuthContext clears session; ProtectedRoute will redirect to /login.
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-slate-100 bg-white">
        <div className="w-full flex items-center justify-between px-8 py-4">
          <Logo variant="dark" />

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">
                {profile?.full_name || profile?.email}
              </p>
              <p className="text-xs text-slate-400">{profile?.department || 'Staff'}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              Change Password
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-8 py-10">{children}</main>

      <footer className="border-t border-slate-100 px-8 py-4">
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Multybyte
          <span className="mx-1.5">&middot;</span>
          Version {APP_VERSION}
        </p>
      </footer>

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() =>
            setNotice({ type: 'success', message: 'Your password has been updated.' })
          }
        />
      )}

      <Toast notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  )
}
