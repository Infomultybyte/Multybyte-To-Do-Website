-- =====================================================================
-- Multybyte To-Do Management System — Part 1 Row Level Security
-- Run this AFTER schema.sql. Enforces access control at the database
-- level so the frontend can never see or modify another staff member's
-- data, even if frontend code is bypassed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enable RLS on every table. With RLS enabled and no policy, all
-- access is denied by default until a policy explicitly allows it.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- A user may select and update only their own profile row. The RLS
-- policy alone only checks WHICH row (id = auth.uid()) — it does not
-- stop a staff member from editing their own `role` or `status` column
-- via a raw PATCH request. That is closed separately in
-- part3_hardening.sql with column-level grants plus a trigger, so
-- self-promotion to admin is blocked at the database level, not just
-- hidden from the UI. Inserts happen only via the handle_new_user()
-- trigger (security definer) — staff have no insert policy here.
-- ---------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- tasks
-- Staff may only ever READ their own tasks. Task creation, renaming,
-- reordering (position), and deletion are intentionally NOT available
-- to staff — those are Admin-only responsibilities in a later phase.
-- Do not add insert/update/delete policies for staff here; when Admin
-- ships, give admins their own policies gated on profiles.role = 'admin'
-- rather than loosening these.
-- ---------------------------------------------------------------------
drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
  on public.tasks
  for select
  to authenticated
  using (staff_id = auth.uid());

-- Explicitly no insert/update/delete policies for staff. With RLS
-- enabled and no matching policy, these operations are denied outright
-- at the database level — this is intentional, not an oversight.

-- ---------------------------------------------------------------------
-- task_completions
-- A staff member may fully manage only their own completion records.
-- ---------------------------------------------------------------------
drop policy if exists "completions_select_own" on public.task_completions;
create policy "completions_select_own"
  on public.task_completions
  for select
  to authenticated
  using (staff_id = auth.uid());

drop policy if exists "completions_insert_own" on public.task_completions;
create policy "completions_insert_own"
  on public.task_completions
  for insert
  to authenticated
  with check (staff_id = auth.uid());

drop policy if exists "completions_update_own" on public.task_completions;
create policy "completions_update_own"
  on public.task_completions
  for update
  to authenticated
  using (staff_id = auth.uid())
  with check (staff_id = auth.uid());

drop policy if exists "completions_delete_own" on public.task_completions;
create policy "completions_delete_own"
  on public.task_completions
  for delete
  to authenticated
  using (staff_id = auth.uid());

-- ---------------------------------------------------------------------
-- Note for the future Admin phase:
-- When Admin is built, add separate policies (or a `using (is_admin())`
-- helper function checking profiles.role = 'admin') rather than loosening
-- these staff policies, so staff-level isolation never regresses.
-- ---------------------------------------------------------------------
