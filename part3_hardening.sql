-- =====================================================================
-- Multybyte To-Do Management System — Part 3 hardening
-- Run this AFTER schema.sql and rls_policies.sql (including on a
-- database that already has Part 1/2 deployed — everything here is
-- idempotent and additive).
--
-- Closes two gaps found in review:
--   1. Staff previously had insert/update/delete RLS policies on
--      `tasks` — meaning a staff member could add, rename, reorder, or
--      delete their own tasks despite the UI never exposing this.
--      rls_policies.sql now only grants staff SELECT on tasks; nothing
--      further is needed here for that fix.
--   2. `profiles_update_own` allows a staff member to update their own
--      profile row, but RLS's row-level check (id = auth.uid()) does
--      not restrict which COLUMNS can change — so, without this file,
--      a crafted request could flip a staff member's own `role` to
--      'admin' or `status` to something else. This file closes that
--      with column-level grants (so the database physically rejects
--      writes to role/status/email/id from the client) plus a trigger
--      as defense in depth.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Column-level grants: staff can only ever write full_name and
-- department on their own profile. Even a hand-crafted REST/SQL call
-- as an authenticated user cannot touch id, email, role, or status.
-- ---------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (full_name, department) on public.profiles to authenticated;

-- Staff never insert or delete profiles directly (handled by the
-- handle_new_user trigger, which runs as security definer and is
-- unaffected by these grants).
revoke insert, delete on public.profiles from authenticated;

-- Tasks: staff are read-only at the database level, matching the RLS
-- policies in rls_policies.sql. This is belt-and-suspenders — even if
-- a future policy were mistakenly added back, the grant still blocks it.
revoke insert, update, delete on public.tasks from authenticated;

-- ---------------------------------------------------------------------
-- 2) Trigger defense-in-depth: even if grants are ever changed by
-- mistake, block any change to role/status unless it comes from the
-- service role (i.e. a trusted backend/Admin action, not the browser).
-- ---------------------------------------------------------------------
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and coalesce(auth.role(), 'authenticated') <> 'service_role' then
    raise exception 'Only an administrator can change role or status.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_privilege_escalation on public.profiles;
create trigger trg_prevent_self_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_privilege_escalation();

-- ---------------------------------------------------------------------
-- 3) Performance: composite index matching the grid's actual query
-- pattern (staff's tasks for one month, in display order), so ordering
-- by `position` doesn't require a separate sort step even with 50+
-- tasks. Superset of idx_tasks_staff_month_year, safe to keep both.
-- ---------------------------------------------------------------------
create index if not exists idx_tasks_staff_month_year_position
  on public.tasks (staff_id, year, month, position);

-- Completion lookups filter by staff_id and a completion_date range in
-- the same query (see getCompletionsForMonth) — a composite index
-- serves that better than the two separate single-column indexes from
-- Part 1.
create index if not exists idx_completions_staff_date
  on public.task_completions (staff_id, completion_date);
