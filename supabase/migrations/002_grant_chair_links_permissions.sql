-- Migration: 002_grant_chair_links_permissions.sql
-- Run this if you already created chair_links and received:
-- "Failed to fetch chair links: permission denied for table chair_links"

grant usage on schema public to anon, authenticated;

grant select on table public.chair_links to anon;
grant select, insert, update, delete on table public.chair_links to authenticated;
grant all on table public.chair_links to service_role;
