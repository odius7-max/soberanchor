import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import DirectorySearch from '@/components/find/DirectorySearch'
import CategoryLane, { type LaneTile } from '@/components/find/CategoryLane'
import FeaturedBand from '@/components/find/FeaturedBand'

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
  const clean = term.replace(/[%_,]/g, '')
  if (!clean) return []
  const { data } = await supabase
    .from('facilities')
    .select(`${CARD_SELECT}, facility_type`)
    .or(`name.ilike.%${clean}%,city.ilike.%${clean}%`)
    .order('name')
    .limit(limit)
  return (data ?? []) as FacilityCard[]
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
  searchParams: Promise<{ category?: string; q?: string }>
}

function isCategoryKey(v: string | undefined): v is CategoryKey {
  return !!v && (CATEGORY_KEYS as readonly string[]).includes(v)
}

export default async function FindPage({ searchParams }: FindPageProps) {
  const params = await searchParams
  const category: CategoryKey = isCategoryKey(params.category) ? params.category : 'treatment'
  const q = (params.q ?? '').trim().slice(0, 100)

  const [countEntries, activePreview, searchResults] = await Promise.all([
    Promise.all(CATEGORY_KEYS.map(async (k) => [k, await countFor(k)] as const)),
    q ? Promise.resolve([] as FacilityCard[]) : previewFor(category, 10),
    q ? keywordSearch(q, 15)                  : Promise.resolve([] as FacilityCard[]),
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
          {q ? (
            <SearchResults q={q} results={searchResults} />
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

function SearchResults({ q, results }: { q: string; results: FacilityCard[] }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <h2
          className="text-[22px] font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)', letterSpacing: '-0.5px' }}
        >
          Search results
        </h2>
        <Link href="/find" className="text-teal text-sm font-semibold hover:underline whitespace-nowrap">
          Clear search →
        </Link>
      </div>
      <p className="text-sm text-mid mb-5">
        Matches for <span className="text-dark font-semibold">&ldquo;{q}&rdquo;</span> across name and city.
      </p>

      {results.length === 0 ? (
        <EmptyState
          title="No matches."
          body="Try different keywords, or pick a category above to browse."
        />
      ) : (
        <FacilityList results={results} icon="🔎" iconBg="var(--warm-gray)" showTypeBadge />
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
                {(f.city || f.state) && (
                  <p className="text-[13px] text-mid mt-1">
                    📍 {[f.city, f.state].filter(Boolean).join(', ')}
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
