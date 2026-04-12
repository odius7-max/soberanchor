'use client'

import { useState } from 'react'

// ─── State map: SAMHSA ID → display info ─────────────────────────────────────

interface StateInfo {
  id:    number
  abbr:  string
  name:  string
}

const STATES: StateInfo[] = [
  { id:  1, abbr: 'AK', name: 'Alaska' },
  { id:  2, abbr: 'AL', name: 'Alabama' },
  { id:  3, abbr: 'AR', name: 'Arkansas' },
  { id:  4, abbr: 'AS', name: 'American Samoa' },
  { id:  5, abbr: 'AZ', name: 'Arizona' },
  { id:  6, abbr: 'CA', name: 'California' },
  { id:  7, abbr: 'CO', name: 'Colorado' },
  { id:  8, abbr: 'CT', name: 'Connecticut' },
  { id:  9, abbr: 'DC', name: 'D.C.' },
  { id: 10, abbr: 'DE', name: 'Delaware' },
  { id: 11, abbr: 'FL', name: 'Florida' },
  { id: 12, abbr: 'GA', name: 'Georgia' },
  { id: 13, abbr: 'GU', name: 'Guam' },
  { id: 14, abbr: 'HI', name: 'Hawaii' },
  { id: 15, abbr: 'IA', name: 'Iowa' },
  { id: 16, abbr: 'ID', name: 'Idaho' },
  { id: 17, abbr: 'IL', name: 'Illinois' },
  { id: 18, abbr: 'MD', name: 'Maryland' },
  { id: 19, abbr: 'ME', name: 'Maine' },
  { id: 20, abbr: 'MI', name: 'Michigan' },
  { id: 21, abbr: 'MN', name: 'Minnesota' },
  { id: 22, abbr: 'MO', name: 'Missouri' },
  { id: 23, abbr: 'MS', name: 'Mississippi' },
  { id: 24, abbr: 'MT', name: 'Montana' },
  { id: 25, abbr: 'NC', name: 'North Carolina' },
  { id: 26, abbr: 'ND', name: 'North Dakota' },
  { id: 27, abbr: 'NE', name: 'Nebraska' },
  { id: 28, abbr: 'NH', name: 'New Hampshire' },
  { id: 29, abbr: 'NJ', name: 'New Jersey' },
  { id: 30, abbr: 'NM', name: 'New Mexico' },
  { id: 31, abbr: 'NV', name: 'Nevada' },
  { id: 32, abbr: 'NY', name: 'New York' },
  { id: 33, abbr: 'OH', name: 'Ohio' },
  { id: 34, abbr: 'UM', name: 'US Minor Outlying Islands' },
  { id: 35, abbr: 'OK', name: 'Oklahoma' },
  { id: 36, abbr: 'OR', name: 'Oregon' },
  { id: 37, abbr: 'PA', name: 'Pennsylvania' },
  { id: 38, abbr: 'PR', name: 'Puerto Rico' },
  { id: 39, abbr: 'RI', name: 'Rhode Island' },
  { id: 40, abbr: 'SC', name: 'South Carolina' },
  { id: 41, abbr: 'SD', name: 'South Dakota' },
  { id: 42, abbr: 'TN', name: 'Tennessee' },
  { id: 43, abbr: 'TX', name: 'Texas' },
  { id: 44, abbr: 'UT', name: 'Utah' },
  { id: 45, abbr: 'VA', name: 'Virginia' },
  { id: 46, abbr: 'VI', name: 'Virgin Islands' },
  { id: 47, abbr: 'VT', name: 'Vermont' },
  { id: 48, abbr: 'WA', name: 'Washington' },
  { id: 49, abbr: 'WI', name: 'Wisconsin' },
  { id: 50, abbr: 'WV', name: 'West Virginia' },
  { id: 51, abbr: 'WY', name: 'Wyoming' },
]

// Phase 1+2 high-density states (matches PRIORITY_STATE_IDS in route)
const PRIORITY_IDS = new Set([6, 11, 32, 43, 37, 33, 17, 20, 12, 25])

// ─── API response types ───────────────────────────────────────────────────────

