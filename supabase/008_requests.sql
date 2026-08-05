-- ============================================================
--  Public request form.
--
--  A link you can put in your Instagram bio. Anyone can submit a
--  request; nothing becomes a client or an order until you approve it.
--
--  Run once in Supabase -> SQL Editor. Safe to run again.
-- ============================================================

create table if not exists public.requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  description text not null,
  specs       text,
  budget      numeric(12,2),
  photo       text,                                   -- storage path under requests/
  status      text not null default 'pending'
              check (status in ('pending','approved','rejected')),
  client_id   uuid references public.clients(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists requests_status_idx on public.requests (status, created_at desc);

alter table public.requests enable row level security;

-- Anyone may submit, but only as a pending row.
drop policy if exists "requests_public_insert" on public.requests;
create policy "requests_public_insert" on public.requests
  for insert to anon, authenticated
  with check (status = 'pending');

-- Only you may read them. A stranger cannot list other people's requests.
drop policy if exists "requests_owner_select" on public.requests;
create policy "requests_owner_select" on public.requests
  for select to authenticated using (true);

drop policy if exists "requests_owner_update" on public.requests;
create policy "requests_owner_update" on public.requests
  for update to authenticated using (true) with check (true);

drop policy if exists "requests_owner_delete" on public.requests;
create policy "requests_owner_delete" on public.requests
  for delete to authenticated using (true);

-- ------------------------------------------------------------
-- Let the public form attach a photo, but only inside requests/.
-- Everything else in the bucket stays writable by you alone, and the
-- bucket's own size and mime-type limits still apply.
-- ------------------------------------------------------------
drop policy if exists "item_photos_public_insert" on storage.objects;
create policy "item_photos_public_insert" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = 'requests'
  );
