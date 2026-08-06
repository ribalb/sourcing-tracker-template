-- ============================================================
--  DEMO DATA — invented clients and orders.
--
--  Run this ONLY on a demo database. It is here so a prospect sees a
--  business that has been running for months instead of an empty app.
--
--  Everything below is fictional. Never run it on a real client's
--  project: the delete at the top wipes the tables.
--
--  Run after schema.sql and 002–009, in Supabase -> SQL Editor.
--  Running it again resets the demo to this exact state.
-- ============================================================

-- Reset, so a demo can be re-run after someone has clicked around.
delete from public.requests;
delete from public.items;
delete from public.clients;

-- ------------------------------------------------------------
-- Clients
-- ------------------------------------------------------------
insert into public.clients (id, name, phone, address, note, created_at) values
  ('11111111-1111-4111-8111-111111111101', 'Maya Khoury',    '+961 71 204 118', E'Achrafieh, Rue Sursock\nImm. Beit Nassar, 4th floor',      'Prefers neutral colours. Always in a hurry.', now() - interval '94 days'),
  ('11111111-1111-4111-8111-111111111102', 'Lea Chalhoub',   '+961 3 442 907',  E'Hamra, Rue Jeanne d\'Arc\nImm. Zeidan, 2nd floor, left',   'Repeat client, pays on delivery.',            now() - interval '77 days'),
  ('11111111-1111-4111-8111-111111111103', 'Nour Abou Zeid', '+961 76 615 330', E'Jounieh, Ghadir\nImm. Saade, 3rd floor',                   null,                                          now() - interval '61 days'),
  ('11111111-1111-4111-8111-111111111104', 'Rita Semaan',    '+961 70 883 214', E'Mar Mikhael, Rue d\'Arménie\nAbove the flower shop',       'Size 38. Sensitive to wool.',                 now() - interval '44 days'),
  ('11111111-1111-4111-8111-111111111105', 'Yara Fakhoury',  '+961 81 190 655', E'Baabda, Rue Brazilia\nVilla 12',                           null,                                          now() - interval '30 days'),
  ('11111111-1111-4111-8111-111111111106', 'Dana Mroueh',    '+961 71 771 042', E'Verdun, Rue Rachid Karameh\nImm. Chams, 6th floor',        'Found through Instagram, first order.',        now() - interval '18 days'),
  ('11111111-1111-4111-8111-111111111107', 'Joelle Rizk',    '+961 3 928 471',  null,                                                        null,                                          now() - interval '9 days'),
  ('11111111-1111-4111-8111-111111111108', 'Sara Haddad',    '+961 78 336 509', E'Antelias, main road\nImm. Khalil, 1st floor',              'Asked about payment by instalments.',          now() - interval '4 days');

