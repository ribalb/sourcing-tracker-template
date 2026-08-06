-- ============================================================
--  The public request form grows up.
--
--  Two things:
--    1. A delivery address, asked on the form and kept on the client.
--    2. More than one item per request (request_items).
--
--  Run once in Supabase -> SQL Editor. Safe to run again.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Address
--
-- Asked once on the form, copied onto the client when you approve, then
-- reused for every later order. Editable on the client's page.
-- ------------------------------------------------------------
alter table public.clients  add column if not exists address text;
alter table public.requests add column if not exists address text;

-- ------------------------------------------------------------
-- 2. Several items in one request
--
-- The old single-item columns on `requests` stay where they are, so no
-- existing submission is lost, but nothing writes to them any more —
-- everything below reads request_items.
-- ------------------------------------------------------------
create table if not exists public.request_items (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests(id) on delete cascade,
  position    int  not null default 1,               -- the order they typed them in
  description text not null,
  specs       text,
  budget      numeric(12,2),
  photo       text,                                  -- storage path under requests/
  created_at  timestamptz not null default now()
);

create index if not exists request_items_request_id_idx
  on public.request_items (request_id, position);

-- Move every old single-item submission into the new table, once.
insert into public.request_items (request_id, position, description, specs, budget, photo)
select r.id, 1, r.description, r.specs, r.budget, r.photo
  from public.requests r
 where r.description is not null
   and not exists (select 1 from public.request_items ri where ri.request_id = r.id);

-- A request now carries its items in the child table.
alter table public.requests alter column description drop not null;

comment on column public.requests.description is
  'Superseded by request_items. Kept so old submissions keep their text.';

alter table public.request_items enable row level security;

-- Only you can read them. Submissions arrive through submit_request(),
-- which is security definer, so the public needs no insert policy here.
drop policy if exists "owner_all_request_items" on public.request_items;
create policy "owner_all_request_items" on public.request_items
  for all to authenticated
  using (true) with check (true);

-- The form no longer inserts into `requests` directly: it calls
-- submit_request(), which writes the request and all its items together.
-- A direct anon insert would walk past every check in there.
drop policy if exists "requests_public_insert" on public.requests;

-- ------------------------------------------------------------
-- 3. The one door the public form writes through
--
-- Request and items land together or not at all, photo paths are checked
-- to be inside requests/, and the list is capped. Returns {ok:false,
-- reason} rather than an error, so the form can say something in the
-- visitor's own language.
-- ------------------------------------------------------------
create or replace function public.submit_request(
  p_name    text,
  p_phone   text,
  p_address text,
  p_items   jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name     text := btrim(coalesce(p_name, ''));
  v_phone    text := nullif(btrim(coalesce(p_phone, '')), '');
  v_digits   text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_address  text := nullif(btrim(coalesce(p_address, '')), '');
  v_len      int;
  v_recent   int;
  v_req      uuid;
  v_item     jsonb;
  v_budget   text;
  v_photo    text;
  v_pos      int := 0;
begin
  if v_name = '' then
    return json_build_object('ok', false, 'reason', 'name');
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return json_build_object('ok', false, 'reason', 'items');
  end if;

  v_len := jsonb_array_length(p_items);
  if v_len < 1 or v_len > 10 then
    return json_build_object('ok', false, 'reason', 'items');
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if btrim(coalesce(v_item->>'description', '')) = '' then
      return json_build_object('ok', false, 'reason', 'items');
    end if;
  end loop;

  -- Nobody sends you five separate requests in an hour from one number.
  if length(v_digits) >= 7 then
    select count(*) into v_recent
      from public.requests
     where created_at > now() - interval '1 hour'
       and regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_digits;

    if v_recent >= 5 then
      return json_build_object('ok', false, 'reason', 'too_many');
    end if;
  end if;

  insert into public.requests (name, phone, address, status)
  values (v_name, v_phone, v_address, 'pending')
  returning id into v_req;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pos := v_pos + 1;

    v_budget := btrim(coalesce(v_item->>'budget', ''));
    v_photo  := btrim(coalesce(v_item->>'photo', ''));

    insert into public.request_items (request_id, position, description, specs, budget, photo)
    values (
      v_req,
      v_pos,
      left(btrim(v_item->>'description'), 500),
      nullif(left(btrim(coalesce(v_item->>'specs', '')), 300), ''),
      case when v_budget ~ '^\d+(\.\d+)?$' then v_budget::numeric(12,2) else null end,
      -- Anything outside requests/ is not something this form uploaded.
      case when v_photo like 'requests/%' then v_photo else null end
    );
  end loop;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.submit_request(text, text, text, jsonb) from public;
grant execute on function public.submit_request(text, text, text, jsonb) to anon, authenticated;

-- ------------------------------------------------------------
-- 4. Clean up an abandoned experiment
--
-- An earlier draft of this file added one-time-code verification by SMS.
-- It was dropped before release. These lines remove it from any database
-- that ran that draft, and do nothing anywhere else.
-- ------------------------------------------------------------
drop function if exists public.otp_issue(text, text, int);
drop function if exists public.otp_check(text, text);
drop function if exists public.otp_required();
drop table    if exists public.phone_verifications;
alter table public.settings drop column if exists require_phone_otp;
alter table public.requests drop column if exists phone_verified;
