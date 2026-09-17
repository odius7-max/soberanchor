/**
 * CLAIM-FLOW-SPEC §2 (ODI-66) — the single validator for "where was this person
 * headed before we asked them to sign in".
 *
 * Every surface that carries the continuation uses this: the Edge middleware,
 * the claim page's own auth guard, and the auth modal. One implementation means
 * they cannot drift apart and disagree about what is safe.
 *
 * Deliberately narrow. This is an open-redirect surface, so the validator
 * allowlists exactly one destination shape rather than trying to enumerate
 * attacks: the exact pathname `/providers/claim`, optionally with a single
 * `facility` key whose value is a UUID. A `startsWith` check would let
 * `/providers/claim-evil` through; exact equality does not.
 *
 * The returned string is rebuilt from the parsed pieces, never echoed from
 * input, so nothing unexpected can survive validation.
 *
 * Edge-runtime safe: URL and string operations only.
 */

export const CLAIM_PATH = '/providers/claim'
export const CONTINUATION_PARAM = 'next'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Parsing base. Any input that is genuinely relative keeps this origin; an
// absolute or protocol-relative URL replaces it and is rejected on that basis.
const LOCAL_BASE = 'http://continuation.invalid'

/**
 * Validate a continuation target.
 *
 * @returns a canonical local URL (`/providers/claim` or
 *          `/providers/claim?facility=<uuid>`), or null if unusable.
 */
export function validateContinuation(raw: unknown): string | null {
  if (typeof raw !== 'string') return null

  const value = raw.trim()
  if (!value) return null
  if (value.length > 256) return null

  // Backslashes: browsers normalise `\` to `/`, so `/\evil.com` can become the
  // protocol-relative `//evil.com` after the fact. Reject before that happens.
  if (value.includes('\\')) return null

  // Must be site-root-relative, and not protocol-relative.
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null

  // Fragments carry nothing we support and complicate canonicalisation.
  if (value.includes('#')) return null

  // Malformed percent-encoding — reject rather than let the browser guess.
  try {
    decodeURIComponent(value)
  } catch {
    return null
  }

  let url: URL
  try {
    url = new URL(value, LOCAL_BASE)
  } catch {
    return null
  }

  // An absolute input would have replaced the base origin. Credentials are
  // never legitimate here.
  if (url.origin !== LOCAL_BASE) return null
  if (url.username || url.password) return null

  if (url.pathname !== CLAIM_PATH) return null

  // Query: nothing, or exactly one `facility=<uuid>`. Unknown or duplicated
  // keys are a signal something is being smuggled through — reject outright
  // rather than silently dropping them.
  const keys = [...url.searchParams.keys()]
  if (keys.length === 0) return CLAIM_PATH
  if (keys.length !== 1 || keys[0] !== 'facility') return null

  const values = url.searchParams.getAll('facility')
  if (values.length !== 1) return null

  const facilityId = values[0]
  if (!UUID_RE.test(facilityId)) return null

  return `${CLAIM_PATH}?facility=${facilityId.toLowerCase()}`
}

/** Build the continuation for a claim entry point. */
export function buildContinuation(facilityId?: string | null): string {
  if (facilityId && UUID_RE.test(facilityId)) {
    return `${CLAIM_PATH}?facility=${facilityId.toLowerCase()}`
  }
  return CLAIM_PATH
}

/** The facility UUID inside an already-validated continuation, if it has one. */
export function continuationFacilityId(continuation: string | null): string | null {
  if (!continuation) return null
  const validated = validateContinuation(continuation)
  if (!validated) return null
  const q = validated.indexOf('?facility=')
  return q === -1 ? null : validated.slice(q + '?facility='.length)
}

/** True when a continuation points at a specific facility claim. */
export function isClaimContinuation(continuation: string | null): boolean {
  return validateContinuation(continuation) !== null
}

/**
 * Where to send someone who cancels out of a claim.
 *
 * Deterministic by design: a direct or shared link may have no same-site
 * history entry, so history.back() can strand the user (or bounce them off the
 * site). With a facility we return to that listing; without one, to the
 * provider landing page.
 */
export function claimCancelHref(facilityId: string | null): string {
  return facilityId && UUID_RE.test(facilityId) ? `/find/${facilityId}` : '/for-providers'
}

/** Validate a bare facility id from a query string. */
export function validateFacilityId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim().toLowerCase()
  return UUID_RE.test(value) ? value : null
}