-- ------------------------------------------------------------
-- Items
--
-- Spread across every status and several months, so the dashboard,
-- the reports and the History sections all have something to show.
-- ------------------------------------------------------------
insert into public.items
  (client_id, description, specs, budget, status, cost, price, deposit, note, created_at) values

  -- Maya: a finished, closed order plus one live request
  ('11111111-1111-4111-8111-111111111101', 'Wool coat, camel',        'Size S, mid-length', 400, 'closed',    285, 460, 460, null,                         now() - interval '92 days'),
  ('11111111-1111-4111-8111-111111111101', 'Silk scarf',              '90x90, cream',       120, 'closed',     68, 135, 135, null,                         now() - interval '90 days'),
  ('11111111-1111-4111-8111-111111111101', 'Leather ankle boots',     'Size 37, black',     300, 'sourcing',  null, null,   0, 'Check the Marais shops.',   now() - interval '11 days'),

  -- Lea: mid-flight, partly paid
  ('11111111-1111-4111-8111-111111111102', 'Quilted jacket',          'Size M, navy',       350, 'shipped',   240, 395, 200, null,                         now() - interval '26 days'),
  ('11111111-1111-4111-8111-111111111102', 'Cashmere jumper',         'Size M, grey',       220, 'delivered', 140, 245, 245, null,                         now() - interval '40 days'),
  ('11111111-1111-4111-8111-111111111102', 'Canvas tote',             'Natural',             90, 'bought',     52,  98,   0, null,                         now() - interval '8 days'),

  -- Nour: one cancelled with a deposit already taken (shows the credit case)
  ('11111111-1111-4111-8111-111111111103', 'Loafers',                 'Size 40, brown',     250, 'canceled',  null, 265,  80, 'Out of stock everywhere.',  now() - interval '35 days'),
  ('11111111-1111-4111-8111-111111111103', 'Linen shirt',             'Size L, white',      130, 'delivered',  74, 145, 145, null,                         now() - interval '33 days'),

  -- Rita
  ('11111111-1111-4111-8111-111111111104', 'Pleated midi skirt',      'Size 38, black',     190, 'found',     118, 205,   0, 'Two colours available.',     now() - interval '6 days'),
  ('11111111-1111-4111-8111-111111111104', 'Cotton blazer',           'Size 38, ecru',      300, 'requested', null, null,   0, null,                        now() - interval '5 days'),

  -- Yara
  ('11111111-1111-4111-8111-111111111105', 'Running trainers',        'Size 39, white',     160, 'out_for_delivery', 96, 175, 100, null,                   now() - interval '14 days'),
  ('11111111-1111-4111-8111-111111111105', 'Crossbody bag',           'Small, tan',         280, 'closed',    165, 310, 310, null,                         now() - interval '58 days'),

  -- Dana: first order, still early
  ('11111111-1111-4111-8111-111111111106', 'Oversized denim jacket',  'Size M, light wash', 180, 'sourcing',  null, null,   0, null,                        now() - interval '15 days'),
  ('11111111-1111-4111-8111-111111111106', 'Gold hoop earrings',      'Medium',              90, 'requested', null, null,   0, null,                        now() - interval '15 days'),

  -- Joelle
  ('11111111-1111-4111-8111-111111111107', 'Trench coat',             'Size S, beige',      420, 'bought',    268, 455, 200, 'Bought at the outlet.',       now() - interval '7 days'),
  ('11111111-1111-4111-8111-111111111107', 'Silk slip dress',         'Size S, black',      240, 'requested', null, null,   0, null,                        now() - interval '3 days'),

  -- Sara: newest, nothing priced yet
  ('11111111-1111-4111-8111-111111111108', 'Chunky knit cardigan',    'Size M, oatmeal',    170, 'requested', null, null,   0, null,                        now() - interval '4 days'),
  ('11111111-1111-4111-8111-111111111108', 'Ballet flats',            'Size 39, black',     150, 'sourcing',  null, null,   0, null,                        now() - interval '2 days'),

  -- Older closed business, so the dashboard has history to filter
  ('11111111-1111-4111-8111-111111111102', 'Puffer vest',             'Size M, black',      200, 'closed',    128, 225, 225, null,                         now() - interval '70 days'),
  ('11111111-1111-4111-8111-111111111104', 'Leather belt',            '80cm, cognac',        70, 'closed',     34,  85,  85, null,                         now() - interval '52 days');

-- ------------------------------------------------------------
-- Two of the above were bought abroad rather than in dollars, so the
-- cost field shows what it does on a real buying trip. `cost` itself is
-- already the dollar figure; these columns only record what was handed
-- over, which is what the item card shows underneath.
-- ------------------------------------------------------------
update public.items
   set cost_currency = 'EUR', cost_original = 264.00, cost_rate = 1.080000
 where description = 'Wool coat, camel';               -- cost 285 = 264 EUR

update public.items
   set cost_currency = 'SAR', cost_original = 360.00, cost_rate = 0.266700
 where description = 'Crossbody bag';                  -- cost 165 ≈ 360 SAR

-- ------------------------------------------------------------
-- Two requests waiting in the inbox, so the badge shows "2"
-- and the approval flow can be demonstrated live.
--
-- Carla asks for one thing; Maya asks for three at once, which is what
-- the inbox looks like when someone sends a whole list from Instagram.
-- ------------------------------------------------------------
insert into public.requests (id, name, phone, address, status, created_at) values
  ('22222222-2222-4222-8222-222222222201', 'Carla Nassar', '+961 71 448 902',
   E'Badaro, Rue de l\'Église\nImm. Rizk, 5th floor', 'pending', now() - interval '2 days'),
  ('22222222-2222-4222-8222-222222222202', 'Maya Khoury',  '+961 71 204 118',
   E'Achrafieh, Rue Sursock\nImm. Beit Nassar, 4th floor', 'pending', now() - interval '6 hours');

insert into public.request_items (request_id, position, description, specs, budget) values
  ('22222222-2222-4222-8222-222222222201', 1, 'Black leather shoulder bag, structured, not too big', 'Medium, gold hardware',   320),
  ('22222222-2222-4222-8222-222222222202', 1, 'Striped cotton shirt for summer',                     'Size S, blue and white',  110),
  ('22222222-2222-4222-8222-222222222202', 2, 'Wide-leg linen trousers',                             'Size S, sand',            140),
  ('22222222-2222-4222-8222-222222222202', 3, 'Flat leather sandals',                                'Size 37, tan',             95);

-- The second one deliberately reuses Maya's number, so the demo can show
-- the app spotting an existing client instead of creating a duplicate.
