-- Migration: 004_participant_chair_tracking.sql
-- Adds:
--   1. public.admin_users table + public.is_admin() security-definer function
--   2. Tightens existing write policies on chair_links and chair_contacts to is_admin()
--   3. public.participant_chair_states table with RLS
-- ============================================================

-- ============================================================
-- 1. Admin table and helper function
-- ============================================================

-- Stores the set of Supabase auth.users who hold admin privileges.
-- Only service_role (backend / Supabase migrations) may manage this table;
-- no authenticated user can promote themselves.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Revoke everything from public roles so the table itself is never directly
-- visible through PostgREST to ordinary clients.
revoke all on table public.admin_users from anon, authenticated;
grant all on table public.admin_users to service_role;

-- Enable RLS for defense-in-depth (service_role bypasses RLS by default in
-- Supabase, but explicit policy prevents accidents if that ever changes).
alter table public.admin_users enable row level security;

-- No policies for anon/authenticated — the table is fully locked down to service_role.

-- Security-definer function so it always runs as the table owner (postgres),
-- not as the calling user. This means RLS on admin_users cannot be bypassed
-- by the caller, and the caller never gains direct table access.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- Grant execute to authenticated so they can call it in policy checks.
-- anon users will always get false (auth.uid() is null for anon).
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

-- ============================================================
-- 2. Tighten existing policies on chair_links
--    Replace auth.role() = 'authenticated' gates with is_admin()
-- ============================================================

-- SELECT: active links are public (anon + authenticated);
--         inactive links are admin-only.
drop policy if exists "Allow read access for active links or authenticated users" on public.chair_links;
create policy "Public read active; admin read all chair links"
  on public.chair_links
  for select
  using (
    is_active = true
    or public.is_admin()
  );

-- INSERT: admin only
drop policy if exists "Allow authenticated users to insert chair links" on public.chair_links;
create policy "Admin insert chair links"
  on public.chair_links
  for insert
  to authenticated
  with check (public.is_admin());

-- UPDATE: admin only
drop policy if exists "Allow authenticated users to update chair links" on public.chair_links;
create policy "Admin update chair links"
  on public.chair_links
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- DELETE: admin only
drop policy if exists "Allow authenticated users to delete chair links" on public.chair_links;
create policy "Admin delete chair links"
  on public.chair_links
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- 3. Tighten existing policies on chair_contacts
--    chair_contacts should be admin-only (leader emails must not
--    be accessible to regular signed-in participants).
-- ============================================================

drop policy if exists "Allow authenticated users to read chair contacts" on public.chair_contacts;
create policy "Admin read chair contacts"
  on public.chair_contacts
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Allow authenticated users to insert chair contacts" on public.chair_contacts;
create policy "Admin insert chair contacts"
  on public.chair_contacts
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Allow authenticated users to update chair contacts" on public.chair_contacts;
create policy "Admin update chair contacts"
  on public.chair_contacts
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 4. participant_chair_states table
-- ============================================================

create table if not exists public.participant_chair_states (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  email                   text not null,
  display_name            text,
  -- Nullable until the participant completes their first assessment.
  current_chair           smallint check (current_chair between 1 and 4),
  current_chair_updated_at timestamptz,
  -- Per-chair timestamps (null until a participant has visited that chair).
  chair_1_last_at         timestamptz,
  chair_2_last_at         timestamptz,
  chair_3_last_at         timestamptz,
  chair_4_last_at         timestamptz,
  -- Serialised AssessmentProgress for cross-device mid-assessment sync.
  in_progress_state       jsonb,
  updated_at              timestamptz not null default now()
);

-- Keep email in sync automatically (optional convenience index).
create index if not exists idx_participant_chair_states_email
  on public.participant_chair_states (email);

-- Reuse the existing set_updated_at trigger function (defined in migration 001).
-- Guard with drop/create so this migration is idempotent.
drop trigger if exists trigger_participant_chair_states_updated_at on public.participant_chair_states;
create trigger trigger_participant_chair_states_updated_at
  before update on public.participant_chair_states
  for each row
  execute function public.set_updated_at();

-- Table-level grants:
--   anon            — none (unauthenticated users have no account to track)
--   authenticated   — their own rows only (enforced by RLS below)
--   service_role    — full access for server-side operations
revoke all on table public.participant_chair_states from anon;
grant select, insert, update on table public.participant_chair_states to authenticated;
grant all on table public.participant_chair_states to service_role;

-- Enable RLS
alter table public.participant_chair_states enable row level security;

-- Policy: participants can read/write only their own row.
create policy "Participants manage own state"
  on public.participant_chair_states
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: admins can read all rows (leadership roster view).
create policy "Admins read all participant states"
  on public.participant_chair_states
  for select
  to authenticated
  using (public.is_admin());
