import { supabase } from '@/lib/supabase'
import { buildSearchFilter, parseLocationQuery, formatMiles } from '@/lib/facility-search'
import {
  resolveAttempts, resolveZip, searchNear,
  type PlaceCandidate, type NearbyFacility,
} from '@/lib/location-resolve'
import Link from 'next/link'
import DirectorySearch from '@/components/find/DirectorySearch'
import CategoryLane, { type LaneTile } from '@/components/find/CategoryLane'
import FeaturedBand from '@/components/find/FeaturedBand'
import FocusOnMount from '@/components/find/FocusOnMount'

// ── Category model ───────────────────────────────────────────────────────────

type CategoryKey =
  | 'treatment'
  | 'detox'
  | 'outpatient'
  | 'therapist'
  | 'sober_living'
  | 'venue'

const CATEGORY_KEYS: readonly CategoryKey[] = [
  'treatment', 'detox', 'outpatient', 'therapist', 'sober_living', 'venue',
] as const

type CategoryMeta = {
  label: string
  desc: string
  viewAllHref: string
  icon: string
  iconBg: string
}

const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  treatment:    { label: 'Treatment Centers',  desc: 'Inpatient, residential, and detox programs.',       viewAllHref: '/find/treatment',   icon: '🏥', iconBg: 'var(--teal-10)' },
  detox:        { label: 'Medical Detox',      desc: 'Medically-supervised alcohol and drug detox.',      viewAllHref: '/find/treatment',   icon: '🩺', iconBg: 'var(--teal-10)' },
  outpatient:   { label: 'Outpatient / IOP',   desc: 'IOP, OP, and day programs.',                        viewAllHref: '/find/outpatient',  icon: '💊', iconBg: 'var(--teal-10)' },
  therapist:    { label: 'Therapists',         desc: 'Addiction specialists, dual-diagnosis, family.',    viewAllHref: '/find/therapists',  icon: '💆', iconBg: 'rgba(39,174,96,0.07)' },
  sober_living: { label: 'Sober Living',       desc: 'Transitional housing and recovery residences.',     viewAllHref: '/find/sober-living', icon: '🏠', iconBg: 'var(--gold-10)' },
  venue:        { label: 'Sober Venues',       desc: 'Alcohol-free bars, cafes, and event spaces.',       viewAllHref: '/find/venues',      icon: '🍹', iconBg: 'var(--gold-10)' },
}

type FacilityCard = {
  id: string
  name: string
  city: string | null
  state: string | null
  is_featured: boolean | null
  is_verified: boolean | null
  is_claimed: boolean | null
  source: string | null
  facility_type?: string | null
  /** Present only on distance results; straight-line miles from the origin. */
  distance_miles?: number | null
}

// ── Category filter helpers ──────────────────────────────────────────────────
// Detox and Outpatient/IOP are FILTERED VIEWS over existing facility_types,
// not new types. `detox` = treatment + has service_detail.DETOX; the ~700
// unenriched facilities (no service_detail) intentionally won't match.

const TYPE_MAP: Record<Exclude<CategoryKey, 'detox'>, string> = {
  treatment:    'treatment',
  outpatient:   'outpatient',
  therapist:    'therapist',
  sober_living: 'sober_living',
  venue:        'venue',
}

async function countFor(key: CategoryKey): Promise<number> {
  if (key === 'detox') {
    const { count } = await supabase
      .from('facilities')
      .select('id', { count: 'exact', head: true })
      .eq('facility_type', 'treatment')
      .not('service_detail->DETOX', 'is', null)
    return count ?? 0
  }
  const { count } = await supabase
    .from('facilities')
    .select('id', { count: 'exact', head: true })
    .eq('facility_type', TYPE_MAP[key])
  return count ?? 0
}

const CARD_SELECT = 'id, name, city, state, is_featured, is_verified, is_claimed, source'

async function previewFor(key: CategoryKey, limit: number): Promise<FacilityCard[]> {
  if (key === 'detox') {
    const { data } = await supabase
      .from('facilities')
      .select(CARD_SELECT)
      .eq('facility_type', 'treatment')
      .not('service_detail->DETOX', 'is', null)
      .order('name')
      .limit(limit)
    return (data ?? []) as FacilityCard[]
  }
  const { data } = await supabase
    .from('facilities')
    .select(CARD_SELECT)
    .eq('facility_type', TYPE_MAP[key])
    .order('name')
    .limit(limit)
  return (data ?? []) as FacilityCard[]
}

