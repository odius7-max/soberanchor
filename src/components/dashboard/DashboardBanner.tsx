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

const FIELD_STYLE: React.CSSProperties = {
  width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)',
  color: '#fff', fontFamily: 'var(--font-body)', boxSizing: 'border-box', outline: 'none',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
  marginBottom: 5, letterSpacing: '0.6px', textTransform: 'uppercase',
}

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

// ─── Shared form fields ───────────────────────────────────────────────────────

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

function MilestoneForm({
  label, setLabel, date, setDate,
  fellowshipId, setFellowshipId, isPrimary, setIsPrimary,
  fellowships, showPrimaryToggle, saving, onSave, onCancel, saveLabel,
}: MilestoneFormProps) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={LABEL_STYLE}>Label *</label>
          <input
            type="text" value={label} onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Alcohol, Gambling"
            style={FIELD_STYLE}
            onKeyDown={e => { if (e.key === 'Enter' && label.trim() && date) onSave() }}
          />
        </div>
        <div>
          <label style={LABEL_STYLE}>Sobriety Date *</label>
          <input
            type="date" value={date} max={new Date().toISOString().slice(0, 10)}
            onChange={e => setDate(e.target.value)}
            style={{ ...FIELD_STYLE, color: date ? '#fff' : 'rgba(255,255,255,0.35)', colorScheme: 'dark' }}
          />
        </div>
      </div>
      <div style={{ marginBottom: showPrimaryToggle ? 12 : 14 }}>
        <label style={LABEL_STYLE}>Fellowship</label>
        <div style={{ position: 'relative' }}>
          <select
            value={fellowshipId} onChange={e => setFellowshipId(e.target.value)}
            style={{ ...FIELD_STYLE, padding: '9px 32px 9px 12px', background: 'rgba(20,50,80,0.85)', color: fellowshipId ? '#fff' : 'rgba(255,255,255,0.4)', appearance: 'none', cursor: 'pointer' }}
          >
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
          <input
            type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)}
            style={{ accentColor: '#D4A574', width: 14, height: 14, flexShrink: 0 }}
          />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Set as primary (drives the main day counter)</span>
        </label>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          Cancel
        </button>
        <button
          onClick={onSave} disabled={saving || !label.trim() || !date}
          style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: saving || !label.trim() || !date ? 'rgba(42,138,153,0.35)' : 'var(--teal)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving || !label.trim() || !date ? 'default' : 'pointer', fontFamily: 'var(--font-body)' }}
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardBanner({
  userId, displayName, currentStep,
  initialMilestones, fellowships, onActiveFellowshipChange,
}: Props) {
  const router = useRouter()
  const [milestones, setMilestones] = useState<SobrietyMilestone[]>(initialMilestones)

  // Active tab on the normal banner view
  const initPrimaryIdx = initialMilestones.findIndex(m => m.is_primary)
  const [activeIdx, setActiveIdx] = useState(initPrimaryIdx >= 0 ? initPrimaryIdx : 0)

  // Management panel
  const [showPanel, setShowPanel] = useState(false)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null) // null=closed, 'new'=adding
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [needsNewPrimary, setNeedsNewPrimary] = useState(false)
  const [saving, setSaving] = useState(false)

  // Shared form fields (used for both edit and add)
  const [fLabel, setFLabel] = useState('')
  const [fDate, setFDate] = useState('')
  const [fFellowshipId, setFFellowshipId] = useState('')
  const [fIsPrimary, setFIsPrimary] = useState(false)

  // ── Normal banner derived state ──
  const activeMilestone = milestones[activeIdx] ?? null
  const daysClean = activeMilestone ? calcDays(activeMilestone.sobriety_date) : null
  const nextM = daysClean !== null ? (DAY_MILESTONES.find(m => m > daysClean) ?? null) : null
  const daysToNext = nextM !== null && daysClean !== null ? nextM - daysClean : null
  const isMilestoneDay = daysClean !== null && DAY_MILESTONES.includes(daysClean)
  const quote = QUOTES[(daysClean ?? 0) % QUOTES.length]

  function getFellowshipBadge(fid: string | null): string | null {
    if (!fid) return null
    const f = fellowships.find(f => f.id === fid)
    return f ? (f.abbreviation ?? f.name) : null
  }

  function switchTab(idx: number) {
    setActiveIdx(idx)
    onActiveFellowshipChange(milestones[idx]?.fellowship_id ?? null)
  }

  function openPanel() {
    setShowPanel(true)
    setEditingId(null)
    setConfirmDeleteId(null)
  }

  function closePanel() {
    setShowPanel(false)
    setEditingId(null)
    setConfirmDeleteId(null)
    setNeedsNewPrimary(false)
  }

  function startEdit(m: SobrietyMilestone) {
    setEditingId(m.id)
    setFLabel(m.label)
    setFDate(m.sobriety_date)
    setFFellowshipId(m.fellowship_id ?? '')
    setFIsPrimary(m.is_primary ?? false)
    setConfirmDeleteId(null)
  }

  function startAddNew() {
    setEditingId('new')
    setFLabel(''); setFDate(''); setFFellowshipId(''); setFIsPrimary(false)
    setConfirmDeleteId(null)
  }

  function cancelForm() {
    setEditingId(null)
    setFLabel(''); setFDate(''); setFFellowshipId(''); setFIsPrimary(false)
  }

  // ── Save (add or edit) ──
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
        const next = [
          ...milestones.map(m => willBePrimary ? { ...m, is_primary: false as boolean | null } : m),
          newM as SobrietyMilestone,
        ]
        setMilestones(next)
        if (willBePrimary) {
          await supabase.from('user_profiles').update({ sobriety_date: fDate, primary_fellowship_id: fFellowshipId || null }).eq('id', userId)
          onActiveFellowshipChange(fFellowshipId || null)
          // Sync active tab to new primary
          setActiveIdx(next.findIndex(m => m.is_primary))
          router.refresh()
        }
        setNeedsNewPrimary(false)
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
        if (willBePrimary) {
          onActiveFellowshipChange(fFellowshipId || null)
          setActiveIdx(next.findIndex(m => m.id === editingId))
        }
        router.refresh()
      }
      if (willBePrimary) setNeedsNewPrimary(false)
    }

    setEditingId(null)
    setSaving(false)
  }

  // ── Delete ──
  async function confirmDelete() {
    if (!confirmDeleteId) return
    const supabase = createClient()
    const target = milestones.find(m => m.id === confirmDeleteId)
    const wasPrimary = target?.is_primary ?? false

    await supabase.from('sobriety_milestones').delete().eq('id', confirmDeleteId)
    const next = milestones.filter(m => m.id !== confirmDeleteId)
    setMilestones(next)
    setConfirmDeleteId(null)

    if (wasPrimary && next.length > 0) {
      setNeedsNewPrimary(true)
      // Clear profile sobriety date until user picks a new primary
      await supabase.from('user_profiles').update({ sobriety_date: null, primary_fellowship_id: null }).eq('id', userId)
      onActiveFellowshipChange(null)
      setActiveIdx(0)
      router.refresh()
    } else if (wasPrimary && next.length === 0) {
      await supabase.from('user_profiles').update({ sobriety_date: null, primary_fellowship_id: null }).eq('id', userId)
      onActiveFellowshipChange(null)
      setActiveIdx(0)
      router.refresh()
    } else {
      // Deleted a non-primary — keep active tab in bounds
      setActiveIdx(i => Math.min(i, next.length - 1))
    }
  }

  // ── Set as primary ──
  async function setAsPrimary(id: string) {
    const supabase = createClient()
    const target = milestones.find(m => m.id === id)
    if (!target) return
    await supabase.from('sobriety_milestones').update({ is_primary: false }).eq('user_id', userId)
    await supabase.from('sobriety_milestones').update({ is_primary: true }).eq('id', id)
    await supabase.from('user_profiles').update({ sobriety_date: target.sobriety_date, primary_fellowship_id: target.fellowship_id }).eq('id', userId)
    setMilestones(prev => prev.map(m => ({ ...m, is_primary: m.id === id })))
    setNeedsNewPrimary(false)
    onActiveFellowshipChange(target.fellowship_id)
    setActiveIdx(milestones.findIndex(m => m.id === id))
    router.refresh()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-[20px] overflow-hidden mb-6 relative"
      style={{ background: 'linear-gradient(145deg,#002244 0%,#003366 35%,#1a4a5e 70%,#2A8A99 100%)', padding: '28px 32px 24px' }}
    >
      <svg aria-hidden className="absolute bottom-0 left-0 right-0 pointer-events-none" viewBox="0 0 900 120" fill="none" preserveAspectRatio="none" style={{ height: 120, width: '100%', opacity: 0.04 }}>
        <path d="M0 60 Q150 0 300 60 Q450 120 600 60 Q750 0 900 60 L900 120 L0 120Z" fill="#fff" />
        <path d="M0 80 Q150 30 300 80 Q450 130 600 80 Q750 30 900 80 L900 120 L0 120Z" fill="#fff" opacity="0.5" />
      </svg>
      <div aria-hidden className="absolute pointer-events-none select-none" style={{ right: -20, top: -20, opacity: 0.03, fontSize: 200, lineHeight: 1 }}>⚓</div>

      <div className="relative">
        {showPanel ? (
          // ════════════════════════════════════════════════
          // MANAGEMENT PANEL
          // ════════════════════════════════════════════════
          <div>
            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>
                Sobriety Milestones
              </div>
              <button
                onClick={closePanel}
                style={{ padding: '7px 18px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                Done ✓
              </button>
            </div>

            {/* "Pick new primary" warning */}
            {needsNewPrimary && (
              <div style={{ background: 'rgba(212,165,116,0.12)', border: '1px solid rgba(212,165,116,0.35)', borderRadius: 10, padding: '11px 14px', marginBottom: 14, fontSize: 13, color: '#D4A574', lineHeight: 1.5 }}>
                Your primary milestone was removed — please set a new one below.
              </div>
            )}

            {/* No milestones yet */}
            {milestones.length === 0 && editingId !== 'new' && (
              <div style={{ textAlign: 'center', padding: '24px 0 16px', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                No milestones yet. Add your first one below.
              </div>
            )}

            {/* Milestone cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {milestones.map(m => {
                const badge = getFellowshipBadge(m.fellowship_id)
                const days = calcDays(m.sobriety_date)

                // ── Delete confirmation ──
                if (confirmDeleteId === m.id) {
                  return (
                    <div key={m.id} style={{ background: 'rgba(192,57,43,0.1)', border: '1.5px solid rgba(192,57,43,0.35)', borderRadius: 12, padding: '16px' }}>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 14, lineHeight: 1.65 }}>
                        Remove this milestone? This will permanently remove your <strong style={{ color: '#fff' }}>{m.label}</strong> milestone and its associated step work progress. This cannot be undone.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={confirmDelete}
                          style={{ flex: 2, padding: '8px', borderRadius: 8, border: 'none', background: 'rgba(192,57,43,0.7)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                        >
                          Remove permanently
                        </button>
                      </div>
                    </div>
                  )
                }

                // ── Edit form ──
                if (editingId === m.id) {
                  return (
                    <div key={m.id} style={{ background: 'rgba(42,138,153,0.1)', border: '1.5px solid rgba(42,138,153,0.3)', borderRadius: 12, padding: '16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 12, letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Editing — {m.label}
                      </div>
                      <MilestoneForm
                        label={fLabel} setLabel={setFLabel}
                        date={fDate} setDate={setFDate}
                        fellowshipId={fFellowshipId} setFellowshipId={setFFellowshipId}
                        isPrimary={fIsPrimary} setIsPrimary={setFIsPrimary}
                        fellowships={fellowships}
                        showPrimaryToggle={!m.is_primary}
                        saving={saving}
                        onSave={saveForm}
                        onCancel={cancelForm}
                        saveLabel="Save changes"
                      />
                    </div>
                  )
                }

                // ── Normal card ──
                return (
                  <div
                    key={m.id}
                    style={{
                      background: m.is_primary ? 'rgba(212,165,116,0.07)' : 'rgba(255,255,255,0.07)',
                      border: m.is_primary ? '1.5px solid rgba(212,165,116,0.45)' : '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 12, padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{m.label}</span>
                          {m.is_primary && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(212,165,116,0.2)', border: '1px solid rgba(212,165,116,0.35)', color: '#D4A574', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                              Primary
                            </span>
                          )}
                          {badge && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(42,138,153,0.2)', border: '1px solid rgba(42,138,153,0.25)', color: 'rgba(255,255,255,0.75)' }}>
                              {badge}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                          {fmtDate(m.sobriety_date)} ·{' '}
                          <strong style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{days.toLocaleString()}</strong> days
                        </div>
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {(!m.is_primary || needsNewPrimary) && (
                          <button
                            onClick={() => setAsPrimary(m.id)}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font-body)',
                              background: needsNewPrimary ? 'rgba(212,165,116,0.2)' : 'rgba(255,255,255,0.08)',
                              border: needsNewPrimary ? '1px solid rgba(212,165,116,0.4)' : '1px solid rgba(255,255,255,0.15)',
                              color: needsNewPrimary ? '#D4A574' : 'rgba(255,255,255,0.65)',
                            }}
                          >
                            {needsNewPrimary ? '★ Set primary' : 'Set primary'}
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(m)}
                          style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { setConfirmDeleteId(m.id); setEditingId(null) }}
                          style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(192,57,43,0.3)', background: 'rgba(192,57,43,0.1)', color: '#e88', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add new milestone */}
            {editingId === 'new' ? (
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 12, padding: '16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 12, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  New milestone
                </div>
                <MilestoneForm
                  label={fLabel} setLabel={setFLabel}
                  date={fDate} setDate={setFDate}
                  fellowshipId={fFellowshipId} setFellowshipId={setFFellowshipId}
                  isPrimary={fIsPrimary} setIsPrimary={setFIsPrimary}
                  fellowships={fellowships}
                  showPrimaryToggle={milestones.length > 0}
                  saving={saving}
                  onSave={saveForm}
                  onCancel={cancelForm}
                  saveLabel="Add milestone"
                />
              </div>
            ) : (
              <button
                onClick={startAddNew}
                style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
              >
                + Add new milestone
              </button>
            )}
          </div>
        ) : (
          // ════════════════════════════════════════════════
          // NORMAL BANNER VIEW — 3 rows: top bar | quote | steps
          // ════════════════════════════════════════════════
          <>
            {/* ── ROW 1: greeting+tabs | day count | stat boxes ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>

              {/* LEFT: greeting + milestone pills */}
              <div style={{ flexShrink: 0, maxWidth: '38%' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: '#fff', letterSpacing: '-0.4px', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getGreeting()}, {displayName} 👋
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  {milestones.map((m, i) => {
                    const badge = getFellowshipBadge(m.fellowship_id)
                    const isActive = i === activeIdx
                    return (
                      <button
                        key={m.id}
                        onClick={() => switchTab(i)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 11px', borderRadius: 999, cursor: 'pointer',
                          background: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.1)',
                          border: isActive ? 'none' : '1px solid rgba(255,255,255,0.18)',
                          color: isActive ? 'var(--navy)' : 'rgba(255,255,255,0.8)',
                          fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                        }}
                      >
                        {m.label}
                        {badge && <span style={{ fontSize: 9, opacity: 0.65 }}>· {badge}</span>}
                        {m.is_primary && <span style={{ fontSize: 8, opacity: 0.5, marginLeft: 1 }}>★</span>}
                      </button>
                    )
                  })}
                  <button
                    onClick={openPanel}
                    style={{
                      padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
                      color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
                  >
                    {milestones.length === 0 ? '+ Add milestone' : '+ Add/Edit Milestone(s)'}
                  </button>
                </div>
              </div>

              {/* CENTER: day count */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                {daysClean !== null ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-2px' }}>
                      {daysClean.toLocaleString()}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>days</span>
                  </div>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No date set</span>
                )}
                {isMilestoneDay && (
                  <div style={{ fontSize: 11, marginTop: 4, color: '#D4A574', fontWeight: 700 }}>🎉 Milestone day!</div>
                )}
              </div>

              {/* RIGHT: stat boxes */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {nextM !== null && daysToNext !== null && (
                  <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 10, padding: '10px 14px', minWidth: 108 }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>Next Milestone</div>
                    <div style={{ color: '#D4A574', fontSize: 17, fontWeight: 700, marginTop: 3, lineHeight: 1 }}>{nextM} Days</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 3 }}>{daysToNext} day{daysToNext !== 1 ? 's' : ''} away</div>
                  </div>
                )}
                {activeMilestone?.fellowship_id && (
                  <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 10, padding: '10px 14px', minWidth: 108 }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>Currently On</div>
                    <div style={{ color: '#fff', fontSize: 17, fontWeight: 700, marginTop: 3, lineHeight: 1 }}>Step {currentStep}</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 3 }}>{STEPS[currentStep - 1]?.s}</div>
                  </div>
                )}
              </div>
            </div>

            {/* ── ROW 2: quote ── */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid rgba(212,165,116,0.4)', padding: '11px 16px', marginBottom: 16, borderRadius: '0 8px 8px 0' }}>
              <div style={{ fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.85)', fontSize: 15, fontStyle: 'italic', lineHeight: 1.5, fontWeight: 500 }}>&ldquo;{quote.text}&rdquo;</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 4 }}>— {quote.attr}</div>
            </div>

            {/* ── ROW 3: step progress circles ── */}
            {activeMilestone?.fellowship_id && (
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
            )}
          </>
        )}
      </div>
    </div>
  )
}
