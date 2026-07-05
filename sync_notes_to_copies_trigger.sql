-- ============================================================================
-- Keep courier copies' notes in sync with the base (Shopify) order
-- Run once in Supabase SQL editor. Safe to re-run.
--
-- Why: couriers see date-suffixed COPIES of orders (e.g. #49231-05, base_order_id
-- set). The Shopify sync only updates BASE orders (base_order_id IS NULL), so when
-- a note is edited/DELETED in Shopify the base clears but the courier's copy keeps
-- the old note. This trigger propagates note changes from a base order to all of
-- its copies, so deletions and edits reach the courier.
-- ============================================================================

create or replace function public.propagate_shopify_notes_to_copies()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only base orders drive their copies, and only when a note field changed.
  if NEW.base_order_id is null and (
        NEW.order_note    is distinct from OLD.order_note
     or NEW.customer_note is distinct from OLD.customer_note
     or NEW.notes         is distinct from OLD.notes
  ) then
    update public.orders
       set order_note    = NEW.order_note,
           customer_note = NEW.customer_note,
           notes         = NEW.notes
     where base_order_id = NEW.id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_propagate_notes_to_copies on public.orders;
create trigger trg_propagate_notes_to_copies
  after update of order_note, customer_note, notes on public.orders
  for each row
  execute function public.propagate_shopify_notes_to_copies();

-- ----------------------------------------------------------------------------
-- One-time backfill: push each base order's current notes onto its copies, so
-- already-stale copies are corrected immediately (not only on the next change).
-- ----------------------------------------------------------------------------
update public.orders c
   set order_note    = b.order_note,
       customer_note = b.customer_note,
       notes         = b.notes
  from public.orders b
 where c.base_order_id = b.id;
