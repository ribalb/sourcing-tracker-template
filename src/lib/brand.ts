/**
 * ============================================================
 *  REBRAND HERE
 * ============================================================
 *
 * Everything that changes per client lives in this file, plus:
 *   - three colours in src/app/globals.css (marked REBRAND)
 *   - the client's logo dropped into public/ as logo.svg or logo.png
 *
 * Nothing else in the codebase mentions a business name.
 */

export const BRAND = {
  /** The wordmark, set on two lines the way a fashion logo usually is. */
  wordmarkTop: "ATELIER",
  wordmarkBottom: "BEIRUT",

  /** Plain name, used in page titles and sentences. */
  name: "Atelier",

  /** Arabic name. Leave equal to `name` if they use the Latin one. */
  nameAr: "أتيليه",

  /** Short description used in the browser tab and on the install tile. */
  tagline: "Sourcing tracker",
} as const;
