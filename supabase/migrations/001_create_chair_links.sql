-- Migration: 001_create_chair_links.sql
-- Create table public.chair_links
create table public.chair_links (
  id uuid primary key default gen_random_uuid(),
  chair smallint not null check (chair between 1 and 4),
  category text not null check (category in ('group', 'resource')),
  title text not null check (char_length(trim(title)) > 0),
  description text not null check (char_length(trim(description)) > 0),
  url text not null check (url ~* '^https?://'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Index for ordering chair links by chair, category, and sort_order
create index idx_chair_links_chair_category_sort
  on public.chair_links (chair, category, sort_order);

-- Automatic updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to execute set_updated_at before each row update
create trigger trigger_chair_links_updated_at
  before update on public.chair_links
  for each row
  execute function public.set_updated_at();

-- Enable Row-Level Security (RLS)
alter table public.chair_links enable row level security;

-- Policies:
-- 1. Public read (anon, authenticated): select active rows; authenticated admins can select all rows (including inactive ones)
create policy "Allow read access for active links or authenticated users"
  on public.chair_links
  for select
  using (
    is_active = true
    or auth.role() = 'authenticated'
  );

-- 2. Admin write (authenticated): insert restricted to authenticated users
create policy "Allow authenticated users to insert chair links"
  on public.chair_links
  for insert
  to authenticated
  with check (auth.role() = 'authenticated');

-- 3. Admin write (authenticated): update restricted to authenticated users
create policy "Allow authenticated users to update chair links"
  on public.chair_links
  for update
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 4. Admin write (authenticated): delete restricted to authenticated users
create policy "Allow authenticated users to delete chair links"
  on public.chair_links
  for delete
  to authenticated
  using (auth.role() = 'authenticated');
