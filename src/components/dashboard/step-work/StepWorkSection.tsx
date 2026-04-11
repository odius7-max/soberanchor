'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveStepWorkEntry, submitStepWork, saveSponsorFeedback } from '@/app/dashboard/step-work/actions'
import PrintButton from './PrintButton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prompt {
  id: string
  type: 'text' | 'yesno' | 'table'
  question: string
  hint?: string
  followup?: string          // yesno
  columns?: string[]         // table
  rows?: string              // "dynamic"
  required?: boolean
}

interface Workbook {
  id: string
  title: string
  slug: string
  step_number: number | null
  description: string | null
  reference_text: string | null
  prompts: Prompt[]
}

interface Entry {
  id: string
  review_status: string
  responses: Record<string, unknown> | null
  sponsor_feedback: string | null
  submitted_at: string | null
  reviewed_at: string | null
}

interface Props {
  workbook: Workbook
  entry: Entry | null
  userId: string
  sponsorRelationshipId: string | null
  isSponsorView?: boolean   // true when sponsor is reviewing
  sponseeName?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; icon: string; bg: string; color: string; border: string }> = {
  draft:          { label: 'Draft — auto-saving',   icon: '✏️', bg: 'rgba(42,138,153,0.07)',   color: 'var(--teal)',  border: 'rgba(42,138,153,0.2)' },
  submitted:      { label: 'Submitted for review',  icon: '📤', bg: 'rgba(212,165,116,0.1)',   color: '#9A7B54',      border: 'rgba(212,165,116,0.3)' },
  reviewed:       { label: 'Reviewed by sponsor',   icon: '✅', bg: 'rgba(39,174,96,0.08)',    color: '#27AE60',      border: 'rgba(39,174,96,0.2)' },
  needs_revision: { label: 'Needs revision',        icon: '🔁', bg: 'rgba(231,76,60,0.07)',    color: '#C0392B',      border: 'rgba(231,76,60,0.2)' },
}

const ta: React.CSSProperties = {
  width: '100%', borderRadius: 10, border: '1.5px solid var(--border)', padding: '11px 13px',
  fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.65, resize: 'vertical',
  boxSizing: 'border-box', outline: 'none', color: 'var(--dark)', background: '#fff',
}

const readonlyTa: React.CSSProperties = {
  ...ta, background: 'var(--warm-gray)', cursor: 'default', color: 'var(--dark)',
}

// ─── Prompt renderers ─────────────────────────────────────────────────────────

function TextPrompt({ prompt, value, onChange, readonly }: { prompt: Prompt; value: string; onChange: (v: string) => void; readonly: boolean }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      readOnly={readonly}
      rows={5}
      placeholder={readonly ? '' : 'Write your response here…'}
      style={readonly ? readonlyTa : ta}
      onFocus={e => { if (!readonly) e.target.style.borderColor = 'var(--teal)' }}
      onBlur={e => { if (!readonly) e.target.style.borderColor = 'var(--border)' }}
    />
  )
}


