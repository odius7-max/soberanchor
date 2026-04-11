'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const QUOTES = [
  { text: "One day at a time. That's all anyone can do.", attr: "The Program" },
  { text: "You don't have to see the whole staircase, just take the first step.", attr: "Martin Luther King Jr." },
  { text: "Recovery is not a race. You don't have to feel guilty if it takes you longer than you thought.", attr: "Unknown" },
  { text: "What lies behind us and what lies before us are small matters compared to what lies within us.", attr: "Ralph Waldo Emerson" },
  { text: "The first step toward change is awareness. The second is acceptance.", attr: "Nathaniel Branden" },
  { text: "You are not your addiction. You are so much more.", attr: "Unknown" },
  { text: "Every morning is a new beginning. Take a deep breath and start again.", attr: "Unknown" },
]

const STEPS = [
  { n: 1, s: 'Powerlessness' }, { n: 2, s: 'Hope' }, { n: 3, s: 'Decision' },
  { n: 4, s: 'Inventory' }, { n: 5, s: 'Admission' }, { n: 6, s: 'Readiness' },
  { n: 7, s: 'Humility' }, { n: 8, s: 'Amends List' }, { n: 9, s: 'Amends' },
  { n: 10, s: 'Daily Inventory' }, { n: 11, s: 'Spiritual Growth' }, { n: 12, s: 'Service' },
]

const DAY_MILESTONES = [7, 14, 21, 30, 60, 90, 120, 180, 270, 365, 500, 730, 1000, 1095]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function calcDays(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000)
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export interface SobrietyMilestone {
  id: string
  label: string
  sobriety_date: string
  fellowship_id: string | null
  is_primary: boolean | null
  notes: string | null
}

export interface Fellowship { id: string; name: string; abbreviation: string | null }

interface Props {
  userId: string
  displayName: string
  currentStep: number
  initialMilestones: SobrietyMilestone[]
  fellowships: Fellowship[]
  onActiveFellowshipChange: (fellowshipId: string | null) => void
}

