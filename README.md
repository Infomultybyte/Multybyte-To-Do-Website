# Multybyte To-Do Management System — complete (Staff + Admin)

Part 1: project foundation, Supabase schema/RLS, and Staff authentication.
Part 2: the Staff monthly To-Do grid (view + tick/untick tasks), wired
live to Supabase.
Part 3: security hardening, performance tuning for large task lists, and
a full review pass on the Staff section.
Part 4: Staff-section production-readiness review — fixed a
config-crash/blank-screen gap, let future months with pre-assigned
tasks be selected, fixed `npm run lint` linting the build output, and
removed an unused delete right on completion history.
Admin Part 1: the Admin section's foundation — login detection, route
protection, and layout only.
Admin Dashboard (Part 2): company-wide stats and a per-staff overview
table, read-only.
Admin Staff Management (Part 3): the `/admin/staff` page — view, add,
edit, and activate/deactivate Staff accounts.
Admin Task Management (Part 4): the `/admin/tasks` page — add, rename,
reorder, and soft-delete a staff member's tasks per month.
Admin Staff Detail (Part 5): `/admin/staff/:staffId` — an admin can view
and check/uncheck any one staff member's grid directly.
Admin Reports (Part 6): `/admin/reports` — a filterable staff
performance table, a per-staff monthly breakdown, and a staff
comparison chart, all read-only.
Excel Export (Part 7): "Export Excel" on Reports — a client-side,
two-sheet (Detail + Summary) `.xlsx` download built from real Supabase
data, no server component.
Task Interval + Favicon (this pass): every task now has an Interval
(Daily / Weekly / Monthly / Quarterly / One Time), set by an admin when
adding or editing a task on `/admin/tasks` and shown read-only next to
the task name on the Staff dashboard (and on `/admin/staff/:staffId`).
The site favicon is now the Multybyte logo.

## Notifications (this pass)

Adds an in-app notification bell (header, both Admin and Staff panels)
for the two urgent-task events each side cares about:

- **Admin assigns an urgent task** &rarr; the staff member gets a
  notification the moment it lands on their dashboard.
- **Staff moves a task to In Process or Completed** &rarr; every active
  admin gets a notification naming the staff member, the task, and the
  new status.

Each notification shows the date/time it arrived. Delivery is realtime
(Supabase `postgres_changes`, no polling) — updates appear without a
page refresh, and independently in every tab the user is signed in on
(each tab holds its own realtime subscription), so a second/third open
tab chimes and pops up too — the same way WhatsApp Web behaves across
tabs.

A new notification also:
- Plays a chime (`src/utils/notificationSound.js`, synthesized with the
  Web Audio API — no external audio file). Each user can mute it
  per-device from the bell dropdown ("Mute sound"); the preference is
  stored in `localStorage`, not the database.
- Pops up as an in-app toast, top-right, for ~6 seconds
  (`NotificationToastStack.jsx`).
- Shows a native OS/browser notification regardless of which tab or
  window is currently focused, once permission is granted
  (`src/utils/browserNotification.js`) — this is what covers "signed in
  on another tab, or a different window entirely". Chrome/Firefox/etc.
  increasingly require the permission prompt to come from an actual
  click rather than firing automatically on page load, so the bell
  dropdown shows an "Enable" button when permission hasn't been decided
  yet; if the user has explicitly blocked it, a note points them at
  their browser's site settings instead. The chime and in-app toast work
  either way.

Marking a notification read (individually, or "Mark all as read")
removes it from the list entirely rather than leaving it there dimmed —
the bell only ever shows what's still unread. `getNotifications()` only
ever fetches `is_read = false` rows for the same reason.

**Database changes:** `supabase/notifications.sql` — adds the
`notifications` table (RLS: a user can only read/mark-read their own
rows), two `SECURITY DEFINER` triggers on `urgent_tasks` that generate
those rows (never inserted from the browser directly), and adds the
table to the `supabase_realtime` publication. Run this after
`supabase/urgent_tasks.sql` and `supabase/urgent_tasks_staff_remark.sql`.

