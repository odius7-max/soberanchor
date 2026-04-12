import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { transformFacility, type SamhsaRawRecord } from '@/lib/samhsa-transform'

// ─── State ID Table (SAMHSA IDs — NOT FIPS codes) ──────────────────────────

const ALL_STATE_IDS: number[] = [
   1,  2,  3,  4,  5,  6,  7,  8,  9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
]

// Priority order: high-density states first (phase 1→3 from field mapping doc)
const PRIORITY_STATE_IDS: number[] = [
  6, 11, 32, 43, 37,  // Phase 1: CA, FL, NY, TX, PA
  33, 17, 20, 12, 25, // Phase 2: OH, IL, MI, GA, NC
]

// ─── Per-state stats ─────────────────────────────────────────────────────────

interface StateStats {
  state_id:      number
  pages_fetched: number
  imported:      number
  skipped:       number
  errors:        number
  error_samples: string[]
  debug_sample?: { keys: string[]; first_record: unknown }
}

// ─── Fetch + paginate one state ──────────────────────────────────────────────

async function importState(
  stateId:    number,
  admin:      ReturnType<typeof createAdminClient>,
  captureDebug?: boolean,
): Promise<StateStats> {
  const stats: StateStats = {
    state_id:      stateId,
    pages_fetched: 0,
    imported:      0,
    skipped:       0,
    errors:        0,
    error_samples: [],
  }

  const BASE = 'https://findtreatment.gov/locator/exportsAsJson/v2'
  const BATCH = 100  // upsert batch size

  let page = 1
  let totalPages = 1  // will be updated after first response

  while (page <= totalPages) {
    const url = `${BASE}?sType=sa&limitType=0&limitValue=${stateId}&pageSize=500&page=${page}&sort=0`

    let rows: SamhsaRawRecord[]
    try {
      const resp = await fetch(url, {
        headers: {
          'Accept':     'application/json',
          'User-Agent': 'SoberAnchor/1.0 (+https://soberanchor.com)',
        },
        signal: AbortSignal.timeout(45_000),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`)
      const body = await resp.json() as {
        page?: number
        pageSize?: number
        totalPages?: number
        recordCount?: number
        rows?: unknown[]
      }

      // Update pagination bounds from the first response
      if (page === 1) {
        totalPages = Number(body.totalPages ?? 1)
        console.log(
          `[import-facilities] state=${stateId} pages=${totalPages} records=${body.recordCount ?? '?'}`
        )
      }

      rows = Array.isArray(body.rows) ? (body.rows as SamhsaRawRecord[]) : []

      // Capture raw structure of first 3 records for debugging
      if (captureDebug && page === 1 && rows.length > 0) {
        const sample = rows[0] as Record<string, unknown>
        stats.debug_sample = {
          keys: Object.keys(sample),
          first_record: sample,
        }
        console.log('[import-facilities] DEBUG first record keys:', JSON.stringify(Object.keys(sample)))
        console.log('[import-facilities] DEBUG first record:', JSON.stringify(sample))
        for (let di = 0; di < Math.min(3, rows.length); di++) {
          console.log(`[import-facilities] DEBUG record[${di}] keys:`, JSON.stringify(Object.keys(rows[di] as Record<string, unknown>)))
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      stats.errors++
      if (stats.error_samples.length < 5) stats.error_samples.push(`Fetch page ${page}: ${msg}`)
      // Non-recoverable for this state — stop paginating
      break
    }

    stats.pages_fetched++

    // Transform all rows, collect valid ones
    const transformed: NonNullable<ReturnType<typeof transformFacility>>[] = []
    for (const raw of rows) {
      try {
        const facility = transformFacility(raw)
        if (!facility) { stats.skipped++; continue }
        transformed.push(facility)
      } catch (err: unknown) {
        stats.skipped++
        const msg = err instanceof Error ? err.message : String(err)
        if (stats.error_samples.length < 5) stats.error_samples.push(`Transform: ${msg}`)
      }
    }

    // Upsert in batches
    for (let i = 0; i < transformed.length; i += BATCH) {
      const batch = transformed.slice(i, i + BATCH)
      const { error } = await admin.from('facilities').upsert(batch, {
        onConflict: 'samhsa_id',
        ignoreDuplicates: false,
      })

      if (!error) {
        stats.imported += batch.length
      } else {
        // Batch failed — fall back to individual upserts to isolate bad rows
        for (const facility of batch) {
          const { error: rowErr } = await admin.from('facilities').upsert(facility, {
            onConflict: 'samhsa_id',
            ignoreDuplicates: false,
          })
          if (!rowErr) {
            stats.imported++
          } else {
            stats.errors++
            const msg = rowErr.message ?? String(rowErr)
            if (stats.error_samples.length < 5) {
              stats.error_samples.push(`Upsert "${facility?.name}": ${msg}`)
            }
          }
        }
      }
    }

    page++
    // 0.5s between page requests to avoid rate limiting
    if (page <= totalPages) await new Promise(r => setTimeout(r, 500))
  }

  console.log(
    `[import-facilities] state=${stateId} done — ` +
    `imported=${stats.imported} skipped=${stats.skipped} errors=${stats.errors}`
  )

  return stats
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Admin-only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!user || !adminIds.includes(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse request body — states: number | number[] | 'all' | 'priority'
  let stateIds: number[]
  try {
    const body = await req.json() as { states?: string | number | number[] }
    const raw = body?.states

    if (raw === 'all') {
      stateIds = ALL_STATE_IDS
    } else if (raw === 'priority') {
      stateIds = PRIORITY_STATE_IDS
    } else if (typeof raw === 'string') {
      // Comma-separated list of state IDs
      stateIds = raw
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n >= 1 && n <= 51)
    } else if (typeof raw === 'number') {
      stateIds = [raw]
    } else if (Array.isArray(raw)) {
      stateIds = raw
        .map(n => parseInt(String(n), 10))
        .filter(n => !isNaN(n) && n >= 1 && n <= 51)
    } else {
      return NextResponse.json(
        { error: 'Missing required param: states (number, comma-separated string, array, "all", or "priority")' },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (stateIds.length === 0) {
    return NextResponse.json({ error: 'No valid state IDs provided (valid range: 1–51)' }, { status: 400 })
  }

  // Deduplicate + preserve order
  stateIds = [...new Set(stateIds)]

  console.log(`[import-facilities] Starting import for ${stateIds.length} state(s): ${stateIds.join(', ')}`)

  const admin = createAdminClient()
  const perStateStats: StateStats[] = []

  for (let i = 0; i < stateIds.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1000))  // 1s between states
    const stateStats = await importState(stateIds[i], admin, i === 0)  // capture debug for first state
    perStateStats.push(stateStats)
  }

  const summary = {
    states_processed:         perStateStats.length,
    total_facilities_imported: perStateStats.reduce((s, st) => s + st.imported, 0),
    total_skipped:             perStateStats.reduce((s, st) => s + st.skipped, 0),
    total_errors:              perStateStats.reduce((s, st) => s + st.errors, 0),
    per_state_stats:           perStateStats,
  }

  console.log(
    `[import-facilities] Complete — ` +
    `states=${summary.states_processed} ` +
    `imported=${summary.total_facilities_imported} ` +
    `skipped=${summary.total_skipped} ` +
    `errors=${summary.total_errors}`
  )

  return NextResponse.json(summary)
}
