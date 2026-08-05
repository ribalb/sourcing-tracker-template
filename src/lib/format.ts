const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Money is always shown in USD, in Latin digits, in both languages. */
export function money(value: number | null | undefined): string {
  return usd.format(value ?? 0);
}

/** Blank instead of "$0" — used where an empty price should stay empty. */
export function moneyOrDash(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : usd.format(value);
}

export function formatDate(iso: string, lang: "en" | "ar"): string {
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-LB" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Turn a typed number field into a number or null. */
export function toNumber(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Replace {name}-style placeholders in a message template. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

/**
 * A loose key for comparing two phone numbers.
 *
 * People write the same Lebanese number as "+961 71 622 967" or "71 622 967",
 * which share no prefix at all. The last 7 digits survive both, so they are
 * what we compare on. Used only to *suggest* a match — never to merge two
 * clients without being asked.
 */
export function phoneKey(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 7 ? digits.slice(-7) : null;
}

/** Strip everything except digits so wa.me accepts the number. */
export function waNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}
