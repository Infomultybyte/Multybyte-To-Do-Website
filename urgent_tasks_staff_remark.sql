-- =====================================================================
-- Multybyte To-Do Management System — Urgent Tasks: Staff Remark
-- Run this AFTER supabase/urgent_tasks.sql. Idempotent — safe to run on
-- a database that already has it deployed.
--
-- What this adds:
-- A `staff_remark` column the STAFF member may optionally fill in when
-- they mark an urgent task completed (separate from `admin_remark`,
-- which only the admin who assigned the task can write). The Staff UI
-- prompts for this at the moment of marking a task Completed and lets
-- it be left blank — this column is what that optional value is saved
-- into.
-- =====================================================================

alter table public.urgent_tasks
  add column if not exists staff_remark text;

-- Serves the Staff/Admin "urgent tasks for this month" queries, which
-- filter by staff_id and a deadline date range.
create index if not exists idx_urgent_tasks_staff_deadline
  on public.urgent_tasks (staff_id, deadline);

-- ---------------------------------------------------------------------
-- enforce_urgent_task_write_scope(): re-defined to also allow a
-- non-admin (the task's own staff member) to write `staff_remark` on
-- their own row — everything else about the scope check is unchanged.
-- The existing trigger (trg_urgent_tasks_write_scope) already points at
-- this function by name, so replacing the function body is enough; no
-- need to drop/recreate the trigger itself.
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

-- ---------------------------------------------------------------------
-- Column-level grant: `authenticated` gains write access to
-- staff_remark (previously only task_name/deadline/admin_remark/status
-- from supabase/urgent_tasks.sql). This is additive — it does not
-- replace or narrow that earlier grant. A staff member can now save a
-- remark on their own row when completing a task; the trigger above is
-- still what stops them from touching task_name/deadline/admin_remark/
-- staff_id, exactly as before.
-- ---------------------------------------------------------------------
grant update (staff_remark) on public.urgent_tasks to authenticated;