export default function DashboardBanner({
  userId,
  displayName,
  currentStep,
  initialMilestones,
  fellowships,
  onActiveFellowshipChange,
}: Props) {
  const router = useRouter()
  const [milestones, setMilestones] = useState<SobrietyMilestone[]>(initialMilestones)

  const initPrimaryIdx = initialMilestones.findIndex(m => m.is_primary)
  const [activeIdx, setActiveIdx] = useState(initPrimaryIdx >= 0 ? initPrimaryIdx : 0)

  // Add-form state
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formFellowshipId, setFormFellowshipId] = useState('')
  const [formIsPrimary, setFormIsPrimary] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit-date state (inline on active milestone)
  const [editingDate, setEditingDate] = useState(false)
  const [editDateValue, setEditDateValue] = useState('')
  const [savingDate, setSavingDate] = useState(false)

  const activeMilestone = milestones[activeIdx] ?? null
  const daysClean = activeMilestone ? calcDays(activeMilestone.sobriety_date) : null
  const nextM = daysClean !== null ? (DAY_MILESTONES.find(m => m > daysClean) ?? null) : null
  const daysToNext = nextM !== null && daysClean !== null ? nextM - daysClean : null
  const isMilestoneDay = daysClean !== null && DAY_MILESTONES.includes(daysClean)
  const quote = QUOTES[(daysClean ?? 0) % QUOTES.length]

  function fellowshipBadge(fid: string | null): string | null {
    if (!fid) return null
    const f = fellowships.find(f => f.id === fid)
    return f ? (f.abbreviation ?? f.name) : null
  }

  function switchTab(idx: number) {
    setActiveIdx(idx)
    setShowForm(false)
    setEditingDate(false)
    onActiveFellowshipChange(milestones[idx]?.fellowship_id ?? null)
  }

  async function addMilestone() {
    if (!label.trim() || !formDate) return
    setSaving(true)
    const supabase = createClient()
    const isFirst = milestones.length === 0
    const willBePrimary = isFirst || formIsPrimary

    if (willBePrimary && !isFirst) {
      await supabase.from('sobriety_milestones').update({ is_primary: false }).eq('user_id', userId)
    }

    const { data: newM } = await supabase
      .from('sobriety_milestones')
      .insert({
        user_id: userId,
        label: label.trim(),
        sobriety_date: formDate,
        fellowship_id: formFellowshipId || null,
        is_primary: willBePrimary,
      })
      .select('id,label,sobriety_date,fellowship_id,is_primary,notes')
      .single()

    if (newM) {
      let next = milestones.map(m => willBePrimary ? { ...m, is_primary: false as boolean | null } : m)
      next = [...next, newM as SobrietyMilestone]
      setMilestones(next)
      const newIdx = next.length - 1
      setActiveIdx(newIdx)
      onActiveFellowshipChange((newM as SobrietyMilestone).fellowship_id)

      if (willBePrimary) {
        await supabase.from('user_profiles').update({
          sobriety_date: formDate,
          primary_fellowship_id: formFellowshipId || null,
        }).eq('id', userId)
        router.refresh()
      }
    }

    setLabel(''); setFormDate(''); setFormFellowshipId(''); setFormIsPrimary(false)
    setShowForm(false)
    setSaving(false)
  }

  async function saveEditDate() {
    if (!activeMilestone || !editDateValue) return
    setSavingDate(true)
    const supabase = createClient()
    await supabase.from('sobriety_milestones').update({ sobriety_date: editDateValue }).eq('id', activeMilestone.id)
    const next = milestones.map(m => m.id === activeMilestone.id ? { ...m, sobriety_date: editDateValue } : m)
    setMilestones(next)
    if (activeMilestone.is_primary) {
      await supabase.from('user_profiles').update({ sobriety_date: editDateValue }).eq('id', userId)
      router.refresh()
    }
    setEditingDate(false)
    setSavingDate(false)
  }

  return (
    <div
      className="rounded-[20px] overflow-hidden mb-6 relative"
      style={{ background: 'linear-gradient(145deg,#002244 0%,#003366 35%,#1a4a5e 70%,#2A8A99 100%)', padding: '28px 32px 24px' }}
    >
      {/* Decorative wave */}
      <svg aria-hidden className="absolute bottom-0 left-0 right-0 pointer-events-none" viewBox="0 0 900 120" fill="none" preserveAspectRatio="none" style={{ height: 120, width: '100%', opacity: 0.04 }}>
        <path d="M0 60 Q150 0 300 60 Q450 120 600 60 Q750 0 900 60 L900 120 L0 120Z" fill="#fff" />
        <path d="M0 80 Q150 30 300 80 Q450 130 600 80 Q750 30 900 80 L900 120 L0 120Z" fill="#fff" opacity="0.5" />
      </svg>
      <div aria-hidden className="absolute pointer-events-none select-none" style={{ right: -20, top: -20, opacity: 0.03, fontSize: 200, lineHeight: 1 }}>⚓</div>

      <div className="relative">
        {/* Greeting */}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: '#fff', letterSpacing: '-0.5px', marginBottom: 14 }}>
          {getGreeting()}, {displayName} 👋
        </div>

        {/* Milestone tab pills */}
        {milestones.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {milestones.map((m, i) => {
              const badge = fellowshipBadge(m.fellowship_id)
              const isActive = i === activeIdx
              return (
                <button
                  key={m.id}
                  onClick={() => switchTab(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 13px', borderRadius: 999, cursor: 'pointer',
                    background: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.1)',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.18)',
                    color: isActive ? 'var(--navy)' : 'rgba(255,255,255,0.8)',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                  }}
                >
                  {m.label}
                  {badge && <span style={{ fontSize: 10, opacity: 0.65 }}>· {badge}</span>}
                  {m.is_primary && <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 1 }}>★</span>}
                </button>
              )
            })}
            <button
              onClick={() => { setShowForm(v => !v); setEditingDate(false) }}
              style={{
                padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                background: showForm ? 'rgba(212,165,116,0.22)' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${showForm ? 'rgba(212,165,116,0.35)' : 'rgba(255,255,255,0.14)'}`,
                color: showForm ? '#D4A574' : 'rgba(255,255,255,0.55)',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              }}
            >
              {showForm ? '✕ Cancel' : '+ Add milestone'}
            </button>
          </div>
        )}

        {/* Sobriety date line */}
        <div style={{ marginBottom: 18, minHeight: 24 }}>
          {milestones.length === 0 ? (
            <button
              onClick={() => setShowForm(true)}
              style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              + Set sobriety date
            </button>
          ) : editingDate && activeMilestone ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="date"
                value={editDateValue}
                onChange={e => setEditDateValue(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                autoFocus
                style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 8, padding: '5px 10px', fontSize: 13, color: '#fff', fontFamily: 'var(--font-body)', colorScheme: 'dark' as const }}
                onKeyDown={e => { if (e.key === 'Enter') saveEditDate(); if (e.key === 'Escape') setEditingDate(false) }}
              />
              <button onClick={saveEditDate} disabled={savingDate}
                style={{ fontSize: 12, padding: '5px 14px', borderRadius: 7, background: 'var(--teal)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: savingDate ? 0.7 : 1 }}>
                {savingDate ? '…' : 'Save'}
              </button>
              <button onClick={() => setEditingDate(false)}
                style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Cancel
              </button>
            </div>
          ) : activeMilestone ? (
            <div className="group" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
              Sober since{' '}
              <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{fmtDate(activeMilestone.sobriety_date)}</span>
              <button
                onClick={() => { setEditDateValue(activeMilestone.sobriety_date); setEditingDate(true); setShowForm(false) }}
                title="Edit date"
                className="group-hover:!opacity-100"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 5, color: 'rgba(255,255,255,0.35)', opacity: 0, transition: 'opacity 0.15s' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          ) : null}
        </div>

        {/* Day count + stat cards */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            {daysClean !== null ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-1.5px' }}>
                  {daysClean.toLocaleString()}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>days</span>
                {isMilestoneDay && (
                  <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 999, background: 'rgba(212,165,116,0.2)', border: '1px solid rgba(212,165,116,0.35)', color: '#D4A574', fontWeight: 700 }}>
                    🎉 {daysClean} Days!
                  </span>
                )}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {nextM !== null && daysToNext !== null && (
              <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 12, padding: '12px 16px', minWidth: 110 }}>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>Next Milestone</div>
                <div style={{ color: '#D4A574', fontSize: 18, fontWeight: 700, marginTop: 3 }}>{nextM} Days</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>{daysToNext} day{daysToNext !== 1 ? 's' : ''} away</div>
              </div>
            )}
            <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>Currently On</div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginTop: 3 }}>Step {currentStep}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>{STEPS[currentStep - 1]?.s}</div>
            </div>
          </div>
        </div>

        {/* Inline add-milestone form */}
        {showForm && (
          <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 14 }}>New sobriety milestone</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 5, letterSpacing: '0.6px', textTransform: 'uppercase' as const }}>Label *</label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Alcohol, Gambling"
                  style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'var(--font-body)', boxSizing: 'border-box' as const, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 5, letterSpacing: '0.6px', textTransform: 'uppercase' as const }}>Sobriety Date *</label>
                <input
                  type="date"
                  value={formDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => setFormDate(e.target.value)}
                  style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: formDate ? '#fff' : 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-body)', colorScheme: 'dark' as const, boxSizing: 'border-box' as const }}
                />
              </div>
            </div>
            <div style={{ marginBottom: milestones.length > 0 ? 12 : 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 5, letterSpacing: '0.6px', textTransform: 'uppercase' as const }}>Fellowship</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={formFellowshipId}
                  onChange={e => setFormFellowshipId(e.target.value)}
                  style={{ width: '100%', fontSize: 13, padding: '9px 32px 9px 12px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(20,50,80,0.85)', color: formFellowshipId ? '#fff' : 'rgba(255,255,255,0.4)', appearance: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                >
                  <option value="">— None / not affiliated —</option>
                  {fellowships.map(f => (
                    <option key={f.id} value={f.id}>{f.abbreviation ? `${f.abbreviation} — ${f.name}` : f.name}</option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>▾</span>
              </div>
            </div>
            {milestones.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formIsPrimary}
                  onChange={e => setFormIsPrimary(e.target.checked)}
                  style={{ accentColor: '#D4A574', width: 14, height: 14, flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Set as primary (drives the main day counter)</span>
              </label>
            )}
            <button
              onClick={addMilestone}
              disabled={saving || !label.trim() || !formDate}
              style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: saving || !label.trim() || !formDate ? 'rgba(42,138,153,0.35)' : 'var(--teal)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving || !label.trim() || !formDate ? 'default' : 'pointer', fontFamily: 'var(--font-body)' }}
            >
              {saving ? 'Saving…' : 'Add Milestone'}
            </button>
          </div>
        )}

        {/* Quote */}
        <div style={{ background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid rgba(212,165,116,0.4)', padding: '14px 18px', marginBottom: 20, borderRadius: '0 8px 8px 0' }}>
          <div style={{ fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.85)', fontSize: 17, fontStyle: 'italic', lineHeight: 1.55, fontWeight: 500 }}>&ldquo;{quote.text}&rdquo;</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 6 }}>— {quote.attr}</div>
        </div>

        {/* Step progress strip */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' as const }}>
          {STEPS.map(({ n, s }) => {
            const isDone = n < currentStep
            const isActive = n === currentStep
            return (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, minWidth: 46 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  background: isDone ? '#2A8A99' : isActive ? '#D4A574' : 'rgba(255,255,255,0.1)',
                  border: isDone ? '2px solid rgba(255,255,255,0.3)' : isActive ? '2.5px solid rgba(255,255,255,0.9)' : '1.5px solid rgba(255,255,255,0.15)',
                  color: isDone || isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                  boxShadow: isActive ? '0 0 18px rgba(212,165,116,0.5)' : 'none',
                }}>
                  {isDone ? '✓' : n}
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, maxWidth: 50, textAlign: 'center', lineHeight: 1.3, color: isDone ? 'rgba(255,255,255,0.6)' : isActive ? '#D4A574' : 'rgba(255,255,255,0.25)' }}>
                  {s}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
