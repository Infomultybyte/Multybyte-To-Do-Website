-- =====================================================================
-- Multybyte To-Do Management System — Admin Staff Management (Part 3)
-- Run this AFTER schema.sql, rls_policies.sql, part3_hardening.sql,
-- staff_final_hardening.sql, admin_part1_hardening.sql, and
-- admin_dashboard_part2_hardening.sql. Idempotent — safe to run on a
-- database that already has all prior parts deployed.
--
-- What this page needs that didn't exist before:
--   1. An admin creating a Staff account needs the new Auth user's
--      `department` (captured at signup time) to land on their
--      `profiles` row, not just `full_name`.
--   2. An admin needs to flip another Staff member's `status` between
--      'active'/'inactive' FROM THE BROWSER. Every write path built so
--      far either blocks role/status changes outright
--      (prevent_self_privilege_escalation, part3_hardening.sql) or only
--      lets a user touch their OWN row (profiles_update_own,
--      rls_policies.sql) — neither allows this. Auth-user creation
--      itself still goes through a service-role Edge Function (see
--      supabase/functions/admin-create-staff), never the browser.
--
-- Explicitly NOT added here: no way for the browser to change `role`,
-- `email`, or `id` on any row, admin or not. Role stays a backend-only
-- change (service role / SQL Editor), exactly as documented in
-- admin_part1_hardening.sql — this file does not reopen that.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) handle_new_user(): also copy `department` from the new Auth user's
-- metadata onto their profiles row, the same way `full_name` already
-- is. The admin-create-staff Edge Function sets both in
-- `user_metadata` when it calls `auth.admin.createUser`. Harmless for
-- every OTHER way a user can be created (self-signup, dashboard "Add
-- user") — department is simply left null there, same as today.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, department, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    'staff',
    new.raw_user_meta_data ->> 'department',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2) prevent_self_privilege_escalation(): split the single role/status
-- check into two. `role` stays exactly as locked down as before — no
-- browser session, admin or staff, may change it; that still requires
-- the service role (Edge Function) or direct SQL Editor access. `status`
-- gets one narrow carve-out: an ACTIVE ADMIN (public.is_admin()) may
-- change status on a row that is — and remains — a Staff row
-- (old.role = 'staff' and new.role = 'staff'; role can't actually
-- change via this path since the column grant below never gives
-- `authenticated` write access to `role`, but the check is kept here
-- too as defense in depth, matching this codebase's existing style).
-- This intentionally does NOT let an admin flip their own status or
-- another admin's status through the UI — Staff Management only ever
-- targets Staff rows, so that's the only case this needs to cover.
-- ---------------------------------------------------------------------
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and coalesce(auth.role(), 'authenticated') <> 'service_role' then
    raise exception 'Only a trusted backend process can change role.';
  end if;

  if new.status is distinct from old.status
     and auth.uid() is not null
     and coalesce(auth.role(), 'authenticated') <> 'service_role'
     and not (
       public.is_admin()
       and old.role = 'staff'
       and new.role = 'staff'
     ) then
    raise exception 'Only an administrator can change a staff member''s status.';
  end if;

  return new;
end;
$$;

-- The existing trigger (trg_prevent_self_privilege_escalation) already
-- points at this function by name, so replacing the function body above
-- is enough — no need to drop/recreate the trigger itself.

-- ---------------------------------------------------------------------
-- 3) Column-level grant: `authenticated` gains write access to the
-- `status` column (previously only `full_name`/`department` from
-- part3_hardening.sql). This is the same "grants say WHICH COLUMNS,
-- RLS says WHICH ROWS, the trigger says WHO/WHEN" layering already used
-- everywhere else in this project. A staff member still cannot
-- actually change their own status: the trigger above rejects it
-- (is_admin() is false for them) even though the column is writable
-- and profiles_update_own would otherwise let them touch their own row.
-- `role`, `email`, and `id` remain ungranted — no policy or trigger
-- change anywhere in this file opens a write path for those.
-- ---------------------------------------------------------------------
grant update (status) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 4) profiles_update_admin_staff: lets an active admin UPDATE any
-- Staff profile row (role = 'staff'). Combined with the grant above,
-- this is what actually lets Staff Management save Full name,
-- Department, and Status edits. `profiles_update_own` and
-- `profiles_select_admin_all` are untouched — Postgres OR's every
-- applicable policy for the same command, so a staff member's own-row
-- access is unaffected; this only adds a new way for an admin to reach
-- OTHER staff members' rows, and only staff rows at that (an admin
-- cannot use this policy to edit another admin's row).
-- ---------------------------------------------------------------------
drop policy if exists "profiles_update_admin_staff" on public.profiles;
create policy "profiles_update_admin_staff"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin() and role = 'staff')
  with check (public.is_admin() and role = 'staff');

-- ---------------------------------------------------------------------
-- Note on Delete: still no DELETE policy or grant added here for the
-- browser/`authenticated` role — that remains intentional. A real,
-- permanent delete now exists, but it goes through the
-- admin-delete-staff Edge Function (service role only), which calls
-- `auth.admin.deleteUser`. Deleting the auth.users row cascades via
-- the existing `on delete cascade` FKs (profiles -> auth.users,
-- tasks -> profiles, task_completions -> profiles/tasks), wiping the
-- profile, every task, and every completion record for that staff
-- member. "Deactivate" (status = 'inactive') is still the reversible,
-- history-preserving option; "Delete" in the UI is the permanent one.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Note on account creation: creating the Auth user itself (email +
-- password) is NOT done here and cannot be done from the browser with
-- the anon key — Supabase Auth's admin user-creation API requires the
-- service_role key, which must never reach frontend code. That step is
-- handled by the `admin-create-staff` Edge Function
-- (supabase/functions/admin-create-staff/index.ts), which runs
-- server-side with the service_role key, itself checks the caller is
-- an active admin before doing anything, and lets `handle_new_user`
-- (above) create the resulting profiles row exactly as it would for
-- any other new Auth user.
-- ---------------------------------------------------------------------