**Frontend:** `src/services/notificationService.js`,
`src/hooks/useNotifications.js`, `src/components/NotificationBell.jsx`,
wired into `AdminLayout` and `StaffLayout`.

## Task Interval + Favicon (this pass)

**Task Interval.** Added a `task_interval` column on `tasks`
(`supabase/admin_task_interval_hardening.sql`), defaulting to `'Daily'`
and constrained to `Daily` / `Weekly` / `Monthly` / `Quarterly` /
`One Time`. The Add Task and Edit Task modals on `/admin/tasks` now
have an Interval dropdown alongside the task name, and the Admin task
table shows an Interval column. The Staff dashboard grid (and the
Admin Staff Detail grid, which shares the same `TodoGrid` component)
shows each task's interval as a small read-only badge next to its
name — Staff never gets a way to set or change it.

This is admin-only the same way `task_name` already is: Staff has no
INSERT/UPDATE policy on `tasks` at all, so granting column-level write
access on `task_interval` to `authenticated` is enough — an admin's
write satisfies `tasks_insert_admin` / `tasks_update_admin`
(`public.is_admin()`), a staff write has no policy to go through,
regardless of what the browser sends.

**Favicon.** `public/favicon.ico`, `favicon-16x16.png`,
`favicon-32x32.png`, `favicon-192x192.png`, `favicon-512x512.png`, and
`apple-touch-icon.png` were generated from the provided Multybyte logo
(white background made transparent) and wired up in `index.html`.

## Admin Part 8 — final integration & hardening (this pass)

Reviewed the whole Admin panel end to end against the Part 8 checklist:
navigation, Staff/Admin separation, a full RLS re-audit (every policy
in `supabase/`, read line by line against the "nobody can…" list),
historical-data integrity, UI/empty/error/loading states, responsive
behavior, and a static code review in place of `npm run build`/`npm run
lint` (see "Known limitations" below for why those couldn't be run
directly in this environment, and what was done instead).

**Result: no code changes were needed.** Every route, RLS policy,
loading/empty/error/success state, and responsive layout already in the
project from Parts 1–7 was verified correct on inspection — the
security layering (RLS row policies + column-level grants + the
`prevent_self_privilege_escalation` trigger, all cross-checked against
each other) holds together exactly as each file's own comments claim it
does, and no gap was found. **One real issue was found and fixed, in
documentation only:** this README's "Run the database setup" list
still stopped at Part 3 (Staff Management) and its closing section
claimed Task Management/Reports/Export weren't built — both wrong,
since all of that shipped in Parts 4–7. A developer following the old
instructions verbatim would have deployed an app with a working
Dashboard and Staff Management but a non-functional Task Management
page (no RLS write path). Fixed below — no `.sql` file content changed,
only which files this README tells you to run and in what order.

## Admin Part 1 — foundation

Adds Admin authentication detection, route protection, and a layout —
nothing more. Built without touching Staff functionality: every existing
Staff file was reviewed and only two were edited, both to make login
role-aware rather than staff-only (see "Files changed" below); the Staff
grid, hooks, and services are untouched.

**What's here:**

- `/admin` redirects to `/admin/dashboard`. `/admin/dashboard`,
  `/admin/staff`, `/admin/tasks`, `/admin/reports` are each gated by
  `ProtectedRoute allowedRoles={['admin']}` — the same guard component
  Staff routes use, just with a different allowed role. Role is read
  from `profiles.role` in the database; nothing about it comes from the
  client, so a Staff account cannot reach these routes by editing the
  URL, and an unauthenticated visitor is redirected to `/login` exactly
  like on any Staff route.
- `AdminLayout` — a sidebar (Dashboard/Staff/Tasks/Reports, Multybyte
  branding, current-page highlight) + a top header (admin name, logout),
  responsive down to mobile (the sidebar becomes a slide-in drawer
  behind a hamburger button below the `lg` breakpoint). Uses the same
  slate/lime/paper palette as the Staff section.
