-- =====================================================================
-- Multybyte To-Do Management System — Urgent / Deadline Tasks
-- Run this AFTER schema.sql, rls_policies.sql, part3_hardening.sql,
-- staff_final_hardening.sql, admin_part1_hardening.sql,
-- admin_dashboard_part2_hardening.sql, admin_staff_management_hardening.sql,
-- and admin_task_management_hardening.sql (this file reuses
-- public.is_admin() and public.is_staff_profile() defined there).
-- Idempotent — safe to run on a database that already has all prior
-- parts deployed.
--
-- What this adds:
-- A separate `urgent_tasks` table for one-off, deadline-driven tasks an
-- admin hands to a specific staff member outside the regular monthly
-- checklist (tasks/task_completions) — e.g. "Prepare the client
-- proposal by Friday, with a remark". Kept as its own table rather than
-- reusing `tasks` because the shape is genuinely different: a single
-- deadline date (not a month-long grid of daily checkboxes), an admin
-- remark, and a three-state workflow status that the STAFF drives
-- (pending -> in_process -> completed) rather than a per-day tick.
-- =====================================================================

create table if not exists public.urgent_tasks (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  task_name text not null,
  deadline date not null,
  admin_remark text,
  status text not null default 'pending' check (status in ('pending', 'in_process', 'completed')),
  completed_at timestamptz,
  -- Which admin assigned it. Defaults to the calling user at the
  -- database level (never sent by the client) — see the insert grant
  -- below, which does not include this column.
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_urgent_tasks_staff_id on public.urgent_tasks (staff_id);
create index if not exists idx_urgent_tasks_staff_status on public.urgent_tasks (staff_id, status);
-- Serves the Admin Dashboard's "recently completed" feed (all staff,
-- completed-only, most recent first).
create index if not exists idx_urgent_tasks_completed_at
  on public.urgent_tasks (completed_at desc)
  where status = 'completed';

-- Reuses the same set_updated_at() trigger function every other table
-- in this project already uses (schema.sql).
drop trigger if exists trg_urgent_tasks_updated_at on public.urgent_tasks;
create trigger trg_urgent_tasks_updated_at
  before update on public.urgent_tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Single BEFORE UPDATE trigger doing two things, in order:
--
--  1. Scope enforcement — mirrors the "grants say WHICH COLUMNS, RLS
--     says WHICH ROWS, the trigger says WHO/WHEN" layering already used
--     elsewhere in this project (part3_hardening.sql,
--     admin_staff_management_hardening.sql). The column grants below
--     are broad (needed so BOTH an admin editing a task AND a staff
--     member updating their own status can go through the same GRANT),
--     so this trigger is what actually stops a staff member from
--     rewriting task_name/deadline/admin_remark/staff_id on their own
--     row even though urgent_tasks_update_own_status's RLS would
--     otherwise let the UPDATE statement through.
--
--  2. completed_at bookkeeping — stamped the moment status flips to
--     'completed' (by whoever made that change, staff or admin), and
--     cleared if it's ever moved back out of 'completed' — so
--     completed_at always reflects the most recent completion, never a
--     stale timestamp from an earlier cycle.
-- ---------------------------------------------------------------------
create or replace function public.enforce_urgent_task_write_scope()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.task_name is distinct from old.task_name
       or new.deadline is distinct from old.deadline
       or new.admin_remark is distinct from old.admin_remark
       or new.staff_id is distinct from old.staff_id then
      raise exception 'Only an administrator can edit the task name, deadline, staff, or remark.';
    end if;
  end if;

  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at = now();
  elsif new.status <> 'completed' then
    new.completed_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_urgent_tasks_write_scope on public.urgent_tasks;
create trigger trg_urgent_tasks_write_scope
  before update on public.urgent_tasks
  for each row execute function public.enforce_urgent_task_write_scope();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.urgent_tasks enable row level security;

drop policy if exists "urgent_tasks_select_own" on public.urgent_tasks;
create policy "urgent_tasks_select_own"
  on public.urgent_tasks
  for select
  to authenticated
  using (staff_id = auth.uid());

drop policy if exists "urgent_tasks_select_admin_all" on public.urgent_tasks;
create policy "urgent_tasks_select_admin_all"
  on public.urgent_tasks
  for select
  to authenticated
  using (public.is_admin());

-- Only an admin may create one, and only for a real, current Staff
-- account (never for another admin) — reuses is_staff_profile() from
-- admin_task_management_hardening.sql.
drop policy if exists "urgent_tasks_insert_admin" on public.urgent_tasks;
create policy "urgent_tasks_insert_admin"
  on public.urgent_tasks
  for insert
  to authenticated
  with check (public.is_admin() and public.is_staff_profile(staff_id));

-- An admin may update any row (rename/reschedule/re-remark, or
-- override status if ever needed).
drop policy if exists "urgent_tasks_update_admin" on public.urgent_tasks;
create policy "urgent_tasks_update_admin"
  on public.urgent_tasks
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A staff member may update only their own row — the trigger above is
-- what actually limits them to the `status` column once they're in.
drop policy if exists "urgent_tasks_update_own_status" on public.urgent_tasks;
create policy "urgent_tasks_update_own_status"
  on public.urgent_tasks
  for update
  to authenticated
  using (staff_id = auth.uid())
  with check (staff_id = auth.uid());

-- No delete policy or grant for anyone from the browser — matches this
-- project's existing "no real DELETE from the client" convention.

-- ---------------------------------------------------------------------
-- Column-level grants ("grants say WHICH COLUMNS"):
--  - insert: an admin supplies staff_id, task_name, deadline, and
--    admin_remark. created_by defaults to auth.uid() at the database
--    level and is never sent by the client.
--  - update: task_name/deadline/admin_remark/status are all grantable
--    to `authenticated` broadly; the trigger (not the grant) is what
--    stops a non-admin from touching the first three. completed_at is
--    deliberately NOT grantable from the browser — it is only ever set
--    by the trigger above.
-- ---------------------------------------------------------------------
grant insert (staff_id, task_name, deadline, admin_remark) on public.urgent_tasks to authenticated;
grant update (task_name, deadline, admin_remark, status) on public.urgent_tasks to authenticated;
