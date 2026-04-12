import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Type Maps ─────────────────────────────────────────────────────────────

const DAY_MAP: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
}

const TYPE_MAP: Record<string, string> = {
  'O': 'Open', 'C': 'Closed', 'D': 'Discussion', 'SP': 'Speaker',
  'ST': 'Step Study', 'B': 'Big Book Study', 'BE': 'Beginners',
  'MED': 'Meditation', 'W': 'Women', 'M': 'Men', 'LGBTQ': 'LGBTQ+',
  'Y': 'Young People', 'OUT': 'Outdoor', 'X': 'Wheelchair Accessible',
  'XB': 'Wheelchair-Accessible Bathroom', 'CF': 'Child-Friendly',
  'ASL': 'Sign Language', 'S': 'Spanish', 'EN': 'English',
  'DR': 'Daily Reflections', 'TR': 'Tradition Study', 'LIT': 'Literature',
  'ABSI': 'As Bill Sees It', '11': 'Step 11 Meditation', '12x12': '12x12',
  'H': 'Birthday', 'CAN': 'Candlelight', 'SM': 'Smoking Permitted',
  'FF': 'Fragrance Free', 'BA': 'Babysitting Available', 'TC': 'Temporarily Closed',
  'A': 'Secular', 'DD': 'Dual Diagnosis', 'SEN': 'Seniors',
  'POC': 'People of Color', 'N': 'Native American', 'GR': 'Grapevine',
  'LS': 'Living Sober', 'P': 'Professionals', 'XT': 'Cross Talk Permitted',
  'G': 'Gay', 'L': 'Lesbian', 'BI': 'Bisexual', 'T': 'Transgender',
  'NB': 'Non-Binary', 'DB': 'Digital Basket', 'POA': 'Proof of Attendance',
  'AL': 'Concurrent with Alateen', 'AL-AN': 'Concurrent with Al-Anon',
  'BRK': 'Breakfast', 'NDG': 'Indigenous', 'FR': 'French',
  'POR': 'Portuguese', 'RUS': 'Russian', 'KOR': 'Korean',
  'JA': 'Japanese', 'POL': 'Polish', 'HI': 'Hindi', 'AR': 'Arabic',
  'DE': 'German', 'ITA': 'Italian', 'TL': 'Tagalog', 'PUN': 'Punjabi',
  'FA': 'Persian', 'HE': 'Hebrew',
}

// ─── Transform ─────────────────────────────────────────────────────────────