- `/admin/dashboard` shows a real (if minimal) welcome page. `/admin/staff`,
  `/admin/tasks`, `/admin/reports` are an explicit placeholder — no
  queries, no fake data, just proof the route and layout work.
- The existing login page is unchanged in structure — it still has one
  form and one `signIn()` call. What changed is where a signed-in user
  is sent afterward: `AuthContext` now exposes `homePath`, computed from
  the database-backed `profiles.role`/`status` (`/admin/dashboard` for
  an active admin, `/staff/todo` for an active staff member, `null`
  otherwise) — the login page was never role-aware before because only
  Staff existed.

**A real bug found and fixed:** the Part 3 trigger that blocks
self-privilege-escalation (`prevent_self_privilege_escalation`) also
blocked a direct SQL Editor update to `role`/`status`, because
`auth.role()` returns `NULL` outside a PostgREST request and the
trigger's `coalesce(..., 'authenticated')` treated that the same as a
browser request. That meant there was no way to create the *first*
Admin account at all. Fixed in `supabase/admin_part1_hardening.sql` —
see that file's comments, and "Files changed" below.

**No new tables, no new RLS policies, no second database.** Admin login
and the Admin layout only ever read the signed-in admin's own `profiles`
row, which the existing `profiles_select_own` policy (`id = auth.uid()`)
already allows for any authenticated user, admin or staff.

**Not built yet (by design for this pass):** Staff Management, Task
Management, Reports, Excel export, analytics. The sidebar links to all
four; three of them are placeholders.


## Admin Staff Management (this pass)

Replaces the `/admin/staff` placeholder with a real page. Staff (Task
Management, Reports) sidebar destinations are unchanged and still
placeholders — this pass touches Staff Management only, and every
existing Staff-section file and RLS policy was left as-is.

**What's here:**

- **Staff table** — name, email, department, status, created date, and
  row actions, for every account with `role = 'staff'` (active and
  inactive). Backed by `profiles_select_admin_all`, the same read
  policy the Dashboard already uses.
- **Search** — filters the table by name, email, or department as you
  type. Runs client-side against the already-loaded list rather than a
  new query per keystroke.
- **Add Staff** — a modal collects full name, email, password, and
  department, plus an Active/Inactive toggle. Creating the Supabase
  Auth user itself needs the `service_role` key, which must never sit
  in frontend code — so this calls a new Edge Function,
  `supabase/functions/admin-create-staff`, that runs server-side, has
  its own admin check, and is the only place in this project the
  service-role key is ever used. See "Deploy the Staff Management Edge
  Function" below.
- **Edit Staff** — full name, department, and status only. There is no
  way to change role or email from this UI, and no database grant that
  would let a browser request do it either way (see the hardening file
  below).
- **Activate/Deactivate** — a status toggle per row, with a
  confirmation dialog before deactivating (activating doesn't need one).
  Deactivating never deletes anything: the profile, tasks, and
  completion history all stay exactly as they were, and the existing
  sign-in check (`AuthContext.signIn`, unchanged from Part 1) already
  refuses login and signs the session back out for any non-active
  profile.
- **No delete.** There is intentionally no way to permanently remove a
  Staff account or its history from this UI — deactivation is the only
  supported path, matching the requirement that historical data is
  never lost.

**Database changes:** `supabase/admin_staff_management_hardening.sql`.
It does three things: lets `handle_new_user` copy `department` (not
just `full_name`) onto a new profile; lets an active admin change a
Staff row's `status` from the browser (previously *no* browser session
could change `status` at all, admin included — see that file's
comments for the full reasoning); and adds the
`profiles_update_admin_staff` RLS policy an admin's edits actually go
through. `role` and `email` remain impossible to write from the
browser for anyone — that did not change.

## Deploy the Staff Management Edge Function

