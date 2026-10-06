-- ============================================================
-- Phase 3 — Supabase PostgreSQL Schema for QR-ATT
--
-- This file replaces the local SQLite schema with a cloud schema.
-- It mirrors the original `events` and `attendance` tables but
-- integrates with Supabase Auth (auth.users) and adds Row Level
-- Security so each user can only see their own data.
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard -> SQL Editor
--   2. Paste the ENTIRE file
--   3. Click "Run"
--   4. Verify the tables appear under Table Editor
--
-- This script is IDEMPOTENT: it can be run multiple times safely.
--
-- IMPORTANT: All three tables are created FIRST, then the policies.
-- (Policies reference each other's tables, so creating a policy
-- before its referenced table exists fails with 42P01.)
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLES (create all three before any policy)
-- ------------------------------------------------------------

-- Profiles: per-user profile that references Supabase Auth.
-- Created automatically for each new signed-up user.
<<<<<<< HEAD
=======
-- Roles: student | teacher | admin (admin assigned manually via SQL).
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
<<<<<<< HEAD
  role text not null default 'student' check (role in ('student', 'teacher')),
=======
  student_id text,
  course text,
  year_section text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Events: an attendance event (mirrors SQLite `events`).
-- `event_code` is the public identifier embedded in the QR code.
<<<<<<< HEAD
=======
-- status: 'open' accepts scans, 'closed' rejects scans.
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title text not null,
<<<<<<< HEAD
  start_time timestamptz,
  end_time timestamptz,
=======
  description text,
  venue text,
  status text not null default 'open' check (status in ('open', 'closed')),
  start_time timestamptz,
  end_time timestamptz,
  qr_secret text,
  late_after_minutes integer not null default 15,
  latitude double precision,
  longitude double precision,
  radius_meters integer not null default 0,
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

<<<<<<< HEAD
-- Attendance: one student scanning one event.
-- `student_id` references the auth user, `event_id` references events.
-- Mirrors SQLite `attendance` table and its UNIQUE constraint.
=======
-- Backfill columns when re-running on an existing database.
alter table public.profiles add column if not exists student_id text;
alter table public.profiles add column if not exists course text;
alter table public.profiles add column if not exists year_section text;
alter table public.events add column if not exists qr_secret text;
alter table public.events add column if not exists late_after_minutes integer not null default 15;
alter table public.events add column if not exists latitude double precision;
alter table public.events add column if not exists longitude double precision;
alter table public.events add column if not exists radius_meters integer not null default 0;
alter table public.events add column if not exists venue text;
alter table public.events add column if not exists status text not null default 'open';

-- Attendance: one student scanning one event.
-- `student_id` references the auth user, `event_id` references events.
-- Mirrors SQLite `attendance` table and its UNIQUE constraint.
-- status: 'present' by default; 'late' when past grace period; admin may correct to 'absent'/'excused'.
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
<<<<<<< HEAD
=======
  status text not null default 'present' check (status in ('present', 'late', 'absent', 'excused')),
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  scanned_at timestamptz not null default now(),
  unique (student_id, event_id)
);

<<<<<<< HEAD
=======
alter table public.attendance add column if not exists status text not null default 'present';

>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
-- ------------------------------------------------------------
-- 2. ROW LEVEL SECURITY + POLICIES (after all tables exist)
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;

<<<<<<< HEAD
=======
-- Migrate old check constraint so 'admin' role is accepted on
-- databases created before this update.
do $$
begin
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles
    add constraint profiles_role_check check (role in ('student', 'teacher', 'admin'));
  alter table public.events drop constraint if exists events_status_check;
  alter table public.events
    add constraint events_status_check check (status in ('open', 'closed'));
  alter table public.attendance drop constraint if exists attendance_status_check;
  alter table public.attendance
    add constraint attendance_status_check check (status in ('present', 'late', 'absent', 'excused'));
exception when others then null;
end $$;

-- Helper: true when the calling user is an admin.
-- SECURITY DEFINER so it can read profiles under RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
-- Profiles policies
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Teachers can read the profiles of students who attended their events
-- (needed to show attendee names in the teacher's History view).
drop policy if exists "Teachers can view profiles of their attendees" on public.profiles;
create policy "Teachers can view profiles of their attendees"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.attendance a
      join public.events e on e.id = a.event_id
      where a.student_id = profiles.id
        and e.created_by = auth.uid()
    )
  );

<<<<<<< HEAD
=======
-- Admins can view every profile (user management).
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Admins can update any profile (e.g. role changes, corrections).
drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());

>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
-- Events policies
-- Any signed-in user can read event details (needed to validate QR codes)
drop policy if exists "Events are readable by any authenticated user" on public.events;
create policy "Events are readable by any authenticated user"
  on public.events for select
  using (auth.role() = 'authenticated');

-- Only the creator can insert / update their events
drop policy if exists "Users can insert events" on public.events;
create policy "Users can insert events"
  on public.events for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Users can update their own events" on public.events;
create policy "Users can update their own events"
  on public.events for update
<<<<<<< HEAD
=======
  using (auth.uid() = created_by or public.is_admin());

-- Admins can delete any event (event management).
drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events for delete
  using (public.is_admin());

drop policy if exists "Creators can delete their own events" on public.events;
create policy "Creators can delete their own events"
  on public.events for delete
>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
  using (auth.uid() = created_by);

-- Attendance policies
-- Students can only view / insert their own attendance
drop policy if exists "Students can view their own attendance" on public.attendance;
create policy "Students can view their own attendance"
  on public.attendance for select
  using (auth.uid() = student_id);

drop policy if exists "Students can insert their own attendance" on public.attendance;
create policy "Students can insert their own attendance"
  on public.attendance for insert
  with check (auth.uid() = student_id);

-- Teachers can view attendance for events they created
drop policy if exists "Teachers can view attendance for their events" on public.attendance;
create policy "Teachers can view attendance for their events"
  on public.attendance for select
  using (
    exists (
      select 1 from public.events e
      where e.id = attendance.event_id
        and e.created_by = auth.uid()
    )
  );

<<<<<<< HEAD
=======
-- Admins: full attendance visibility + correction (update/delete).
drop policy if exists "Admins can view all attendance" on public.attendance;
create policy "Admins can view all attendance"
  on public.attendance for select
  using (public.is_admin());

drop policy if exists "Admins can update all attendance" on public.attendance;
create policy "Admins can update all attendance"
  on public.attendance for update
  using (public.is_admin());

drop policy if exists "Admins can delete attendance" on public.attendance;
create policy "Admins can delete attendance"
  on public.attendance for delete
  using (public.is_admin());

>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
-- ------------------------------------------------------------
-- 3. AUTO-PROFILE TRIGGER (after profiles table exists)
-- Automatically create a profile after a user signs up
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

<<<<<<< HEAD
=======
-- ------------------------------------------------------------
-- 4. PROMOTE AN ADMIN (run manually after a user registers):
--    update public.profiles set role = 'admin' where email = 'you@school.edu';
-- ------------------------------------------------------------

>>>>>>> 60502c09d579e3137f719182ab7702bcdf3016e0
------------------------------------------------------------
-- END OF SCHEMA
------------------------------------------------------------
