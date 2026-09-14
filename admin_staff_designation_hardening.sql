-- =====================================================================
-- Multybyte To-Do Management System — Staff designation
-- Run this AFTER admin_staff_management_hardening.sql (and everything
-- before it). Idempotent — safe to run on a database that already has
-- every prior part deployed.
--
-- Why this file exists:
-- The Admin Staff list previously had no way to reflect an
-- organizational hierarchy — it only ever sorted by created_at, which
-- looks "random" to an admin trying to find, say, the CEO or an Admin
-- among a long staff list. This adds a free-text `designation` column
-- (e.g. 'CEO', 'Manager', 'Sales Executive') that an admin sets per
-- staff member from the Edit Staff modal; the actual sort-by-hierarchy
-- logic lives in the frontend (staffManagementService.listStaff), not
-- here — this file only adds the column and the column-level grant
-- needed to write it.
-- =====================================================================

alter table public.profiles add column if not exists designation text;

-- Same "grants say WHICH COLUMNS, RLS says WHICH ROWS, the trigger says
-- WHO/WHEN" layering used everywhere else in this project
-- (part3_hardening.sql, admin_staff_management_hardening.sql). The
-- grant below opens the column up on rows a policy already allows
-- touching (profiles_update_own for your own row, or
-- profiles_update_admin_staff for an admin editing any Staff row) —
-- but designation is meant to be an ADMIN-set hierarchy field, not
-- self-editable, so the trigger replacement further down blocks a
-- staff member from changing their own designation even though the
-- grant + profiles_update_own would otherwise allow it.
grant update (designation) on public.profiles to authenticated;

-- Extends the same prevent_self_privilege_escalation() trigger function
-- already used to lock down role/status changes (part3_hardening.sql,
-- admin_staff_management_hardening.sql) with one more case: designation
-- may only be changed by an active admin (public.is_admin()), for
-- anyone's row, including their own. A staff member's own-row update
-- access (profiles_update_own) is otherwise unaffected — they can still
-- update full_name/department as before, just not designation.
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

  if new.designation is distinct from old.designation
     and auth.uid() is not null
     and coalesce(auth.role(), 'authenticated') <> 'service_role'
     and not public.is_admin() then
    raise exception 'Only an administrator can change a designation.';
  end if;

  return new;
end;
$$;

-- The existing trigger (trg_prevent_self_privilege_escalation) already
-- points at this function by name, so replacing the function body above
-- is enough — no need to drop/recreate the trigger itself.

-- No index added: the staff roster is small enough (well under
-- thousands of rows) that sorting happens in the application layer
-- after a single unfiltered fetch, exactly like the existing
-- created_at ordering — see staffManagementService.js.
