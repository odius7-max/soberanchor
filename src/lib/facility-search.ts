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

// ── Location parsing (ODI-93) ────────────────────────────────────────────────
//
// Whole-input recognition only. A query becomes a location when the ENTIRE
// input resolves as one — "Springfield" is a place, "Springfield Recovery
// Center" is a facility name. Nothing here touches the database; resolution
// against zip_centroids lives in location-resolve.ts so this file stays pure.

/**
 * Collapse a place name to its comparable core: diacritics folded, lowercased,
 * non-alphanumerics dropped. "Coeur d'Alene", "Coeur d Alene" and
 * "coeur-dalene" all become "coeurdalene", so the punctuation variants that
 * GeoNames and SAMHSA disagree on stop mattering.
 */
export function normalizePlaceName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * ILIKE prefilter for the punctuation-insensitive city fallback: the input's
 * alphanumeric runs joined by wildcards, so "winston salem" can reach
 * "Winston-Salem" and "coeur d alene" can reach "Coeur d'Alene". This is only
 * a prefilter to bound the row count — `normalizePlaceName` equality is what
 * actually decides a match. Runs are alphanumeric by construction, so no user
 * character survives into the pattern as a wildcard.
 */
export function cityIlikePattern(s: string): string | null {
  const runs = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g);
  return runs?.length ? runs.join("%") : null;
}

export type LocationQuery =
  /** Whole input is a state. Statewide browse — a state gets no distance origin. */
  | { kind: "state"; code: string; name: string }
  /** 5-digit ZIP (ZIP+4 accepted, first five used). */
  | { kind: "zip"; zip: string }
  /** 3–4 digit numeric: a ZIP-prefix filter, not a distance search. */
  | { kind: "zip_prefix"; prefix: string }
  /**
   * Place-shaped. `attempts` are tried in order against the gazetteer; the
   * first that resolves wins, and if none do the query falls through to text.
   */
  | { kind: "place"; attempts: Array<{ city: string; state: string | null }> }
  /** Existing ODI-92 free-text path. */
  | { kind: "text" };

/**
 * Classify a whole query. Order: state, numeric shapes, place, text.
 *
 * State wins over a same-named city ("Washington", "New York") — the slice-1
 * rule Astra endorsed. An explicit city+state ("New York, NY") still selects
 * the city, because the whole input is not a state.
 */
export function parseLocationQuery(input: string): LocationQuery {
  const q = input.trim().replace(/\s+/g, " ");
  if (!q) return { kind: "text" };

  const whole = toStateCode(q);
  if (whole) return { kind: "state", code: whole, name: STATE_NAMES[whole] };

  // Numeric shapes. Leading zeroes are preserved (00901 stays five chars) and
  // a longer numeric string is never truncated into a ZIP.
  if (/^\d+$/.test(q) || /^\d{5}-\d{4}$/.test(q)) {
    const digits = q.replace("-", "");
    if (digits.length === 5 || digits.length === 9) return { kind: "zip", zip: digits.slice(0, 5) };
    if (digits.length === 3 || digits.length === 4) return { kind: "zip_prefix", prefix: digits };
    return { kind: "text" };
  }

  const attempts: Array<{ city: string; state: string | null }> = [];
  const parts = q.split(",");

  if (parts.length === 2) {
    // An explicit state is authoritative: if it isn't a state we do NOT drop it
    // and resolve some other Portland — the query goes to text instead.
    const city = parts[0].trim();
    const code = toStateCode(parts[1]);
    if (city && code && /[a-z]/i.test(city)) attempts.push({ city, state: code });
  } else if (parts.length === 1 && /[a-z]/i.test(q)) {
    // Comma-free input. The whole string is the better reading ("Mount
    // Washington" is a town, not Mount in Washington), so it is tried first;
    // a trailing state is the fallback ("Portland ME", "Portland Maine").
    attempts.push({ city: q, state: null });
    const words = q.split(" ");
    for (const take of [1, 2]) {
      if (words.length <= take) continue;
      const code = toStateCode(words.slice(-take).join(" "));
      if (code) attempts.push({ city: words.slice(0, -take).join(" "), state: code });
    }
  }

  return attempts.length ? { kind: "place", attempts } : { kind: "text" };
}

/**
 * Card/note distance label. `search_facilities_near` already rounds to one
 * decimal; that same rounded number drives both the card and the 50-mile note
 * so the two can never contradict each other. A rounded zero is not an exact
 * shared location, so it says so.
 */
export function formatMiles(d: number): string {
  return d < 0.1 ? "Less than 0.1 mi" : `${d.toFixed(1)} mi`;
}
