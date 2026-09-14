import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ConfigErrorScreen from './components/ConfigErrorScreen'
import LoginPage from './pages/LoginPage'
import StaffTodoPage from './pages/StaffTodoPage'
import AdminLayout from './layouts/AdminLayout'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminStaffPage from './pages/admin/AdminStaffPage'
import AdminStaffDetailPage from './pages/admin/AdminStaffDetailPage'
import AdminTasksPage from './pages/admin/AdminTasksPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import { supabaseConfigError } from './lib/supabaseClient'

// Staff and Admin are separate route branches, each protected by its
// own ProtectedRoute(allowedRoles=...) so neither section can leak into
// the other.
export default function App() {
  // Checked before anything else touches Supabase: if env vars are
  // missing/invalid, supabase is null and every auth/data call would
  // throw. Showing this screen instead avoids a blank white app and a
  // console-only error nobody but a developer would ever see.
  if (supabaseConfigError) {
    return <ConfigErrorScreen message={supabaseConfigError} />
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/staff/todo"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffTodoPage />
              </ProtectedRoute>
            }
          />

          {/* Admin section — foundation only (Part 1). Each route is
              individually gated by ProtectedRoute with allowedRoles set
              to ['admin'], enforced against the database-backed
              profiles.role/status, not anything the client controls. A
              staff account hitting any /admin/* URL is redirected to
              /login exactly like an unauthenticated visitor would be. */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminDashboardPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminStaffPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Linked from the Dashboard's Staff overview table. A basic
              placeholder for now (Part 2 scope is Dashboard only) — the
              real per-staff To-Do detail view is a later phase. */}
          <Route
            path="/admin/staff/:staffId"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminStaffDetailPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tasks"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminTasksPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout>
                  <AdminReportsPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