interface StateStats {
  state_id:      number
  pages_fetched: number
  imported:      number
  skipped:       number
  errors:        number
  error_samples: string[]
}

interface ImportResult {
  states_processed:          number
  total_facilities_imported: number
  total_skipped:             number
  total_errors:              number
  per_state_stats:           StateStats[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FacilityImportClient({
  totalCount,
  samhsaCount,
}: {
  totalCount:  number
  samhsaCount: number
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<ImportResult | null>(null)
  const [resultError, setResultError] = useState<string | null>(null)

  // Live counts updated optimistically after each import
  const [liveSamhsa, setLiveSamhsa]   = useState(samhsaCount)
  const [liveTotal,  setLiveTotal]    = useState(totalCount)

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll()      { setSelected(new Set(STATES.map(s => s.id))) }
  function deselectAll()    { setSelected(new Set()) }
  function selectPriority() { setSelected(new Set(PRIORITY_IDS)) }

  async function runImport() {
    if (selected.size === 0) return
    setImporting(true)
    setResult(null)
    setResultError(null)
    try {
      const res = await fetch('/api/admin/import-facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ states: [...selected] }),
      })
      const data: ImportResult = await res.json()
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error ?? 'Import failed')
      setResult(data)
      // Optimistically bump the counts
      setLiveSamhsa(prev => prev + data.total_facilities_imported)
      setLiveTotal(prev => prev + data.total_facilities_imported)
    } catch (err: unknown) {
      setResultError(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
    }
  }

  const allSelected      = selected.size === STATES.length
  const prioritySelected = PRIORITY_IDS.size === [...PRIORITY_IDS].filter(id => selected.has(id)).length

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.75px', margin: 0, marginBottom: 6 }}>Facility Import</h1>
        <p style={{ fontSize: 14, color: 'var(--mid)', margin: 0 }}>Import treatment facilities from SAMHSA FindTreatment.gov into the SoberAnchor database.</p>
      </div>

      {/* ── DB counts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Facilities',  value: liveTotal.toLocaleString(),   color: 'var(--navy)' },
          { label: 'From SAMHSA',       value: liveSamhsa.toLocaleString(),   color: 'var(--teal)' },
          { label: 'Other Sources',     value: (liveTotal - liveSamhsa).toLocaleString(), color: 'var(--mid)' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, color: card.color, letterSpacing: '-0.5px' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* ── State Selector ── */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 20, overflow: 'hidden' }}>

        {/* Card header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Select States
            {selected.size > 0 && (
              <span style={{ marginLeft: 10, background: 'var(--teal)', color: '#fff', borderRadius: 20, padding: '2px 9px', fontSize: 11, letterSpacing: 0 }}>
                {selected.size} selected
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={prioritySelected ? deselectAll : selectPriority}
              style={{ background: prioritySelected ? 'rgba(212,175,55,0.12)' : 'transparent', border: '1.5px solid', borderColor: prioritySelected ? '#c8a415' : 'var(--border)', color: prioritySelected ? '#a07c00' : 'var(--mid)', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
              ⭐ Priority 10
            </button>
            <button
              onClick={allSelected ? deselectAll : selectAll}
              style={{ background: allSelected ? 'rgba(0,51,102,0.07)' : 'transparent', border: '1.5px solid', borderColor: allSelected ? 'var(--navy)' : 'var(--border)', color: allSelected ? 'var(--navy)' : 'var(--mid)', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* State grid */}
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
          {STATES.map(state => {
            const isPriority = PRIORITY_IDS.has(state.id)
            const isChecked  = selected.has(state.id)
            return (
              <label
                key={state.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1.5px solid',
                  borderColor: isChecked ? 'var(--teal)' : 'var(--border)',
                  background: isChecked ? 'rgba(0,139,139,0.06)' : '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 0.1s, background 0.1s',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(state.id)}
                  style={{ accentColor: 'var(--teal)', width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 700, fontSize: 13, color: isChecked ? 'var(--navy)' : 'var(--mid)', letterSpacing: '0.3px', flexShrink: 0, minWidth: 26 }}>
                  {state.abbr}
                </span>
                <span style={{ fontSize: 12, color: isChecked ? 'var(--navy)' : '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {state.name}
                </span>
                {isPriority && (
                  <span title="High facility density — import priority" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px', padding: '1px 6px', borderRadius: 10, background: 'rgba(212,175,55,0.18)', color: '#a07c00', flexShrink: 0 }}>
                    P1
                  </span>
                )}
              </label>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--mid)' }}>
            <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(212,175,55,0.18)', color: '#a07c00', marginRight: 5 }}>P1</span>
            Priority states — highest treatment facility density (Phase 1 + 2)
          </span>
        </div>
      </div>

      {/* ── Import button ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button
          onClick={runImport}
          disabled={importing || selected.size === 0}
          style={{
            background: selected.size === 0 ? 'var(--mid)' : 'var(--teal)',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '13px 28px', fontSize: 14, fontWeight: 700,
            cursor: importing || selected.size === 0 ? 'not-allowed' : 'pointer',
            opacity: importing || selected.size === 0 ? 0.6 : 1,
            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
            letterSpacing: '0.2px',
          }}>
          {importing
            ? '⟳ Importing…'
            : selected.size === 0
              ? 'Select states to import'
              : `↓ Import ${selected.size} State${selected.size > 1 ? 's' : ''}`}
        </button>
        {importing && (
          <span style={{ fontSize: 13, color: 'var(--mid)' }}>
            Fetching from SAMHSA FindTreatment.gov — this may take several minutes for large states.
          </span>
        )}
      </div>

      {/* ── Error banner ── */}
      {resultError && (
        <div style={{ background: '#FEE', border: '1px solid #F5C6CB', borderRadius: 12, padding: '16px 20px', marginBottom: 20, color: '#721C24', fontSize: 14 }}>
          <strong>Import error:</strong> {resultError}
        </div>
      )}

      {/* ── Results panel ── */}
      {result && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>Import Results</div>

          {/* Summary stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'States Processed',       value: result.states_processed,                      color: 'var(--navy)' },
              { label: 'Facilities Imported',     value: result.total_facilities_imported.toLocaleString(), color: '#27AE60' },
              { label: 'Skipped',                 value: result.total_skipped.toLocaleString(),        color: 'var(--mid)' },
              { label: 'Errors',                  value: result.total_errors,                          color: result.total_errors > 0 ? '#C0392B' : 'var(--mid)' },
            ].map(card => (
              <div key={card.label} style={{ background: 'var(--off-white)', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: card.color, letterSpacing: '-0.5px' }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Per-state breakdown */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Per-State Breakdown</div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--off-white)' }}>
                  {['State', 'Pages', 'Imported', 'Skipped', 'Errors', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Imported' || h === 'Skipped' || h === 'Errors' || h === 'Pages' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.per_state_stats.map((stat, i) => {
                  const stateInfo = STATES.find(s => s.id === stat.state_id)
                  return (
                    <tr key={stat.state_id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13, marginRight: 8 }}>
                          {stateInfo?.abbr ?? `ID ${stat.state_id}`}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--mid)' }}>
                          {stateInfo?.name ?? ''}
                        </span>
                        {PRIORITY_IDS.has(stat.state_id) && (
                          <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(212,175,55,0.18)', color: '#a07c00' }}>P1</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: 'var(--mid)' }}>{stat.pages_fetched}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#27AE60' }}>{stat.imported.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: 'var(--mid)' }}>{stat.skipped.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: stat.errors > 0 ? 600 : 400, color: stat.errors > 0 ? '#C0392B' : 'var(--mid)' }}>
                        {stat.errors}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 340 }}>
                        {stat.error_samples.length > 0 && (
                          <div style={{ background: '#FFF8F8', border: '1px solid #f5c6cb', borderRadius: 6, padding: '6px 10px' }}>
                            {stat.error_samples.map((e, j) => (
                              <div key={j} style={{ fontSize: 11, color: '#721C24', fontFamily: 'monospace', lineHeight: 1.5 }}>{e}</div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
