/**
 * The provider listing ladder — single source of truth (ODI-75).
 *
 * Every provider-facing price and feature string comes from here: the public
 * /for-providers pricing table, Plan & Billing, My Listing's plan panel, the
 * Overview and Leads upsells, and the admin facility tier selectors.
 *
 * Before this existed the same ladder was retyped in five places and had
 * drifted badly — the dashboard quoted paid prices roughly 50% above the
 * published ones, sold the Verified badge as an Enhanced perk when it ships
 * free with any claim, and promised Premium priority placement in organic
 * results, in direct contradiction of the published policy that payment never
 * affects organic ranking. Add a tier fact once, here, and every surface agrees.
 *
 * Source: PROVIDER-PREMIUM-SPEC.md ("Listing Tiers — Locked Rules v1").
 *
 * NOT the Sponsor Pro ladder. That's a separate product (free/pro/founding on
 * provider_accounts.subscription_tier, /program, /upgrade) and must not be
 * merged into this one.
 */

/** Matches the `listing_tier` enum on `facilities`. */
export type TierId = 'basic' | 'enhanced' | 'premium'

export interface ProviderTier {
  /** Database enum value. */
  id: TierId
  /** Consumer-facing name. Note `basic` is called "Claimed" everywhere. */
  name: string
  /** Founding Partner rate, 0 for free. */
  price: number
  /** List rate once Founding Partner pricing ends; null for free. */
  regularPrice: number | null
  recommended?: boolean
  tagline: string
  features: string[]
  footnote: string
}

export const PROVIDER_TIERS: ProviderTier[] = [
  {
    id: 'basic',
    name: 'Claimed',
    price: 0,
    regularPrice: null,
    tagline: 'Own and protect your listing.',
    features: [
      'Verified ✓ Claimed badge on your page',
      'Edit your description, hours, and contact info',
      'Up to 3 facility photos',
      'Corrections to your SAMHSA-sourced data',
      'Monthly page-view stats',
      'Protection against unauthorized listing edits',
    ],
    footnote: 'No credit card. No time limit. Claiming is free forever.',
  },
  {
    id: 'enhanced',
    name: 'Enhanced',
    price: 99,
    regularPrice: 199,
    recommended: true,
    tagline: 'Make your page yours.',
    features: [
      'Everything in Claimed',
      'Full photo gallery and video tour',
      'Your logo and branding on the page',
      'Staff profiles and amenities section',
      'Inquiry capture — families can request a callback, routed only to you',
      'Highlighted insurance and payment section',
      'No other centers shown on your page',
      'Inquiry and page analytics dashboard',
    ],
    footnote: 'Flat monthly rate. Annual billing: 2 months free.',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 299,
    regularPrice: 499,
    tagline: 'Stand out — visibly and honestly.',
    features: [
      'Everything in Enhanced',
      '⭐ Featured placement in the directory — always clearly labeled',
      'Featured badge on your listing page',
      'Call-tracking analytics on your own number',
      'Quarterly performance report',
      'Priority support',
    ],
    footnote: 'Featured placement is labeled sponsorship. It never changes organic search results.',
  },
]

export function getTier(id: string): ProviderTier {
  return PROVIDER_TIERS.find(t => t.id === id) ?? PROVIDER_TIERS[0]
}

/**
 * Compact price for dashboard panels and upsells: "Free forever" /
 * "$99/mo Founding Partner rate".
 *
 * The qualifier is not optional. Founding Partner pricing is locked for 12
 * months and then rises to `regularPrice`, so a bare "$99/mo" anywhere in the
 * product is a number that quietly expires. Every compact mention carries it.
 */
export function tierPriceQualified(tier: ProviderTier): string {
  if (tier.price === 0) return 'Free forever'
  return tier.regularPrice
    ? `$${tier.price}/mo Founding Partner rate`
    : `$${tier.price}/mo`
}

/** Suffix for the big pricing table: "/mo · Founding Partner rate (regularly $199)". */
export function tierPricePeriod(tier: ProviderTier): string {
  if (tier.price === 0) return 'forever'
  return tier.regularPrice
    ? `/mo · Founding Partner rate (regularly $${tier.regularPrice})`
    : '/mo'
}

/** Admin facility tier selector: "Claimed (Free)" / "Enhanced ($99/mo)". */
export function adminTierLabel(tier: ProviderTier): string {
  return tier.price === 0 ? `${tier.name} (Free)` : `${tier.name} ($${tier.price}/mo)`
}

/**
 * Upgrade requests are an email hand-off, not automated provisioning — there
 * is no billing integration yet. Callers must be honest that this composes a
 * message the provider still has to send.
 */
export const PROVIDER_SUPPORT_EMAIL = 'providers@soberanchor.com'

export function upgradeMailto(tier: ProviderTier): string {
  const subject = `Upgrade to ${tier.name} — $${tier.price}/mo`
  const body = [
    `I'd like to upgrade my SoberAnchor listing to ${tier.name} ($${tier.price}/mo).`,
    '',
    'Facility name:',
    'Listing URL:',
    'Best contact number:',
  ].join('\n')
  return `mailto:${PROVIDER_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/**
 * Listing views and contact clicks are not instrumented yet — nothing counts
 * them, so no surface may present a number for them. The locked ladder also
 * promises "Monthly page-view stats" to the FREE tier, so view stats must
 * never be advertised as an Enhanced-only unlock. Flip this when real
 * instrumentation lands.
 */
export const PAGE_ANALYTICS_LIVE = false
