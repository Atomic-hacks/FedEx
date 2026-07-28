-- One-time migration for projects that ran an earlier version of schema.sql.
-- This project intentionally uses a hidden /admin route with no authentication,
-- so the requested setup does not use Supabase RLS policies.
alter table if exists public.admins disable row level security;
alter table if exists public.shipments disable row level security;
alter table if exists public.shipment_items disable row level security;
alter table if exists public.tracking_events disable row level security;
alter table if exists public.conversations disable row level security;
alter table if exists public.messages disable row level security;
