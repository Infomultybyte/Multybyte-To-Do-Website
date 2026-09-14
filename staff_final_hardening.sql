-- =====================================================================
-- Multybyte To-Do Management System — Staff section, final hardening
-- Run this AFTER schema.sql, rls_policies.sql, and part3_hardening.sql.
-- Idempotent and additive — safe to run on a database that already has
-- Parts 1–3 deployed.
--
-- Closes one gap found in this final review:
--   `completions_delete_own` (added in rls_policies.sql) lets a staff
--   member issue a raw DELETE against their own task_completions rows.
--   The app itself never deletes a completion row — unchecking a box
--   calls setTaskCompletion(), which upserts `completed = false` onto
--   the existing row instead. Since one of this system's requirements
--   is that historical months stay intact permanently, a delete path
--   that the UI doesn't use is pure downside: it only gives a crafted
--   REST/SQL call a way to erase completion history. This file removes
--   that policy and the underlying grant, so the database itself no
--   longer allows the client to delete completion rows at all — only
--   select/insert/update remain, matching what the app actually does.
-- =====================================================================

drop policy if exists "completions_delete_own" on public.task_completions;

revoke delete on public.task_completions from authenticated;

-- No changes needed elsewhere: tasks already have no insert/update/delete
-- grant for staff (see part3_hardening.sql), and profiles already only
-- allow updating full_name/department. This file only tightens
-- task_completions to match how the Staff UI actually uses it: create
-- and update (via upsert), never delete.
