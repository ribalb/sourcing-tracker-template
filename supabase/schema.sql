-- ============================================================
--  Sourcing tracker — base schema
--  Run this whole file once in Supabase -> SQL Editor -> New query -> Run
--  It is safe to run again later; nothing is deleted.
-- ============================================================

-- ------------------------------------------------------------
-- Secret link generator: 20 hex characters, ~80 bits of randomness.
-- Uses gen_random_uuid(), which is built into Postgres core — no
-- extension needed, and visible from any search_path.
-- ------------------------------------------------------------
create or replace function public.gen_client_token()
returns text
language sql
volatile
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
$$;

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  note       text,                                    -- private note, never shown to the client
  token      text not null unique default public.gen_client_token(),
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  description text not null,                          -- "white cotton T-shirt"
  specs       text,                                   -- size / colour / brand
  budget      numeric(12,2),                          -- what the client said they'd spend
  status      text not null default 'requested'
              check (status in ('requested','sourcing','found','bought','shipped',
                                'out_for_delivery','delivered','closed','canceled')),
  cost        numeric(12,2),                          -- PRIVATE — what you paid
  price       numeric(12,2),                          -- what the client is billed
  deposit     numeric(12,2) not null default 0,       -- what the client already paid
  note        text,                                   -- PRIVATE note
  request_photo text,                                 -- storage path: what they asked for
  found_photo   text,                                 -- storage path: what you found
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists items_client_id_idx  on public.items (client_id);
create index if not exists items_status_idx     on public.items (status);
create index if not exists items_created_at_idx on public.items (created_at desc);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_touch_updated_at on public.items;
create trigger items_touch_updated_at
  before update on public.items
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- Row Level Security
-- Nobody can read these tables without being signed in as you.
-- ------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.items   enable row level security;

drop policy if exists "owner_all_clients" on public.clients;
create policy "owner_all_clients" on public.clients
  for all to authenticated
  using (true) with check (true);

drop policy if exists "owner_all_items" on public.items;
create policy "owner_all_items" on public.items
  for all to authenticated
  using (true) with check (true);

-- ------------------------------------------------------------
-- The public client page.
--
-- This is the ONLY way an unauthenticated visitor can read anything,
-- and it hand-picks the columns it returns. `cost` and `note` are not
-- listed, so they never leave the database — the client's browser
-- cannot see your cost or profit even by inspecting the network tab.
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

  return result;   -- null when the link is wrong
end;
$$;

revoke all on function public.get_client_by_token(text) from public;
grant execute on function public.get_client_by_token(text) to anon, authenticated;

-- ------------------------------------------------------------
-- Give one client a brand new secret link (kills the old one).
-- ------------------------------------------------------------
create or replace function public.reset_client_token(p_client_id uuid)
returns text
language plpgsql
security invoker            -- runs as you, so RLS still applies
set search_path = public, pg_catalog
as $$
declare
  new_token text;
begin
  update public.clients
     set token = public.gen_client_token()
   where id = p_client_id
  returning token into new_token;

  return new_token;
end;
$$;

grant execute on function public.reset_client_token(uuid) to authenticated;
