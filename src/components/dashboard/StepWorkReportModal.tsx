'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { getSponseeStepWorkReport } from '@/app/dashboard/actions'
import type { StepWorkReportEntry, StepWorkReportData } from '@/app/dashboard/actions'

// ─── Constants ───────────────────────────────────────────────────────────────

const RANGES = [7, 30, 60, 90] as const
type Range = (typeof RANGES)[number]

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  submitted:      { label: 'Awaiting review',  color: '#8B6914',       bg: 'rgba(212,165,116,0.12)', border: 'rgba(212,165,116,0.45)' },
  reviewed:       { label: 'Reviewed',         color: '#1a7a45',       bg: 'rgba(39,174,96,0.09)',  border: 'rgba(39,174,96,0.35)'   },
  needs_revision: { label: 'Needs revision',   color: '#7a3800',       bg: 'rgba(230,126,34,0.1)',  border: 'rgba(230,126,34,0.4)'   },
  draft:          { label: 'Draft',            color: 'var(--mid)',    bg: 'var(--warm-gray)',      border: 'var(--border)'           },
}

const DOT_BG: Record<string, string> = {
  reviewed: '#2A8A99',
  submitted: '#fff',
  needs_revision: '#fff',
  draft: '#fff',
}

const DOT_BORDER: Record<string, string> = {
  reviewed: '#2A8A99',
  submitted: '#D4A574',
  needs_revision: '#E67E22',
  draft: '#CCC',
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function fmtShortDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function countAnswered(responses: Record<string, unknown> | null): number {
  if (!responses || typeof responses !== 'object') return 0
  return Object.values(responses).filter(v => {
    if (v === null || v === undefined || v === '') return false
    if (typeof v === 'string' && v.trim() === '') return false
    if (Array.isArray(v) && v.length === 0) return false
    return true
  }).length
}

function getMetaLine(entry: StepWorkReportEntry): string {
  const answered = countAnswered(entry.responses)
  const promptStr = entry.totalPrompts > 0
    ? `${answered} of ${entry.totalPrompts} prompt${entry.totalPrompts !== 1 ? 's' : ''} answered`
    : ''
  const status = entry.reviewStatus ?? 'draft'

  const parts: string[] = []

  if (status === 'reviewed' && entry.reviewedAt) {
    parts.push(`Reviewed by you ${fmtShortDate(entry.reviewedAt)}`)
  } else if (status === 'submitted' && entry.submittedAt) {
    parts.push(`Submitted ${fmtShortDate(entry.submittedAt)}`)
  } else if (status === 'needs_revision' && entry.reviewedAt) {
    parts.push(`Needs revision · reviewed ${fmtShortDate(entry.reviewedAt)}`)
  } else {
    parts.push(`Started ${fmtShortDate(entry.createdAt)}`)
  }

  if (promptStr) parts.push(promptStr)
  return parts.join(' · ')
}

function canNavigate(status: string | null): boolean {
  return status === 'submitted' || status === 'reviewed'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, alert, color,
}: {
  label: string
  value: string | number
  alert?: boolean
  color?: string
}) {
  return (
    <div style={{
      background: alert ? 'rgba(212,165,116,0.09)' : 'var(--warm-gray)',
      border: `1px solid ${alert ? 'rgba(212,165,116,0.4)' : 'transparent'}`,
      borderRadius: 12, padding: '12px 14px',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '1.5px',
        textTransform: 'uppercase', marginBottom: 3,
        color: alert ? '#8B6914' : 'var(--mid)',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
        letterSpacing: '-0.5px', lineHeight: 1.15,
        color: color ?? (alert ? '#D4A574' : 'var(--navy)'),
        wordBreak: 'break-all',
      }}>
        {value}
      </div>
    </div>
  )
}

function TimelineEntry({
  entry,
  isLast,
  onNavigate,
}: {
  entry: StepWorkReportEntry
  isLast: boolean
  onNavigate: (id: string) => void
}) {
  const status = entry.reviewStatus ?? 'draft'
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.draft
  const dotBg = DOT_BG[status] ?? '#fff'
  const dotBorder = DOT_BORDER[status] ?? '#CCC'
  const navigable = canNavigate(status)
  const metaLine = getMetaLine(entry)
  const titlePrefix = entry.stepNumber != null ? `Step ${entry.stepNumber}: ` : ''

  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      {/* Timeline dot + vertical line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
        <div style={{
          width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
          background: dotBg, border: `2px solid ${dotBorder}`,
          marginTop: 3, zIndex: 1,
          boxShadow: status === 'reviewed' ? '0 0 0 3px rgba(42,138,153,0.15)' : 'none',
        }} />
        {!isLast && (
          <div style={{ flex: 1, width: 2, background: 'var(--border)', marginTop: 5, minHeight: 12 }} />
        )}
      </div>

      {/* Content */}
      <div
        onClick={() => navigable ? onNavigate(entry.id) : undefined}
        title={navigable ? 'Click to review' : status === 'draft' ? 'Not yet submitted' : undefined}
        style={{
          flex: 1, paddingLeft: 12, paddingBottom: isLast ? 4 : 18,
          cursor: navigable ? 'pointer' : 'default',
        }}
      >
        {/* Title row + status badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div style={{
            fontWeight: 600, color: navigable ? 'var(--navy)' : 'var(--dark)',
            fontSize: 13, lineHeight: 1.35, flex: 1,
          }}>
            {titlePrefix}{entry.sectionTitle}
            {navigable && <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--teal)', opacity: 0.7 }}>→</span>}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, flexShrink: 0,
            background: badge.bg, color: badge.color,
            border: `1px solid ${badge.border}`,
            lineHeight: 1.5,
          }}>
            {badge.label}
          </span>
        </div>

        {/* Meta line */}
        <div style={{ fontSize: 11, color: 'var(--mid)', lineHeight: 1.4 }}>
          {metaLine}
        </div>
      </div>
    </div>
  )
}

