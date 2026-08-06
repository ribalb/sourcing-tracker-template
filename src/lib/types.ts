export const STATUSES = [
  "requested",
  "sourcing",
  "found",
  "bought",
  "shipped",
  "out_for_delivery",
  "delivered",
  "closed",
  "canceled",
] as const;

export type Status = (typeof STATUSES)[number];

/**
 * Statuses that count towards money and profit.
 * `closed` still counts — it is a completed sale, just archived.
 */
export const isBillable = (s: Status) => s !== "canceled";

/**
 * `closed` means finished and settled: it stays in your books but is not
 * sent to the client's page, so a repeat customer sees only their current
 * order. Filtered in the database, not here — see 007_closed_status.sql.
 */
export const isClosed = (s: Status) => s === "closed";

/**
 * Currencies an item can be *bought* in. Clients are still billed in USD
 * only — see the note in CLAUDE.md; this is about the cost side alone.
 */
export const BUY_CURRENCIES = ["USD", "EUR", "SAR"] as const;
export type BuyCurrency = (typeof BUY_CURRENCIES)[number];

/** What one unit is worth in dollars, and how to write it. */
export const CURRENCY_SYMBOL: Record<BuyCurrency, string> = {
  USD: "$",
  EUR: "€",
  SAR: "﷼",
};

/**
 * Dollars, from an amount in another currency.
 *
 * Rounded to the cent on the way in, so the stored cost is a real figure
 * rather than something that shows as $75.60 and adds up as $75.6003.
 */
export function toUsd(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100;
}

export type Client = {
  id: string;
  name: string;
  phone: string | null;
  /** Where their orders are delivered. Asked once on the request form. */
  address: string | null;
  note: string | null;
  token: string;
  created_at: string;
};

/** Full item — admin side only. Contains `cost`, which clients must never see. */
export type Item = {
  id: string;
  client_id: string;
  description: string;
  specs: string | null;
  budget: number | null;
  status: Status;
  /** ALWAYS US dollars, whatever was actually handed over. */
  cost: number | null;
  /** What was paid, before conversion. All three null when paid in dollars. */
  cost_currency: BuyCurrency | null;
  cost_original: number | null;
  cost_rate: number | null;
  price: number | null;
  deposit: number;
  note: string | null;
  /** Storage paths, not URLs — see lib/photos.ts */
  request_photo: string | null;
  found_photo: string | null;
  created_at: string;
  updated_at: string;
};

/** What the public client page receives. No cost, no private note. */
export type PublicItem = {
  id: string;
  description: string;
  specs: string | null;
  budget: number | null;
  status: Status;
  price: number | null;
  deposit: number;
  request_photo: string | null;
  found_photo: string | null;
  created_at: string;
};

/** Payment details, written by the owner in Settings. */
export type PaymentInfo = {
  en: string | null;
  ar: string | null;
  method: string | null;
  account: string | null;
  account_name: string | null;
  whatsapp: string | null;
};

export type PublicView = {
  client: { name: string };
  payment: PaymentInfo | null;
  items: PublicItem[];
};

export type RequestStatus = "pending" | "approved" | "rejected";

/** One line of a submission. A request may hold up to ten. */
export type RequestItem = {
  id: string;
  request_id: string;
  position: number;
  description: string;
  specs: string | null;
  budget: number | null;
  photo: string | null;
  created_at: string;
};

/** What the form sends before anything exists in the database. */
export type DraftItem = {
  /** Local only, so React can key the rows while they are being typed. */
  key: string;
  description: string;
  specs: string;
  budget: string;
  photo: string | null;
};

/** A submission from the public form. Not a client and not an order yet. */
export type ClientRequest = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  status: RequestStatus;
  client_id: string | null;
  created_at: string;
  /**
   * Submissions from before multiple items existed kept their one item in
   * these columns. 009 copied them into request_items; nothing writes them
   * now. See supabase/009_request_address_and_items.sql.
   */
  description: string | null;
  specs: string | null;
  budget: number | null;
  photo: string | null;
};

export type Settings = {
  id: boolean;
  payment_note_en: string | null;
  payment_note_ar: string | null;
  pay_method: string | null;
  pay_account: string | null;
  pay_account_name: string | null;
  owner_whatsapp: string | null;
  /** Dollars per one euro / one riyal. What the item form starts from. */
  rate_eur: number;
  rate_sar: number;
  updated_at: string;
};

export type Totals = {
  billed: number;
  cost: number;
  profit: number;
  deposits: number;
  balance: number;
  count: number;
};

export function totalsOf(items: Pick<Item, "status" | "price" | "cost" | "deposit">[]): Totals {
  let billed = 0;
  let cost = 0;
  let deposits = 0;

  for (const it of items) {
    // A deposit is money that actually changed hands, so it counts even
    // when the item is later canceled — otherwise cancelling an item
    // would silently erase a payment the client really made.
    deposits += it.deposit ?? 0;

    // Canceled items are never charged, and their cost never happened.
    if (!isBillable(it.status)) continue;
    billed += it.price ?? 0;
    cost += it.cost ?? 0;
  }

  return {
    billed,
    cost,
    profit: billed - cost,
    deposits,
    balance: billed - deposits,
    count: items.length,
  };
}
