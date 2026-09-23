/**
 * ODI-93: gazetteer resolution and distance search against the DB objects
 * applied in docs/planning/search-v2-plan.md §7.
 *
 * Kept out of facility-search.ts so that file stays pure and unit-testable.
 * Every function here throws on a transport/RPC error and returns an empty
 * result for a genuine miss — the caller renders those as two different
 * states, because "we couldn't reach the database" is not "that place
 * doesn't exist".
 */
import { supabase } from "@/lib/supabase";
import { cityIlikePattern, normalizePlaceName } from "@/lib/facility-search";

export type PlaceCandidate = {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
};

export type NearbyFacility = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  facility_type: string | null;
  is_featured: boolean | null;
  is_verified: boolean | null;
  is_claimed?: boolean | null;
  source?: string | null;
  distance_miles: number;
};

/** Rows returned by `city_centroid`, plus the punctuation-insensitive fallback. */
export async function resolveCity(city: string, state: string | null): Promise<PlaceCandidate[]> {
  const { data, error } = await supabase.rpc("city_centroid", {
    p_city: city,
    p_state: state,
  });
  if (error) throw new Error(`city_centroid failed: ${error.message}`);
  const rows = (data ?? []) as PlaceCandidate[];
  if (rows.length) return rows;

  // The RPC matches the city name exactly, so "Winston Salem" misses the
  // stored "Winston-Salem". Retry punctuation-insensitively. A single-run
  // pattern can only match what the exact RPC already matched, so skip it —
  // that keeps every free-text query (the common case) at one round trip.
  const pattern = cityIlikePattern(city);
  if (!pattern || !pattern.includes("%")) return [];

  let q = supabase
    .from("zip_centroids")
    .select("city, state, latitude, longitude")
    .ilike("city", pattern)
    .limit(2000);
  if (state) q = q.eq("state", state);

  const { data: zips, error: zErr } = await q;
  if (zErr) throw new Error(`zip_centroids fallback failed: ${zErr.message}`);

  const target = normalizePlaceName(city);
  const groups = new Map<string, { city: string; state: string; lat: number; lng: number; n: number }>();
  for (const z of (zips ?? []) as PlaceCandidate[]) {
    if (normalizePlaceName(z.city) !== target) continue;
    const key = `${target}|${z.state}`;
    const g = groups.get(key);
    if (g) {
      g.lat += z.latitude;
      g.lng += z.longitude;
      g.n += 1;
      // Keep one stable spelling for the label.
      if (z.city < g.city) g.city = z.city;
    } else {
      groups.set(key, { city: z.city, state: z.state, lat: z.latitude, lng: z.longitude, n: 1 });
    }
  }

  // Mean of the member ZIP centroids and (state, city) ordering, matching
  // city_centroid so both paths produce the same origin for the same place.
  return [...groups.values()]
    .map((g) => ({ city: g.city, state: g.state, latitude: g.lat / g.n, longitude: g.lng / g.n }))
    .sort((a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city));
}

/** Try each parsed attempt in order; the first that resolves wins. */
export async function resolveAttempts(
  attempts: Array<{ city: string; state: string | null }>,
): Promise<PlaceCandidate[]> {
  for (const a of attempts) {
    const found = await resolveCity(a.city, a.state);
    if (found.length) return found;
  }
  return [];
}

/** ZIP centroid, or null when the ZIP is absent from the reference data. */
export async function resolveZip(zip: string): Promise<PlaceCandidate | null> {
  const { data, error } = await supabase
    .from("zip_centroids")
    .select("city, state, latitude, longitude")
    .eq("zip", zip)
    .maybeSingle();
  if (error) throw new Error(`zip_centroids lookup failed: ${error.message}`);
  return (data as PlaceCandidate | null) ?? null;
}

export const PAGE_SIZE = 25;
/** Bounds the fan-out below; 8 pages is 200 listings. */
export const MAX_PAGES = 8;

/**
 * Nearest listings to an origin, accumulated across `page` continuations.
 *
 * Each page is one `search_facilities_near` call at its own p_offset, so the
 * order is the RPC's (distance, id) throughout and is never re-sorted here.
 * Pages are contiguous slices of that one deterministic ordering, so fetching
 * them in parallel and concatenating reproduces it exactly.
 */
export async function searchNear(
  lat: number,
  lng: number,
  facilityType: string | null,
  page: number,
): Promise<{ rows: NearbyFacility[]; hasMore: boolean }> {
  const pages = Math.min(Math.max(page, 1), MAX_PAGES);
  const calls = Array.from({ length: pages }, (_, i) =>
    supabase.rpc("search_facilities_near", {
      p_lat: lat,
      p_lng: lng,
      p_facility_type: facilityType,
      p_limit: PAGE_SIZE,
      p_offset: i * PAGE_SIZE,
    }),
  );
  const settled = await Promise.all(calls);
  const rows: NearbyFacility[] = [];
  for (const { data, error } of settled) {
    if (error) throw new Error(`search_facilities_near failed: ${error.message}`);
    rows.push(...((data ?? []) as NearbyFacility[]));
  }
  // A short final page means the pool is exhausted.
  const lastFull = (settled[settled.length - 1].data ?? []).length === PAGE_SIZE;
  return { rows, hasMore: lastFull && pages < MAX_PAGES };
}
