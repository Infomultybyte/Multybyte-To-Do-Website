-- =====================================================================
-- Multybyte To-Do Management System — Staff check-in date lock
-- Run this AFTER schema.sql, rls_policies.sql, part3_hardening.sql, and
-- staff_final_hardening.sql. Idempotent and additive.
--
-- Feature: staff may only tick/untick TODAY's date — not a past date,
-- and not a future one. The frontend already disables every non-today
-- checkbox (see src/components/TodoGrid.jsx) and the hook that calls
-- Supabase also short-circuits on any non-today day (see
-- src/hooks/useStaffTodos.js). This migration is the third, database
-- layer: even a hand-crafted request using a staff member's own valid
-- session cannot backdate or pre-date a completion, because RLS/UI
-- alone are never sufficient on their own.
--
-- Timezone note: "today" is evaluated in Asia/Kolkata (IST), matching
-- where this business operates, rather than the database's default UTC
-- or each staff laptop's own local clock. A staff member whose device
-- clock is wrong, or who is physically outside IST, is judged against
-- the same IST "today" as everyone else — this is intentional so the
-- rule means the same thing for every staff member regardless of any
-- one laptop's settings. Change 'Asia/Kolkata' below if the business's
-- operating timezone is ever different.
--
-- Rows written before this migration (any historical data) are
-- completely unaffected — the trigger only evaluates NEW rows going
-- forward, so nothing existing is touched or re-validated.
-- =====================================================================

create or replace function public.enforce_completion_date_is_today()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
begin
  -- Only restrict ordinary authenticated (staff) requests coming through
  -- the anon key with a user JWT. Direct SQL-editor/migration work and
  -- any future service-role/Admin action (auth.role() returns
  -- 'service_role', or null when there is no request context at all,
  -- e.g. a plain SQL Editor session) are left free to set any date —
  -- useful for corrections or for a future Admin backfill tool.
  if auth.role() = 'authenticated' and new.completion_date <> today_ist then
    raise exception
      'Task completions can only be recorded for today''s date (%). Past and future dates cannot be changed.',
      today_ist;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_completion_date_is_today on public.task_completions;
create trigger trg_completion_date_is_today
  before insert or update on public.task_completions
  for each row execute function public.enforce_completion_date_is_today();
