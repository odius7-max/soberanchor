/**
 * SAMHSA FindTreatment.gov → SoberAnchor facilities table transform.
 *
 * Usage:
 *   const row = transformFacility(rawSamhsaRecord)
 *   if (!row) continue  // skip — bad coordinates or missing ID
 *   await supabase.from('facilities').upsert(row, { onConflict: 'samhsa_id' })
 *
 * Actual API format (verified 2026-04):
 *   - No frid/_id field — generate deterministic samhsa_id from address
 *   - services: Array of { f1: string; f2: string; f3: string } objects
 *     where f2 is the category code and f3 is the semicolon-separated description
 *   - typeFacility: camelCase string (usually "SA")
 *   - latitude/longitude: string representations of floats
 */

export type FacilityType = 'treatment' | 'sober_living' | 'therapist' | 'venue' | 'outpatient' | 'telehealth'
export type ListingTier  = 'basic' | 'enhanced' | 'premium'

/** Shape of a raw record from the SAMHSA findtreatment.gov /locator/exportsAsJson/v2 API. */
export interface SamhsaRawRecord {
  _irow?:       number  | null
  name1?:       string  | null
  name2?:       string  | null
  street1?:     string  | null
  street2?:     string  | null
  city?:        string  | null
  state?:       string  | null
  zip?:         string  | null
  phone?:       string  | null
  intake1?:     string  | null
  hotline1?:    string  | null
  website?:     string  | null
  latitude?:    number  | string | null
  longitude?:   number  | string | null
  /** Array of {f1: label, f2: code, f3: description} service category objects */
  services?:    Array<{ f1?: string; f2?: string; f3?: string }> | string[] | null
  typeFacility?: string | null
  // Legacy / alternate field names (older API versions)
  frid?:        string  | null
  _id?:         string  | null
  type_facility?: string | null
  payments?:    string[] | null
  [key: string]: unknown
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
    try {
      const u2 = new URL(`https://${trimmed}`)
      return u2.hostname.includes('.') ? `https://${trimmed}` : null
    } catch {
      return null
    }
  }
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
 * Generate a deterministic samhsa_id from address fields.
 * The SAMHSA export API does not expose a stable facility ID, so we derive
 * one from name + street + city + state + zip. This is stable across re-imports
 * as long as the address doesn't change, which is sufficient for upsert dedup.
 */
function generateSamhsaId(name: string, street: string, city: string, state: string, zip: string): string {
  const n = kebab(name).slice(0, 35)
  const s = kebab(street).slice(0, 20)
  const c = kebab(city).slice(0, 12)
  const st = state.toLowerCase().replace(/[^a-z]/g, '').slice(0, 2)
  const z = zip.replace(/\D/g, '').slice(0, 5)
  return [n, s, c, st, z].filter(Boolean).join('-')
}

/**
 * Deterministic 6-char base-36 hash of a string.
 * Uses a djb2-style multiply-and-XOR so every unique samhsa_id
 * produces a unique-enough suffix regardless of shared zip/state tails.
 */
function slugSuffix(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return Math.abs(h).toString(36).padStart(6, '0').slice(-6)
}

/**
 * Generate a URL-friendly slug for the facility detail page.
 * Appends a 6-char hash of samhsa_id to guarantee uniqueness even when
 * multiple facilities share the same name, city, state, and zip code.
 */
function generateSlug(name: string, city: string, state: string, samhsaId: string): string {
  const n  = kebab(name).slice(0, 50)
  const c  = kebab(city).slice(0, 15)
  const st = state.toLowerCase().replace(/[^a-z]/g, '').slice(0, 2)
  return [n, c, st, slugSuffix(samhsaId)].filter(Boolean).join('-')
}

/**
 * Parse the actual SAMHSA v2 services array.
 * Handles both the current format ({f1,f2,f3}[] objects) and the legacy format (string[]).
 * Returns a map of category code → description text.
 */
function parseServiceCategories(
  raw: Array<{ f1?: string; f2?: string; f3?: string }> | string[] | null | undefined
): Map<string, string> {
  const map = new Map<string, string>()
  if (!Array.isArray(raw)) return map

  for (const item of raw) {
    if (typeof item === 'string') {
      // Legacy format: plain service code string
      map.set(item, item)
    } else if (item && typeof item === 'object') {
      const code = (item.f2 ?? '').trim()
      const desc = (item.f3 ?? '').trim()
      if (code) map.set(code, desc)
    }
  }
  return map
}

/**
 * Derive facility_type from service categories.
 * Uses the SET (Service Setting) description text from the actual API format,
 * plus legacy string-code support.
 */
