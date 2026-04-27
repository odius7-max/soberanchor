/**
 * Sobriety duration formatting + math.
 *
 * Single source of truth for converting a sobriety_date into displayed
 * durations and computing milestones. All UI surfaces should use these
 * helpers rather than rolling their own date math.
 *
 * Why this exists: ad-hoc formatters using `Math.round(days / 365)` round
 * 2.59 years up to "3 years" — internally contradicting the "Next milestone:
 * 3 Years · 149 days away" displayed in the same panel. For a recovery
 * product where dates carry emotional weight (especially relapse resets),
 * the floor-rounded honesty matters.
 *
 * No test runner is configured (only Playwright e2e). The expected behaviors
 * below document the contract and should be re-verified manually after any
 * change to these helpers.
 *
 * Test cases (taken with now = 2026-04-27T12:00:00):
 *
 *   daysClean('2026-04-27')         → 0
 *   daysClean('2026-04-26')         → 1
 *   daysClean('2025-04-27')         → 365
 *   daysClean('2023-04-27')         → 731  (spans Feb 29 2024 leap day)
 *   daysClean('2027-01-01')         → 0    (future date clamps to 0)
 *
 *   calendarSinceSobriety('2023-09-23') → { years:2, months:7, days:4 }
 *   calendarSinceSobriety('2024-04-27') → { years:2, months:0, days:0 }
 *   calendarSinceSobriety('2024-04-28') → { years:1, months:11, days:30 }
 *   calendarSinceSobriety('2026-03-30') → { years:0, months:0, days:28 }
 *
 *   fmtSobrietyDuration('2023-09-23')  → "2 years, 7 months"   (NOT "3 years")
 *   fmtSobrietyDuration('2023-04-27')  → "3 years"
 *   fmtSobrietyDuration('2025-04-27')  → "1 year"
 *   fmtSobrietyDuration('2026-03-27')  → "1 month"
 *   fmtSobrietyDuration('2026-04-27')  → "Today"
 *   fmtSobrietyDuration('2023-09-23', now, { granular:false }) → "2 years"
 *
 *   getNextMilestone('2023-09-23').label    → "3 Years"
 *   getNextMilestone('2023-09-23').daysAway → 149
 *   getNextMilestone('2026-04-27').label    → "24 hours"
 *   getNextMilestone('2026-03-28').label    → "60 days"
 *   getNextMilestone('2025-04-27').label    → "2 Years"
 */

const MS_PER_DAY = 86_400_000

/**
 * Days clean from a sobriety date string ('YYYY-MM-DD') to "now".
 * Uses local-time interpretation of the date string (T00:00:00 in user's TZ),
 * compared against Date.now(). Floor-divided into whole days.
 */
export function daysClean(sobrietyDateStr: string, now: Date = new Date()): number {
  const start = new Date(sobrietyDateStr + 'T00:00:00').getTime()
  return Math.max(0, Math.floor((now.getTime() - start) / MS_PER_DAY))
}

/**
 * Years and months elapsed since the sobriety date.
 * Uses calendar arithmetic — handles leap years correctly by walking
 * month-by-month rather than dividing by 365.
 */
export function calendarSinceSobriety(
  sobrietyDateStr: string,
  now: Date = new Date(),
): { years: number; months: number; days: number } {
  const start = new Date(sobrietyDateStr + 'T00:00:00')
  const startY = start.getFullYear()
  const startM = start.getMonth()
  const startD = start.getDate()

  let years = now.getFullYear() - startY
  let months = now.getMonth() - startM
  let days = now.getDate() - startD

  if (days < 0) {
    months -= 1
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
    days += prevMonthLastDay
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  if (years < 0) return { years: 0, months: 0, days: 0 }
  return { years, months, days }
}

/**
 * Human-readable duration string for display.
 *
 * Format hierarchy:
 *   < 1 day      → "Today"
 *   < 30 days    → "5 days"
 *   < 1 year     → "8 months"  or  "8 months, 14 days" (granular)
 *   ≥ 1 year     → "2 years, 7 months"  or  "2 years" (non-granular or exact anniversary)
 *
 * Math.floor semantics — someone at 2 years 11 months is "2 years, 11 months",
 * never "3 years".
 */
export function fmtSobrietyDuration(
  sobrietyDateStr: string,
  now: Date = new Date(),
  options: { granular?: boolean } = { granular: true },
): string {
  const { years, months, days } = calendarSinceSobriety(sobrietyDateStr, now)

  if (years === 0 && months === 0 && days === 0) return 'Today'

  if (years === 0 && months === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`
  }

  if (years === 0) {
    if (!options.granular || days === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`
    }
    return `${months} month${months !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}`
  }

  if (!options.granular || months === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`
  }
  return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`
}

/**
 * Short form for compact display (e.g. dashboard hero stat block).
 *
 *   < 365 days   → "127 days"
 *   ≥ 365 days   → "2y 7m"  or  "3 years" if exactly on anniversary
 */
export function fmtSobrietyShort(
  sobrietyDateStr: string,
  now: Date = new Date(),
): string {
  const days = daysClean(sobrietyDateStr, now)
  if (days < 365) return `${days.toLocaleString()} days`

  const { years, months } = calendarSinceSobriety(sobrietyDateStr, now)
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`
  return `${years}y ${months}m`
}

/**
 * Days remaining until the next major milestone.
 * Major milestones: 24h, 1w, 2w, 30d, 60d, 90d, 4mo, 6mo, 9mo, then yearly
 * anniversaries up to 30 years.
 *
 * Returns { label, daysAway } or null past the 30-year cap.
 */
export function getNextMilestone(
  sobrietyDateStr: string,
  now: Date = new Date(),
): { label: string; daysAway: number } | null {
  const start = new Date(sobrietyDateStr + 'T00:00:00')
  const days = daysClean(sobrietyDateStr, now)

  const EARLY = [
    { d: 1,   label: '24 hours' },
    { d: 7,   label: '1 week'   },
    { d: 14,  label: '2 weeks'  },
    { d: 30,  label: '30 days'  },
    { d: 60,  label: '60 days'  },
    { d: 90,  label: '90 days'  },
    { d: 120, label: '4 months' },
    { d: 180, label: '6 months' },
    { d: 270, label: '9 months' },
  ]

  const earlyHit = EARLY.find(m => m.d > days)
  if (earlyHit) return { label: earlyHit.label, daysAway: earlyHit.d - days }

  // Yearly anniversaries — calendar math, not days/365, so leap years don't drift.
  const yearsSoFar = calendarSinceSobriety(sobrietyDateStr, now).years
  const nextYear = yearsSoFar + 1
  if (nextYear > 30) return null

  const nextAnniversary = new Date(start)
  nextAnniversary.setFullYear(start.getFullYear() + nextYear)
  const daysAway = Math.ceil((nextAnniversary.getTime() - now.getTime()) / MS_PER_DAY)

  return {
    label: `${nextYear} Year${nextYear !== 1 ? 's' : ''}`,
    daysAway: Math.max(0, daysAway),
  }
}
