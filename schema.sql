-- =====================================================================
-- Multybyte To-Do Management System — Part 1 schema
-- Run this in the Supabase SQL editor (or via the CLI) on a fresh project.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles
-- One row per Supabase Auth user. id is a foreign key to auth.users so
-- profile lifecycle is tied to the auth account.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'staff' check (role in ('staff', 'admin')),
  department text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_status on public.profiles (status);

-- ---------------------------------------------------------------------
-- tasks
-- A staff member's task list for a given month/year. `position` lets the
-- UI keep a stable manual sort order per staff/month.
-- ---------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  task_name text not null,
  month smallint not null check (month between 1 and 12),
  year smallint not null check (year between 2000 and 2100),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_staff_id on public.tasks (staff_id);
create index if not exists idx_tasks_staff_month_year on public.tasks (staff_id, year, month);

-- ---------------------------------------------------------------------
-- task_completions
-- One row per task per calendar day it was marked complete/incomplete.
-- staff_id is denormalized onto this table (in addition to being
-- reachable via task_id -> tasks.staff_id) so RLS policies here can
-- check auth.uid() directly without an extra join, and so the future
-- Admin/Reports phase can query completions per staff efficiently.
-- ---------------------------------------------------------------------
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete cascade,
  completion_date date not null,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),

  -- Prevents duplicate completion rows for the same staff + task + date.
  constraint uq_completion_staff_task_date unique (staff_id, task_id, completion_date)
);

create index if not exists idx_completions_staff_id on public.task_completions (staff_id);
create index if not exists idx_completions_task_id on public.task_completions (task_id);
create index if not exists idx_completions_date on public.task_completions (completion_date);

-- ---------------------------------------------------------------------
-- updated_at auto-touch trigger (shared across all three tables)
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists trg_completions_updated_at on public.task_completions;
create trigger trg_completions_updated_at
  before update on public.task_completions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Keep task_completions.staff_id consistent with its parent task,
-- so the denormalized column can never drift from the source of truth.
-- ---------------------------------------------------------------------
create or replace function public.enforce_completion_staff_matches_task()
returns trigger
language plpgsql
as $$
declare
  task_owner uuid;
begin
  select staff_id into task_owner from public.tasks where id = new.task_id;

  if task_owner is null then
    raise exception 'Referenced task % does not exist', new.task_id;
  end if;

  if new.staff_id <> task_owner then
    raise exception 'staff_id (%) does not match the owning task''s staff_id (%)',
      new.staff_id, task_owner;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_completion_staff_matches_task on public.task_completions;
create trigger trg_completion_staff_matches_task
  before insert or update on public.task_completions
  for each row execute function public.enforce_completion_staff_matches_task();

-- ---------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user is created.
-- Ships as 'staff' / 'active' by default for this Part 1 (staff-only)
-- version. Admin promotion happens later via direct update or an
-- Admin-only UI action in a future phase.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    'staff',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