function deriveFacilityType(categories: Map<string, string>): FacilityType {
  // Current API format: check SET (Service Setting) description
  const setting = (categories.get('SET') ?? '').toLowerCase()
  if (setting) {
    if (setting.includes('residential') || setting.includes('hospital inpatient') ||
        setting.includes('detox') || setting.includes('long-term')) {
      return 'treatment'
    }
    if (setting.includes('outpatient')) return 'outpatient'
  }

  // Legacy format: check raw service codes
  if (categories.has('DT') || categories.has('HH') || categories.has('RL') || categories.has('RES')) {
    return 'treatment'
  }
  if (categories.has('OP') || categories.has('IOT') || categories.has('OTR')) {
    return 'outpatient'
  }

  return 'treatment'
}

/** Detect insurance acceptance from PAY description or legacy payment codes. */
function deriveAcceptsInsurance(categories: Map<string, string>, legacyPayments: string[] | null): boolean {
  // Current API format: PAY entry f3 text
  const payText = (categories.get('PAY') ?? '').toLowerCase()
  if (payText) {
    return payText.includes('medicare') ||
           payText.includes('medicaid') ||
           payText.includes('private health insurance') ||
           payText.includes('military') ||
           payText.includes('tricare') ||
           payText.includes('state-financed')
  }
  // Legacy format: payment code array
  if (legacyPayments) {
    const p = new Set(legacyPayments)
    return p.has('PI') || p.has('MD') || p.has('MC') || p.has('MI')
  }
  return false
}

/** Detect private pay / self-pay from PAY description or legacy payment codes. */
function deriveAcceptsPrivatePay(categories: Map<string, string>, legacyPayments: string[] | null): boolean {
  // Current API format
  const payText = (categories.get('PAY') ?? '').toLowerCase()
  if (payText) {
    return payText.includes('cash or self-payment') ||
           payText.includes('sliding') ||
           payText.includes('self-pay')
  }
  // Legacy format
  if (legacyPayments) {
    const p = new Set(legacyPayments)
    return p.has('SF') || p.has('SS')
  }
  return false
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Transform a raw SAMHSA API record into a FacilityInsert row.
 *
 * Returns null for records that should be skipped:
 *   - Cannot derive a unique samhsa_id (empty name + address)
 *   - 0,0 coordinates (facility has no usable location)
 */
export function transformFacility(raw: SamhsaRawRecord): FacilityInsert | null {
  const name    = (raw.name1 ?? '').trim()
  const street1 = (raw.street1 ?? '').trim()
  const city    = (raw.city ?? '').trim()
  const state   = (raw.state ?? '').trim().toUpperCase()
  const zip     = (raw.zip ?? '').trim().replace(/\D/g, '').slice(0, 5)

  // Try legacy SAMHSA primary keys first; fall back to address-derived ID
  const samhsaId = (raw.frid ?? raw._id ?? '').trim() ||
    generateSamhsaId(name, street1, city, state, zip)

  // Skip if we can't generate any unique key (completely empty record)
  if (!samhsaId) return null

  const lat = toFloat(raw.latitude)
  const lng = toFloat(raw.longitude)
  // Skip placeholder 0,0 coordinates
  if (lat === 0 && lng === 0) return null

  // Parse services in current {f1,f2,f3} format OR legacy string array
  const categories = parseServiceCategories(
    raw.services as Array<{ f1?: string; f2?: string; f3?: string }> | string[] | null
  )

  // Build a normalized service code array for storage (current API: use f2 codes)
  const serviceCodes: string[] = Array.isArray(raw.services)
    ? raw.services
        .map(s => typeof s === 'string' ? s : (s as { f2?: string }).f2 ?? '')
        .filter(Boolean)
    : []

  // Legacy payments array (old API format only)
  const legacyPayments = Array.isArray(raw.payments) ? raw.payments as string[] : null

  return {
    samhsa_id:           samhsaId,
    name:                name || 'Unnamed Facility',
    slug:                generateSlug(name || 'unnamed-facility', city, state, samhsaId),
    phone:               normalizePhone(raw.phone ?? raw.intake1),
    website:             normalizeWebsite(raw.website),
    address_line1:       street1 || null,
    address_line2:       (raw.street2 ?? '').trim() || null,
    city:                city || null,
    state:               state || null,
    zip:                 zip || null,
    latitude:            lat,
    longitude:           lng,
    facility_type:       deriveFacilityType(categories),
    listing_tier:        'basic',
    is_verified:         true,
    is_featured:         false,
    is_claimed:          false,
    accepts_insurance:   deriveAcceptsInsurance(categories, legacyPayments),
    accepts_private_pay: deriveAcceptsPrivatePay(categories, legacyPayments),
    source:              'samhsa',
    last_synced_at:      new Date().toISOString(),
    services:            serviceCodes.length > 0 ? serviceCodes : null,
    payments:            legacyPayments,
    description:         null,
    email:               null,
    provider_account_id: null,
    operating_hours:     null,
  }
}