Adding a Staff account requires the `admin-create-staff` Edge Function
to be deployed to your Supabase project — the Staff table, search,
Edit, and Activate/Deactivate all work without it, but "Add Staff" will
fail until it's deployed.

```bash
# from the project root, with the Supabase CLI installed and logged in
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy admin-create-staff
```

No secrets need to be set manually — `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided to
every Edge Function automatically by Supabase. The function verifies
the caller is an active admin itself before doing anything, so no
front-end code (and no `service_role` key) needs to know that
verification happened.


## Part 4 — production-readiness review (this pass)

Verified end-to-end (installed dependencies, ran `npm run build` and
`npm run lint` for real, and read every file) rather than assumed. Four
real issues were found and fixed:

- **Blank white screen on misconfiguration.** `createClient()` throws
  synchronously if `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are
  missing or invalid (confirmed by testing it directly) — e.g. a Vercel
  deploy where the env vars weren't set. Since that throw happened at
  module-evaluation time, it crashed the entire app before React could
  render anything, leaving a blank white page with only a console error.
  `src/lib/supabaseClient.js` now catches this, and `App.jsx` checks for
  it up front and renders `ConfigErrorScreen` instead — a real, readable
  message instead of nothing. A top-level `ErrorBoundary` (in
  `main.jsx`) was also added as a last-resort net for any other
  uncaught render error, so no future bug can produce a blank screen
  either.
- **Future months with pre-assigned tasks were unreachable.** The month
  dropdown only ever generated past + current months — a staff member
  had no way to select a future month even if tasks already existed for
  it. `buildMonthOptions` now includes a short window of upcoming months
  too; an empty future month still shows the normal "No tasks assigned"
  state, so this costs nothing when there's nothing there yet.
- **`npm run lint` was linting the build output.** There was no
  `.eslintignore`, so after running `npm run build` once, `npm run lint`
  would also lint the minified `dist/` bundle and report 200+ meaningless
  errors from third-party code. Added `.eslintignore` (`node_modules`,
  `dist`). The actual `src/` code was already lint-clean.
- **Unused delete right on completion history.** RLS gave staff a
  `DELETE` policy on `task_completions`, but the app only ever upserts
  (unchecking a box sets `completed = false` on the existing row — it
  never deletes it). Since permanent monthly history is a hard
  requirement, an unused delete path was pure risk. Closed in
  `supabase/staff_final_hardening.sql`.

Everything else in Parts 1–3 was reviewed and found correct on this
pass: RLS isolation, the completion unique constraint, no localStorage
use, day/leap-year math, and the memoized grid's performance under a
large task list. See the sections below for the full review scope.

## What's included

- React + Vite + Tailwind, structured for growth (`components/`, `pages/`,
  `layouts/`, `hooks/`, `lib/`, `services/`, `utils/`, `types/`)
- Supabase Auth (email + password)
- `profiles`, `tasks`, `task_completions` tables with FKs, indexes,
  constraints, and a unique constraint preventing duplicate completion
  rows for the same staff + task + date
- Row Level Security so staff can only ever see/change their own data
- `/login` and a protected `/staff/todo` route with the monthly grid
- Logout

## Part 3 — what changed and why

**Security fixes (found during review — real gaps, now closed):**

- Staff previously had `insert`/`update`/`delete` RLS policies on
  `tasks`. That meant a staff member could add, rename, reorder, or
  delete their own tasks even though the UI never exposed it — a
  request crafted by hand could still do it. Staff now only have
  `select` on `tasks`; task creation/renaming/ordering/deletion is
  Admin-only in a later phase.
- `profiles_update_own` let a signed-in user update *any* column of
  their own row, including `role` and `status` — meaning a staff
  account could self-promote to `admin` via a raw request. This is now
  closed two ways: column-level grants (`supabase/part3_hardening.sql`)
  so the database physically rejects writes to anything but
  `full_name`/`department` from the browser, plus a trigger that blocks
  any `role`/`status` change unless it comes from the service role.