async function keywordSearch(term: string, limit: number): Promise<FacilityCard[]> {
  const filter = buildSearchFilter(term)
  if (!filter) return []
  const { data } = await supabase
    .from('facilities')
    .select(`${CARD_SELECT}, facility_type`)
    .or(filter)
    .order('name')
    .limit(limit)
  return (data ?? []) as FacilityCard[]
}

// ── Location search (ODI-93) ─────────────────────────────────────────────────

async function zipPrefixSearch(prefix: string, limit: number): Promise<FacilityCard[]> {
  const { data } = await supabase
    .from('facilities')
    .select(`${CARD_SELECT}, facility_type`)
    .like('zip', `${prefix}%`)
    .order('name')
    .limit(limit)
  return (data ?? []) as FacilityCard[]
}

/**
 * The RPC returns the columns it needs for ordering, not the two trust flags
 * the card badges read (`is_claimed`, `source`). Fetch them for the returned
 * ids only and merge by id — this never touches the order, which stays the
 * RPC's (distance, id).
 */
async function toCards(rows: NearbyFacility[]): Promise<FacilityCard[]> {
  if (!rows.length) return []
  const { data } = await supabase
    .from('facilities')
    .select('id, is_claimed, source')
    .in('id', rows.map((r) => r.id))
  const extra = new Map((data ?? []).map((r) => [r.id as string, r as { is_claimed: boolean | null; source: string | null }]))
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    city: r.city,
    state: r.state,
    is_featured: r.is_featured,
    is_verified: r.is_verified,
    is_claimed: extra.get(r.id)?.is_claimed ?? null,
    source: extra.get(r.id)?.source ?? null,
    facility_type: r.facility_type,
    distance_miles: r.distance_miles,
  }))
}

type Outcome =
  | { kind: 'state'; stateName: string; results: FacilityCard[] }
  | { kind: 'zip_prefix'; prefix: string; results: FacilityCard[] }
  | { kind: 'distance'; place: string; results: FacilityCard[]; hasMore: boolean; page: number }
  | { kind: 'choose'; city: string; candidates: PlaceCandidate[] }
  | { kind: 'zip_unknown' }
  | { kind: 'place_unknown'; city: string; stateName: string }
  | { kind: 'text'; results: FacilityCard[] }
  | { kind: 'error' }

/**
 * Whole-input routing per docs/planning/search-v2-plan.md §2. A state is a
 * statewide browse and never acquires a distance origin; a city or ZIP that
 * resolves becomes a distance search; anything that does not resolve falls
 * through to the unchanged ODI-92 text path. A transport failure is its own
 * outcome — never reported as "we couldn't find that place".
 *
 * `p_facility_type` is passed as null: /find's category chip has never
 * filtered search results, and wiring it in here would change ODI-92
 * behaviour. The RPC parameter is ready for the slice-2 filter UI.
 *
 * `forceText` is the `mode=text` escape hatch behind the "Search as text"
 * offer on the unresolved-place state: the user has read that we couldn't
 * place the town and asked for the keyword search anyway, so location
 * parsing is skipped rather than quietly resolving the same word somewhere
 * else (ODI-99).
 */
async function runSearch(q: string, page: number, forceText: boolean): Promise<Outcome> {
  const parsed = parseLocationQuery(q)
  try {
    if (forceText) return { kind: 'text', results: await keywordSearch(q, 15) }

    if (parsed.kind === 'state') {
      return { kind: 'state', stateName: parsed.name, results: await keywordSearch(q, 15) }
    }

    if (parsed.kind === 'zip_prefix') {
      return { kind: 'zip_prefix', prefix: parsed.prefix, results: await zipPrefixSearch(parsed.prefix, 25) }
    }

    if (parsed.kind === 'zip') {
      const hit = await resolveZip(parsed.zip)
      if (!hit) return { kind: 'zip_unknown' }
      const { rows, hasMore } = await searchNear(hit.latitude, hit.longitude, null, page)
      return {
        kind: 'distance',
        place: `${hit.city}, ${hit.state} ${parsed.zip}`,
        results: await toCards(rows),
        hasMore,
        page,
      }
    }

    if (parsed.kind === 'place') {
      const candidates = await resolveAttempts(parsed.attempts)
      if (candidates.length > 1) {
        return { kind: 'choose', city: parsed.attempts[0].city, candidates }
      }
      if (candidates.length === 1) {
        const c = candidates[0]
        const { rows, hasMore } = await searchNear(c.latitude, c.longitude, null, page)
        return {
          kind: 'distance',
          place: `${c.city}, ${c.state}`,
          results: await toCards(rows),
          hasMore,
          page,
        }
      }
      // Nothing resolved. When the user named the state themselves, say so
      // plainly instead of OR-ing "Faketown" and "ME" into every Maine
      // listing under a generic heading — a failed lookup dressed up as
      // results (ODI-99).
      if (parsed.explicitState) {
        return {
          kind: 'place_unknown',
          city: parsed.attempts[0].city,
          stateName: parsed.explicitState.name,
        }
      }
    }

    return { kind: 'text', results: await keywordSearch(q, 15) }
  } catch {
    return { kind: 'error' }
  }
}

