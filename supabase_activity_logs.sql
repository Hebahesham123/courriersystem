-- Run this in your Supabase SQL editor to create the activity_logs table.
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_name text,
  user_email text,
  user_role text,
  action text not null,
  entity_type text,
  entity_id text,
  entity_label text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_user_id_idx on public.activity_logs (user_id);
create index if not exists activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);

-- Disable RLS so inserts and selects always work for the app's anon/auth keys.
-- Re-enable later with a proper policy once logging is verified end-to-end.
alter table public.activity_logs disable row level security;

drop policy if exists activity_logs_insert on public.activity_logs;
drop policy if exists activity_logs_select_admin on public.activity_logs;
drop policy if exists activity_logs_select_all on public.activity_logs;

-- ----------------------------------------------------------------------------
-- Drop the auto-audit trigger; logging is now driven from the application
-- (src/lib/activityLogger.ts) which always has a logged-in user available.
-- ----------------------------------------------------------------------------
drop trigger if exists orders_audit_trigger on public.orders;
drop function if exists public.log_order_changes() cascade;
-- (last_modified_by column is harmless to keep; not removing it.)

notify pgrst, 'reload schema';

-- One-time cleanup: remove all the older trigger-generated rows that lack a
-- user_id, so the activity log starts fresh with the JS-side, user-aware
-- entries only.
delete from public.activity_logs where user_id is null;
