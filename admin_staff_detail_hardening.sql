-- =====================================================================
-- Multybyte To-Do Management System — Admin Staff Detail (Part 5)
-- Run this AFTER schema.sql, rls_policies.sql, part3_hardening.sql,
-- staff_final_hardening.sql, admin_part1_hardening.sql,
-- admin_dashboard_part2_hardening.sql,
-- admin_staff_management_hardening.sql, and
-- admin_task_management_hardening.sql. Idempotent — safe to run on a
-- database that already has all prior parts deployed.
--
-- Why this file exists:
-- The Admin Staff Detail page (/admin/staff/:staffId) lets an admin
-- check/uncheck completion boxes on behalf of any staff member. Every
-- policy shipped so far on `task_completions` only lets a user write
-- their OWN rows (completions_insert_own / completions_update_own,
-- staff_id = auth.uid()) — an admin toggling a DIFFERENT staff
-- member's box would be rejected by RLS with no policy shipped here.
-- "completions_select_admin_all" (admin_dashboard_part2_hardening.sql)
-- already covers reading any staff's completions; this file adds the
-- matching write side.
--
-- Table-level INSERT/UPDATE grants on task_completions already exist
-- for `authenticated` (only DELETE was ever revoked, in
-- staff_final_hardening.sql) — so no new grant statement is needed
-- here, only the two RLS policies below. No DELETE policy or grant is
-- added for anyone; that decision from staff_final_hardening.sql is
-- unchanged and applies to admin too — even Admin never deletes a
-- completion row, only ever upserts completed = true/false, exactly
-- like the Staff UI (setTaskCompletion in completionService.js, reused
-- unmodified by the Admin Staff Detail page).
-- =====================================================================

-- ---------------------------------------------------------------------
-- completions_insert_admin / completions_update_admin: an active admin
-- may insert or update a completion row for ANY staff member, as long
-- as that staff member is a real Staff (not another Admin) account —
-- same is_staff_profile() scoping already used by tasks_insert_admin
-- (admin_task_management_hardening.sql), so an admin can't be pointed
-- at another admin's completion history through this page. Existing
-- completions_insert_own / completions_update_own are untouched —
-- Postgres OR's every applicable policy of the same command, so a
-- staff member's own-row write access is completely unaffected; this
-- only adds a new way for an admin to reach OTHER staff members' rows.
--
-- The existing trg_completion_staff_matches_task trigger
-- (schema.sql) still runs regardless of which policy let the write
-- through, and still rejects any row whose staff_id doesn't match the
-- referenced task's own staff_id — so an admin (or anyone) can never
-- create a completion row that points staff_id at one person's profile
-- while task_id belongs to a different person's task, no matter which
-- policy is used to get there.
-- ---------------------------------------------------------------------
drop policy if exists "completions_insert_admin" on public.task_completions;
create policy "completions_insert_admin"
  on public.task_completions
  for insert
  to authenticated
  with check (public.is_admin() and public.is_staff_profile(staff_id));

drop policy if exists "completions_update_admin" on public.task_completions;
create policy "completions_update_admin"
  on public.task_completions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin() and public.is_staff_profile(staff_id));

-- ---------------------------------------------------------------------
-- Note on historical integrity:
-- Nothing in this file changes how a completion row is addressed —
-- it's still uniquely keyed by (staff_id, task_id, completion_date)
-- (uq_completion_staff_task_date, schema.sql), and every write here
-- goes through the exact same setTaskCompletion() upsert the Staff UI
-- already uses. Toggling a box for one month's date can never touch a
-- row for any other date/month — there is no admin write path in this
-- project that updates more than one completion_date at a time.
-- ---------------------------------------------------------------------
