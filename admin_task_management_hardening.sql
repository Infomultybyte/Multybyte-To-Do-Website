-- =====================================================================
-- Multybyte To-Do Management System — Admin Task Management (Part 4)
-- Run this AFTER schema.sql, rls_policies.sql, part3_hardening.sql,
-- staff_final_hardening.sql, admin_part1_hardening.sql,
-- admin_dashboard_part2_hardening.sql, and
-- admin_staff_management_hardening.sql. Idempotent — safe to run on a
-- database that already has all prior parts deployed.
--
-- SCHEMA CHANGE (explained before implementing, per spec):
-- `tasks` currently has `on delete cascade` down to `task_completions`
-- (schema.sql). If Admin were given a real DELETE on tasks, deleting a
-- task would silently erase every historical completion row for every
-- day that task was ever checked off — permanently destroying past
-- reporting data the moment someone deletes a task, even by mistake.
--
-- Fix: add a nullable `deleted_at timestamptz` column to `tasks`.
-- "Delete" in the Admin UI is implemented as an UPDATE that sets
-- `deleted_at = now()`, never a real SQL DELETE. The row — and every
-- completion row that references it — stays in the database exactly as
-- it was, so historical reporting for prior months stays accurate.
-- Active lists (the Staff grid and the Admin task table) simply filter
-- `deleted_at is null`. No DELETE grant or DELETE policy is added
-- anywhere in this file, so a real delete of a task row remains
-- impossible from the browser, admin or not.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Schema change: soft-delete column.
-- ---------------------------------------------------------------------
alter table public.tasks
  add column if not exists deleted_at timestamptz;

-- Partial index: every real query against "current" tasks (Staff grid,
-- Admin task table, Dashboard counts) filters deleted_at is null and
-- orders by position — this serves exactly that shape without the
-- index bloating with soft-deleted rows over time.
create index if not exists idx_tasks_active_staff_month_year_position
  on public.tasks (staff_id, year, month, position)
  where deleted_at is null;

-- ---------------------------------------------------------------------
-- 2) tasks_select_own (rls_policies.sql): a staff member must never see
-- a soft-deleted task, even via a raw REST/SQL call. Re-scoped with
-- deleted_at is null in addition to the existing staff_id = auth.uid().
-- The application layer (taskService.js) also filters this explicitly
-- for clarity/defense-in-depth, matching this codebase's existing
-- style — but the database itself is the real enforcement point.
-- ---------------------------------------------------------------------
drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
  on public.tasks
  for select
  to authenticated
  using (staff_id = auth.uid() and deleted_at is null);

-- tasks_select_admin_all (admin_dashboard_part2_hardening.sql) is left
-- untouched — an admin's SELECT is not restricted by deleted_at at the
-- RLS layer, so soft-deleted rows remain visible to admin tooling or
-- future audit/reporting needs. Every current admin query
-- (adminTaskService.js, adminDashboardService.js) filters
-- `deleted_at is null` explicitly wherever it means "current tasks".

-- ---------------------------------------------------------------------
-- 3) is_admin_staff(staff_id): helper used by the insert policy below
-- so an admin can only ever create a task for a real, current Staff
-- account — never for another admin's id, and never for an id that
-- doesn't exist. Mirrors the `role = 'staff'` scoping already used by
-- profiles_update_admin_staff (admin_staff_management_hardening.sql).
-- ---------------------------------------------------------------------
create or replace function public.is_staff_profile(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = target_id and role = 'staff'
  );
$$;

grant execute on function public.is_staff_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4) RLS: admin write policies on tasks. Nothing here touches or
-- loosens tasks_select_own above, or the fact that staff have no
-- insert/update policy at all (unchanged from part3_hardening.sql) —
-- Postgres OR's every policy of the same command, so staff access is
-- completely unaffected by these additions.
-- ---------------------------------------------------------------------
drop policy if exists "tasks_insert_admin" on public.tasks;
create policy "tasks_insert_admin"
  on public.tasks
  for insert
  to authenticated
  with check (public.is_admin() and public.is_staff_profile(staff_id));

-- Single UPDATE policy covers rename, position change, reorder, AND
-- soft-delete (setting deleted_at) — all of these are plain UPDATEs.
-- Column-level grants below are what actually stop an admin from
-- reassigning staff_id/month/year through this same policy, matching
-- the edit scope in the spec (task name + position only).
drop policy if exists "tasks_update_admin" on public.tasks;
create policy "tasks_update_admin"
  on public.tasks
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Deliberately no delete policy and no delete grant (see section 5) —
-- a real row DELETE on tasks stays impossible from the browser.

-- ---------------------------------------------------------------------
-- 5) Column-level grants ("grants say which columns, RLS says which
-- rows, the trigger says who/when" — same layering as profiles and
-- task_completions elsewhere in this project).
--
-- Insert: an admin creating a task supplies task_name, staff_id, month,
-- year, and position.
--
-- Update: only task_name, position, and deleted_at are grantable — an
-- admin cannot move a task to a different staff member or a different
-- month/year through Edit or Delete, only through a fresh Add (this is
-- what keeps "editing" from ever silently reassigning historical
-- completion records to a different context).
-- ---------------------------------------------------------------------
grant insert (task_name, staff_id, month, year, position) on public.tasks to authenticated;
grant update (task_name, position, deleted_at) on public.tasks to authenticated;

-- Still no delete grant on tasks for anyone via the browser — matches
-- the "no DELETE, ever" decision above.

-- ---------------------------------------------------------------------
-- Note for future phases:
-- Reports (a later phase) reads task_completions, which is completely
-- unaffected by this file — soft-deleting a task never removes or
-- alters a single completion row, so past-month reporting for a
-- deleted task remains exactly as accurate as it was before deletion.
-- ---------------------------------------------------------------------
