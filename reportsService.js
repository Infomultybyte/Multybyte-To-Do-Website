// Admin Reports (/admin/reports) is read-only, so it deliberately does
// not introduce any new Supabase queries: every number it shows is
// derived from the exact same three reads the Admin Dashboard already
// uses (profiles, tasks-for-month, completions-for-range), just kept
// as ALL staff (active and inactive) instead of filtering down to
// active-only, since Reports needs to filter by status itself.
//
// Re-exporting rather than duplicating means Reports automatically
// stays correct if those underlying queries or their RLS scoping ever
// change (e.g. a soft-delete filter). It also means no new RLS policy
// is needed for this page: profiles_select_admin_all,
// tasks_select_admin_all, and completions_select_admin_all
// (admin_dashboard_part2_hardening.sql) already grant everything an
// admin needs to read here. See supabase/admin_reports_hardening.sql
// for a short note documenting that decision.
export {
  getAllStaffProfiles,
  getTasksForAllStaff,
  getCompletionsForAllStaff,
} from './adminDashboardService'
