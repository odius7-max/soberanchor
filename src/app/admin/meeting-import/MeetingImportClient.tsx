'use client'

import { useState } from 'react'

interface FeedSource {
  id: string
  name: string
  region: string | null
  feed_url: string
  feed_type: string
  is_active: boolean
  last_synced_at: string | null
  last_sync_count: number | null
  last_sync_errors: number | null
  created_at: string
}

interface PerFeedStat {
  feed_id: string
  feed_name: string
  imported: number
  skipped: number
  errors: number
  error_samples: string[]
}

interface ImportResult {
  feeds_processed: number
  total_meetings_imported: number
  total_skipped: number
  total_errors: number
  per_feed_stats: PerFeedStat[]
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function truncate(url: string, max = 55) {
  return url.length > max ? url.slice(0, max) + '…' : url
}

export default function MeetingImportClient({ initialFeeds }: { initialFeeds: FeedSource[] }) {
  const [feeds, setFeeds] = useState<FeedSource[]>(initialFeeds)
  const [importing, setImporting] = useState<string | null>(null) // feed id or 'all'
  const [result, setResult] = useState<ImportResult | null>(null)
  const [resultError, setResultError] = useState<string | null>(null)

  const [clearing, setClearing] = useState<string | null>(null)
  const [clearResult, setClearResult] = useState<{ feed: string; deleted: number } | null>(null)

  // Add Feed form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addRegion, setAddRegion] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function runImport(feedId?: string) {
    setImporting(feedId ?? 'all')
    setResult(null)
    setResultError(null)
    try {
      const res = await fetch('/api/admin/import-meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedId ? { feed_id: feedId } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setResult(data)
      // Update local state optimistically with fresh stats from result
      if (data.per_feed_stats) {
        setFeeds(prev => prev.map(f => {
          const stat = (data.per_feed_stats as PerFeedStat[]).find(s => s.feed_id === f.id)
          if (!stat) return f
          return {
            ...f,
            last_synced_at: new Date().toISOString(),
            last_sync_count: stat.imported,
            last_sync_errors: stat.errors,
          }
        }))
      }
    } catch (err: unknown) {
      setResultError(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(null)
    }
  }

  async function handleClearFeed(feedId: string, feedName: string) {
    if (!confirm(`Clear all imported meetings for "${feedName}"? They will be re-imported on next sync.`)) return
    setClearing(feedId)
    setClearResult(null)
    try {
      const res = await fetch(`/api/admin/import-meetings/feeds/${feedId}/clear`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Clear failed')
      setClearResult({ feed: feedName, deleted: data.deleted })
      setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, last_sync_count: 0, last_sync_errors: 0 } : f))
    } catch (err: unknown) {
      setResultError(err instanceof Error ? err.message : String(err))
    } finally {
      setClearing(null)
    }
  }