Run `supabase/part3_hardening.sql` (after `schema.sql` and
`rls_policies.sql`) to apply both fixes — it's additive and safe to run
on a database that already has Part 1/2 deployed.

**Performance:**

- The checkbox toggle handler now has a stable identity across renders
  (previously it was recreated on every state change), and each grid
  cell is memoized. Together, ticking one box no longer causes React to
  re-render the whole grid — this matters once a staff member has 50+
  tasks (1,500+ cells for a 31-day month).
- Added a composite index (`staff_id, year, month, position`) matching
  the grid's actual query/sort pattern, and a composite
  `(staff_id, completion_date)` index for the completions range query.
- Tasks and completions are still each loaded in exactly one query per
  month (no per-cell requests) — verified unchanged from Part 2.

**Routing / future-proofing:**

- `ProtectedRoute` now takes an `allowedRoles` prop (default `['staff']`)
  instead of being hard-wired to staff. When Admin ships, an
  `/admin/*` branch can reuse the exact same guard with
  `allowedRoles={['admin']}`. Role is read from the database-backed
  `profiles.role`, so a staff account cannot get into an admin route by
  editing the URL or any client-side state — and today, since no
  `/admin/*` route exists at all, any such URL simply falls through the
  catch-all route back to `/staff/todo`.

**Verified, unchanged from Part 2 (re-checked during this review):**

- Day-column count is computed from `new Date(year, month, 0).getDate()`
  — confirmed correct for all 12 months plus leap-year edge cases
  (2024, 2028, 2000, and the 1900 non-leap-century case).
- Switching months never touches another month's data — each load is
  scoped by `staff_id + month + year`, and completions are looked up by
  date range within that month only.
- Tasks display in `position` order; there is still no UI (and, as of
  this pass, no RLS path) for staff to change it.
- Today's column highlight only ever matches when the *selected* month
  is the real current month, since it compares year+month+day together.

## Part 2 — the monthly To-Do grid

- **Month selector** — dynamically generated from today's date (never
  hard-coded), defaults to the current month, and lets staff look back
  over past months without ever deleting or hiding old data.
- **Grid** — one row per task, one column per day of the selected month.
  The number of day columns is computed from the month/year (28–31,
  leap years handled), never hard-coded.
- **Checkboxes** — ticking/unticking writes straight to
  `task_completions` in Supabase immediately; there is no Save button.
  Each cell shows a brief saving indicator, and rolls back with an error
  if the write fails — it never shows a checked box that wasn't actually
  saved.
- **Today** — the current date's column is subtly tinted so staff can
  find "today" at a glance.
- **Scoping** — tasks and completions are always queried and written
  with the signed-in staff member's own id; RLS enforces this at the
  database level too, so one staff member can never see or change
  another's data.
- **Empty state** — "No tasks assigned for [Month Year]." with no fake
  placeholder tasks.
- **Responsive** — the grid scrolls horizontally on narrow screens with
  the Task column frozen in place.

### Adding test tasks

Tasks are normally created from **Admin → Tasks** once you have an Admin
login (see "Admin Task Management" below). `supabase/seed_example_tasks.sql`
is still kept as an optional shortcut for seeding a few example tasks
directly in the SQL editor — replace the placeholder staff id with a
real one from **Table Editor → profiles** first.

## 1. Create a Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
2. Once it's provisioned, open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Run the database setup

In the Supabase dashboard, open **SQL Editor** and run these files
**in order**. This list was last verified against the Part 8 (final
Admin hardening) pass — earlier revisions of this README stopped at
Staff Management, before Task Management/Staff Detail/Reports/Excel
Export existed; if you deployed from an older copy of this file,
re-check you have files 8–9 below applied too.

1. `supabase/schema.sql` — creates tables, indexes, constraints, triggers
2. `supabase/rls_policies.sql` — enables RLS and adds the staff-only
   access policies
