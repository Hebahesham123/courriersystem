-- ============================================================================
-- Courier Route Map feature — database setup
-- Run this once in your Supabase SQL editor (main project).
--
-- Creates:
--   1) courier_routes  — one saved daily route per courier (order + done state)
--   2) geocode_cache   — shared address -> lat/lng cache (so we geocode once)
-- Nothing in the existing `orders` table is changed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) courier_routes : persists a courier's optimized/edited route for a day
-- ----------------------------------------------------------------------------
create table if not exists public.courier_routes (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null,
  route_date date not null,
  -- ordered array of stops:
  -- [{ "order_id": "1234", "lat": 30.1, "lng": 31.3,
  --    "done": false, "done_at": null, "manual": false }]
  stops jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (courier_id, route_date)
);

create index if not exists idx_courier_routes_courier_date
  on public.courier_routes (courier_id, route_date);

alter table public.courier_routes enable row level security;

-- A courier can read & write only their own route rows.
drop policy if exists "courier_routes_select_own" on public.courier_routes;
create policy "courier_routes_select_own"
  on public.courier_routes for select
  using (auth.uid() = courier_id);

drop policy if exists "courier_routes_insert_own" on public.courier_routes;
create policy "courier_routes_insert_own"
  on public.courier_routes for insert
  with check (auth.uid() = courier_id);

drop policy if exists "courier_routes_update_own" on public.courier_routes;
create policy "courier_routes_update_own"
  on public.courier_routes for update
  using (auth.uid() = courier_id)
  with check (auth.uid() = courier_id);

drop policy if exists "courier_routes_delete_own" on public.courier_routes;
create policy "courier_routes_delete_own"
  on public.courier_routes for delete
  using (auth.uid() = courier_id);

-- Optional: let admins read every route (mirrors how other admin views work).
-- Comment this out if you do not have a public.users table with a role column.
drop policy if exists "courier_routes_admin_read" on public.courier_routes;
create policy "courier_routes_admin_read"
  on public.courier_routes for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- 2) geocode_cache : address text -> coordinates, shared by all couriers
-- ----------------------------------------------------------------------------
create table if not exists public.geocode_cache (
  address_key text primary key,          -- normalized (lowercased/trimmed) address
  lat double precision,
  lng double precision,
  display_name text,                     -- human label returned by the geocoder
  source text,                           -- 'nominatim' | 'delivery_location' | 'manual'
  created_at timestamptz not null default now()
);

alter table public.geocode_cache enable row level security;

-- Any authenticated user (couriers/admins) may read & fill the shared cache.
drop policy if exists "geocode_cache_read_all" on public.geocode_cache;
create policy "geocode_cache_read_all"
  on public.geocode_cache for select
  using (auth.role() = 'authenticated');

drop policy if exists "geocode_cache_insert_all" on public.geocode_cache;
create policy "geocode_cache_insert_all"
  on public.geocode_cache for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "geocode_cache_update_all" on public.geocode_cache;
create policy "geocode_cache_update_all"
  on public.geocode_cache for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
