/**
 * Directory keyword-search matching (ODI-92).
 *
 * `facilities.state` stores two-letter USPS codes (verified: zero rows with a
 * non-2-char state). Users type either form — "CA" or "California" — so both
 * have to normalize to the stored code before the query is built.
 *
 * Pure and dependency-free so it can be unit tested on its own.
 */
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",        AK: "Alaska",         AZ: "Arizona",        AR: "Arkansas",
  CA: "California",     CO: "Colorado",       CT: "Connecticut",    DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",        GA: "Georgia",        HI: "Hawaii",         ID: "Idaho",
  IL: "Illinois",       IN: "Indiana",        IA: "Iowa",           KS: "Kansas",
  KY: "Kentucky",       LA: "Louisiana",      ME: "Maine",          MD: "Maryland",
  MA: "Massachusetts",  MI: "Michigan",       MN: "Minnesota",      MS: "Mississippi",
  MO: "Missouri",       MT: "Montana",        NE: "Nebraska",       NV: "Nevada",
  NH: "New Hampshire",  NJ: "New Jersey",     NM: "New Mexico",     NY: "New York",
  NC: "North Carolina", ND: "North Dakota",   OH: "Ohio",           OK: "Oklahoma",
  OR: "Oregon",         PA: "Pennsylvania",   RI: "Rhode Island",   SC: "South Carolina",
  SD: "South Dakota",   TN: "Tennessee",      TX: "Texas",          UT: "Utah",
  VT: "Vermont",        VA: "Virginia",       WA: "Washington",     WV: "West Virginia",
  WI: "Wisconsin",      WY: "Wyoming",
  // Territories present in the SAMHSA import.
  AS: "American Samoa", GU: "Guam",           MP: "Northern Mariana Islands",
  PR: "Puerto Rico",    VI: "Virgin Islands",
};

/** Extra spellings users actually type. */
const NAME_ALIASES: Record<string, string> = {
  "washington dc": "DC",
  "washington d.c.": "DC",
  "d.c.": "DC",
  "dc": "DC",
  "us virgin islands": "VI",
  "u.s. virgin islands": "VI",
};

const BY_NAME: Record<string, string> = (() => {
  const map: Record<string, string> = { ...NAME_ALIASES };
  for (const [code, name] of Object.entries(STATE_NAMES)) {
    map[name.toLowerCase()] = code;
  }
  return map;
})();

/**
 * Resolve a user-typed fragment to its USPS code, or null if it isn't a state.
 * Matches the full token only — "Californian Sober Living" is a name, not a state.
 */
export function toStateCode(input: string): string | null {
  const key = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return null;
  if (key.length === 2) {
    const upper = key.toUpperCase();
    return upper in STATE_NAMES ? upper : null;
  }
  return BY_NAME[key] ?? null;
}


// Strip the characters that are either ILIKE wildcards or PostgREST `or()`
// delimiters, so an arbitrary user string can never break the filter syntax.
function sanitizeTerm(s: string): string {
  return s.replace(/[%_,().]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Build the PostgREST `or()` filter for a free-text directory query.
 *
 * Matches name, city, AND state. "CA" and "California" both resolve to the
 * stored USPS code. A "City, ST" query is split on the comma and each part is
 * matched independently, so "Portland, ME" returns Portlands and Maine rather
 * than nothing. Deterministic — no semantic layer. Returns null when the term
 * has nothing searchable left after sanitizing.
 *
 * A bare two-letter part that IS a state code is matched as a state only.
 * Substring-matching "ME" against names and cities drags in "Med Spa",
 * "Memphis", "Home" — noise that buries the Maine results the user asked for.
 * Full state names stay in the text match too, because "California Recovery
 * Center" is a plausible thing to be looking for.
 */
export function buildSearchFilter(term: string): string | null {
  const filters = new Set<string>();

  for (const part of term.split(",")) {
    const clean = sanitizeTerm(part);
    if (!clean) continue;

    const code = toStateCode(clean);
    if (code) filters.add(`state.ilike.${code}`);

    if (!code || clean.length > 2) {
      filters.add(`name.ilike.%${clean}%`);
      filters.add(`city.ilike.%${clean}%`);
    }
  }

  return filters.size ? [...filters].join(",") : null;
}
