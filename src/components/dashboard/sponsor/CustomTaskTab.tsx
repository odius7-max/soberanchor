'use client'

import { useState } from 'react'
import { createAndAssignCustomTask, type SponsorTask } from '@/app/actions/sponsorTasks'

const CATEGORIES: { value: string; label: string; color: string; bg: string }[] = [
  { value: 'reading',    label: 'Reading',    color: '#3a7ca5', bg: 'rgba(58,124,165,0.1)'  },
  { value: 'writing',    label: 'Writing',    color: '#d4a017', bg: 'rgba(212,160,23,0.12)' },
  { value: 'reflection', label: 'Reflection', color: '#8b6bb8', bg: 'rgba(139,107,184,0.12)' },
  { value: 'action',     label: 'Action',     color: '#38a169', bg: 'rgba(56,161,105,0.12)' },
]

interface StepInfo {
  step_number: number
  name: string
}

interface Props {
  sponseeId: string
  sponseeName: string
  relationshipId: string
  programId: string | null
  currentStep: number | null
  steps: StepInfo[]
  onAssigned: (task: SponsorTask) => void
  onCancel: () => void
}

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CustomTaskTab({
  sponseeId, sponseeName, relationshipId, programId, currentStep, steps,
  onAssigned, onCancel,
}: Props) {
  const [stage, setStage] = useState<'create' | 'review'>('create')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('reflection')
  const [stepNumber, setStepNumber] = useState<number | null>(currentStep)
  const [dueDate, setDueDate] = useState('')
  const [sponsorNote, setSponsorNote] = useState('')
  const [saveToLibrary, setSaveToLibrary] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canContinue = title.trim().length > 0

  function goReview() {
    if (!canContinue) { setError('Title is required'); return }
    setError(null)
    setStage('review')
  }

  async function handleAssign() {
    setSaving(true)
    setError(null)
    const result = await createAndAssignCustomTask({
      sponseeId,
      relationshipId,
      programId: saveToLibrary ? programId : null,
      title: title.trim(),
      description: description.trim() || null,
      category,
      stepNumber,
      dueDate: dueDate || null,
      sponsorNote: sponsorNote.trim() || null,
      saveToLibrary: saveToLibrary && programId !== null && stepNumber !== null,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    if (result.task) onAssigned(result.task)
  }

  const inp: React.CSSProperties = {
    width: '100%', fontSize: 13, padding: '9px 11px', borderRadius: 8,
    border: '1.5px solid var(--border)', background: '#fff',
    fontFamily: 'var(--font-body)', boxSizing: 'border-box', color: 'var(--dark)',
    outline: 'none',
  }

  const cat = CATEGORIES.find(c => c.value === category) ?? CATEGORIES[2]

  return (
    <div style={{ padding: '16px 24px 20px' }}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 11 }}>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.5px',
          background: stage === 'create' ? 'var(--teal)' : 'var(--warm-gray)',
          color: stage === 'create' ? '#fff' : 'var(--mid)',
        }}>
          1 · CREATE TASK
        </span>
        <span style={{ color: 'var(--mid)' }}>→</span>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.5px',
          background: stage === 'review' ? 'var(--teal)' : 'var(--warm-gray)',
          color: stage === 'review' ? '#fff' : 'var(--mid)',
        }}>
          2 · REVIEW &amp; ASSIGN
        </span>
      </div>

      {stage === 'create' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--mid)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Title <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Read pages 1–20 of the Big Book"
              maxLength={200}
              autoFocus
              style={inp}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--mid)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Category
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map(c => {
                const isActive = category === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                      border: isActive ? `1.5px solid ${c.color}` : '1.5px solid var(--border)',
                      background: isActive ? c.bg : '#fff',
                      color: isActive ? c.color : 'var(--mid)',
                    }}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--mid)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Step
              </label>
              <select
                value={stepNumber ?? ''}
                onChange={e => setStepNumber(e.target.value ? Number(e.target.value) : null)}
                style={inp}
              >
                <option value="">No step</option>
                {steps.map(s => (
                  <option key={s.step_number} value={s.step_number}>
                    Step {s.step_number} · {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--mid)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={inp}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--mid)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Instructions (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What should the sponsee focus on?"
              rows={3}
              style={{ ...inp, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--mid)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Private note to sponsee (optional)
            </label>
            <textarea
              value={sponsorNote}
              onChange={e => setSponsorNote(e.target.value)}
              placeholder="Context or encouragement…"
              rows={2}
              style={{ ...inp, resize: 'vertical' }}
            />
          </div>

          {error && <div style={{ fontSize: 13, color: '#c0392b' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              onClick={onCancel}
              style={{
                background: 'none', border: '1.5px solid var(--border)', borderRadius: 9,
                padding: '9px 18px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', color: 'var(--mid)', fontFamily: 'var(--font-body)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={goReview}
              disabled={!canContinue}
              style={{
                background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 9,
                padding: '9px 20px', fontSize: 13, fontWeight: 700,
                cursor: canContinue ? 'pointer' : 'not-allowed',
                opacity: canContinue ? 1 : 0.5,
                fontFamily: 'var(--font-body)',
              }}
            >
              Review Task →
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Preview — what {sponseeName} will see
          </div>

          {/* Preview card */}
          <div style={{
            borderRadius: 12,
            borderTop: '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            borderLeft: `3px solid ${cat.color}`,
            background: '#fff',
            padding: '14px 16px', marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{title.trim()}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                background: cat.bg, color: cat.color,
              }}>
                {cat.label}
              </span>
              {stepNumber && (
                <span style={{ fontSize: 10, color: 'var(--mid)' }}>· Step {stepNumber}</span>
              )}
            </div>
            {description && (
              <div style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.5, marginBottom: 6 }}>
                {description}
              </div>
            )}
            {sponsorNote && (
              <div style={{ fontSize: 12, color: 'var(--teal)', fontStyle: 'italic', marginBottom: 6 }}>
                Note: {sponsorNote}
              </div>
            )}
            {dueDate && (
              <div style={{ fontSize: 11, color: 'var(--mid)' }}>Due {fmtDate(dueDate)}</div>
            )}
          </div>

          {/* Save to library */}
          {programId && stepNumber && (
            <label style={{
              display: 'flex', gap: 8, alignItems: 'center',
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(42,157,143,0.05)', border: '1px solid rgba(42,157,143,0.2)',
              marginBottom: 14, cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={saveToLibrary}
                onChange={e => setSaveToLibrary(e.target.checked)}
                style={{ accentColor: 'var(--teal)' }}
              />
              <span style={{ fontSize: 12, color: 'var(--navy)' }}>
                Save to My Library for future reuse
              </span>
            </label>
          )}

          {error && <div style={{ fontSize: 13, color: '#c0392b', marginBottom: 10 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', paddingTop: 4 }}>
            <button
              onClick={() => setStage('create')}
              style={{
                background: 'none', border: '1.5px solid var(--border)', borderRadius: 9,
                padding: '9px 18px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', color: 'var(--mid)', fontFamily: 'var(--font-body)',
              }}
            >
              ← Edit
            </button>
            <button
              onClick={handleAssign}
              disabled={saving}
              style={{
                background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 9,
                padding: '9px 20px', fontSize: 13, fontWeight: 700,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
                fontFamily: 'var(--font-body)',
              }}
            >
              {saving ? 'Assigning…' : `Create & Assign to ${sponseeName}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
