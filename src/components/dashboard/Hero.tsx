'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getGreeting } from '@/lib/greeting'
import { useScrollFade } from '@/hooks/useScrollFade'
import type { SobrietyMilestone, Fellowship } from './DashboardBanner'
import type { ProgramRowData } from './DashboardShell'
import { getProgramLabel } from '@/lib/program-column'

const STEPS = [
  { n: 1, s: 'Powerlessness' }, { n: 2, s: 'Hope' }, { n: 3, s: 'Decision' },
  { n: 4, s: 'Inventory' }, { n: 5, s: 'Admission' }, { n: 6, s: 'Readiness' },
  { n: 7, s: 'Humility' }, { n: 8, s: 'Amends List' }, { n: 9, s: 'Amends' },
  { n: 10, s: 'Daily Inventory' }, { n: 11, s: 'Spiritual Growth' }, { n: 12, s: 'Service' },
]

const EARLY_MILESTONES = [1, 7, 14, 30, 60, 90, 120, 180, 270]

function getNextMilestone(daysClean: number): number {
  const early = EARLY_MILESTONES.find(m => m > daysClean)
  if (early !== undefined) return early
  const yearsCompleted = Math.floor(daysClean / 365)
  return (yearsCompleted + 1) * 365
}

function fmtMilestoneLabel(days: number): string {
  if (days < 365) return `${days} Days`
  const years = Math.round(days / 365)
  return `${years} Year${years !== 1 ? 's' : ''}`
}

function calcDays(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000)
}

function fmtSober(days: number): string {
  if (days < 365) return `${days.toLocaleString()} days`
  const years = Math.round(days / 365)
  return `${years} year${years !== 1 ? 's' : ''}`
}

const FIELD_STYLE: React.CSSProperties = {
  width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)',
  color: '#fff', fontFamily: 'var(--font-body)', boxSizing: 'border-box', outline: 'none',
}
const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
  marginBottom: 5, letterSpacing: '0.6px', textTransform: 'uppercase',
}

interface Props {
  userId: string
  displayName: string
  milestones: SobrietyMilestone[]
  fellowships: Fellowship[]
  currentStep: number
  completedStepNumbers?: number[]
  dailyQuote: { text: string; attribution: string | null } | null
  onActiveFellowshipChange: (fid: string | null) => void
  programRows: ProgramRowData[]
}

