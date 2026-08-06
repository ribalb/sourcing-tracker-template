/**
 * A pinned location, kept next to the written address.
 *
 * The same list of hosts is enforced again in `clean_map_url()` — see
 * supabase/011_map_location.sql. This copy is only so the request form can
 * say "that isn't a map link" while someone is still typing; the database
 * is what actually decides, because anyone can call the function directly.
 */
const ALLOWED = [
  /^https:\/\/(www\.)?google\.[a-z.]+\/maps/i,
  /^https:\/\/maps\.google\.[a-z.]+\//i,
  /^https:\/\/maps\.app\.goo\.gl\//i,
  /^https:\/\/goo\.gl\/maps\//i,
  /^https:\/\/maps\.apple\.com\//i,
  /^https:\/\/(www\.)?waze\.com\//i,
];

export function isMapUrl(url: string): boolean {
  const v = url.trim();
  return v.length > 0 && v.length <= 500 && ALLOWED.some((re) => re.test(v));
}

/**
 * What the "use my current location" button stores. Coordinates rather than
 * a shortened share link, so it keeps working whatever Google does to its
 * URL shortener, and six decimals is roughly a doorway.
 */
export function pinUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