function YesNoPrompt({ prompt, value, onChange, readonly }: {
  prompt: Prompt
  value: { answer: boolean | null; followup: string }
  onChange: (v: { answer: boolean | null; followup: string }) => void
  readonly: boolean
}) {
  const { answer, followup } = value
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(opt => (
          <button
            key={String(opt.v)}
            disabled={readonly}
            onClick={() => onChange({ ...value, answer: answer === opt.v ? null : opt.v })}
            style={{
              padding: '9px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              border: `1.5px solid ${answer === opt.v ? 'var(--navy)' : 'var(--border)'}`,
              background: answer === opt.v ? 'var(--navy)' : '#fff',
              color: answer === opt.v ? '#fff' : 'var(--mid)',
              cursor: readonly ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {answer === true && prompt.followup && (
        <textarea
          value={followup}
          onChange={e => onChange({ ...value, followup: e.target.value })}
          readOnly={readonly}
          rows={4}
          placeholder={readonly ? '' : prompt.followup}
          style={readonly ? readonlyTa : ta}
          onFocus={e => { if (!readonly) e.target.style.borderColor = 'var(--teal)' }}
          onBlur={e => { if (!readonly) e.target.style.borderColor = 'var(--border)' }}
        />
      )}
    </div>
  )
}

function TablePrompt({ prompt, value, onChange, readonly }: {
  prompt: Prompt
  value: Array<Record<string, string>>
  onChange: (v: Array<Record<string, string>>) => void
  readonly: boolean
}) {
  const cols = prompt.columns ?? []

  function addRow() {
    const empty: Record<string, string> = {}
    cols.forEach(c => { empty[c] = '' })
    onChange([...value, empty])
  }

  function updateCell(rowIdx: number, col: string, v: string) {
    const next = value.map((row, i) => i === rowIdx ? { ...row, [col]: v } : row)
    onChange(next)
  }

  function removeRow(rowIdx: number) {
    onChange(value.filter((_, i) => i !== rowIdx))
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} style={{ textAlign: 'left', padding: '8px 10px', background: 'var(--warm-gray)', border: '1px solid var(--border)', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap', fontSize: 12 }}>
                  {c}
                </th>
              ))}
              {!readonly && <th style={{ width: 36, background: 'var(--warm-gray)', border: '1px solid var(--border)' }} />}
            </tr>
          </thead>
          <tbody>
            {value.length === 0 && (
              <tr>
                <td colSpan={cols.length + (readonly ? 0 : 1)} style={{ padding: '16px 10px', textAlign: 'center', color: 'var(--mid)', fontSize: 13, border: '1px solid var(--border)', background: '#fff', fontStyle: 'italic' }}>
                  No rows yet{readonly ? '.' : ' — click "+ Add Row" below.'}
                </td>
              </tr>
            )}
            {value.map((row, ri) => (
              <tr key={ri}>
                {cols.map(c => (
                  <td key={c} style={{ border: '1px solid var(--border)', padding: 0, verticalAlign: 'top', background: '#fff' }}>
                    <textarea
                      value={row[c] ?? ''}
                      onChange={e => updateCell(ri, c, e.target.value)}
                      readOnly={readonly}
                      rows={2}
                      style={{ width: '100%', border: 'none', outline: 'none', padding: '8px 10px', fontSize: 13, fontFamily: 'var(--font-body)', lineHeight: 1.55, resize: 'vertical', background: 'transparent', color: 'var(--dark)', boxSizing: 'border-box' }}
                    />
                  </td>
                ))}
                {!readonly && (
                  <td style={{ border: '1px solid var(--border)', padding: '4px', textAlign: 'center', background: '#fff', verticalAlign: 'middle' }}>
                    <button onClick={() => removeRow(ri)} title="Remove row" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0392B', fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readonly && (
        <button
          onClick={addRow}
          style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--teal)', background: 'none', border: '1.5px dashed rgba(42,138,153,0.35)', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', width: '100%', fontFamily: 'var(--font-body)' }}
        >
          + Add Row
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StepWorkSection({ workbook, entry, userId, sponsorRelationshipId, isSponsorView = false, sponseeName }: Props) {
  const router = useRouter()
  const readonly = isSponsorView || entry?.review_status === 'submitted' || entry?.review_status === 'reviewed'

  // Initialise responses from DB or empty
  function initResponses(): Record<string, unknown> {
    const base: Record<string, unknown> = {}
    if (entry?.responses) Object.assign(base, entry.responses)
    for (const p of workbook.prompts) {
      if (base[p.id] === undefined) {
        if (p.type === 'yesno') base[p.id] = { answer: null, followup: '' }
        else if (p.type === 'table') base[p.id] = []
        else base[p.id] = ''
      }
    }
    return base
  }

  const [responses, setResponses] = useState<Record<string, unknown>>(initResponses)
  const [entryId, setEntryId] = useState<string | null>(entry?.id ?? null)
  const [status, setStatus] = useState<string>(entry?.review_status ?? 'draft')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Sponsor feedback state
  const initFeedback = (): Record<string, string> => {
    if (!entry?.sponsor_feedback) return {}
    try { return JSON.parse(entry.sponsor_feedback) } catch { return {} }
  }
  const [feedback, setFeedback] = useState<Record<string, string>>(initFeedback)
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [feedbackSaved, setFeedbackSaved] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save (skip if readonly or sponsor view)
  const doSave = useCallback(async (current: Record<string, unknown>) => {
    if (readonly || isSponsorView) return
    setSaveState('saving')
    const result = await saveStepWorkEntry({ workbookId: workbook.id, responses: current, sponsorRelationshipId })
    if ('error' in result) {
      setSaveState('error')
    } else {
      if (!entryId && result.id) setEntryId(result.id)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }, [workbook.id, sponsorRelationshipId, readonly, isSponsorView, entryId])

  function handleChange(promptId: string, val: unknown) {
    const next = { ...responses, [promptId]: val }
    setResponses(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSave(next), 1500)
  }

  async function handleSubmit() {
    if (!entryId) {
      // Save first to create the entry
      const result = await saveStepWorkEntry({ workbookId: workbook.id, responses, sponsorRelationshipId })
      if ('error' in result) { setSubmitError(result.error ?? 'Save failed'); return }
      setEntryId(result.id!)
      const subResult = await submitStepWork(result.id!)
      if (subResult.error) { setSubmitError(subResult.error); return }
    } else {
      setSubmitLoading(true)
      const result = await submitStepWork(entryId)
      setSubmitLoading(false)
      if (result.error) { setSubmitError(result.error); return }
    }
    setStatus('submitted')
    setSubmitError(null)
  }

  async function handleSaveFeedback() {
    if (!entryId) return
    setFeedbackSaving(true)
    const result = await saveSponsorFeedback({ entryId, feedback })
    setFeedbackSaving(false)
    if (!result.error) {
      setFeedbackSaved(true)
      setTimeout(() => setFeedbackSaved(false), 3000)
    }
  }

  const statusMeta = STATUS_META[status] ?? STATUS_META.draft
  const canSubmit = !readonly && status !== 'submitted' && status !== 'reviewed'
  const hasSponsor = !!sponsorRelationshipId

  return (
    <div className="max-w-[780px] mx-auto px-6 py-8 pb-20">

      {/* Back link */}
      <button
        onClick={() => router.push('/dashboard')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--teal)', padding: 0, fontFamily: 'var(--font-body)', marginBottom: 20 }}
      >
        ← {isSponsorView ? `Back to Dashboard` : 'Back to My Dashboard'}
      </button>

      {/* Section header */}
      <div className="bg-white rounded-[16px] border border-border p-6 mb-6">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            {workbook.step_number && (
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 6 }}>
                Step {workbook.step_number}
              </div>
            )}
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--navy)', margin: 0, lineHeight: 1.2 }}>
              {isSponsorView && sponseeName ? `${sponseeName}'s ` : ''}{workbook.title}
            </h1>
            {workbook.description && (
              <p style={{ fontSize: 14, color: 'var(--mid)', marginTop: 8, lineHeight: 1.6, maxWidth: 600 }}>{workbook.description}</p>
            )}
          </div>
          {/* Status badge + print */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <PrintButton workbook={workbook} />
            <div style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`, whiteSpace: 'nowrap' }}>
              {statusMeta.icon} {statusMeta.label}
            </div>
          </div>
        </div>

        {/* Auto-save indicator */}
        {!readonly && !isSponsorView && (
          <div style={{ marginTop: 12, fontSize: 12, color: saveState === 'error' ? '#C0392B' : saveState === 'saving' ? 'var(--mid)' : saveState === 'saved' ? '#27AE60' : 'transparent' }}>
            {saveState === 'saving' && '💾 Saving…'}
            {saveState === 'saved' && '✓ Saved'}
            {saveState === 'error' && '⚠ Save failed — check your connection'}
            {saveState === 'idle' && '.'}
          </div>
        )}
      </div>

      {/* Prompts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {workbook.prompts.map((prompt, idx) => {
          const pFeedback = feedback[prompt.id] ?? ''
          const hasFeedback = !!(entry?.sponsor_feedback && (() => { try { return JSON.parse(entry.sponsor_feedback)[prompt.id] } catch { return null } })())

          return (
            <div key={prompt.id} className="bg-white rounded-[16px] border border-border overflow-hidden">
              {/* Prompt header */}
              <div style={{ padding: '16px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <div className="flex items-center justify-center rounded-lg font-bold flex-shrink-0"
                    style={{ width: 28, height: 28, fontSize: 12, background: 'rgba(0,51,102,0.07)', color: 'var(--navy)', marginTop: 1 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.45 }}>{prompt.question}</div>
                    {prompt.hint && (
                      <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 5, lineHeight: 1.55, fontStyle: 'italic' }}>{prompt.hint}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Prompt input */}
              <div style={{ padding: '0 20px 20px' }}>
                {prompt.type === 'text' && (
                  <TextPrompt prompt={prompt} value={(responses[prompt.id] as string) ?? ''} onChange={v => handleChange(prompt.id, v)} readonly={!!readonly} />
                )}
                {prompt.type === 'yesno' && (
                  <YesNoPrompt
                    prompt={prompt}
                    value={(responses[prompt.id] as { answer: boolean | null; followup: string }) ?? { answer: null, followup: '' }}
                    onChange={v => handleChange(prompt.id, v)}
                    readonly={!!readonly}
                  />
                )}
                {prompt.type === 'table' && (
                  <TablePrompt
                    prompt={prompt}
                    value={(responses[prompt.id] as Array<Record<string, string>>) ?? []}
                    onChange={v => handleChange(prompt.id, v)}
                    readonly={!!readonly}
                  />
                )}

                {/* Sponsor feedback area */}
                {isSponsorView && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 6 }}>
                      💬 Your Feedback
                    </div>
                    <textarea
                      value={pFeedback}
                      onChange={e => setFeedback(prev => ({ ...prev, [prompt.id]: e.target.value }))}
                      rows={3}
                      placeholder="Add your thoughts, encouragement, or guidance…"
                      style={ta}
                      onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                )}

                {/* Show sponsor feedback to sponsee (read-only) */}
                {!isSponsorView && hasFeedback && (() => {
                  const fb = (() => { try { return JSON.parse(entry!.sponsor_feedback!)[prompt.id] } catch { return null } })()
                  if (!fb) return null
                  return (
                    <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(39,174,96,0.07)', border: '1px solid rgba(39,174,96,0.2)' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#27AE60', marginBottom: 6 }}>💬 Sponsor Feedback</div>
                      <div style={{ fontSize: 13, color: 'var(--dark)', lineHeight: 1.6 }}>{fb}</div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit / Sponsor feedback actions */}
      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isSponsorView ? (
          <div>
            {submitError && <p style={{ fontSize: 13, color: '#C0392B', marginBottom: 10 }}>{submitError}</p>}
            <button
              onClick={handleSaveFeedback}
              disabled={feedbackSaving}
              style={{ padding: '13px 32px', borderRadius: 12, background: 'var(--navy)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: feedbackSaving ? 'wait' : 'pointer', fontFamily: 'var(--font-body)', opacity: feedbackSaving ? 0.7 : 1 }}
            >
              {feedbackSaving ? 'Saving…' : feedbackSaved ? '✓ Feedback Saved' : '✅ Submit Review'}
            </button>
            {feedbackSaved && <p style={{ fontSize: 13, color: '#27AE60', marginTop: 6 }}>Review submitted. {sponseeName} will see your feedback.</p>}
          </div>
        ) : canSubmit ? (
          <div>
            {!hasSponsor && (
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.25)', fontSize: 13, color: '#9A7B54', marginBottom: 12 }}>
                💡 Connect with a sponsor from your Dashboard to submit your work for review.
              </div>
            )}
            {submitError && <p style={{ fontSize: 13, color: '#C0392B', marginBottom: 8 }}>{submitError}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitLoading || !hasSponsor}
              style={{ padding: '13px 32px', borderRadius: 12, background: hasSponsor ? 'var(--teal)' : 'var(--mid)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: (!hasSponsor || submitLoading) ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', opacity: submitLoading ? 0.7 : 1 }}
            >
              {submitLoading ? 'Submitting…' : '📤 Submit to Sponsor'}
            </button>
          </div>
        ) : status === 'submitted' ? (
          <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(212,165,116,0.1)', border: '1px solid rgba(212,165,116,0.25)', fontSize: 14, color: '#9A7B54', fontWeight: 500 }}>
            📤 Submitted for review. Your sponsor will be notified.
          </div>
        ) : status === 'reviewed' ? (
          <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.2)', fontSize: 14, color: '#27AE60', fontWeight: 500 }}>
            ✅ Your sponsor has reviewed this section. Check the feedback above each response.
          </div>
        ) : null}
      </div>
    </div>
  )
}