3. `supabase/part3_hardening.sql` — column-level grants, the
   privilege-escalation trigger, and two composite indexes (see "Part 3"
   above for why each of these exists)
4. `supabase/staff_final_hardening.sql` — removes the unused delete
   right on completion history (see "Part 4" above)
5. `supabase/admin_part1_hardening.sql` — fixes the privilege-escalation
   trigger so an Admin account can actually be promoted via the SQL
   Editor (see "Admin Part 1" above)
6. `supabase/admin_dashboard_part2_hardening.sql` — adds the `is_admin()`
   helper and admin-only SELECT policies the Dashboard needs
7. `supabase/admin_staff_management_hardening.sql` — lets an admin
   change a Staff member's status from the browser and carries
   `department` through Auth-user creation (see "Admin Staff
   Management" above)
8. `supabase/admin_task_management_hardening.sql` — adds the
   `deleted_at` soft-delete column on `tasks`, the `is_staff_profile()`
   helper, and the admin insert/update policies + column grants Task
   Management needs to add/rename/reorder/soft-delete tasks
9. `supabase/admin_task_interval_hardening.sql` — adds the
   `task_interval` column on `tasks` (Daily / Weekly / Monthly /
   Quarterly / One Time, defaulting to Daily) and grants write access on
   it the same way `task_name` already works, so only an admin can set
   or change a task's interval — shown read-only next to the task name
   on the Staff dashboard
10. `supabase/admin_staff_detail_hardening.sql` — adds the admin
   insert/update policies on `task_completions` that let an admin
   check/uncheck boxes on another staff member's grid from
   `/admin/staff/:staffId`
11. `supabase/admin_reports_hardening.sql` — no schema/policy changes;
    documents why Reports needed no new SQL (it reuses the Dashboard's
    admin-scoped SELECT policies). Safe to run (a no-op) or skip.
12. `supabase/excel_export_hardening.sql` — no schema/policy changes;
    documents why Excel export needed no new SQL either, for the same
    reason. Safe to run (a no-op) or skip.
13. `supabase/urgent_tasks.sql` and `supabase/urgent_tasks_staff_remark.sql`
    — add the `urgent_tasks` table (one-off, deadline-driven tasks an
    admin assigns a staff member) and its optional `staff_remark` column.
14. `supabase/notifications.sql` — adds the `notifications` table and the
    triggers that notify a staff member when assigned an urgent task, and
    notify every admin when a staff member updates one (see
    "Notifications" above). Run this after step 13.

All are idempotent (`create if not exists`, `drop policy/trigger if
exists`, `create or replace function`), so re-running any of them is
safe — including on a database that already has an earlier part
deployed.

## 3. Create your first staff login

The `handle_new_user` trigger auto-creates a matching `profiles` row
(role `staff`, status `active`) whenever a new Auth user is created, so
you only need to create the Auth user:

1. In the Supabase dashboard, go to **Authentication → Users → Add user**.
2. Enter an email and password, and create the user.
3. Check the **Table Editor → profiles** table — a row should appear
   automatically with `role = staff` and `status = active`.
4. Optional: edit that profile row to set `full_name` and `department`.

To deactivate someone later, set their `profiles.status` to `inactive` —
the app blocks login for any non-active profile even if their Auth
credentials are still valid.

## 3b. Create your first Admin login

There's no Admin UI for this yet (Staff Management is a later phase).
After creating the Auth user as in step 3 above (which makes them
`staff`/`active` by default), promote them in the SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'the-persons-email@example.com';
```

That account can now sign in at `/login` and will land on
`/admin/dashboard` instead of `/staff/todo`.

## 4. Seed a few test tasks (optional, for Part 2)

Run `supabase/seed_example_tasks.sql` in the SQL Editor after pasting in
the staff profile id from step 3, so there's something to check off in
the grid. See "Adding test tasks" above for details.

## 5. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the two values from step 1:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

Never put a `service_role` key in `.env` or anywhere in this frontend —
only the `anon` key belongs here, and RLS is what keeps data safe.

## 6. Install and run locally

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`). You
should land on `/login`. Sign in with the staff account you created in
step 3 — you'll be redirected to `/staff/todo` and see the monthly
grid for the current month. Logging out returns you to `/login`.
Visiting `/staff/todo` while signed out redirects you back to `/login`.

