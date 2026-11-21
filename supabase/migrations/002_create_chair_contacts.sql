-- Migration: 002_create_chair_contacts.sql
-- Create table public.chair_contacts for per-chair leader recipient configuration
create table if not exists public.chair_contacts (
  chair smallint primary key check (chair between 1 and 4),
  contact_name text,
  contact_email text not null check (char_length(trim(contact_email)) > 0),
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Ensure set_updated_at trigger function exists
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at on modification
drop trigger if exists trigger_chair_contacts_updated_at on public.chair_contacts;
create trigger trigger_chair_contacts_updated_at
  before update on public.chair_contacts
  for each row
  execute function public.set_updated_at();

-- Table-level grants: authenticated leaders and service_role can access.
-- Explicitly revoke all from anon so leader emails are never exposed publicly to browser clients.
grant usage on schema public to authenticated, service_role;
grant select, insert, update on table public.chair_contacts to authenticated;
grant all on table public.chair_contacts to service_role;
revoke all on table public.chair_contacts from anon;

-- Enable Row-Level Security (RLS)
alter table public.chair_contacts enable row level security;

-- Policies for authenticated leaders:
drop policy if exists "Allow authenticated users to read chair contacts" on public.chair_contacts;
create policy "Allow authenticated users to read chair contacts"
  on public.chair_contacts
  for select
  to authenticated
  using (auth.role() = 'authenticated');

drop policy if exists "Allow authenticated users to insert chair contacts" on public.chair_contacts;
create policy "Allow authenticated users to insert chair contacts"
  on public.chair_contacts
  for insert
  to authenticated
  with check (auth.role() = 'authenticated');

drop policy if exists "Allow authenticated users to update chair contacts" on public.chair_contacts;
create policy "Allow authenticated users to update chair contacts"
  on public.chair_contacts
  for update
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
