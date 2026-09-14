-- =====================================================================
-- Multybyte To-Do Management System — Admin Dashboard (Part 2)
-- Run this AFTER schema.sql, rls_policies.sql, part3_hardening.sql,
-- staff_final_hardening.sql, and admin_part1_hardening.sql. Idempotent —
-- safe to run on a database that already has all prior parts deployed.
--
-- Why this file exists:
-- Every policy shipped so far only lets a user see their OWN row
-- (profiles: id = auth.uid(); tasks/task_completions: staff_id =
-- auth.uid()). That's correct for Staff, but it means an Admin account
-- could not yet read any OTHER staff member's profile, tasks, or
-- completions — and the Dashboard needs exactly that (company-wide
-- totals and a per-staff table) to work at all.
--
-- This file adds THREE new SELECT-only policies (one per table), each
-- gated on the caller being an active admin. It does not touch, modify,
-- or remove any existing Staff policy — Postgres OR's every applicable
-- policy of the same command together, so Staff's own-row access is
-- completely unaffected; Admin simply gains an additional way to match
-- rows that Staff's policies never granted. No insert/update/delete
-- policy is added for Admin here — the Dashboard is read-only, so the
-- database grants exactly that and nothing more until a later phase
-- (Staff/Task Management) needs write access and adds its own policies.
-- =====================================================================

-- ---------------------------------------------------------------------
-- is_admin(): SECURITY DEFINER helper so the admin policies below can
-- check "is the CALLER an admin?" without recursively re-invoking RLS
-- on `profiles` (a policy on `profiles` that queries `profiles` as the
-- calling user would either recurse or simply see only that user's own
-- row via the existing profiles_select_own policy, making the check
-- useless for anyone but the row's own owner). Running as the function
-- owner (the table owner, which does not have FORCE ROW LEVEL SECURITY
-- applied) sidesteps that: this function's internal query is not
-- subject to RLS, but everything it returns is just a boolean, so it
-- leaks no row data — it only tells the calling policy yes/no.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

-- Callable by any signed-in user (it only ever answers about the
-- caller themselves via auth.uid(), so this is safe to expose broadly).
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- profiles: an admin may additionally SELECT every profile row (needed
-- for Total Staff / Active Staff counts and the per-staff overview
-- table). Existing profiles_select_own and profiles_update_own policies
-- are untouched — a staff member's own-row access and column-level
-- write restrictions (part3_hardening.sql) are unchanged.
-- ---------------------------------------------------------------------
drop policy if exists "profiles_select_admin_all" on public.profiles;
create policy "profiles_select_admin_all"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- tasks: an admin may additionally SELECT every staff member's tasks
-- (needed to count tasks-per-staff for the selected month/year).
-- Existing tasks_select_own stays exactly as-is; staff still have no
-- insert/update/delete access (see part3_hardening.sql grants).
-- ---------------------------------------------------------------------
drop policy if exists "tasks_select_admin_all" on public.tasks;
create policy "tasks_select_admin_all"
  on public.tasks
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- task_completions: an admin may additionally SELECT every staff
-- member's completion history (needed for completed/total counts and
-- "completed today"). Existing completions_select_own /
-- completions_insert_own / completions_update_own stay exactly as-is;
-- staff still cannot delete completions (staff_final_hardening.sql).
-- ---------------------------------------------------------------------
drop policy if exists "completions_select_admin_all" on public.task_completions;
create policy "completions_select_admin_all"
  on public.task_completions
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- Note for future phases:
-- Staff Management / Task Management will need admin WRITE policies
-- (insert/update/delete on profiles/tasks). Add those as their own new
-- policies gated on public.is_admin() when that phase ships — do not
-- loosen the SELECT-only policies added here.
-- ---------------------------------------------------------------------
