-- =====================================================================
-- Multybyte To-Do Management System — In-App Notifications
-- Run this AFTER schema.sql, rls_policies.sql, part3_hardening.sql,
-- staff_final_hardening.sql, admin_part1_hardening.sql,
-- admin_dashboard_part2_hardening.sql, admin_staff_management_hardening.sql,
-- admin_task_management_hardening.sql, and supabase/urgent_tasks.sql
-- (this file reuses public.is_admin() from admin_dashboard_part2_hardening.sql
-- and the urgent_tasks table from urgent_tasks.sql). Idempotent — safe to
-- run on a database that already has all prior parts deployed.
--
-- What this adds:
-- A generic `notifications` table, one row per recipient per event, plus
-- two triggers on `urgent_tasks` that generate those rows automatically:
--
--  1. Admin assigns an urgent task to a staff member
--     -> that staff member gets a notification ("New urgent task
--        assigned: ...").
--  2. Staff member moves their own urgent task to In Process or
--     Completed
--     -> every active admin gets a notification naming the staff member,
--        the task, and the new status.
--
-- Rows are written entirely by SECURITY DEFINER trigger functions, never
-- inserted directly by the browser — so there is no INSERT policy/grant
-- for `authenticated` at all. A signed-in user can only ever SELECT their
-- own notifications and flip their own `is_read` flag; who a notification
-- is FOR and WHY it exists is decided solely by the database, matching
-- this project's existing "triggers decide who/what, grants decide which
-- columns, RLS decides which rows" layering (see urgent_tasks.sql).
-- =====================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  -- Which urgent task this is about. on delete cascade means a
  -- notification never outlives the task it refers to (urgent_tasks has
  -- no client-facing delete today, but this keeps the table consistent
  -- if one is ever removed via the SQL Editor).
  urgent_task_id uuid references public.urgent_tasks (id) on delete cascade,
  type text not null check (
    type in ('urgent_task_assigned', 'urgent_task_in_process', 'urgent_task_completed')
  ),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Serves the notification bell's own list (most recent first) for the
-- signed-in user.
create index if not exists idx_notifications_recipient_created
  on public.notifications (recipient_id, created_at desc);

-- Serves the unread-count badge — a small partial index rather than a
-- full-table one since most rows end up read.
create index if not exists idx_notifications_recipient_unread
  on public.notifications (recipient_id)
  where is_read = false;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (recipient_id = auth.uid());

-- A user may only ever mark their OWN notifications read/unread — the
-- with check mirrors using() so recipient_id itself can never be
-- reassigned to someone else's id via this policy.
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Column-level grant: is_read is the only thing the browser is ever
-- allowed to write. No insert/delete grant to `authenticated` at all —
-- rows are created only by the SECURITY DEFINER trigger functions below,
-- which run as the table owner and so are not subject to this grant.
grant update (is_read) on public.notifications to authenticated;

-- ---------------------------------------------------------------------
-- Trigger 1 — admin assigns an urgent task -> notify that staff member.
-- ---------------------------------------------------------------------
create or replace function public.notify_urgent_task_assigned()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  admin_name text;
begin
  select full_name into admin_name from public.profiles where id = new.created_by;

  insert into public.notifications (recipient_id, urgent_task_id, type, title, message)
  values (
    new.staff_id,
    new.id,
    'urgent_task_assigned',
    'New urgent task assigned',
    coalesce(admin_name, 'An administrator') || ' added "' || new.task_name ||
      '" to your urgent tasks — due ' || to_char(new.deadline, 'DD Mon YYYY') || '.'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_urgent_task_assigned on public.urgent_tasks;
create trigger trg_notify_urgent_task_assigned
  after insert on public.urgent_tasks
  for each row execute function public.notify_urgent_task_assigned();

-- ---------------------------------------------------------------------
-- Trigger 2 — staff member moves their task to In Process/Completed ->
-- notify every active admin. Gated on `not public.is_admin()` so an
-- admin overriding a status themselves (urgent_tasks_update_admin) never
-- notifies admins about their own action — only a genuine staff-driven
-- change fans out.
-- ---------------------------------------------------------------------
create or replace function public.notify_urgent_task_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  staff_name text;
  notif_type text;
  status_label text;
begin
  if new.status is distinct from old.status and not public.is_admin() then
    if new.status = 'in_process' then
      notif_type := 'urgent_task_in_process';
      status_label := 'In Process';
    elsif new.status = 'completed' then
      notif_type := 'urgent_task_completed';
      status_label := 'Completed';
    else
      -- Staff moving a task back to 'pending' isn't a workflow event
      -- either panel needs to be notified about.
      return new;
    end if;

    select full_name into staff_name from public.profiles where id = new.staff_id;

    insert into public.notifications (recipient_id, urgent_task_id, type, title, message)
    select
      p.id,
      new.id,
      notif_type,
      coalesce(staff_name, 'A staff member') || ' updated an urgent task',
      coalesce(staff_name, 'A staff member') || ' marked "' || new.task_name || '" as ' ||
        status_label || '.'
    from public.profiles p
    where p.role = 'admin' and p.status = 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_urgent_task_status_change on public.urgent_tasks;
create trigger trg_notify_urgent_task_status_change
  after update on public.urgent_tasks
  for each row execute function public.notify_urgent_task_status_change();

-- ---------------------------------------------------------------------
-- Realtime — add the table to Supabase's realtime publication so the
-- notification bell can subscribe to postgres_changes (new row arrives
-- -> badge/list update immediately, no polling). Guarded so re-running
-- this file on a database that already has it added doesn't error.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