export default function Hero({ userId, displayName, milestones: initialMilestones, fellowships, currentStep, completedStepNumbers = [], dailyQuote, onActiveFellowshipChange, programRows }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [milestones, setMilestones] = useState<SobrietyMilestone[]>(initialMilestones)
  const [showPanel, setShowPanel] = useState(false)
  const { ref: stepsScrollRef, fadeLeft: stepsFadeLeft, fadeRight: stepsFadeRight } = useScrollFade()
  const completedStepSet = new Set(completedStepNumbers)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [fLabel, setFLabel] = useState('')
  const [fDate, setFDate] = useState('')
  const [fFellowshipId, setFFellowshipId] = useState('')
  const [fIsPrimary, setFIsPrimary] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const greeting = mounted ? `Good ${getGreeting(new Date())}` : 'Good morning'
  const primaryMilestone = milestones.find(m => m.is_primary) ?? milestones[0] ?? null
  const daysClean = (mounted && primaryMilestone) ? calcDays(primaryMilestone.sobriety_date) : null
  const nextMDays = daysClean !== null ? getNextMilestone(daysClean) : null
  const daysToNext = (nextMDays !== null && daysClean !== null) ? nextMDays - daysClean : null
  const nextMLabel = nextMDays !== null ? fmtMilestoneLabel(nextMDays) : null
  const stepLabel = STEPS.find(s => s.n === currentStep)?.s ?? null
  const allStepsDone = currentStep > 12

  function getFellowshipAbbr(fid: string | null): string | null {
    if (!fid) return null
    const f = fellowships.find(f => f.id === fid)
    return f ? (f.abbreviation ?? f.name) : null
  }

  function cancelForm() {
    setEditingId(null)
    setFLabel(''); setFDate(''); setFFellowshipId(''); setFIsPrimary(false)
    setConfirmDeleteId(null)
  }

  async function saveForm() {
    if (!fLabel.trim() || !fDate) return
    setSaving(true)
    const supabase = createClient()

    if (editingId === 'new') {
      const isFirst = milestones.length === 0
      const willBePrimary = isFirst || fIsPrimary
      if (willBePrimary && !isFirst) {
        await supabase.from('sobriety_milestones').update({ is_primary: false }).eq('user_id', userId)
      }
      const { data: newM } = await supabase
        .from('sobriety_milestones')
        .insert({ user_id: userId, label: fLabel.trim(), sobriety_date: fDate, fellowship_id: fFellowshipId || null, is_primary: willBePrimary })
        .select('id,label,sobriety_date,fellowship_id,is_primary,notes').single()
      if (newM) {
        const next = [...milestones.map(m => willBePrimary ? { ...m, is_primary: false as boolean | null } : m), newM as SobrietyMilestone]
        setMilestones(next)
        if (willBePrimary) {
          await supabase.from('user_profiles').update({ sobriety_date: fDate, primary_fellowship_id: fFellowshipId || null }).eq('id', userId)
          onActiveFellowshipChange(fFellowshipId || null)
          router.refresh()
        }
      }
    } else if (editingId) {
      const existing = milestones.find(m => m.id === editingId)
      const wasPrimary = existing?.is_primary ?? false
      const willBePrimary = fIsPrimary
      if (willBePrimary && !wasPrimary) {
        await supabase.from('sobriety_milestones').update({ is_primary: false }).eq('user_id', userId)
      }
      await supabase.from('sobriety_milestones').update({
        label: fLabel.trim(), sobriety_date: fDate,
        fellowship_id: fFellowshipId || null, is_primary: willBePrimary,
      }).eq('id', editingId)
      const next = milestones.map(m => {
        if (m.id === editingId) return { ...m, label: fLabel.trim(), sobriety_date: fDate, fellowship_id: fFellowshipId || null, is_primary: willBePrimary }
        return willBePrimary ? { ...m, is_primary: false as boolean | null } : m
      })
      setMilestones(next)
      if (willBePrimary || wasPrimary) {
        const primaryDate = willBePrimary ? fDate : (next.find(m => m.is_primary)?.sobriety_date ?? null)
        const primaryFid = willBePrimary ? (fFellowshipId || null) : (next.find(m => m.is_primary)?.fellowship_id ?? null)
        await supabase.from('user_profiles').update({ sobriety_date: primaryDate, primary_fellowship_id: primaryFid }).eq('id', userId)
        if (willBePrimary) onActiveFellowshipChange(fFellowshipId || null)
        router.refresh()
      }
    }

    cancelForm()
    setSaving(false)
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return
    const supabase = createClient()
    const target = milestones.find(m => m.id === confirmDeleteId)
    await supabase.from('sobriety_milestones').delete().eq('id', confirmDeleteId)
    const next = milestones.filter(m => m.id !== confirmDeleteId)
    setMilestones(next)
    setConfirmDeleteId(null)
    if (target?.is_primary) {
      await supabase.from('user_profiles').update({ sobriety_date: null, primary_fellowship_id: null }).eq('id', userId)
      onActiveFellowshipChange(null)
      router.refresh()
    }
  }

  function startEdit(m: SobrietyMilestone) {
    setEditingId(m.id); setFLabel(m.label); setFDate(m.sobriety_date)
    setFFellowshipId(m.fellowship_id ?? ''); setFIsPrimary(m.is_primary ?? false)
    setConfirmDeleteId(null)
  }

  const sortedMilestones = [...milestones].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return new Date(b.sobriety_date).getTime() - new Date(a.sobriety_date).getTime()
  })
  const programRowMap = new Map(programRows.map(r => [r.milestoneId, r]))

  return (
    <div
      className="rounded-[20px] overflow-hidden mb-6 relative px-4 pt-5 pb-5 md:px-8 md:pt-6 md:pb-6"
      style={{ background: 'linear-gradient(145deg,#002244 0%,#003366 35%,#1a4a5e 70%,#2A8A99 100%)' }}
    >
      <svg aria-hidden className="absolute bottom-0 left-0 right-0 pointer-events-none" viewBox="0 0 900 120" fill="none" preserveAspectRatio="none" style={{ height: 120, width: '100%', opacity: 0.04 }}>
        <path d="M0 60 Q150 0 300 60 Q450 120 600 60 Q750 0 900 60 L900 120 L0 120Z" fill="#fff" />
      </svg>
      <div aria-hidden className="absolute pointer-events-none select-none" style={{ right: -20, top: -20, opacity: 0.03, fontSize: 200, lineHeight: 1 }}>⚓</div>

      <div className="relative">
        {showPanel ? (
          /* ── Milestone management panel ── */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: '#fff' }}>
                Sobriety Milestones
              </div>
              <button
                onClick={() => { setShowPanel(false); cancelForm() }}
                style={{ padding: '7px 18px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                Done ✓
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {milestones.map(m => {
                const days = mounted ? calcDays(m.sobriety_date) : 0
                const abbr = getFellowshipAbbr(m.fellowship_id)

                if (confirmDeleteId === m.id) return (
                  <div key={m.id} style={{ background: 'rgba(192,57,43,0.1)', border: '1.5px solid rgba(192,57,43,0.35)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 12, lineHeight: 1.6 }}>
                      Remove <strong style={{ color: '#fff' }}>{m.label}</strong> milestone? This cannot be undone.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
                      <button onClick={confirmDelete} style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: 'rgba(192,57,43,0.7)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Remove permanently</button>
                    </div>
                  </div>
                )

                if (editingId === m.id) return (
                  <div key={m.id} style={{ background: 'rgba(42,138,153,0.1)', border: '1.5px solid rgba(42,138,153,0.3)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, letterSpacing: '1px', textTransform: 'uppercase' }}>Editing — {m.label}</div>
                    <MilestoneForm label={fLabel} setLabel={setFLabel} date={fDate} setDate={setFDate} fellowshipId={fFellowshipId} setFellowshipId={setFFellowshipId} isPrimary={fIsPrimary} setIsPrimary={setFIsPrimary} fellowships={fellowships} showPrimaryToggle={!m.is_primary} saving={saving} onSave={saveForm} onCancel={cancelForm} saveLabel="Save changes" />
                  </div>
                )

                return (
                  <div key={m.id} style={{ background: m.is_primary ? 'rgba(212,165,116,0.07)' : 'rgba(255,255,255,0.07)', border: m.is_primary ? '1.5px solid rgba(212,165,116,0.45)' : '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{m.label}</span>
                          {m.is_primary && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(212,165,116,0.2)', border: '1px solid rgba(212,165,116,0.35)', color: '#D4A574', textTransform: 'uppercase' }}>Primary</span>}
                          {abbr && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: 'rgba(42,138,153,0.2)', border: '1px solid rgba(42,138,153,0.25)', color: 'rgba(255,255,255,0.75)' }}>{abbr}</span>}
                        </div>
                        <div suppressHydrationWarning style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                          {new Date(m.sobriety_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{days.toLocaleString()}</strong> days
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        <button onClick={() => startEdit(m)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Edit</button>
                        <button onClick={() => { setConfirmDeleteId(m.id); setEditingId(null) }} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(192,57,43,0.3)', background: 'rgba(192,57,43,0.1)', color: '#e88', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Remove</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {editingId === 'new' ? (
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, letterSpacing: '1px', textTransform: 'uppercase' }}>New milestone</div>
                <MilestoneForm label={fLabel} setLabel={setFLabel} date={fDate} setDate={setFDate} fellowshipId={fFellowshipId} setFellowshipId={setFFellowshipId} isPrimary={fIsPrimary} setIsPrimary={setFIsPrimary} fellowships={fellowships} showPrimaryToggle={milestones.length > 0} saving={saving} onSave={saveForm} onCancel={cancelForm} saveLabel="Add milestone" />
              </div>
            ) : (
              <button
                onClick={() => { setEditingId('new'); setFLabel(''); setFDate(''); setFFellowshipId(''); setFIsPrimary(false) }}
                style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                + Add new milestone
              </button>
            )}
          </div>
        ) : (
          /* ── Hero program table ── */
          <>
            {/* Greeting */}
            <div
              suppressHydrationWarning
              style={{ fontSize: 22, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px', marginBottom: 16 }}
            >
              {greeting}, {displayName} 👋
            </div>

            {/* Program table or empty-state CTA */}
            {milestones.length > 0 ? (
              <>
                {/* Responsive table styles — desktop grid / mobile stacked block */}
                <style>{`
                  .sa-hero-hdr,.sa-hero-row-d{display:grid;grid-template-columns:auto auto minmax(120px,1fr) auto auto;gap:20px;align-items:center;}
                  .sa-hero-row-m{display:none;}
                  @media(max-width:559px){
                    .sa-hero-hdr,.sa-hero-row-d{display:none;}
                    .sa-hero-row-m{display:block;}
                  }
                `}</style>

                {/* Column headers */}
                <div className="sa-hero-hdr" style={{ marginBottom: 6 }}>
                  {['SOBER', 'FLSHP', 'PROGRAM', 'SINCE', ''].map(h => (
                    <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)' }}>{h}</div>
                  ))}
                </div>

                {/* Data rows */}
                {sortedMilestones.map(m => {
                  const days = mounted ? calcDays(m.sobriety_date) : null
                  const row = programRowMap.get(m.id)
                  const programLabel = row ? getProgramLabel({
                    fellowshipId: row.fellowshipId,
                    activeSponseesInFellowship: row.activeSponseesInFellowship,
                    workbookName: row.workbookName,
                    currentStep: row.currentStep,
                    maxStep: row.maxStep,
                  }) : 'Just Tracking'
                  const abbr = row?.fellowshipAbbr ?? getFellowshipAbbr(m.fellowship_id) ?? '—'
                  const since = new Date(m.sobriety_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  const onEdit = () => { startEdit(m); setShowPanel(true) }
                  return (
                    <div key={m.id} suppressHydrationWarning style={{ marginBottom: 8 }}>
                      {/* Desktop: 5-column grid */}
                      <div className="sa-hero-row-d">
                        <div style={{ fontWeight: 700, color: '#f0c040', fontSize: 13, whiteSpace: 'nowrap' as const }}>
                          {days !== null ? fmtSober(days) : '—'}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' as const }}>
                          {abbr}
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {programLabel}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' as const }}>
                          {since}
                        </div>
                        <button
                          onClick={onEdit} title={`Edit ${m.label}`}
                          style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1 }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#fff' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
                        >✎</button>
                      </div>
                      {/* Mobile: 2-line stacked block */}
                      <div className="sa-hero-row-m">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, minWidth: 0 }}>
                            <span style={{ fontWeight: 700, color: '#f0c040' }}>{days !== null ? fmtSober(days) : '—'}</span>
                            <span style={{ color: 'rgba(255,255,255,0.75)' }}>{` · ${abbr} · ${programLabel}`}</span>
                          </div>
                          <button
                            onClick={onEdit} title={`Edit ${m.label}`}
                            style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1, flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#fff' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
                          >✎</button>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{since}</div>
                      </div>
                    </div>
                  )
                })}

                {/* + Add program */}
                <button
                  onClick={() => { setEditingId('new'); setFLabel(''); setFDate(''); setFFellowshipId(''); setFIsPrimary(false); setShowPanel(true) }}
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2, padding: 0, fontFamily: 'var(--font-body)', transition: 'color 0.15s', textAlign: 'left' as const }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
                >
                  + Add program
                </button>
              </>
            ) : (
              <button
                onClick={() => { setEditingId('new'); setFLabel(''); setFDate(''); setFFellowshipId(''); setFIsPrimary(false); setShowPanel(true) }}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.3)', background: 'transparent', color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'center' as const }}
              >
                + Add your sobriety date
              </button>
            )}

            {/* Row 2: next milestone + current step, separated by thin divider */}
            {(nextMLabel !== null || (!allStepsDone && stepLabel)) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: 13 }}>
                {nextMLabel !== null && daysToNext !== null && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#fff' }}>
                    <span style={{ color: '#f0c040', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: 11 }}>
                      Next Milestone
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {nextMLabel} · {daysToNext} day{daysToNext !== 1 ? 's' : ''} away
                    </span>
                  </span>
                )}
                {nextMLabel !== null && !allStepsDone && stepLabel && (
                  <span aria-hidden style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.18)' }} />
                )}
                {!allStepsDone && stepLabel && (
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Currently on{' '}
                    <strong style={{ color: '#f0c040', fontWeight: 600 }}>
                      Step {currentStep} · {stepLabel}
                    </strong>
                  </span>
                )}
                {allStepsDone && (
                  <span style={{ color: '#27AE60', fontWeight: 600 }}>All 12 steps complete ✓</span>
                )}
              </div>
            )}

            {/* Row 2.5: 12-step progress strip (numbered squares) */}
            {milestones.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                {stepsFadeLeft && (
                  <div aria-hidden style={{ position: 'absolute', top: 12, left: 0, bottom: 0, width: 24, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(to right, #003366, transparent)' }} />
                )}
                {stepsFadeRight && (
                  <div aria-hidden style={{ position: 'absolute', top: 12, right: 0, bottom: 0, width: 24, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(to left, #1a4a5e, transparent)' }} />
                )}
                <div
                  ref={stepsScrollRef}
                  style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' as const, paddingBottom: 2 }}
                >
                  {STEPS.map(({ n, s }) => {
                    const isDone = completedStepSet.has(n)
                    const isCurrent = !allStepsDone && n === currentStep
                    return (
                      <div
                        key={n}
                        title={`Step ${n} · ${s}`}
                        style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700,
                          background: isDone
                            ? 'linear-gradient(135deg, #3a7ca5, #2a9d8f)'
                            : isCurrent
                              ? '#f0c040'
                              : 'rgba(255,255,255,0.06)',
                          border: isCurrent
                            ? '2px solid rgba(255,255,255,0.9)'
                            : isDone
                              ? '1.5px solid rgba(255,255,255,0.2)'
                              : '1px solid rgba(255,255,255,0.12)',
                          color: isDone ? '#fff' : isCurrent ? '#1a2332' : 'rgba(255,255,255,0.5)',
                          boxShadow: isCurrent ? '0 0 0 3px rgba(240,192,64,0.25)' : 'none',
                        }}
                      >
                        {isDone ? '✓' : n}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Row 3: daily quote */}
            {dailyQuote && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.82)', lineHeight: 1.55 }}>
                &ldquo;{dailyQuote.text}&rdquo;
                {dailyQuote.attribution && (
                  <span style={{ fontStyle: 'normal', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 4 }}>
                    — {dailyQuote.attribution}
                  </span>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}

interface MilestoneFormProps {
  label: string; setLabel: (v: string) => void
  date: string; setDate: (v: string) => void
  fellowshipId: string; setFellowshipId: (v: string) => void
  isPrimary: boolean; setIsPrimary: (v: boolean) => void
  fellowships: Fellowship[]
  showPrimaryToggle: boolean
  saving: boolean
  onSave: () => void
  onCancel: () => void
  saveLabel: string
}

function MilestoneForm({ label, setLabel, date, setDate, fellowshipId, setFellowshipId, isPrimary, setIsPrimary, fellowships, showPrimaryToggle, saving, onSave, onCancel, saveLabel }: MilestoneFormProps) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={LABEL_STYLE}>Label *</label>
          <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Alcohol, Gambling" style={FIELD_STYLE} onKeyDown={e => { if (e.key === 'Enter' && label.trim() && date) onSave() }} />
        </div>
        <div>
          <label style={LABEL_STYLE}>Sobriety Date *</label>
          <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} style={{ ...FIELD_STYLE, color: date ? '#fff' : 'rgba(255,255,255,0.35)', colorScheme: 'dark' }} />
        </div>
      </div>
      <div style={{ marginBottom: showPrimaryToggle ? 12 : 14 }}>
        <label style={LABEL_STYLE}>Fellowship</label>
        <div style={{ position: 'relative' }}>
          <select value={fellowshipId} onChange={e => setFellowshipId(e.target.value)} style={{ ...FIELD_STYLE, padding: '9px 32px 9px 12px', background: 'rgba(20,50,80,0.85)', color: fellowshipId ? '#fff' : 'rgba(255,255,255,0.4)', appearance: 'none', cursor: 'pointer' }}>
            <option value="">— None / not affiliated —</option>
            {fellowships.map(f => (
              <option key={f.id} value={f.id}>{f.abbreviation ? `${f.abbreviation} — ${f.name}` : f.name}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>▾</span>
        </div>
      </div>
      {showPrimaryToggle && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} style={{ accentColor: '#D4A574', width: 14, height: 14, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Set as primary (drives the main day counter)</span>
        </label>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
        <button onClick={onSave} disabled={saving || !label.trim() || !date} style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: saving || !label.trim() || !date ? 'rgba(42,138,153,0.35)' : 'var(--teal)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving || !label.trim() || !date ? 'default' : 'pointer', fontFamily: 'var(--font-body)' }}>
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  )
}
