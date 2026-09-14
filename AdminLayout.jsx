import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'
import Logo from '../components/Logo'
import ChangePasswordModal from '../components/ChangePasswordModal'
import NotificationBell from '../components/NotificationBell'
import Toast from '../components/Toast'
import { APP_VERSION } from '../version'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/admin/staff', label: 'Staff', icon: StaffIcon },
  { to: '/admin/tasks', label: 'Tasks', icon: TasksIcon },
  { to: '/admin/reports', label: 'Reports', icon: ReportsIcon },
]

/**
 * Admin shell: fixed sidebar (Dashboard/Staff/Tasks/Reports) + top header
 * (admin name, logout). Mirrors StaffLayout's branding (same Logo, same
 * slate/lime/paper palette from tailwind.config.js) so both sections
 * feel like one product, while remaining a completely separate layout
 * component — Staff routes never render this and vice versa.
 *
 * Collapses to a slide-in drawer on small screens, toggled by the
 * hamburger button in the header, so the sidebar never has to be
 * squeezed onto a phone-width screen.
 */
export default function AdminLayout({ children }) {
  const { profile, signOut } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [notice, setNotice] = useState(null)

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
    // AuthContext clears session; ProtectedRoute will redirect to /login.
  }

  return (
    <div className="min-h-screen bg-paper lg:flex">
      {/* Mobile overlay, shown only while the drawer is open */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          aria-hidden="true"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <Sidebar mobileNavOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 lg:hidden"
                aria-label="Open navigation menu"
              >
                <MenuIcon />
              </button>
              <div className="lg:hidden">
                <Logo variant="dark" />
              </div>
              <p className="hidden text-sm font-semibold text-slate-400 lg:block">
                Admin
              </p>
            </div>

            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">
                  {profile?.full_name || profile?.email}
                </p>
                <p className="text-xs text-slate-400">Administrator</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="hidden rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:inline-flex"
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

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          {/* Small-screen fallback for the Change Password action, since
              the button above is hidden below sm to keep the header from
              overflowing on phone widths. */}
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="mb-4 inline-flex rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:hidden"
          >
            Change Password
          </button>
          {children}
        </main>
      </div>

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

function Sidebar({ mobileNavOpen, onNavigate }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-700 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-[65px] items-center border-b border-white/10 px-6">
        {/* The logo artwork has an opaque white background, so it only
            reads correctly on white surfaces — this sidebar is dark, so
            a plain text wordmark stands in for it here instead. */}
        <span className="text-lg font-bold tracking-tight text-white">Multybyte</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-200 hover:bg-slate-800/60 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-xs text-slate-300">&copy; {new Date().getFullYear()} Multybyte</p>
        <p className="mt-0.5 text-[11px] text-slate-400">Version {APP_VERSION}</p>
      </div>
    </aside>
  )
}

// Small inline icon set — kept local to this file rather than pulling in
// an icon library dependency for four simple glyphs.
function iconClass(active) {
  return `h-[18px] w-[18px] shrink-0 ${active ? 'text-lime-400' : 'text-slate-300'}`
}

function DashboardIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass(active)} aria-hidden="true">
      <rect x="3.75" y="3.75" width="7" height="7" rx="1.25" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.25" y="3.75" width="7" height="7" rx="1.25" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.75" y="13.25" width="7" height="7" rx="1.25" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.25" y="13.25" width="7" height="7" rx="1.25" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function StaffIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass(active)} aria-hidden="true">
      <circle cx="9" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 19.5c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M15.5 6.1c1.44.46 2.48 1.81 2.48 3.4 0 1.59-1.04 2.94-2.48 3.4M18 19.5c0-2.6-1.72-4.8-4.08-5.28"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TasksIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass(active)} aria-hidden="true">
      <rect x="4.5" y="4" width="15" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 9.5h8M8 13h8M8 16.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function ReportsIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass(active)} aria-hidden="true">
      <path d="M5 19.5V10M12 19.5V4.5M19 19.5v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.5 19.5h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 6.5h16M4 12h16M4 17.5h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
