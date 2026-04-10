'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface JournalEntry {
  id: string
  title: string | null
  entry_date: string
  excerpt: string | null
  step_number: number | null
  is_shared_with_sponsor: boolean
}

interface Props {
  userId: string
  entries: JournalEntry[]
}

const STEP_NAMES = ['','Powerlessness','Hope','Decision','Inventory','Admission','Readiness','Humility','Amends List','Amends','Daily Inventory','Spiritual Growth','Service']

export default function JournalTab({ userId, entries }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [stepNumber, setStepNumber] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!body.trim()) { setError('Please write something first.'); return }
    setSaving(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('journal_entries').insert({
      user_id: userId,
      title: title.trim() || null,
      body: body.trim(),
      step_number: stepNumber ? parseInt(stepNumber) : null,
      is_shared_with_sponsor: isShared,
    })
    if (err) { setError('Failed to save. Please try again.'); setSaving(false); return }
    setShowForm(false); setTitle(''); setBody(''); setStepNumber(''); setIsShared(false)
    router.refresh()
  }

  function fmtDate(s: string) {
    return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <p className="text-mid" style={{ fontSize: '14px' }}>Private entries — only shared with your sponsor when you choose.</p>
        <button onClick={() => setShowForm(v => !v)} className="font-semibold text-white rounded-lg hover:bg-navy-dark transition-colors" style={{ fontSize: '13px', padding: '8px 16px', background: 'var(--navy)', border: 'none', cursor: 'pointer' }}>
          {showForm ? '✕ Cancel' : '+ New Entry'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button className="font-semibold rounded-lg hover:bg-[var(--navy-10)] transition-colors" style={{ fontSize: '12px', padding: '7px 14px', background: 'none', border: '1.5px solid var(--navy)', color: 'var(--navy)', cursor: 'pointer' }}>🖨️ Print All</button>
        <button className="font-semibold rounded-lg hover:bg-[var(--navy-10)] transition-colors" style={{ fontSize: '12px', padding: '7px 14px', background: 'none', border: '1.5px solid var(--navy)', color: 'var(--navy)', cursor: 'pointer' }}>📥 Export PDF</button>
        <button style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '8px', background: 'none', border: '1.5px solid #C0392B', color: '#C0392B', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => { if (window.confirm('Permanently delete all journal entries? We recommend exporting first. This cannot be undone.')) alert('Delete All — wiring to API coming soon.') }}>
          🗑️ Delete All from Server
        </button>
      </div>

      {showForm && (
        <div className="rounded-[16px] p-6 mb-5" style={{ background: '#fff', border: '2px solid #2A8A99' }}>
          <div className="font-bold text-navy mb-4" style={{ fontSize: '16px' }}>New Journal Entry</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)"
              className="w-full rounded-xl text-dark outline-none" style={{ border: '1.5px solid var(--border)', padding: '10px 14px', fontSize: '15px', fontFamily: 'inherit' }}
              onFocus={e => (e.target.style.borderColor = '#2A8A99')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write about your day, your recovery, your gratitude…" rows={6}
              className="w-full rounded-xl text-dark resize-none outline-none" style={{ border: '1.5px solid var(--border)', padding: '12px 14px', fontSize: '14px', fontFamily: 'inherit', lineHeight: 1.65 }}
              onFocus={e => (e.target.style.borderColor = '#2A8A99')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} autoFocus />
            <div className="flex items-center gap-3 flex-wrap">
              <select value={stepNumber} onChange={e => setStepNumber(e.target.value)} className="rounded-lg text-dark outline-none"
                style={{ border: '1.5px solid var(--border)', padding: '8px 12px', fontSize: '13px', background: '#fff', cursor: 'pointer' }}>
                <option value="">No step tag</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>Step {n} — {STEP_NAMES[n]}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="rounded-md flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ width: '20px', height: '20px', background: isShared ? '#2A8A99' : '#fff', border: isShared ? '2px solid #2A8A99' : '2px solid #D0CBC4', color: '#fff', fontSize: '12px' }}
                  onClick={() => setIsShared(v => !v)}>
                  {isShared ? '✓' : ''}
                </div>
                <input type="checkbox" className="sr-only" checked={isShared} onChange={e => setIsShared(e.target.checked)} />
                <span style={{ fontSize: '13px', color: 'var(--dark)' }}>Share with my sponsor</span>
              </label>
            </div>
            {error && <div style={{ fontSize: '13px', color: '#C0392B', fontWeight: 500 }}>{error}</div>}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="font-semibold text-white rounded-lg transition-colors" style={{ fontSize: '14px', padding: '10px 20px', background: '#2A8A99', border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-lg" style={{ fontSize: '14px', padding: '10px 16px', background: 'var(--warm-gray)', border: '1.5px solid var(--border)', color: 'var(--mid)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {entries.length === 0 && !showForm ? (
        <div className="text-center py-16 text-mid">
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✏️</div>
          <div className="font-semibold text-dark mb-1.5" style={{ fontSize: '16px' }}>No journal entries yet</div>
          <div style={{ fontSize: '14px' }}>Your journal is private and secure. Start writing today.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {entries.map(entry => (
            <div key={entry.id} className="rounded-[16px] p-5 cursor-pointer bg-white border border-[var(--border)] hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-navy" style={{ fontFamily: 'var(--font-display)', fontSize: '18px' }}>{entry.title ?? 'Untitled Entry'}</span>
                <span className="text-mid flex-shrink-0 ml-3" style={{ fontSize: '12px', marginTop: '3px' }}>{fmtDate(entry.entry_date)}</span>
              </div>
              {entry.excerpt && <div className="text-mid" style={{ fontSize: '14px', lineHeight: 1.55 }}>{entry.excerpt}</div>}
              <div className="flex gap-2 mt-2 flex-wrap">
                {entry.step_number && (
                  <span className="rounded-full font-semibold" style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.2)', color: '#9A7B54' }}>Step {entry.step_number} Work</span>
                )}
                {entry.is_shared_with_sponsor && (
                  <span className="rounded-full font-semibold" style={{ fontSize: '11px', padding: '3px 10px', background: 'var(--teal-10)', border: '1px solid var(--teal-20)', color: 'var(--teal)' }}>Shared with sponsor</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
