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
  /** The pin that goes with it. A map link, never anything else — see lib/maps.ts. */
  map_url: string | null;
  note: string | null;
  /**
   * This client's own service fee percentage, or null to be charged the one
   * in Settings. 0 is a real answer — it means this client pays no fee — so
   * "not set" has to be null and not zero.
   */
  service_fee_pct: number | null;
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
  /**
   * The service fee, as a percentage — 10 means 10%. Comes from the database
   * function, not the settings table, which anon cannot read. Older rows and
   * a database still on 011 send nothing, which reads as no fee.
   */
  fee_pct?: number | null;
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
  map_url: string | null;
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
  /** The service fee charged on top of every order, as a percentage. */
  service_fee_pct: number;
  updated_at: string;
};

/**
 * The service fee in dollars, from a total and a percentage.
 *
 * Rounded to the cent here and nowhere else, so the figure the client is
 * shown is the figure that is added up — a fee left at $50.0004 would print
 * as $50 on the page and as something else in the export.
 */
export function feeOn(subtotal: number, pct: number | null | undefined): number {
  if (!pct || subtotal <= 0) return 0;
  return Math.round(subtotal * pct) / 100;
}

export type Totals = {
  /** The item prices alone, before the service fee. */
  items: number;
  /** The service fee in dollars. Zero when no fee is set. */
  fee: number;
  /**
   * The percentages actually charged inside this total, without repeats.
   * One client always gives one; a figure covering several clients gives
   * as many as differ, so a label can say "(10%)" when they all agree and
   * stay silent rather than lie when they do not. See feeLabel().
   */
  feePcts: number[];
  /** What the client owes in all: items plus fee. */
  billed: number;
  cost: number;
  profit: number;
  deposits: number;
  balance: number;
  count: number;
};

/**
 * `feePct` is the percentage this client is charged — 10 for 10%. It comes
 * from Settings unless the client carries their own; feePctOf() decides.
 * The fee is charged on the items that are actually billed, so cancelling an
 * item removes its share of it too. It counts as income: it is inside
 * `billed`, and therefore inside `profit` and `balance`.
 */
export function totalsOf(
  items: Pick<Item, "status" | "price" | "cost" | "deposit">[],
  feePct: number | null | undefined = 0,
): Totals {
  let priced = 0;
  let cost = 0;
  let deposits = 0;

  for (const it of items) {
    // A deposit is money that actually changed hands, so it counts even
    // when the item is later canceled — otherwise cancelling an item
    // would silently erase a payment the client really made.
    deposits += it.deposit ?? 0;

    // Canceled items are never charged, and their cost never happened.
    if (!isBillable(it.status)) continue;
    priced += it.price ?? 0;
    cost += it.cost ?? 0;
  }

  const fee = feeOn(priced, feePct);
  const billed = priced + fee;

  return {
    items: priced,
    fee,
    feePcts: fee > 0 ? [Number(feePct)] : [],
    billed,
    cost,
    profit: billed - cost,
    deposits,
    balance: billed - deposits,
    count: items.length,
  };
}

/**
 * The percentage a client is charged: their own if they have one, otherwise
 * the one from Settings. Zero is a real rate — a client set to 0 pays no fee
 * even while everyone else does — so only null falls back.
 */
export function feePctOf(
  client: { service_fee_pct?: number | null } | null | undefined,
  settingsPct: number | null | undefined,
): number {
  const own = client?.service_fee_pct;
  if (own !== null && own !== undefined) return Number(own);
  return Number(settingsPct ?? 0);
}

/**
 * Totals over items belonging to several clients, each possibly charged a
 * different percentage.
 *
 * The fee is a percentage of one client's own items, so it can only be worked
 * out per client and then added up. Applying one blended rate to the grand
 * total would be wrong the moment two clients differ, and quietly wrong —
 * every figure would still look plausible.
 */
export function totalsAcross<T extends Pick<Item, "status" | "price" | "cost" | "deposit">>(
  items: T[],
  clientOf: (item: T) => string,
  pctOf: (clientId: string) => number | null | undefined,
): Totals {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const key = clientOf(it);
    const list = groups.get(key);
    if (list) list.push(it);
    else groups.set(key, [it]);
  }

  const sum: Totals = {
    items: 0,
    fee: 0,
    feePcts: [],
    billed: 0,
    cost: 0,
    profit: 0,
    deposits: 0,
    balance: 0,
    count: items.length,
  };

  const pcts = new Set<number>();

  for (const [id, list] of groups) {
    const t = totalsOf(list, pctOf(id));
    sum.items += t.items;
    sum.fee += t.fee;
    sum.billed += t.billed;
    sum.cost += t.cost;
    sum.profit += t.profit;
    sum.deposits += t.deposits;
    sum.balance += t.balance;
    for (const p of t.feePcts) pcts.add(p);
  }

  sum.feePcts = [...pcts].sort((a, b) => a - b);
  return sum;
}

/**
 * "Service fee (10%)" while one rate is in play, plain "Service fee" once
 * several are. A single percentage printed over a mixture of clients would
 * read as the rate the fee was worked out at, and it would not be.
 */
export function feeLabel(base: string, pcts: number[]): string {
  return pcts.length === 1 ? `${base} (${pcts[0]}%)` : base;
}
