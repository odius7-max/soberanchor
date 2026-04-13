'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { assignTask } from '@/app/actions/sponsorTasks'

const CATEGORIES: { value: string; icon: string; label: string }[] = [
  { value: 'reading',    icon: '📖', label: 'Reading'     },
  { value: 'writing',    icon: '✏️',  label: 'Writing'     },
  { value: 'action',     icon: '✅',  label: 'Action Item' },
  { value: 'meeting',    icon: '🤝',  label: 'Meeting Goal'},
  { value: 'amends',     icon: '💛',  label: 'Amends'      },
  { value: 'service',    icon: '🙌',  label: 'Service'     },
  { value: 'prayer',     icon: '🙏',  label: 'Prayer'      },
  { value: 'meditation', icon: '🧘',  label: 'Meditation'  },
  { value: 'reflection', icon: '💭',  label: 'Reflection'  },
  { value: 'custom',     icon: '⭐',  label: 'Custom'      },
]

const RECURRENCE_OPTIONS = [
  { value: 'daily',   label: 'Daily'   },
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
]

interface Props {
  sponseeId: string
  sponseeName: string
  relationshipId: string
  onClose: () => void
  onAssigned: () => void
}

export default function AssignTaskModal({ sponseeId, sponseeName, relationshipId, onClose, onAssigned }: Props) {
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory]       = useState('custom')
  const [dueDate, setDueDate]         = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrence, setRecurrence]   = useState('weekly')
  const [sponsorNote, setSponsorNote] = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const close = useCallback(() => onClose(), [onClose])

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError(null)
    const result = await assignTask({
      sponseeId,
      relationshipId,
      title,
      description: description || null,
      category,
      dueDate: dueDate || null,
      isRecurring,
      recurrenceInterval: isRecurring ? recurrence : null,
      sponsorNote: sponsorNote || null,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onAssigned()
    close()
  }

  const inp: React.CSSProperties = {
    width: '100%', fontSize: 13, padding: '9px 12px',
    borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff',
    fontFamily: 'var(--font-body)', boxSizing: 'border-box', color: 'var(--dark)',
    outline: 'none',
  }

  const modal = (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 18,
          width: '100%', maxWidth: 480,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>
              Assign Task
            </div>
            <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>to {sponseeName}</div>
          </div>
          <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--mid)', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--mid)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Title <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Read pages 1–20 of the Big Book"
              style={inp}
              maxLength={200}
              autoFocus
              onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--mid)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Category
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    border: category === c.value ? '1.5px solid var(--teal)' : '1.5px solid var(--border)',
                    background: category === c.value ? 'rgba(42,138,153,0.08)' : '#fff',
                    color: category === c.value ? 'var(--teal)' : 'var(--mid)',
                  }}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--mid)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Description <span style={{ fontSize: 11, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional details or instructions…"
              rows={3}
              style={{ ...inp, resize: 'vertical' }}
              onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Due date + recurring */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--mid)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Due Date <span style={{ fontSize: 11, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={inp}
                onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--mid)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Recurring
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36 }}>
                <button
                  type="button"
                  onClick={() => setIsRecurring(v => !v)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: isRecurring ? 'var(--teal)' : 'var(--border)',
                    position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: isRecurring ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s',
                  }} />
                </button>
                {isRecurring && (
                  <select
                    value={recurrence}
                    onChange={e => setRecurrence(e.target.value)}
                    style={{ ...inp, width: 'auto', flex: 1, padding: '5px 8px', fontSize: 12 }}
                  >
                    {RECURRENCE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}
                {!isRecurring && <span style={{ fontSize: 12, color: 'var(--mid)' }}>Off</span>}
              </div>
            </div>
          </div>

          {/* Sponsor note */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--mid)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Private note to sponsee <span style={{ fontSize: 11, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <textarea
              value={sponsorNote}
              onChange={e => setSponsorNote(e.target.value)}
              placeholder="Context, encouragement, or instructions just for them…"
              rows={2}
              style={{ ...inp, resize: 'vertical' }}
              onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {error && <div style={{ fontSize: 13, color: '#c0392b', fontWeight: 500 }}>{error}</div>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="button"
              onClick={close}
              style={{
                background: 'none', border: '1.5px solid var(--border)', borderRadius: 9,
                padding: '9px 20px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', color: 'var(--mid)', fontFamily: 'var(--font-body)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              style={{
                background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 9,
                padding: '9px 24px', fontSize: 13, fontWeight: 700,
                cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
                opacity: saving || !title.trim() ? 0.6 : 1,
                fontFamily: 'var(--font-body)',
              }}
            >
              {saving ? 'Assigning…' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
