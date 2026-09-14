-- =====================================================================
-- Multybyte To-Do Management System — Task Interval
-- Run this AFTER schema.sql, rls_policies.sql, part3_hardening.sql,
-- staff_final_hardening.sql, admin_part1_hardening.sql,
-- admin_dashboard_part2_hardening.sql, admin_staff_management_hardening.sql,
-- and admin_task_management_hardening.sql. Idempotent — safe to run on a
-- database that already has all prior parts deployed.
--
-- What this adds:
-- A `task_interval` column on `tasks` recording how often a task recurs
-- (Daily / Weekly / Monthly / Quarterly / One Time). It is set when an
-- admin adds a task and can be changed when an admin edits a task, and
-- is shown read-only on the Staff dashboard (and the Admin Staff Detail
-- view) right next to the task name — the Staff account itself has no
-- way to set or change it, matching the "only admin can edit/add
-- interval, same as tasks" requirement.
--
-- This deliberately reuses the exact same RLS policies that already
-- govern `tasks` (tasks_insert_admin / tasks_update_admin from
-- admin_task_management_hardening.sql, and tasks_select_own /
-- tasks_select_admin_all) — a staff session has no INSERT/UPDATE policy
-- on `tasks` at all, so simply granting column-level write access on
-- `task_interval` to `authenticated` is enough to make it admin-only in
-- practice: an admin's request satisfies `public.is_admin()`, a staff
-- request has no matching policy row to write through, exactly like
-- task_name and position already work.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Schema change: task_interval column.
-- Defaults to 'Daily' so existing rows (added before this migration)
-- get a sensible value with no manual backfill required.
-- ---------------------------------------------------------------------
alter table public.tasks
  add column if not exists task_interval text not null default 'Daily'
  check (task_interval in ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'One Time'));

-- ---------------------------------------------------------------------
-- 2) Column-level grants — admin-only in effect, same reasoning as
-- section 5 of admin_task_management_hardening.sql: `task_interval` is
-- simply added alongside the columns already grantable there.
-- Read access needs no new grant: SELECT on the whole row is already
-- granted, and RLS (tasks_select_own / tasks_select_admin_all) is what
-- decides which rows — Staff and Admin alike can already see every
-- column, including this new one, on rows they're allowed to select.
-- ---------------------------------------------------------------------
grant insert (task_interval) on public.tasks to authenticated;
grant update (task_interval) on public.tasks to authenticated;

-- No changes to tasks_insert_admin / tasks_update_admin themselves —
-- those policies already gate every INSERT/UPDATE on this table to
-- `public.is_admin()`, so this column inherits that same protection
-- automatically. Staff still has zero write policy on `tasks`, so a
-- staff session cannot set or change task_interval under any
-- circumstance, mirroring task_name/position exactly.
-- =====================================================================
