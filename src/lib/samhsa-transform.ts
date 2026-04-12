/**
 * SAMHSA FindTreatment.gov → SoberAnchor facilities table transform.
 *
 * Usage:
 *   const row = transformFacility(rawSamhsaRecord)
 *   if (!row) continue  // skip — bad coordinates or missing ID
 *   await supabase.from('facilities').upsert(row, { onConflict: 'samhsa_id' })
 *
 * Field mapping spec: SAMHSA-FACILITY-FIELD-MAPPING.md
 */

export type FacilityType = 'treatment' | 'sober_living' | 'therapist' | 'venue' | 'outpatient' | 'telehealth'
export type ListingTier  = 'basic' | 'enhanced' | 'premium'

/** Shape of a raw record from the SAMHSA findtreatment.gov /locator/exportsAsJson/v2 API. */
export interface SamhsaRawRecord {
  frid?:          string | null
  _id?:           string | null
  name1?:         string | null
  name2?:         string | null
  street1?:       string | null
  street2?:       string | null
  city?:          string | null
  state?:         string | null
  zip?:           string | null
  phone?:         string | null
  website?:       string | null
  latitude?:      number | string | null
  longitude?:     number | string | null
  type_facility?: string | null
  services?:      string[] | null
  payments?:      string[] | null
  [key: string]:  unknown
}

/** Columns written on upsert — excludes DB-managed fields (id, created_at, updated_at, avg_rating, review_count). */
export interface FacilityInsert {
  samhsa_id:           string
  name:                string
  slug:                string
  phone:               string | null
  website:             string | null
  address_line1:       string | null
  address_line2:       string | null
  city:                string | null
  state:               string | null
  zip:                 string | null
  latitude:            number | null
  longitude:           number | null
  facility_type:       FacilityType
  listing_tier:        ListingTier
  is_verified:         boolean
  is_featured:         boolean
  is_claimed:          boolean
  accepts_insurance:   boolean
  accepts_private_pay: boolean
  source:              string
  last_synced_at:      string
  services:            string[] | null
  payments:            string[] | null
  description:         null
  email:               null
  provider_account_id: null
  operating_hours:     null
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Strip all non-digit characters then format as (XXX) XXX-XXXX. Returns null if not 10 digits. */
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  // Drop leading country code 1 if 11 digits
  const ten = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits
  if (ten.length !== 10) return null
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}

/** Returns the URL string if valid http(s), otherwise null. */
function normalizeWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  try {
    const u = new URL(trimmed)
    return u.protocol === 'http:' || u.protocol === 'https:' ? trimmed : null
  } catch {
    // Try prepending https:// for bare domains like "example.com"
    try {
      const u2 = new URL(`https://${trimmed}`)
      return u2.hostname.includes('.') ? `https://${trimmed}` : null
    } catch {
      return null
    }
  }
}

/** Derive facility_type from SAMHSA service code array. */
function deriveFacilityType(services: string[] | null | undefined): FacilityType {
  const s = new Set(services ?? [])
  if (s.has('DT') || s.has('HH') || s.has('RL') || s.has('RES')) return 'treatment'
  if (s.has('OP') || s.has('IOT') || s.has('OTR'))               return 'outpatient'
  return 'treatment'
}

/** true if any insurance payment code is present. */
function deriveAcceptsInsurance(payments: string[] | null | undefined): boolean {
  const p = new Set(payments ?? [])
  return p.has('PI') || p.has('MD') || p.has('MC') || p.has('MI')
}

/** true if self-pay or sliding scale is present. */
function deriveAcceptsPrivatePay(payments: string[] | null | undefined): boolean {
  const p = new Set(payments ?? [])
  return p.has('SF') || p.has('SS')
}

/** Convert any value to a finite float; return 0 on failure. */
function toFloat(val: number | string | null | undefined): number {
  const n = parseFloat(String(val ?? 0))
  return isFinite(n) ? n : 0
}

/** Kebab-case a string: lowercase, replace non-alphanumeric runs with hyphens, trim edges. */
function kebab(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Generate a deterministic, unique slug.
 * Pattern: <name-60>-<city-20>-<state>-<samhsaId-8>
 * All segments guaranteed unique because samhsa_id is the SAMHSA primary key.
 */
function generateSlug(name: string, city: string, state: string, samhsaId: string): string {
  const namePart  = kebab(name).slice(0, 60)
  const cityPart  = kebab(city).slice(0, 20)
  const statePart = state.toLowerCase().replace(/[^a-z]/g, '')
  const idPart    = samhsaId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()
  return [namePart, cityPart, statePart, idPart].filter(Boolean).join('-')
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Transform a raw SAMHSA API record into a FacilityInsert row.
 *
 * Returns null for records that should be skipped:
 *   - Missing samhsa_id (can't dedup)
 *   - 0,0 coordinates (facility has no usable location)
 */
export function transformFacility(raw: SamhsaRawRecord): FacilityInsert | null {
  // Resolve the SAMHSA primary key — field varies by API version
  const samhsaId = (raw.frid ?? raw._id ?? '').trim()
  if (!samhsaId) return null

  const lat = toFloat(raw.latitude)
  const lng = toFloat(raw.longitude)
  // Skip placeholder coordinates
  if (lat === 0 && lng === 0) return null

  const name     = (raw.name1 ?? '').trim()
  const city     = (raw.city  ?? '').trim()
  const state    = (raw.state ?? '').trim().toUpperCase()
  const services = Array.isArray(raw.services) ? raw.services : null
  const payments = Array.isArray(raw.payments) ? raw.payments : null

  return {
    samhsa_id:           samhsaId,
    name:                name || 'Unnamed Facility',
    slug:                generateSlug(name || 'unnamed-facility', city, state, samhsaId),
    phone:               normalizePhone(raw.phone),
    website:             normalizeWebsite(raw.website),
    address_line1:       (raw.street1 ?? '').trim() || null,
    address_line2:       (raw.street2 ?? '').trim() || null,
    city:                city || null,
    state:               state || null,
    zip:                 (raw.zip ?? '').trim().slice(0, 5) || null,
    latitude:            lat,
    longitude:           lng,
    facility_type:       deriveFacilityType(services),
    listing_tier:        'basic',
    is_verified:         true,
    is_featured:         false,
    is_claimed:          false,
    accepts_insurance:   deriveAcceptsInsurance(payments),
    accepts_private_pay: deriveAcceptsPrivatePay(payments),
    source:              'samhsa',
    last_synced_at:      new Date().toISOString(),
    services,
    payments,
    // Nullable columns — populated by providers after claiming
    description:         null,
    email:               null,
    provider_account_id: null,
    operating_hours:     null,
  }
}
