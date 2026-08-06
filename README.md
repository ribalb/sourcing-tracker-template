# Sourcing tracker — build template

A working order tracker for a one-person sourcing business: someone who takes
requests through Instagram and WhatsApp, buys the items abroad, and bills the
customer afterwards.

This folder is the **template**. Each sale is a copy of it with a different
brand, a different database and a different address.

| Who | Address | How they get in |
| --- | --- | --- |
| The owner | `/admin` | Email + password |
| Each customer | `/c/<secret-link>` | Nothing. The link is the key. |
| Anyone (Instagram bio) | `/request` | Nothing. Submits a request for approval. |

Arabic ⇄ English on every screen. All money in USD.

---

## What it does

**Owner side**

- Add a customer once (name + WhatsApp number).
- Log every item they ask for: description, size, their budget, their photo.
- Move it along: Requested → Sourcing → Found → Bought → Shipped → Out for
  delivery → Delivered → Closed (or Canceled).
- Record **cost**, **price** and any **deposit**. Profit is calculated per item
  and in total.
- **To source** — everything still to find, across all customers, on one screen
  built for use in a shop.
- **Requests** — submissions from the public form, approved one tap at a time.
- Dashboard filtered by date and status, exported to Excel or PDF.
- One-tap WhatsApp messages when a status changes.

**Customer side**

- Their items, current status, a photo of what was found, price, deposit,
  balance.
- How to pay, with the account number and the amount copyable in one tap.
- Closed orders disappear, so a returning customer sees only the current order.

**Cost and profit never reach the customer's browser.** The customer page cannot
read the tables at all; it calls one database function that returns a fixed list
of columns, and cost is not among them.

---

## Building a copy for a client

### 1. Rebrand — about 15 minutes

| What | Where |
| --- | --- |
| Name and wordmark | `src/lib/brand.ts` |
| Colours | `src/app/globals.css`, the block marked **REBRAND** |
| App icon | replace `public/logo.svg` and `public/icon-maskable.svg` |
| Install tile name | `public/manifest.webmanifest` |

Nothing else in the codebase mentions a business name.

### 2. Database — about 10 minutes

Create a free project at [supabase.com](https://supabase.com), then in
**SQL Editor** run these files **in order**:

```
schema.sql
002_payment_details.sql
003_fix_token_generator.sql
004_payment_actions.sql
005_delivery_statuses.sql
006_item_photos.sql
007_closed_status.sql
008_requests.sql
009_request_address_and_items.sql
010_cost_currency.sql
011_map_location.sql
```

All are safe to run twice.

**Never run `900_demo_seed.sql` on a client's database** — it deletes everything
and inserts invented data. It exists only for the sales demo.

### 3. The owner's login

**Authentication → Users → Add user → Create new user**, with **Auto Confirm
User** ticked. Then **Authentication → Sign In / Providers → Email** and turn
**Allow new users to sign up** OFF, so nobody else can register.

### 4. Connect and deploy

Copy `.env.local.example` to `.env.local` and fill in the two values from
Supabase → **Connect** → **App Frameworks** → **Next.js**.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
```

Leave `NEXT_PUBLIC_SITE_URL` unset — the app then builds customer links from
whatever address it is actually running on, which is right both locally and in
production, with nothing to keep in sync.

```powershell
npm install
npm run dev
```

Then push to GitHub and import into [vercel.com](https://vercel.com), adding the
same two environment variables. Free on both.

### 5. Hand over

- The live address and the `/admin` login you created
- Their Supabase project, transferred to their account if they want it
- Tell them to open the site on their phone → **Share → Add to Home Screen**

---

## Project layout

```
src/lib/brand.ts               name and wordmark — the only branded file
src/app/login                  owner sign-in
src/app/admin                  dashboard · to source · requests · clients · settings
src/app/c/[token]              the customer's page
src/app/request                the public request form
src/middleware.ts              blocks /admin without a session
src/lib/i18n.tsx               every Arabic and English string
src/lib/types.ts               data shapes and the money maths
supabase/                      run in number order; 900 is demo data only
```

To reword anything in either language, edit `src/lib/i18n.tsx` — all the text
lives there and nowhere else.