// ─── Modal Body ───────────────────────────────────────────────────────────────

interface ContentProps {
  sponseeId: string
  sponseeName: string
  onClose: () => void
}

function ModalBody({ sponseeId, sponseeName, onClose }: ContentProps) {
  const router = useRouter()
  const [range, setRange] = useState<Range>(30)
  const [data, setData] = useState<StepWorkReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch once on mount (always 90 days; range filtering is client-side)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getSponseeStepWorkReport(sponseeId)
      .then(result => { if (!cancelled) { setData(result); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [sponseeId])

  // Body scroll lock + Escape
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Client-side range filtering
  const filteredEntries = useMemo(() => {
    if (!data) return []
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - range + 1)
    cutoff.setHours(0, 0, 0, 0)
    return data.entries.filter(e => new Date(e.updatedAt) >= cutoff)
  }, [data, range])

  // Sessions = distinct dates within range
  const sessions = useMemo(
    () => new Set(filteredEntries.map(e => e.updatedAt.slice(0, 10))).size,
    [filteredEntries]
  )

  // Global stats (not range-filtered)
  const daysSinceWork = data ? daysSince(data.lastActivityDate) : null
  const stepPct = data && data.totalSteps > 0
    ? (data.completedSteps / data.totalSteps) * 100
    : 0
  const stepsColor = stepPct > 50 ? '#1a7a45' : stepPct > 0 && stepPct < 25 ? '#D4A574' : 'var(--navy)'

  function handleNavigate(entryId: string) {
    onClose()
    router.push(`/dashboard/step-work/review/${entryId}`)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="md:p-4"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        className="md:rounded-[20px] md:max-h-[calc(100vh-32px)]"
        style={{
          background: '#fff', width: '100%', maxWidth: 640,
          height: '100%', maxHeight: '100dvh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,51,102,0.24)',
          overflow: 'hidden',
        }}
      >
        {/* Sticky header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: '1px solid var(--border)',
          flexShrink: 0, background: '#fff',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 3 }}>
              {sponseeName}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--navy)', margin: 0, letterSpacing: '-0.5px' }}>
              Step Work Report
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close report"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', fontSize: 20, lineHeight: 1, padding: 6 }}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px 32px', flex: 1 }}>

          {/* Range tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--warm-gray)', borderRadius: 10, padding: 4 }}>
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  flex: 1, padding: '7px 0', fontSize: 13, fontWeight: 600,
                  border: 'none', borderRadius: 7, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  background: range === r ? '#fff' : 'transparent',
                  color: range === r ? 'var(--navy)' : 'var(--mid)',
                  boxShadow: range === r ? '0 1px 4px rgba(0,51,102,0.1)' : 'none',
                }}
              >
                {r}d
              </button>
            ))}
          </div>

          {/* Loading / error */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--mid)', fontSize: 14 }}>
              Loading step work data…
            </div>
          )}
          {error && (
            <div style={{ background: '#FEE', border: '1px solid #F5C6CB', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#721C24', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Summary stats — 4 cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24 }}>
                <StatCard
                  label="Steps Completed"
                  value={`${data.completedSteps} / ${data.totalSteps}`}
                  color={stepsColor}
                />
                <StatCard
                  label={`Sessions (${range}d)`}
                  value={sessions}
                />
                <StatCard
                  label="Awaiting Review"
                  value={data.awaitingReview}
                  alert={data.awaitingReview > 0}
                />
                <StatCard
                  label="Since Last Work"
                  value={daysSinceWork !== null ? `${daysSinceWork}d` : '—'}
                  alert={daysSinceWork !== null && daysSinceWork > 5}
                />
              </div>

              {/* Fellowship label */}
              {data.fellowshipName && (
                <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: 'rgba(42,138,153,0.1)', color: 'var(--teal)', borderRadius: 5, padding: '1px 7px', fontWeight: 700 }}>
                    {data.fellowshipName}
                  </span>
                  <span>program · click submitted or reviewed entries to open full review</span>
                </div>
              )}

              {/* Timeline */}
              {filteredEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--mid)' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>📖</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>
                    No step work activity in the last {range} days
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {range < 90 ? 'Try expanding the range to see earlier activity.' : 'Encourage your sponsee to start or continue their step work.'}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mid)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 14 }}>
                    Activity Timeline · {filteredEntries.length} entr{filteredEntries.length !== 1 ? 'ies' : 'y'}
                  </div>
                  <div>
                    {filteredEntries.map((entry, i) => (
                      <TimelineEntry
                        key={entry.id}
                        entry={entry}
                        isLast={i === filteredEntries.length - 1}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Portal Wrapper (default export) ─────────────────────────────────────────

interface Props {
  sponseeId: string
  sponseeName: string
  onClose: () => void
}

export default function StepWorkReportModal({ sponseeId, sponseeName, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(
    <ModalBody sponseeId={sponseeId} sponseeName={sponseeName} onClose={onClose} />,
    document.body
  )
}
