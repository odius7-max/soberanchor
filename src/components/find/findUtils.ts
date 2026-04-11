// findUtils.ts — pure shared utilities for the /find experience (no 'use client')

// ---------------------------------------------------------------------------
// Filter option arrays
// ---------------------------------------------------------------------------

export const FELLOWSHIP_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Fellowships' },
  { value: 'aa', label: 'AA – Alcoholics Anonymous' },
  { value: 'na', label: 'NA – Narcotics Anonymous' },
  { value: 'al-anon', label: 'Al-Anon' },
  { value: 'alateen', label: 'Alateen' },
  { value: 'smart-recovery', label: 'SMART Recovery' },
  { value: 'celebrate-recovery', label: 'Celebrate Recovery' },
  { value: 'oa', label: 'OA – Overeaters Anonymous' },
  { value: 'ga', label: 'GA – Gamblers Anonymous' },
  { value: 'ca', label: 'CA – Cocaine Anonymous' },
  { value: 'ma', label: 'MA – Marijuana Anonymous' },
  { value: 'slaa', label: 'SLAA – Sex & Love Addicts Anonymous' },
  { value: 'refuge-recovery', label: 'Refuge Recovery' },
]

export const DAY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any Day' },
  { value: 'Sunday', label: 'Sunday' },
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
]

export const TIME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any Time' },
  { value: 'morning', label: 'Morning (6am–12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm–5pm)' },
  { value: 'evening', label: 'Evening (5pm–9pm)' },
  { value: 'late_night', label: 'Late Night (9pm+)' },
]

export const FORMAT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any Format' },
  { value: 'in_person', label: 'In Person' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
]

export const MEETING_SPECIALTY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any Type' },
  { value: 'Women', label: 'Women' },
  { value: 'Men', label: 'Men' },
  { value: 'LGBTQ+', label: 'LGBTQ+' },
  { value: 'Young People', label: 'Young People' },
  { value: 'Beginners', label: 'Beginners' },
  { value: 'Speaker', label: 'Speaker' },
  { value: 'Step Study', label: 'Step Study' },
  { value: 'Big Book', label: 'Big Book' },
  { value: 'Discussion', label: 'Discussion' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Secular/Non-Religious', label: 'Secular/Non-Religious' },
  { value: 'Meditation', label: 'Meditation' },
]

export const RADIUS_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 5, label: '5 mi' },
  { value: 10, label: '10 mi' },
  { value: 15, label: '15 mi' },
  { value: 25, label: '25 mi' },
  { value: 50, label: '50 mi' },
]

export const DAY_ORDER: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

export const MEETING_SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'soonest', label: 'Soonest' },
  { value: 'nearest', label: 'Nearest' },
  { value: 'alphabetical', label: 'A–Z' },
]

export const FACILITY_SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'featured', label: 'Featured' },
  { value: 'nearest', label: 'Nearest' },
  { value: 'alphabetical', label: 'A–Z' },
]

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Converts a time string "HH:MM" or "HH:MM:SS" to total minutes since midnight.
 * Returns 0 if the input is null/empty/unparseable.
 */
export function timeToMinutes(t: string | null): number {
  if (!t) return 0
  const parts = t.split(':')
  const hours = parseInt(parts[0] ?? '0', 10)
  const minutes = parseInt(parts[1] ?? '0', 10)
  if (isNaN(hours) || isNaN(minutes)) return 0
  return hours * 60 + minutes
}

/**
 * Returns the time-of-day bucket for a given "HH:MM" time string.
 * morning:    6:00–11:59
 * afternoon: 12:00–16:59
 * evening:   17:00–20:59
 * late_night: 21:00+  (and wraps: 0:00–5:59 is also late_night)
 */
export function getTimeRange(
  timeStr: string | null,
): 'morning' | 'afternoon' | 'evening' | 'late_night' | null {
  if (!timeStr) return null
  const mins = timeToMinutes(timeStr)
  if (mins >= 360 && mins < 720) return 'morning'   // 6:00–11:59
  if (mins >= 720 && mins < 1020) return 'afternoon' // 12:00–16:59
  if (mins >= 1020 && mins < 1260) return 'evening'  // 17:00–20:59
  return 'late_night'                                // 21:00+ or 0:00–5:59
}

/**
 * Formats a "HH:MM" or "HH:MM:SS" time string as 12-hour time, e.g. "7:00 PM".
 * Returns "" if the input is null/unparseable.
 */
