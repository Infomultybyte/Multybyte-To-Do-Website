-- =====================================================================
-- Multybyte To-Do Management System — Admin Panel Part 1
-- Run this AFTER schema.sql, rls_policies.sql, part3_hardening.sql, and
-- staff_final_hardening.sql. Idempotent — safe to run on a database that
-- already has all prior parts deployed.
--
-- This part adds NO new tables and NO new RLS policies. Admin login and
-- the Admin layout only ever read the signed-in admin's own `profiles`
-- row, which the existing "profiles_select_own" policy
-- (id = auth.uid()) already allows for any authenticated user — staff
-- or admin — so nothing further is needed there.
--
-- One real bug WAS found and is fixed below.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Bug fix: prevent_self_privilege_escalation() (added in
-- part3_hardening.sql) blocked ANY update to `role`/`status` unless
-- auth.role() = 'service_role'. That's correct for blocking a
-- browser-authenticated staff member from self-promoting — but
-- auth.role() also returns NULL when a query runs outside a PostgREST
-- request entirely (e.g. a statement typed directly into the Supabase
-- SQL Editor, or run by a migration). coalesce(null, 'authenticated')
-- evaluates to 'authenticated', so the trigger fired there too —
-- meaning there was no way to promote the very first Admin account at
-- all, via the SQL Editor or otherwise, without a backend service-role
-- call that doesn't exist in this project.
--
-- Fix: only block the change when there IS a real end-user JWT context
-- (auth.uid() is not null) and that context isn't the service role.
-- Direct SQL Editor / migration statements have no JWT context at all
-- (auth.uid() is null there), so they're unaffected by this check —
-- while a browser request authenticated as a staff member (which always
-- has a real auth.uid()) is still blocked from touching its own
-- role/status, exactly as intended.
-- ---------------------------------------------------------------------
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and auth.uid() is not null
     and coalesce(auth.role(), 'authenticated') <> 'service_role' then
    raise exception 'Only an administrator can change role or status.';
  end if;
  return new;
end;
$$;

-- The existing trigger (trg_prevent_self_privilege_escalation) already
-- points at this function by name, so replacing the function body above
-- is enough — no need to drop/recreate the trigger itself.

-- ---------------------------------------------------------------------
-- How to create your first Admin account (no Admin UI for this exists
-- yet — Staff Management is a later phase):
--
-- 1. Have the person sign up / be created the normal way (Supabase
--    Dashboard -> Authentication -> Users -> Add user). The
--    handle_new_user trigger auto-creates their `profiles` row as
--    role = 'staff', status = 'active'.
-- 2. In the SQL Editor, run:
--      update public.profiles
--      set role = 'admin'
--      where email = 'the-persons-email@example.com';
--    (This now works thanks to the fix above.)
-- 3. That account can now sign in at /login and will land on
--    /admin/dashboard instead of /staff/todo.
-- ---------------------------------------------------------------------
