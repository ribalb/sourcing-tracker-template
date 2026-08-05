-- ============================================================
--  Adds the "how to pay" note shown on every client's page.
--  Run this once in Supabase -> SQL Editor, the same way as schema.sql.
--  Safe to run again.
-- ============================================================

-- A single row of app-wide settings. The `id` check keeps it to one row.
create table if not exists public.settings (
  id              boolean primary key default true check (id),
  payment_note_en text,
  payment_note_ar text,
  updated_at      timestamptz not null default now()
);

insert into public.settings (id) values (true) on conflict (id) do nothing;

alter table public.settings enable row level security;

drop policy if exists "owner_all_settings" on public.settings;
create policy "owner_all_settings" on public.settings
  for all to authenticated
  using (true) with check (true);

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at
  before update on public.settings
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- Re-create the client page function so it also returns the
-- payment note. Still hand-picked columns — no cost, no notes.
-- ------------------------------------------------------------
create or replace function public.get_client_by_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if p_token is null or length(p_token) < 8 then
    return null;
  end if;

  select json_build_object(
    'client', json_build_object(
      'name', c.name
    ),
    'payment', (
      select json_build_object('en', s.payment_note_en, 'ar', s.payment_note_ar)
      from public.settings s
      where s.id
    ),
    'items', coalesce((
      select json_agg(
        json_build_object(
          'id',          i.id,
          'description', i.description,
          'specs',       i.specs,
          'budget',      i.budget,
          'status',      i.status,
          'price',       i.price,
          'deposit',     i.deposit,
          'created_at',  i.created_at
        )
        order by i.created_at desc
      )
      from public.items i
      where i.client_id = c.id
    ), '[]'::json)
  )
  into result
  from public.clients c
  where c.token = p_token;

  return result;
end;
$$;

revoke all on function public.get_client_by_token(text) from public;
grant execute on function public.get_client_by_token(text) to anon, authenticated;
