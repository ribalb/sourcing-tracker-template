# Sourcing tracker — build template

This is a **product template**, not a live business. It is a rebrandable copy of
a tracker built for a one-person Instagram sourcing business, sold as a one-off
build to other businesses of the same shape.

The original, live installation lives in a separate folder and repository and is
in daily use with real customers. **Nothing here should ever be copied back into
it**, and this template must never point at the original's database.

## The shape of the customer

Someone who takes requests through Instagram DMs and WhatsApp, buys the items on
trips abroad, ships them home, and bills afterwards. Usually one person doing
everything, working from their phone.

## The pitch, in one sentence

Their customers stop asking "where is my order?" because they can look, and the
owner stops keeping prices and margins in their head.

## The two doors

| Who | Address | How they get in |
| --- | --- | --- |
| Owner | `/admin` | Email + password, one account |
| Each customer | `/c/<20-char token>` | Nothing. The link is the credential. |
| Public | `/request` | Submits a request; nothing is created until approved. |

Customers deliberately have **no accounts**. They arrive from Instagram; any
sign-up step means they message the owner instead of self-serving.

## Decisions carried over — do not re-litigate without asking

- **Cost and profit are hidden by the database, not the UI.** The customer page
  cannot query the tables (RLS blocks anon). It calls `get_client_by_token()`,
  a `security definer` function returning a hand-picked column list with no
  `cost` and no private notes. Any change to the customer page must preserve
  this. Filtering in React would still send the numbers to their browser.
- **One deposit field per item**, not a payments table. Enough for balance due
  without a ledger.
- **Clients are billed in USD only.** No multi-currency prices, no rates on
  anything a client sees. The *cost* side is the exception: items can be bought
  in EUR or SAR, because that is where the money actually goes. `items.cost` is
  still always dollars — every total, export and profit figure reads it and
  needs no currency logic. `cost_currency` / `cost_original` / `cost_rate` sit
  alongside it and record only what was handed over, so €70 stays legible next
  to $75.60. Rates are typed in Settings and copied onto each item at save
  time; editing a rate later never rewrites an old order.
- **Arabic ⇄ English**, all copy in `src/lib/i18n.tsx` and nowhere else. The
  `msg.*` WhatsApp templates are gender-neutral in Arabic because the customer's
  gender is unknown; the rest of the Arabic UI addresses the owner.
- **`closed`** = finished and settled. Filtered out of the customer page in SQL,
  still counted in the dashboard and exports, collapsed into **History** on the
  owner's client page.
- **Canceled items keep their numbers.** Price stops being charged, cost stops
  counting, but a deposit already paid still counts as money received — deleting
  it would erase a real payment. If that leaves a credit, the page says so.
- **The app never sends a message by itself.** Status changes open WhatsApp with
  the text ready, to be edited or abandoned.
- **The public form writes through `submit_request()`, not through the table.**
  It is `security definer`, so `requests` has no anon insert policy any more.
  One call writes the request and all its items together, rejects photo paths
  outside `requests/`, and caps the list at ten. Inserting from the browser
  again would walk past every one of those.
- **The pinned location is a separate column from the written address.**
  A typed address gets you to the street, the pin to the door, and people
  already send one on WhatsApp. Mixing them into one field would put a URL
  into the printed report and the Excel export, where it is unreadable and
  untappable — so `map_url` is its own column and paper only ever gets the
  words. `clean_map_url()` accepts Google, Apple and Waze links and silently
  drops anything else: the owner taps that link from her phone, and it must
  not be a stranger's URL. `lib/maps.ts` repeats the list for the form's
  benefit only; the database is what decides.
- **The service fee is one percentage in Settings, stored nowhere else.** It is
  charged on the items total of every client page, shown as its own line, and
  folded into the amount to send. It is income, so it sits inside `billed` and
  therefore inside profit, the dashboard and the export — which is why the
  export and the printed report list items and fee separately, or the price
  column would not add up to the total under it. Nothing is copied onto the
  item at save time, unlike a buying rate: changing the percentage does change
  what an old, unpaid order comes to.
- **One client can be charged their own percentage.** `clients.service_fee_pct`
  is null for everybody by default, which means "follow Settings"; a number
  there overrides it for that client alone. Null and 0 are different answers —
  0 means this client pays no fee while everyone else still does — so the field
  is nullable and the empty box saves null. It resolves inside
  `get_client_by_token()`, so the client page receives one number and never
  learns where it came from. Anything totalling more than one client (the
  dashboard, the export, the printed report) must work the fee out per client
  and add up — `totalsAcross()` in `lib/types.ts` — because one blended rate
  over mixed clients is wrong in a way that still looks plausible. For the same
  reason those screens print "(10%)" beside the fee only while a single rate is
  in play; see `feeLabel()`.
- **Duplicate clients are suggested, never merged automatically.** Matching is
  on name or the last 7 digits of the phone (`phoneKey`), because the same
  Lebanese number gets written `+961 71 …` and `71 …`. Two different women with
  the same first name are likelier than one person with two numbers.

## Rebranding a copy

`src/lib/brand.ts`, the REBRAND block in `src/app/globals.css`, the two SVGs in
`public/`, and `public/manifest.webmanifest`. Nothing else names a business.

## Database

Run `schema.sql` then `002`–`012` in order; all are idempotent. There is no
migration runner — they are pasted into the Supabase SQL editor by hand.

`900_demo_seed.sql` **deletes every row** and inserts invented data. It exists
for the sales demo only. Never run it on a client's project.

## Things that bit us, so nobody rediscovers them

- `gen_random_bytes()` lives in the `extensions` schema on Supabase, invisible to
  functions pinned to `search_path = public`. Tokens use the built-in
  `gen_random_uuid()` instead.
- `navigator.clipboard` only exists on https or localhost; `lib/clipboard.ts`
  falls back to `execCommand` for plain http testing over wifi.
- Grid children do not shrink below their intrinsic width, and iOS date inputs
  are wide — fields need `min-w-0` or they break out of their card.
- The owner's payment message supports `**bold**` via a small parser in
  `pay-section.tsx`. It is not full markdown.
- **PostgREST matches an RPC by the exact set of argument names it is sent.** A
  new parameter with a `default` does *not* let an older caller through: the
  four-argument call the deployed form was making died with `PGRST202` the
  moment `011` replaced `submit_request` with a five-argument version. So
  adding an argument to a function the browser calls breaks the live form
  between running the SQL and finishing the deploy, whichever order you pick.
  When that window matters, leave a wrapper with the old signature delegating
  to the new one, and drop it after the deploy.

## Deliberately not built

Offline support was built once and removed: for a shop with patchy signal it
sounded useful, but it cached a redirect to the login page under an admin
address and the complexity was not worth it. If it comes up again, the failure
mode to avoid is caching redirected responses.
