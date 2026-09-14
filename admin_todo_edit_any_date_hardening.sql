-- =====================================================================
-- Multybyte To-Do Management System — Admin can edit any date
-- Run this AFTER staff_checkin_date_lock.sql (and everything before it).
-- Idempotent — safe to run on a database that already has every prior
-- part deployed.
--
-- Why this file exists:
-- staff_checkin_date_lock.sql added a trigger restricting ordinary
-- authenticated writes on task_completions to TODAY's date (IST) only.
-- That trigger fires for every 'authenticated' request regardless of
-- who is behind it — which meant it also blocked an ADMIN trying to
-- tick/untick a staff member's box for a past or future date from the
-- Admin Staff Detail page (/admin/staff/:staffId), even though RLS
-- already lets an admin write any staff member's completions
-- (admin_staff_detail_hardening.sql). This file carves out that one
-- exception: an active admin may set any completion_date; an ordinary
-- staff session remains locked to today, unchanged.
-- =====================================================================

create or replace function public.enforce_completion_date_is_today()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if auth.role() = 'authenticated'
     and new.completion_date <> today_ist
     and not public.is_admin() then
    raise exception
      'Task completions can only be recorded for today''s date (%). Past and future dates cannot be changed.',
      today_ist;
  end if;

  return new;
end;
$$;

-- The existing trigger (trg_completion_date_is_today, from
-- staff_checkin_date_lock.sql) already points at this function by name,
-- so replacing the function body above is enough — no need to
-- drop/recreate the trigger itself.

-- ---------------------------------------------------------------------
-- Note: this relies on public.is_admin() (defined in
-- admin_dashboard_part2_hardening.sql), which checks the CALLER's own
-- profiles.role/status via a security-definer function, so it works
-- correctly inside this trigger regardless of whose completion row is
-- being written. Nothing else about how completions are addressed
-- changes: still uniquely keyed by (staff_id, task_id, completion_date),
-- still rejected if staff_id doesn't match the task's real owner
-- (trg_completion_staff_matches_task, schema.sql), and RLS
-- (admin_staff_detail_hardening.sql) still restricts an admin's writes
-- to actual Staff rows, never another Admin's.
-- ---------------------------------------------------------------------