// ── Lane composition ─────────────────────────────────────────────────────────

function categoryTile(key: CategoryKey, active: CategoryKey, counts: Record<CategoryKey, number>): LaneTile {
  const m = CATEGORY_META[key]
  return {
    key,
    href: `/find?category=${key}#results`,
    title: m.label,
    desc:  m.desc,
    icon:  m.icon,
    iconBg: m.iconBg,
    count: counts[key],
    isActive: key === active,
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

type FindPageProps = {
  searchParams: Promise<{ category?: string; q?: string; page?: string; mode?: string }>
}

function isCategoryKey(v: string | undefined): v is CategoryKey {
  return !!v && (CATEGORY_KEYS as readonly string[]).includes(v)
}

export default async function FindPage({ searchParams }: FindPageProps) {
  const params = await searchParams
  const category: CategoryKey = isCategoryKey(params.category) ? params.category : 'treatment'
  const q = (params.q ?? '').trim().slice(0, 100)
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

  const [countEntries, activePreview, outcome] = await Promise.all([
    Promise.all(CATEGORY_KEYS.map(async (k) => [k, await countFor(k)] as const)),
    q ? Promise.resolve([] as FacilityCard[]) : previewFor(category, 10),
    q ? runSearch(q, page, params.mode === 'text') : Promise.resolve(null),
  ])
  const counts = Object.fromEntries(countEntries) as Record<CategoryKey, number>

  const treatmentTiles: LaneTile[] = [
    categoryTile('treatment',  category, counts),
    categoryTile('detox',      category, counts),
    categoryTile('outpatient', category, counts),
    categoryTile('therapist',  category, counts),
  ]

  const soberLifeTiles: LaneTile[] = [
    categoryTile('sober_living', category, counts),
    categoryTile('venue',        category, counts),
  ]

  const communityTiles: LaneTile[] = [
    {
      key: 'find-a-meeting',
      href: '/fellowships',
      title: 'Find a Meeting',
      desc: 'Official fellowship finders — AA, NA, SMART Recovery, and more.',
      icon: '👥',
      iconBg: 'rgba(0,51,102,0.06)',
    },
    {
      key: 'browse-fellowships',
      href: '/fellowships',
      title: 'Browse Fellowships',
      desc: 'How each program works — AA, NA, Al-Anon, SMART, and more.',
      icon: '📖',
      iconBg: 'rgba(0,51,102,0.06)',
    },
  ]

  const activeMeta = CATEGORY_META[category]

  return (
    <>
      {/* Hero + search */}
      <section className="pt-10 pb-6 px-6">
        <div className="max-w-[1120px] mx-auto">
          <p className="text-xs font-bold tracking-[2px] uppercase text-teal mb-2">Directory</p>
          <h1
            className="text-[clamp(28px,3.5vw,40px)] font-semibold leading-[1.15] mb-2.5"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-1.0px' }}
          >
            Find what you need.
          </h1>
          <p className="text-mid text-base leading-relaxed max-w-[560px] mb-6">
            Treatment, sober living, therapists, sober venues, meetings — grouped by what you're
            looking for.
          </p>
          <DirectorySearch initialQuery={q} />
        </div>
      </section>

      {/* Three intent lanes */}
      <section className="px-6">
        <div className="max-w-[1120px] mx-auto">
          <CategoryLane
            id="lane-treatment"
            label="Get Treatment"
            pillLabel="Clinical"
            pillKind="clinical"
            tiles={treatmentTiles}
            cols={4}
            crossLink={{ href: '/find?category=sober_living#results', label: 'Just finished treatment? Find recovery housing' }}
          />
          <CategoryLane
            id="lane-sober-life"
            label="Sober Life"
            pillLabel="Lifestyle"
            pillKind="lifestyle"
            tiles={soberLifeTiles}
            cols={2}
          />
          <CategoryLane
            id="lane-meetings"
            label="Meetings & Fellowships"
            pillLabel="Support"
            pillKind="support"
            tiles={communityTiles}
            cols={2}
          />
        </div>
      </section>

      {/* Results */}
      <section id="results" className="px-6 pb-16 pt-2 scroll-mt-24">
        <div className="max-w-[1120px] mx-auto">
          {q && outcome ? (
            <SearchResults q={q} outcome={outcome} />
          ) : (
            <>
              {/* Labeled Featured band above the organic preview (payment-blind). */}
              <FeaturedBand facilityType={category === 'detox' ? 'treatment' : category} />
              <CategoryPreview
                category={category}
                meta={activeMeta}
                count={counts[category]}
                results={activePreview}
              />
            </>
          )}
        </div>
      </section>
    </>
  )
}

// ── Results renderers ────────────────────────────────────────────────────────

function CategoryPreview({
  category,
  meta,
  count,
  results,
}: {
  category: CategoryKey
  meta: CategoryMeta
  count: number
  results: FacilityCard[]
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <h2
          className="text-[22px] font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-0.5px' }}
        >
          {meta.label}
        </h2>
        <Link href={meta.viewAllHref} className="text-teal text-sm font-semibold hover:underline whitespace-nowrap">
          {category === 'detox'
            ? 'See all Treatment Centers →'
            : `View all${count ? ` ${count.toLocaleString()}` : ''} →`}
        </Link>
      </div>
      <p className="text-sm text-mid mb-5">{meta.desc}</p>

      {results.length === 0 ? (
        <EmptyState
          title="No matching listings yet."
          body="We're growing this directory. Try another category above, or search."
        />
      ) : (
        <FacilityList results={results} icon={meta.icon} iconBg={meta.iconBg} showTypeBadge={false} />
      )}

      {category === 'detox' && (
        <p className="text-[12px] text-mid mt-4">
          Filter based on SAMHSA service data. Facilities without detailed program data may not appear here — try the full{' '}
          <Link href="/find/treatment" className="text-teal font-semibold hover:underline">Treatment Centers</Link> list.
        </p>
      )}
    </>
  )
}

/**
 * `headingId` makes the heading programmatically focusable so a client
 * component can move focus to it once the results render (ODI-99 item 4).
 * Omitted everywhere else, so no other state steals focus.
 */
function ResultsHeader({ title, headingId }: { title: string; headingId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-1">
      <h2
        id={headingId}
        tabIndex={headingId ? -1 : undefined}
        className="text-[22px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--teal)]"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-0.5px' }}
      >
        {title}
      </h2>
      <Link href="/find" className="text-teal text-sm font-semibold hover:underline whitespace-nowrap">
        Clear search →
      </Link>
    </div>
  )
}

function SearchResults({ q, outcome }: { q: string; outcome: Outcome }) {
  // A service failure is its own state — never an "unknown place" message and
  // never an empty result set that reads as "nothing exists near you".
  if (outcome.kind === 'error') {
    return (
      <>
        <ResultsHeader title="Search results" />
        <div className="mt-4">
          <EmptyState
            title={`We couldn't load results. Please try again.`}
            body="This one is on us, not your search."
          />
        </div>
      </>
    )
  }

  if (outcome.kind === 'zip_unknown') {
    return (
      <>
        <ResultsHeader title="Search results" />
        <div className="mt-4">
          <EmptyState
            title={`We couldn't find a location for ZIP code ${q}.`}
            body="Try a city and state, or check the ZIP code."
          />
        </div>
      </>
    )
  }

  if (outcome.kind === 'place_unknown') {
    return <UnresolvedPlace city={outcome.city} stateName={outcome.stateName} />
  }

  if (outcome.kind === 'choose') {
    return <PlaceChooser city={outcome.city} candidates={outcome.candidates} />
  }

  if (outcome.kind === 'distance') {
    return <DistanceResults q={q} outcome={outcome} />
  }

  // Statewide browse, ZIP-prefix filter, and the unchanged ODI-92 text path
  // all render the same list — only the heading and the sub-line differ.
  const { title, sub } =
    outcome.kind === 'state'
      ? {
          title: `Recovery services and places in ${outcome.stateName}`,
          sub: <>Listings across {outcome.stateName}, ordered by name.</>,
        }
      : outcome.kind === 'zip_prefix'
        ? {
            title: `Centers with ZIP codes starting with ${outcome.prefix}`,
            sub: <>Ordered by name — a ZIP prefix has no single location to measure from.</>,
          }
        : {
            title: 'Search results',
            sub: (
              <>
                Matches for <span className="text-dark font-semibold">&ldquo;{q}&rdquo;</span> across name,
                city, and state.
              </>
            ),
          }

  return (
    <>
      <ResultsHeader title={title} />
      <p className="text-sm text-mid mb-5">{sub}</p>
      {outcome.results.length === 0 ? (
        <EmptyState
          title="No matches."
          body="Try different keywords, or pick a category above to browse."
        />
      ) : (
        <FacilityList results={outcome.results} icon="🔎" iconBg="var(--warm-gray)" showTypeBadge />
      )}
    </>
  )
}

/**
 * A town we cannot place inside a state the user named themselves. The old
 * behaviour OR'd the parts into the ODI-92 text filter, so "Faketown, ME"
 * returned fifteen Maine listings under "Search results" — a failed lookup
 * wearing the costume of an answer. Both ways forward are offered by name so
 * the next step is the visitor's choice, not ours.
 */
function UnresolvedPlace({ city, stateName }: { city: string; stateName: string }) {
  const offer =
    'inline-flex items-center justify-center min-h-[44px] px-5 rounded-[12px] border border-[var(--border)] bg-white text-teal font-semibold text-sm hover:border-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--teal)]'

  return (
    <>
      <ResultsHeader title="Search results" />
      <div className="mt-4 border border-[var(--border)] rounded-[14px] bg-white p-6 text-center">
        <p className="text-navy font-semibold text-[15px]">
          {`We couldn't find ${city} in ${stateName}.`}
        </p>
        <p className="text-mid text-[13.5px] mt-1">
          {`It may be spelled differently here, or we may not list anything there yet.`}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
          <Link href={`/find?q=${encodeURIComponent(stateName)}#results`} className={offer}>
            {`Browse all ${stateName} listings`}
          </Link>
          {/* mode=text is explicit consent to the keyword path: without it a
              bare city name could resolve to a same-named town in a state the
              visitor never asked about. */}
          <Link href={`/find?q=${encodeURIComponent(city)}&mode=text#results`} className={offer}>
            {`Search “${city}” as text`}
          </Link>
        </div>
      </div>
    </>
  )
}

/**
 * Ambiguous town names get a choice, not a guess: a stressed visitor can
 * overlook a correction strip and trust results for the wrong Springfield.
 * No geographic results render until the place is settled. Each option is a
 * plain link to its own disambiguated query URL, so it is keyboard-operable
 * by construction and back/refresh/share all reproduce the choice.
 */
const CHOOSER_HEADING_ID = 'chooser-heading'

function PlaceChooser({ city, candidates }: { city: string; candidates: PlaceCandidate[] }) {
  const seen = new Set<string>()
  const options = candidates.filter((c) => {
    const key = `${c.city.toLowerCase()}|${c.state}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <>
      <ResultsHeader title={`Which ${city}?`} headingId={CHOOSER_HEADING_ID} />
      {/* Without this a keyboard user lands back at the top of the document
          and tabs past the nav and all six category tiles to reach a choice. */}
      <FocusOnMount targetId={CHOOSER_HEADING_ID} />
      <p className="text-sm text-mid mb-5">Choose a state to see nearby centers.</p>
      <ul role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {options.map((c) => {
          const label = `${c.city}, ${c.state}`
          return (
            <li key={label}>
              <Link
                href={`/find?q=${encodeURIComponent(label)}#results`}
                className="card-hover flex items-center min-h-[44px] bg-white border border-[var(--border)] rounded-[12px] px-4 py-2.5 text-[15px] text-navy font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--teal)]"
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function DistanceResults({
  q,
  outcome,
}: {
  q: string
  outcome: Extract<Outcome, { kind: 'distance' }>
}) {
  const { place, results, hasMore, page } = outcome
  const nearest = results[0]?.distance_miles ?? null

  return (
    <>
      <ResultsHeader title={`Nearest listed centers to ${place}`} />
      <p className="text-sm text-mid mb-2">
        Approximate straight-line distances from the center of {place}. Travel distances may be longer.
      </p>

      {/* Same rounded figure as the cards, so the note can never contradict a
          card reading exactly 50.0 mi. */}
      {nearest !== null && nearest > 50 && (
        <p className="text-sm text-dark mb-2">
          The closest center listed for this search is about {nearest.toFixed(1)} miles from {place}.
        </p>
      )}

      <div className="mb-5" aria-hidden />

      {results.length === 0 ? (
        <EmptyState
          title="No listings with a location yet."
          body="We're growing this directory. Try a nearby city, or browse a category above."
        />
      ) : (
        <>
          <FacilityList results={results} icon="📍" iconBg="var(--teal-10)" showTypeBadge />
          {hasMore && (
            <div className="flex justify-center mt-5">
              <Link
                href={`/find?q=${encodeURIComponent(q)}&page=${page + 1}#results`}
                className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-[12px] border border-[var(--border)] bg-white text-teal font-semibold text-sm hover:border-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--teal)]"
              >
                Show more
              </Link>
            </div>
          )}
          <p className="text-[12px] text-mid mt-4">
            Showing the {results.length} nearest listed centers.
          </p>
        </>
      )}
    </>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-[var(--border)] rounded-[14px] bg-white p-6 text-center">
      <p className="text-navy font-semibold text-[15px]">{title}</p>
      <p className="text-mid text-[13.5px] mt-1">{body}</p>
    </div>
  )
}

const TYPE_BADGE_LABEL: Record<string, string> = {
  treatment: 'Treatment',
  outpatient: 'Outpatient',
  therapist: 'Therapist',
  sober_living: 'Sober Living',
  venue: 'Sober Venue',
}

function FacilityList({
  results,
  icon,
  iconBg,
  showTypeBadge,
}: {
  results: FacilityCard[]
  icon: string
  iconBg: string
  showTypeBadge: boolean
}) {
  return (
    <ul role="list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {results.map((f) => (
        <li key={f.id}>
          <Link
            href={`/find/${f.id}`}
            className="card-hover block bg-white border border-[var(--border)] rounded-[14px] overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--teal)]"
          >
            <div className="flex flex-wrap">
              <div
                className="shrink-0 flex items-center justify-center text-[36px]"
                style={{ width: 108, minHeight: 96, background: iconBg }}
                aria-hidden
              >
                {icon}
              </div>
              <div className="flex-1 p-4 px-5 min-w-0">
                <div className="flex flex-wrap gap-2 mb-1.5">
                  {showTypeBadge && f.facility_type && TYPE_BADGE_LABEL[f.facility_type] && (
                    <span className="inline-flex items-center text-xs font-semibold rounded-full px-3 py-0.5" style={{ color: 'var(--navy)', background: 'rgba(0,51,102,0.06)', border: '1px solid rgba(0,51,102,0.15)' }}>
                      {TYPE_BADGE_LABEL[f.facility_type]}
                    </span>
                  )}
                  {f.is_featured && (
                    <span className="inline-flex items-center gap-1 bg-[var(--gold-10)] border border-[rgba(212,165,116,0.2)] text-[#9A7B54] text-xs font-semibold rounded-full px-3 py-0.5">
                      ⭐ Featured
                    </span>
                  )}
                  {f.is_verified && f.is_claimed && (
                    <span className="inline-flex items-center gap-1 bg-[var(--teal-10)] border border-[var(--teal-20)] text-teal text-xs font-semibold rounded-full px-3 py-0.5">
                      ✓ Verified
                    </span>
                  )}
                  {!f.is_verified && f.source === 'samhsa' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-0.5" style={{ color: '#4A6785', background: 'rgba(74,103,133,0.08)', border: '1px solid rgba(74,103,133,0.2)' }}>
                      SAMHSA Listed
                    </span>
                  )}
                </div>
                <h3 className="text-[16px] text-navy font-semibold leading-snug line-clamp-2">{f.name}</h3>
                {(f.city || f.state || f.distance_miles != null) && (
                  <p className="text-[13px] text-mid mt-1 flex flex-wrap items-center gap-x-2">
                    {(f.city || f.state) && (
                      <span>📍 {[f.city, f.state].filter(Boolean).join(', ')}</span>
                    )}
                    {/* Distance only ever appears on RPC results — an unknown
                        distance is absent, never rendered as 0 mi. */}
                    {f.distance_miles != null && (
                      <span className="font-semibold text-navy">{formatMiles(f.distance_miles)}</span>
                    )}
                  </p>
                )}
                <div className="flex justify-end mt-2">
                  <span className="text-teal font-semibold text-sm">View Details →</span>
                </div>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
