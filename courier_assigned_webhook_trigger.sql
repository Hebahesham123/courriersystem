-- ============================================================================
-- Courier-assigned notification — database trigger (fires from ANY place)
-- Run this once in your Supabase SQL editor (main project).
--
-- This replaces the per-screen frontend calls: no matter WHERE an order gets
-- assigned to a courier (orders list, order popup, calendar, receive/exchange,
-- bulk assign, a future screen, or even a manual DB edit), Postgres itself POSTs
-- to the n8n webhook. The HTTP call is async (pg_net) so it never blocks or slows
-- the assignment.
-- ============================================================================

-- 1) Enable pg_net (Supabase's async HTTP client). Safe to run repeatedly.
create extension if not exists pg_net;

-- 2) The notifier function.
create or replace function public.notify_courier_assigned()
returns trigger
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  v_courier_name text;
  v_order_number text;
  v_phone        text;
  v_message      text;
begin
  -- Only fire when the order is actually assigned to a courier now.
  if NEW.assigned_courier_id is null then
    return NEW;
  end if;
  if coalesce(NEW.status, '') <> 'assigned' then
    return NEW;
  end if;
  -- On UPDATE, only when the courier actually changed (skip unrelated edits and
  -- the constant re-writes the Shopify sync does).
  if TG_OP = 'UPDATE'
     and NEW.assigned_courier_id is not distinct from OLD.assigned_courier_id then
    return NEW;
  end if;

  select name into v_courier_name from public.users where id = NEW.assigned_courier_id;
  v_courier_name := coalesce(nullif(trim(v_courier_name), ''), 'المندوب');

  v_order_number := coalesce(NEW.order_id, NEW.id::text);
  v_phone        := coalesce(NEW.mobile_number, NEW.customer_phone);

  v_message :=
    'عميلنا العزيز 👋' || chr(10) ||
    'تم إسناد طلبك رقم #' || v_order_number ||
    ' إلى المندوب ' || v_courier_name ||
    ' للتوصيل، وسيتواصل معك قريبًا لتحديد الموعد المناسب.' || chr(10) ||
    'شكرًا لثقتك بنا 💚';

  perform net.http_post(
    url     := 'https://n8n.srv1155688.hstgr.cloud/webhook/courier-assigned',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'event',         'courier-assigned',
      'order_number',  v_order_number,
      'courier_name',  v_courier_name,
      'customer_name', NEW.customer_name,
      'customer_phone', v_phone,
      'message',       v_message
    )
  );

  return NEW;
end;
$$;

-- 3) The trigger. Fires only when assigned_courier_id or status change (cheap),
--    and on new rows that arrive already assigned (e.g. date-suffixed copies).
drop trigger if exists trg_notify_courier_assigned on public.orders;
create trigger trg_notify_courier_assigned
  after insert or update of assigned_courier_id, status on public.orders
  for each row
  execute function public.notify_courier_assigned();

-- ----------------------------------------------------------------------------
-- Quick test (optional): re-assign one real order to the same courier won't fire
-- (courier unchanged). To test, assign an order to a courier in the app, then:
--   select * from net._http_response order by created desc limit 5;
-- You should see a 200 response from the n8n webhook.
-- ----------------------------------------------------------------------------