  async function handleAddFeed(e: React.FormEvent) {
    e.preventDefault()
    if (!addName.trim() || !addUrl.trim()) return
    setAddSaving(true)
    setAddError(null)
    try {
      const res = await fetch('/api/admin/import-meetings/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName.trim(), feed_url: addUrl.trim(), region: addRegion.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add feed')
      setFeeds(prev => [...prev, data.feed])
      setAddName(''); setAddUrl(''); setAddRegion('')
      setShowAddForm(false)
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : String(err))
    } finally {
      setAddSaving(false)
    }
  }

  const isAnyImporting = importing !== null

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Admin</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.75px', margin: 0, marginBottom: 6 }}>Meeting Import</h1>
          <p style={{ fontSize: 14, color: 'var(--mid)', margin: 0 }}>Import AA meetings from external JSON feeds into the SoberAnchor database.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <button
            onClick={() => setShowAddForm(s => !s)}
            style={{ background: '#fff', border: '1.5px solid var(--navy)', color: 'var(--navy)', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            + Add Feed
          </button>
          <button
            onClick={() => runImport()}
            disabled={isAnyImporting || feeds.filter(f => f.is_active).length === 0}
            style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: isAnyImporting ? 'not-allowed' : 'pointer', opacity: isAnyImporting ? 0.7 : 1, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
            {importing === 'all' ? '⟳ Importing…' : '↓ Import All'}
          </button>
        </div>
      </div>

      {/* Add Feed Form */}
      {showAddForm && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px', marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14 }}>Add New Feed</div>
          <form onSubmit={handleAddFeed} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>Name *</label>
              <input
                value={addName} onChange={e => setAddName(e.target.value)} required
                placeholder="e.g. SF Bay Area AA"
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>Feed URL *</label>
              <input
                value={addUrl} onChange={e => setAddUrl(e.target.value)} required type="url"
                placeholder="https://example.org/meetings.json"
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>Region</label>
              <input
                value={addRegion} onChange={e => setAddRegion(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => { setShowAddForm(false); setAddError(null) }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '9px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--mid)', fontFamily: 'var(--font-body)' }}>
                Cancel
              </button>
              <button type="submit" disabled={addSaving}
                style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: addSaving ? 'not-allowed' : 'pointer', opacity: addSaving ? 0.7 : 1, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                {addSaving ? 'Saving…' : 'Add Feed'}
              </button>
            </div>
          </form>
          {addError && (
            <div style={{ marginTop: 10, color: '#721C24', background: '#FEE', border: '1px solid #F5C6CB', borderRadius: 7, padding: '8px 12px', fontSize: 13 }}>
              {addError}
            </div>
          )}
        </div>
      )}

      {/* Feed Sources Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase' }}>Feed Sources ({feeds.length})</div>
        </div>

        {feeds.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>
            No feed sources configured. Add a feed to get started.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
              <thead>
                <tr style={{ background: 'var(--off-white)' }}>
                  {['Name', 'Region', 'Feed URL', 'Last Synced', 'Count', 'Errors', 'Status', '', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feeds.map((feed, i) => (
                  <tr key={feed.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
                    <td style={{ padding: '13px 14px', fontWeight: 600, color: 'var(--navy)', fontSize: 14, whiteSpace: 'nowrap' }}>{feed.name}</td>
                    <td style={{ padding: '13px 14px', fontSize: 13, color: 'var(--mid)', whiteSpace: 'nowrap' }}>{feed.region ?? '—'}</td>
                    <td style={{ padding: '13px 14px', fontSize: 12, color: 'var(--mid)', fontFamily: 'monospace' }}>
                      <a href={feed.feed_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', textDecoration: 'none' }}>
                        {truncate(feed.feed_url, 45)}
                      </a>
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 13, color: 'var(--mid)', whiteSpace: 'nowrap' }}>
                      {feed.last_synced_at ? timeAgo(feed.last_synced_at) : <span style={{ color: '#aaa' }}>Never</span>}
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 14, fontWeight: 600, color: 'var(--navy)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {feed.last_sync_count != null ? feed.last_sync_count.toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: 13, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {feed.last_sync_errors != null && feed.last_sync_errors > 0
                        ? <span style={{ color: '#C0392B', fontWeight: 600 }}>{feed.last_sync_errors}</span>
                        : feed.last_synced_at ? <span style={{ color: '#27AE60' }}>0</span> : <span style={{ color: '#aaa' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '13px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
                        padding: '3px 9px', borderRadius: 20,
                        background: feed.is_active ? 'rgba(39,174,96,0.10)' : 'rgba(0,0,0,0.06)',
                        color: feed.is_active ? '#27AE60' : '#999',
                      }}>
                        {feed.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 8px 13px 14px', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => runImport(feed.id)}
                        disabled={isAnyImporting || !feed.is_active}
                        style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: isAnyImporting || !feed.is_active ? 'not-allowed' : 'pointer', opacity: isAnyImporting || !feed.is_active ? 0.5 : 1, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                        {importing === feed.id ? '⟳ Importing…' : 'Import'}
                      </button>
                    </td>
                    <td style={{ padding: '13px 14px 13px 4px', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleClearFeed(feed.id, feed.name)}
                        disabled={clearing !== null || (feed.last_sync_count ?? 0) === 0}
                        title="Delete all imported meetings for this feed"
                        style={{ background: 'none', border: '1px solid #ddd', color: '#999', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: clearing !== null || (feed.last_sync_count ?? 0) === 0 ? 'not-allowed' : 'pointer', opacity: clearing !== null || (feed.last_sync_count ?? 0) === 0 ? 0.4 : 1, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                        {clearing === feed.id ? 'Clearing…' : 'Clear'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error banner */}
      {resultError && (
        <div style={{ background: '#FEE', border: '1px solid #F5C6CB', borderRadius: 12, padding: '16px 20px', marginBottom: 20, color: '#721C24', fontSize: 14 }}>
          <strong>Import error:</strong> {resultError}
        </div>
      )}

      {/* Clear result banner */}
      {clearResult && (
        <div style={{ background: 'rgba(39,174,96,0.07)', border: '1.5px solid rgba(39,174,96,0.25)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, fontSize: 14, color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Cleared <strong>{clearResult.deleted.toLocaleString()}</strong> imported meetings for <strong>{clearResult.feed}</strong>. Run Import to re-import fresh data.</span>
          <button onClick={() => setClearResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Results Panel */}
      {result && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>Import Results</div>

          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Feeds Processed', value: result.feeds_processed, color: 'var(--navy)' },
              { label: 'Meetings Imported', value: result.total_meetings_imported.toLocaleString(), color: '#27AE60' },
              { label: 'Skipped', value: result.total_skipped.toLocaleString(), color: 'var(--mid)' },
              { label: 'Errors', value: result.total_errors, color: result.total_errors > 0 ? '#C0392B' : 'var(--mid)' },
            ].map(card => (
              <div key={card.label} style={{ background: 'var(--off-white)', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: card.color, letterSpacing: '-0.5px' }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Per-feed breakdown */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Per Feed Breakdown</div>
          {result.per_feed_stats.map(stat => (
            <div key={stat.feed_id} style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: stat.error_samples.length > 0 ? 8 : 0 }}>
                <span style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 14 }}>{stat.feed_name}</span>
                <span style={{ fontSize: 13, color: 'var(--mid)' }}>
                  <span style={{ color: '#27AE60', fontWeight: 600 }}>{stat.imported.toLocaleString()} imported</span>
                  {' · '}{stat.skipped} skipped
                  {stat.errors > 0 && <span style={{ color: '#C0392B', fontWeight: 600 }}> · {stat.errors} errors</span>}
                </span>
              </div>
              {stat.error_samples.length > 0 && (
                <div style={{ background: '#FFF8F8', border: '1px solid #f5c6cb', borderRadius: 7, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#721C24', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Error Samples</div>
                  {stat.error_samples.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#721C24', fontFamily: 'monospace', marginBottom: 3 }}>{e}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