## Verifying persistence (important)

1. Tick a few checkboxes in the grid.
2. Refresh the page — they should still be checked.
3. Log out, log back in — they should still be checked.
4. Open the same account in another browser (or an incognito window,
   simulating "another laptop") — they should still be checked there too.
5. In the Supabase dashboard, open **Table Editor → task_completions**
   and confirm a row exists for each ticked cell with `completed = true`.

If any of these fail, check the Troubleshooting section below.

## Troubleshooting

- **A "Configuration problem" screen instead of the login page** — your
  `.env` wasn't picked up (locally), or `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` weren't set in your Vercel project's
  Environment Variables (in production). Confirm the file is named
  exactly `.env`, is in the project root, and restart `npm run dev`
  (Vite only reads env vars at startup) — or, on Vercel, set the two
  variables and redeploy. Check the browser console for the exact
  message.
- **Login succeeds but immediately signs back out** — the profile row
  is missing or `status` isn't `active`. Check **Table Editor →
  profiles** for that user.
- **"This account is inactive"** — expected behavior for a profile
  with `status = inactive`.
- **Checkbox flips back with a red dot** — the write to
  `task_completions` failed (network issue, or RLS denied it because
  the task's `staff_id` doesn't match the signed-in user). Check the
  browser console for the Supabase error.
- **Grid says "No tasks assigned"** — there are no rows in `tasks` for
  that staff id + month + year. Run `supabase/seed_example_tasks.sql`
  or wait for the Admin Task Management phase.
- **"Add Staff" fails with a network/function error** — the
  `admin-create-staff` Edge Function isn't deployed yet. See "Deploy
  the Staff Management Edge Function" above.
- **"Admin access required" when adding staff** — the signed-in account
  isn't `role = 'admin'` and `status = 'active'` in `profiles`; the
  function checks this itself regardless of what the browser sends.
- **Editing/deactivating a Staff member silently fails** — confirm
  `supabase/admin_staff_management_hardening.sql` has been run; without
  it, the database has no write path for `status` and no
  `profiles_update_admin_staff` policy for an admin to reach another
  user's row.

## Testing checklist — Admin Staff Management

1. Sign in as an admin, go to **Staff**, click **Add Staff**, fill in
   the form, and submit — the new account should appear in the table
   immediately.
2. Confirm the new row's name/email/department/status match what you
   entered, and its "Created" date is today.
3. Sign out, sign in as the new staff account with the password you
   set — it should land on `/staff/todo` normally.
4. Back as admin, click **Edit** on that staff member, change their
   name/department, save — the table updates immediately.
5. Click **Deactivate** — a confirmation dialog appears; confirm it.
6. Sign out, try signing in as that staff account again — sign-in
   should be refused ("This account is inactive").
7. In **Table Editor → tasks / task_completions**, confirm any
   pre-existing rows for that staff id are untouched.
8. Type part of a name, email, or department into the Staff search box
   — the table should narrow to matching rows only.
9. Sign in as any (non-deactivated) staff account and confirm
   `/staff/todo` still works exactly as before, and that visiting
   `/admin/staff` directly redirects to `/login`.
10. Run `npm run build` — it should complete with no errors.

## What's next (not in this phase)

Task Management, Staff Detail, Reports, and Excel export all shipped in
later passes (see the Part 8 section near the top of this file for the
final integration/hardening review). What's still genuinely out of
scope for this project as it stands:

- Real-time (websocket) sync between two open tabs of the same user
- Deleting a Staff account or task outright (deactivate/soft-delete
  only, by design — see "Historical Data" in the Part 8 notes)
- Bulk task import/assignment across multiple staff at once
