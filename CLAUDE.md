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
- **USD only.** No exchange rates.
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
- **Duplicate clients are suggested, never merged automatically.** Matching is
  on name or the last 7 digits of the phone (`phoneKey`), because the same
  Lebanese number gets written `+961 71 …` and `71 …`. Two different women with
  the same first name are likelier than one person with two numbers.

## Rebranding a copy

`src/lib/brand.ts`, the REBRAND block in `src/app/globals.css`, the two SVGs in
`public/`, and `public/manifest.webmanifest`. Nothing else names a business.

## Database

Run `schema.sql` then `002`–`008` in order; all are idempotent. There is no
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

## Deliberately not built

Offline support was built once and removed: for a shop with patchy signal it
sounded useful, but it cached a redirect to the login page under an admin
address and the complexity was not worth it. If it comes up again, the failure
mode to avoid is caching redirected responses.
