// ODI-52: tier resolution for the facility detail page and Featured band.
// See PROVIDER-PREMIUM-SPEC.md (repo root) for the locked tier ladder.

export type FacilityTier = 'unclaimed' | 'claimed' | 'enhanced' | 'premium'

/**
 * Resolve a facility's consumer-facing tier from its DB flags.
 *
 * Paid tiers imply claimed (billing enforces that in ODI-54); we render
 * defensively anyway — an enhanced row that somehow isn't claimed still
 * renders as enhanced.
 */
export function facilityTier(f: {
  is_claimed: boolean | null
  is_verified: boolean | null
  listing_tier: string | null
}): FacilityTier {
  if (f.listing_tier === 'premium') return 'premium'
  if (f.listing_tier === 'enhanced') return 'enhanced'
  if (f.is_claimed && f.is_verified) return 'claimed'
  return 'unclaimed'
}

const TIER_RANK: Record<FacilityTier, number> = {
  unclaimed: 0,
  claimed: 1,
  enhanced: 2,
  premium: 3,
}

/** True when `tier` is at least `min` on the ladder (e.g. tierAtLeast(t, 'enhanced')). */
export function tierAtLeast(tier: FacilityTier, min: FacilityTier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[min]
}

// ─── Published-override content (facility_overrides.published) ─────────────────
// All keys optional; render falls back to the SAMHSA base layer when absent.

export type PublishedPhoto = { path: string; caption?: string }
export type PublishedStaff = { name: string; title?: string; photo?: string }

export type FacilityPublished = {
  about?: string
  hours?: Record<string, string>
  phone?: string
  website?: string
  photos?: PublishedPhoto[]
  logo?: string
  video_url?: string
  staff?: PublishedStaff[]
  amenities?: string[]
  insurance_notes?: string
}

const MEDIA_BUCKET = 'facility-media'

/**
 * Resolve a stored media path to a public URL. Accepts either a full URL
 * (returned as-is) or a `facility-media/{id}/x.jpg` style path.
 */
export function facilityMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  const clean = path.replace(new RegExp(`^${MEDIA_BUCKET}/`), '')
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${clean}`
}