export function fmt12h(t: string | null): string {
  if (!t) return ''
  const parts = t.split(':')
  const rawHours = parseInt(parts[0] ?? '0', 10)
  const minutes = parseInt(parts[1] ?? '0', 10)
  if (isNaN(rawHours) || isNaN(minutes)) return ''
  const period = rawHours >= 12 ? 'PM' : 'AM'
  const hours = rawHours % 12 === 0 ? 12 : rawHours % 12
  const paddedMins = String(minutes).padStart(2, '0')
  return `${hours}:${paddedMins} ${period}`
}

/**
 * Returns the great-circle distance in miles between two lat/lng points
 * using the Haversine formula.
 */
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8 // Earth radius in miles
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Geocodes a free-text location query using the Nominatim API.
 * Returns { lat, lng, displayName } or null if no result found.
 */
export async function geocodeLocation(
  query: string,
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query + ', USA',
  )}&limit=1`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SoberAnchor/1.0 (+https://soberanchor.com)',
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{
      lat: string
      lon: string
      display_name: string
    }>
    if (!data.length) return null
    const first = data[0]!
    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      displayName: first.display_name,
    }
  } catch {
    return null
  }
}

/**
 * Returns true if the current day matches dayOfWeek and the current local time
 * falls within [startTime, startTime + durationMins].
 */
export function isLiveNow(
  dayOfWeek: string | null,
  startTime: string | null,
  durationMins: number | null,
): boolean {
  if (!dayOfWeek || !startTime) return false

  const now = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const currentDay = days[now.getDay()]
  if (currentDay !== dayOfWeek) return false

  const currentMins = now.getHours() * 60 + now.getMinutes()
  const startMins = timeToMinutes(startTime)
  const endMins = startMins + (durationMins ?? 60)

  return currentMins >= startMins && currentMins < endMins
}

/**
 * Returns the number of minutes until the next occurrence of a meeting
 * (looking forward up to 7 days). Returns null if day or time is missing.
 */
export function minutesUntilMeeting(
  dayOfWeek: string | null,
  startTime: string | null,
): number | null {
  if (!dayOfWeek || !startTime) return null

  const targetDay = DAY_ORDER[dayOfWeek]
  if (targetDay === undefined) return null

  const now = new Date()
  const currentDay = now.getDay()
  const currentMins = now.getHours() * 60 + now.getMinutes()
  const startMins = timeToMinutes(startTime)

  let daysUntil = targetDay - currentDay
  if (daysUntil < 0) daysUntil += 7
  // If same day but already past start time, wrap to next week
  if (daysUntil === 0 && currentMins >= startMins) daysUntil = 7

  return daysUntil * 24 * 60 + startMins - currentMins
}

/**
 * Formats a minutes countdown for display near a meeting card.
 * Only returns a non-empty string when the meeting starts within 3 hours.
 * - Overdue / in progress: ""
 * - < 60 min:  "In 35m"
 * - < 120 min: "In 1h 15m"
 * - else:      ""
 */
export function formatCountdown(mins: number): string {
  if (mins <= 0 || mins > 180) return ''
  if (mins < 60) return `In ${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 1) return m > 0 ? `In 1h ${m}m` : 'In 1h'
  return ''
}

/**
 * Builds a short summary string like "Vista, CA · 15 mi" for display
 * beneath a search bar. Returns "" if no displayName and no radius.
 */
export function buildLocationSummary(
  displayName: string | null,
  radius: number,
): string {
  const radiusLabel = `${radius} mi`
  if (!displayName) return radius ? `Near you · ${radiusLabel}` : ''

  // Trim to "City, State" from a full Nominatim display_name if possible
  const parts = displayName.split(',').map((p) => p.trim())
  const shortName =
    parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : parts[0] ?? displayName

  return `${shortName} · ${radiusLabel}`
}

/**
 * Builds a human-readable summary of active filters.
 * Joins non-empty filter labels with " · ".
 * Returns "All" when no filters are active.
 *
 * @param filters  A map of filter key → selected value (empty string = no filter)
 */
export function buildFilterSummary(filters: Record<string, string>): string {
  const allOptions: Array<Array<{ value: string; label: string }>> = [
    FELLOWSHIP_OPTIONS,
    DAY_OPTIONS,
    TIME_OPTIONS,
    FORMAT_OPTIONS,
    MEETING_SPECIALTY_OPTIONS,
  ]

  const activeLabels: string[] = []

  for (const [, value] of Object.entries(filters)) {
    if (!value) continue
    // Look up a friendly label across all option arrays
    let label: string | undefined
    for (const opts of allOptions) {
      const match = opts.find((o) => o.value === value)
      if (match) {
        label = match.label
        break
      }
    }
    activeLabels.push(label ?? value)
  }

  return activeLabels.length > 0 ? activeLabels.join(' · ') : 'All'
}
