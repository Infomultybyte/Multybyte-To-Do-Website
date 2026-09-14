-- =====================================================================
-- OPTIONAL — Part 2 testing helper only.
--
-- Admin Task Management doesn't exist yet, so there is currently no UI
-- for creating tasks. Use this script to seed a few example tasks for a
-- staff member while testing the grid. Replace the staff_id below with
-- a real id from your `profiles` table (Table Editor -> profiles -> copy
-- the `id` column for the staff account you're testing with).
--
-- Safe to run multiple times for different staff_id / month / year
-- combinations; it does not delete or affect any existing data.
-- =====================================================================

do $$
declare
  target_staff_id uuid := 'PASTE-STAFF-PROFILE-ID-HERE';
  target_month smallint := extract(month from now())::smallint;
  target_year smallint := extract(year from now())::smallint;
begin
  insert into public.tasks (staff_id, task_name, month, year, position)
  values
    (target_staff_id, 'Update IndiaMART listings', target_month, target_year, 1),
    (target_staff_id, 'Check pending orders', target_month, target_year, 2),
    (target_staff_id, 'Customer follow-up', target_month, target_year, 3),
    (target_staff_id, 'Check inventory', target_month, target_year, 4),
    (target_staff_id, 'Update website', target_month, target_year, 5);
end $$;
