'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { daysClean } from '@/lib/sobriety'

interface Fellowship { id: string; name: string; abbreviation: string | null }
interface Milestone { id: string; label: string; sobriety_date: string; fellowship_id: string | null; is_primary: boolean | null; notes: string | null }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function SobrietyMilestonesSection({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [fellowships, setFellowships] = useState<Fellowship[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [label, setLabel] = useState('')
  const [date, setDate] = useState('')
  const [fellowshipId, setFellowshipId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('sobriety_milestones').select('id, label, sobriety_date, fellowship_id, is_primary, notes').eq('user_id', userId).order('is_primary', { ascending: false }).order('sobriety_date'),
      supabase.from('fellowships').select('id, name, abbreviation').order('name'),
    ]).then(([milestonesRes, fellowshipsRes]) => {
      setMilestones(milestonesRes.data ?? [])
      setFellowships(fellowshipsRes.data ?? [])
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function addMilestone() {
    if (!label.trim() || !date) return
    setSaving(true)
    try {
      const { data } = await supabase.from('sobriety_milestones').insert({
        user_id: userId,
        label: label.trim(),
        sobriety_date: date,
        fellowship_id: fellowshipId || null,
        notes: notes.trim() || null,
        is_primary: milestones.length === 0, // first one is primary
      }).select('id, label, sobriety_date, fellowship_id, is_primary, notes').single()

      if (data) {
        setMilestones(prev => [...prev, data])
        // If this is the first milestone, sync to user_profiles
        if (milestones.length === 0) {
          await supabase.from('user_profiles').update({
            sobriety_date: date,
            primary_fellowship_id: fellowshipId || null,
          }).eq('id', userId)
          router.refresh()
        }
      }
      setLabel(''); setDate(''); setFellowshipId(''); setNotes('')
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function setPrimary(id: string, date: string, fellowship_id: string | null) {
    // Unset all primaries, then set this one
    await supabase.from('sobriety_milestones').update({ is_primary: false }).eq('user_id', userId)
    await supabase.from('sobriety_milestones').update({ is_primary: true }).eq('id', id)
    // Sync to user_profiles
    await supabase.from('user_profiles').update({
      sobriety_date: date,
      primary_fellowship_id: fellowship_id,
    }).eq('id', userId)
    setMilestones(prev => prev.map(m => ({ ...m, is_primary: m.id === id })))
    router.refresh()
  }

  async function deleteMilestone(id: string, wasPrimary: boolean | null) {
    if (!window.confirm('Remove this sobriety milestone?')) return
    setDeleting(id)
    await supabase.from('sobriety_milestones').delete().eq('id', id)
    const next = milestones.filter(m => m.id !== id)
    setMilestones(next)
    // If we deleted the primary and there are others, promote the first
    if (wasPrimary && next.length > 0) {
      await setPrimary(next[0].id, next[0].sobriety_date, next[0].fellowship_id)
    } else if (wasPrimary && next.length === 0) {
      await supabase.from('user_profiles').update({ sobriety_date: null, primary_fellowship_id: null }).eq('id', userId)
      router.refresh()
    }
    setDeleting(null)
  }

  const fellowshipName = (id: string | null) => {
    if (!id) return null
    const f = fellowships.find(f => f.id === id)
    return f ? (f.abbreviation ?? f.name) : null
  }

  return (
    <div className="card-hover rounded-[16px] p-6 mb-4 bg-white border border-[var(--border)]">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h4 className="font-bold text-navy" style={{ fontSize: '14px' }}>🗓️ Sobriety Dates</h4>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, background: 'none', border: '1.5px solid var(--navy)', color: 'var(--navy)', cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ Add Date'}
        </button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 14, lineHeight: 1.6 }}>
        Track multiple sobriety dates for different substances or behaviors. The primary date powers your dashboard day counter.
      </p>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--mid)', padding: '8px 0' }}>Loading…</div>
      ) : milestones.length === 0 && !showForm ? (
        <div style={{ fontSize: 14, color: 'var(--mid)', textAlign: 'center', padding: '20px 0' }}>
          No sobriety dates yet. Add your first one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: showForm ? 16 : 0 }}>
          {milestones.map(m => {
            const days = daysClean(m.sobriety_date)
            const fname = fellowshipName(m.fellowship_id)
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${m.is_primary ? 'rgba(212,165,116,0.4)' : 'var(--border)'}`, background: m.is_primary ? 'rgba(212,165,116,0.04)' : '#fafaf9' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{m.label}</span>
                    {m.is_primary && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(212,165,116,0.15)', border: '1px solid rgba(212,165,116,0.3)', color: '#9A7B54', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Primary</span>}
                    {fname && <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 600 }}>{fname}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>
                    <strong style={{ color: 'var(--navy)' }}>{days.toLocaleString()}</strong> days · since {fmtDate(m.sobriety_date)}
                  </div>
                  {m.notes && <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2, fontStyle: 'italic' }}>{m.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!m.is_primary && (
                    <button onClick={() => setPrimary(m.id, m.sobriety_date, m.fellowship_id)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, background: 'none', border: '1.5px solid var(--border)', color: 'var(--mid)', cursor: 'pointer' }}>
                      Set primary
                    </button>
                  )}
                  <button onClick={() => deleteMilestone(m.id, m.is_primary)} disabled={deleting === m.id} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, background: 'none', border: '1.5px solid #e9c0bb', color: '#C0392B', cursor: deleting === m.id ? 'wait' : 'pointer', opacity: deleting === m.id ? 0.5 : 1 }}>
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{ borderRadius: 12, border: '1.5px solid rgba(42,138,153,0.25)', background: 'rgba(42,138,153,0.03)', padding: '16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Add a sobriety date</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>Label <span style={{ color: '#C0392B' }}>*</span></label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Alcohol, Gambling"
                style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', fontFamily: 'var(--font-body)', boxSizing: 'border-box' as const }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>Date <span style={{ color: '#C0392B' }}>*</span></label>
              <input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setDate(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', fontFamily: 'var(--font-body)', boxSizing: 'border-box' as const }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>Fellowship <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <div style={{ position: 'relative' }}>
              <select
                value={fellowshipId}
                onChange={e => setFellowshipId(e.target.value)}
                style={{ width: '100%', fontSize: 13, padding: '9px 32px 9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', appearance: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer' }}
              >
                <option value="">— None / not affiliated —</option>
                {fellowships.map(f => (
                  <option key={f.id} value={f.id}>{f.abbreviation ? `${f.abbreviation} — ${f.name}` : f.name}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 11, color: 'var(--mid)' }}>▾</span>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>Notes <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any context you want to remember"
              style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', fontFamily: 'var(--font-body)', boxSizing: 'border-box' as const }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setShowForm(false); setLabel(''); setDate(''); setFellowshipId(''); setNotes('') }} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--mid)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={addMilestone} disabled={saving || !label.trim() || !date} style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: 'var(--teal)', fontSize: 13, fontWeight: 700, color: '#fff', cursor: saving || !label.trim() || !date ? 'default' : 'pointer', opacity: saving || !label.trim() || !date ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Add Milestone'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
