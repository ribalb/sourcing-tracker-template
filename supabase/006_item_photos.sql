-- ============================================================
--  Photos on items.
--
--    request_photo — the picture the client sent you
--    found_photo   — the picture you take of what you found,
--                    which appears on the client's page
--
--  Run once in Supabase -> SQL Editor. Safe to run again.
-- ============================================================

alter table public.items
  add column if not exists request_photo text,   -- storage path, not a URL
  add column if not exists found_photo   text;

-- ------------------------------------------------------------
-- Storage bucket.
--
-- Read is public, because the client's page has no login and must be able
-- to display the image. Safety comes from the filename: every photo is
-- stored under a random UUID, so a URL cannot be guessed, only received.
-- Writing is restricted to you.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-photos',
  'item-photos',
  true,
  8388608,                                        -- 8 MB per file
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "item_photos_public_read"   on storage.objects;
drop policy if exists "item_photos_owner_insert"  on storage.objects;
drop policy if exists "item_photos_owner_update"  on storage.objects;
drop policy if exists "item_photos_owner_delete"  on storage.objects;

create policy "item_photos_public_read" on storage.objects
  for select using (bucket_id = 'item-photos');

create policy "item_photos_owner_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'item-photos');

create policy "item_photos_owner_update" on storage.objects
  for update to authenticated using (bucket_id = 'item-photos');

create policy "item_photos_owner_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'item-photos');

-- ------------------------------------------------------------
-- Client page function, now returning the two photo paths.
-- Still no cost, still no private note.
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
      select json_build_object(
        'en',           s.payment_note_en,
        'ar',           s.payment_note_ar,
        'method',       s.pay_method,
        'account',      s.pay_account,
        'account_name', s.pay_account_name,
        'whatsapp',     s.owner_whatsapp
      )
      from public.settings s
      where s.id
    ),
    'items', coalesce((
      select json_agg(
        json_build_object(
          'id',            i.id,
          'description',   i.description,
          'specs',         i.specs,
          'budget',        i.budget,
          'status',        i.status,
          'price',         i.price,
          'deposit',       i.deposit,
          'request_photo', i.request_photo,
          'found_photo',   i.found_photo,
          'created_at',    i.created_at
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