interface FeedSource {
  id: string
  name: string
  feed_url: string
  fellowship_id: string | null
  region: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformMeeting(raw: any, feedSource: FeedSource): Record<string, unknown> | null {
  // Must have name and source_id
  const sourceId = raw.slug ?? null
  if (!raw.name?.trim() || !sourceId) return null

  // Must have day and time (skip appointment-only meetings)
  if (raw.day == null || !raw.time) return null

  // Parse coordinates
  let lat: number | null = null
  let lng: number | null = null
  if (raw.latitude != null && raw.longitude != null) {
    lat = parseFloat(raw.latitude)
    lng = parseFloat(raw.longitude)
  } else if (raw.coordinates) {
    const parts = String(raw.coordinates).split(',')
    if (parts.length >= 2) {
      lat = parseFloat(parts[0])
      lng = parseFloat(parts[1])
    }
  }
  if (lat != null && (isNaN(lat) || isNaN(lng!))) { lat = null; lng = null }

  // Parse address fields
  let address: string | null = raw.address ?? null
  let city: string | null = raw.city ?? null
  let state: string | null = raw.state ?? null
  let zip: string | null = raw.postal_code ?? null
  if (!address && raw.formatted_address) {
    address = raw.formatted_address
    const match = String(raw.formatted_address).match(/,\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/)
    if (match) {
      city = city ?? match[1].trim()
      state = state ?? match[2]
      zip = zip ?? match[3] ?? null
    }
  }

  // Derive format — approximate can be boolean true or string 'yes'
  const isApproximate = raw.approximate === true || raw.approximate === 'yes'
  const hasPhysicalAddress = !!(address && !isApproximate)
  const hasConferenceUrl = !!raw.conference_url
  let format = 'in_person'
  if (hasPhysicalAddress && hasConferenceUrl) format = 'hybrid'
  else if (hasConferenceUrl && !hasPhysicalAddress) format = 'online'

  // Map types
  const types = (Array.isArray(raw.types) ? raw.types : [])
    .map((code: string) => TYPE_MAP[code] ?? code)
    .filter(Boolean)

  // Calculate duration
  let durationMinutes = 60
  if (raw.time && raw.end_time) {
    const [sh, sm] = String(raw.time).split(':').map(Number)
    const [eh, em] = String(raw.end_time).split(':').map(Number)
    const calc = (eh * 60 + em) - (sh * 60 + sm)
    if (calc > 0 && calc <= 240) durationMinutes = calc
  }

  // Generate slug — deterministic: name-kebab + source_id suffix (unique)
  const nameKebab = raw.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const slug = nameKebab ? `${nameKebab}-${sourceId}` : sourceId

  // Build notes — combine notes + conference_url_notes
  const notesParts = [raw.notes, raw.conference_url_notes].filter(Boolean)
  const notes = notesParts.length > 0 ? notesParts.join('\n') : null

  // Region — prefer innermost region from regions array
  let region: string | null = raw.region ?? null
  if (!region && Array.isArray(raw.regions) && raw.regions.length > 0) {
    region = raw.regions[raw.regions.length - 1]
  }

  return {
    name: String(raw.name).slice(0, 255),
    slug,
    source_id: sourceId,
    source: 'api',
    fellowship_id: feedSource.fellowship_id,
    day_of_week: DAY_MAP[Number(raw.day)] ?? null,
    start_time: raw.time ? `${raw.time}:00` : null,
    end_time: raw.end_time ? `${raw.end_time}:00` : null,
    duration_minutes: durationMinutes,
    location_name: raw.location ?? null,
    address,
    city,
    state,
    zip,
    country: raw.country ?? 'US',
    latitude: lat,
    longitude: lng,
    approximate: isApproximate ?? false,
    meeting_url: raw.conference_url ?? null,
    conference_phone: raw.conference_phone ?? null,
    conference_phone_notes: raw.conference_phone_notes ?? null,
    format,
    types,
    notes,
    location_notes: raw.location_notes ?? null,
    group_name: raw.group ?? null,
    region,
    contact_email: raw.email ?? raw.contact_1_email ?? null,
    contact_phone: raw.contact_1_phone ?? null,
    entity_name: raw.entity ?? feedSource.name,
    entity_url: raw.entity_website_url ?? null,
    timezone: raw.timezone ?? 'America/Los_Angeles',
    is_verified: true,
    last_synced_at: new Date().toISOString(),
  }
}

// ─── Import one feed ────────────────────────────────────────────────────────

interface FeedStats {
  feed_id: string
  feed_name: string
  imported: number
  skipped: number
  errors: number
  error_samples: string[]
}

async function importFeed(
  feedSource: FeedSource,
  admin: ReturnType<typeof createAdminClient>,
): Promise<FeedStats> {
  const stats: FeedStats = {
    feed_id: feedSource.id,
    feed_name: feedSource.name,
    imported: 0,
    skipped: 0,
    errors: 0,
    error_samples: [],
  }

  // Fetch the feed
  let rawMeetings: unknown[]
  try {
    const resp = await fetch(feedSource.feed_url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'SoberAnchor/1.0' },
      signal: AbortSignal.timeout(30_000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const body = await resp.json()
    // Meeting Guide feeds can be an array or { meetings: [...] }
    rawMeetings = Array.isArray(body) ? body : (Array.isArray(body?.meetings) ? body.meetings : [])
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    stats.errors++
    stats.error_samples.push(`Fetch failed: ${msg}`)
    await admin.from('meeting_feed_sources').update({
      last_synced_at: new Date().toISOString(),
      last_sync_count: 0,
      last_sync_errors: 1,
    }).eq('id', feedSource.id)
    return stats
  }

  // Transform all meetings, skip invalid
  const transformed: Record<string, unknown>[] = []
  for (const raw of rawMeetings) {
    try {
      const meeting = transformMeeting(raw, feedSource)
      if (!meeting) { stats.skipped++; continue }
      transformed.push(meeting)
    } catch (err: unknown) {
      stats.skipped++
      const msg = err instanceof Error ? err.message : String(err)
      if (stats.error_samples.length < 3) stats.error_samples.push(`Transform: ${msg}`)
    }
  }

  // Upsert in batches of 50
  const BATCH = 50
  for (let i = 0; i < transformed.length; i += BATCH) {
    const batch = transformed.slice(i, i + BATCH)
    const { error } = await admin.from('meetings').upsert(batch, {
      onConflict: 'source,source_id',
      ignoreDuplicates: false,
    })

    if (!error) {
      stats.imported += batch.length
    } else {
      // Batch failed — try individually to isolate bad records
      for (const meeting of batch) {
        const { error: rowErr } = await admin.from('meetings').upsert(meeting, {
          onConflict: 'source,source_id',
          ignoreDuplicates: false,
        })
        if (!rowErr) {
          stats.imported++
        } else {
          stats.errors++
          const msg = rowErr.message ?? String(rowErr)
          if (stats.error_samples.length < 5) {
            stats.error_samples.push(`Insert "${(meeting as any).name}": ${msg}`)
          }
        }
      }
    }
  }

  // Update feed source stats
  await admin.from('meeting_feed_sources').update({
    last_synced_at: new Date().toISOString(),
    last_sync_count: stats.imported,
    last_sync_errors: stats.errors,
  }).eq('id', feedSource.id)

  return stats
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Admin auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!user || !adminIds.includes(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Parse optional feed_id param
  let feedId: string | null = null
  try {
    const body = await req.json()
    feedId = body?.feed_id ?? null
  } catch { /* no body is fine */ }

  // Load feed sources
  let query = admin.from('meeting_feed_sources').select('id, name, feed_url, fellowship_id, region').eq('is_active', true)
  if (feedId) query = query.eq('id', feedId)
  const { data: feeds, error: feedsErr } = await query

  if (feedsErr || !feeds) {
    return NextResponse.json({ error: 'Failed to load feed sources' }, { status: 500 })
  }
  if (feeds.length === 0) {
    return NextResponse.json({ error: 'No active feeds found' }, { status: 404 })
  }

  // Process each feed with a 1s delay between fetches
  const perFeedStats: FeedStats[] = []
  for (let i = 0; i < feeds.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1000))
    const feedStats = await importFeed(feeds[i] as FeedSource, admin)
    perFeedStats.push(feedStats)
  }

  const summary = {
    feeds_processed: perFeedStats.length,
    total_meetings_imported: perFeedStats.reduce((s, f) => s + f.imported, 0),
    total_skipped: perFeedStats.reduce((s, f) => s + f.skipped, 0),
    total_errors: perFeedStats.reduce((s, f) => s + f.errors, 0),
    per_feed_stats: perFeedStats,
  }

  return NextResponse.json(summary)
}
