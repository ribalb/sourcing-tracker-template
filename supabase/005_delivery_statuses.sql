-- ============================================================
--  Adds two steps to the end of the status pipeline:
--
--    Requested → Sourcing → Found → Bought → Shipped
--              → Out for delivery → Delivered        (or Canceled)
--
--  Run once in Supabase -> SQL Editor. Safe to run again.
--  Existing items keep whatever status they already have.
-- ============================================================

alter table public.items drop constraint if exists items_status_check;

alter table public.items add constraint items_status_check
  check (status in (
    'requested',
    'sourcing',
    'found',
    'bought',
    'shipped',
    'out_for_delivery',
    'delivered',
    'canceled'
  ));
