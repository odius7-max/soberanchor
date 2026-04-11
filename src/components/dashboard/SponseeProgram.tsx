'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { syncSponseeCurrentStep } from '@/app/dashboard/step-work/actions'
import { writeStepActivityEvent } from '@/app/dashboard/activity/actions'

const STEPS = [
  { n: 1,  s: 'Powerlessness'   },
  { n: 2,  s: 'Hope'            },
  { n: 3,  s: 'Decision'        },
  { n: 4,  s: 'Inventory'       },
  { n: 5,  s: 'Admission'       },
  { n: 6,  s: 'Readiness'       },
  { n: 7,  s: 'Humility'        },
  { n: 8,  s: 'Amends List'     },
  { n: 9,  s: 'Amends'          },
  { n: 10, s: 'Daily Inventory' },
  { n: 11, s: 'Prayer'          },
  { n: 12, s: 'Service'         },
]

const METHODS = [
  { value: 'digital',    label: 'Digital',    desc: 'Completed online using SoberAnchor step work' },
  { value: 'print',      label: 'Print',      desc: 'Written out by hand on printed worksheets'    },
  { value: 'discussion', label: 'Discussion', desc: 'Worked through verbally in person'            },
] as const

type Method = 'digital' | 'print' | 'discussion'

export interface Fellowship { id: string; name: string; abbreviation: string | null; slug: string }
export interface StepCompletion { step_number: number; is_completed: boolean | null; completed_method: string | null; sponsor_note: string | null; completed_at: string | null }

interface Props {
  fellowships: Fellowship[]
  initialFellowshipId: string | null
  relationshipId: string
  sponseeId: string
  sponseeName: string
  currentStep: number
  initialCompletions: StepCompletion[]
}

export default function SponseeProgram({
  fellowships,
  initialFellowshipId,
  relationshipId,
  sponseeId,
  sponseeName,
  currentStep,
  initialCompletions,
}: Props) {
  const supabase = createClient()

  const [fellowshipId, setFellowshipId] = useState<string | null>(initialFellowshipId)
  const [completions, setCompletions] = useState<StepCompletion[]>(initialCompletions)
  const [hasContent, setHasContent] = useState(false)
  // selectedStep = incomplete step clicked → opens mark-complete modal
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  // uncheckStep = completed step clicked → opens uncheck confirm
  const [uncheckStep, setUncheckStep] = useState<number | null>(null)
  const [method, setMethod] = useState<Method>('discussion')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [updatingFellowship, setUpdatingFellowship] = useState(false)

  const currentFellowship = fellowships.find(f => f.id === fellowshipId) ?? null
  const completionMap = new Map(completions.map(c => [c.step_number, c]))

  // Check whether the active fellowship has any seeded workbooks
  useEffect(() => {
    if (!initialFellowshipId) { setHasContent(false); return }
    supabase
      .from('program_workbooks')
      .select('id', { count: 'exact', head: true })
      .eq('fellowship_id', initialFellowshipId)
      .eq('is_active', true)
      .then(({ count }) => setHasContent((count ?? 0) > 0))
  }, [initialFellowshipId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFellowshipChange(newId: string) {
    setUpdatingFellowship(true)
    setFellowshipId(newId || null)
    await supabase
      .from('sponsor_relationships')
      .update({ fellowship_id: newId || null })
      .eq('id', relationshipId)
    if (newId) {
      const [completionsRes, workbooksRes] = await Promise.all([
        supabase
          .from('step_completions')
          .select('step_number, is_completed, completed_method, sponsor_note, completed_at')
          .eq('user_id', sponseeId)
          .eq('fellowship_id', newId),
        supabase
          .from('program_workbooks')
          .select('id', { count: 'exact', head: true })
          .eq('fellowship_id', newId)
          .eq('is_active', true),
      ])
      setCompletions(completionsRes.data ?? [])
      setHasContent((workbooksRes.count ?? 0) > 0)
    } else {
      setCompletions([])
      setHasContent(false)
    }
    setUpdatingFellowship(false)
  }

  async function saveCompletion() {
    if (selectedStep === null || !fellowshipId) return
    setSaving(true)
    const now = new Date().toISOString()
    await supabase.from('step_completions').upsert(
      {
        user_id: sponseeId,
        sponsor_relationship_id: relationshipId,
        fellowship_id: fellowshipId,
        step_number: selectedStep,
        is_completed: true,
        completed_at: now,
        completed_method: method,
        sponsor_note: note.trim() || null,
        sponsor_approved: true,
        sponsor_approved_at: now,
      },
      { onConflict: 'user_id,fellowship_id,step_number' }
    )
    setCompletions(prev => [
      ...prev.filter(c => c.step_number !== selectedStep),
      { step_number: selectedStep, is_completed: true, completed_method: method, sponsor_note: note.trim() || null, completed_at: now },
    ])
    await syncSponseeCurrentStep(sponseeId, fellowshipId)
    writeStepActivityEvent({ sponseeId, stepNumber: selectedStep, isCompleted: true })
    setSelectedStep(null)
    setNote('')
    setMethod('discussion')
    setSaving(false)
  }

  async function saveUncompletion() {
    if (uncheckStep === null || !fellowshipId) return
    setSaving(true)
    await supabase.from('step_completions').upsert(
      {
        user_id: sponseeId,
        sponsor_relationship_id: relationshipId,
        fellowship_id: fellowshipId,
        step_number: uncheckStep,
        is_completed: false,
        completed_at: null,
        completed_method: null,
        sponsor_note: null,
        sponsor_approved: false,
        sponsor_approved_at: null,
      },
      { onConflict: 'user_id,fellowship_id,step_number' }
    )
    setCompletions(prev => [
      ...prev.filter(c => c.step_number !== uncheckStep),
      { step_number: uncheckStep, is_completed: false, completed_method: null, sponsor_note: null, completed_at: null },
    ])
    await syncSponseeCurrentStep(sponseeId, fellowshipId)
    writeStepActivityEvent({ sponseeId, stepNumber: uncheckStep, isCompleted: false })
    setUncheckStep(null)
    setSaving(false)
  }

  function closeModal() {
    setSelectedStep(null)
    setUncheckStep(null)
    setNote('')
    setMethod('discussion')
  }

  return (
    <>
      {/* ── Fellowship selector ── */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 3 }}>📋 Program</div>
            <div style={{ fontSize: 13, color: 'var(--mid)' }}>Select the fellowship {sponseeName} is working</div>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={fellowshipId ?? ''}
              onChange={e => handleFellowshipChange(e.target.value)}
              disabled={updatingFellowship}
              style={{
                fontSize: 14, fontWeight: 600, color: 'var(--navy)',
                padding: '9px 36px 9px 14px', borderRadius: 10,
                border: '1.5px solid var(--border)', background: '#fff',
                cursor: updatingFellowship ? 'wait' : 'pointer',
                appearance: 'none' as const, minWidth: 220,
                fontFamily: 'var(--font-body)',
                opacity: updatingFellowship ? 0.6 : 1,
              }}
            >
              <option value="">— Select program —</option>
              {fellowships.map(f => (
                <option key={f.id} value={f.id}>
                  {f.abbreviation ?? f.name} — {f.name}
                </option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 12, color: 'var(--mid)' }}>▾</span>
          </div>
        </div>
        {fellowshipId && !hasContent && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#888', padding: '8px 12px', background: 'rgba(136,136,136,0.06)', borderRadius: 8, border: '1px solid rgba(136,136,136,0.12)' }}>
            Step work content for {currentFellowship?.abbreviation ?? currentFellowship?.name} is coming soon. You can still track step completion here.
          </div>
        )}
      </div>

      {/* ── Step grid ── */}
      {fellowshipId && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 3 }}>Step Progress</div>
            <div style={{ fontSize: 13, color: 'var(--mid)' }}>
              Click any step to mark it complete or incomplete.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {STEPS.map(step => {
              const completion = completionMap.get(step.n)
              const isComplete = completion?.is_completed === true
              const isCurrent = step.n === currentStep && !isComplete

              let bg = 'var(--warm-gray)'
              let color = 'var(--mid)'
              let border = '1px solid var(--border)'
              if (isComplete) {
                bg = 'rgba(39,174,96,0.08)'; color = '#1e8a4a'; border = '1.5px solid rgba(39,174,96,0.28)'
              } else if (isCurrent) {
                bg = 'rgba(0,51,102,0.07)'; color = 'var(--navy)'; border = '1.5px solid rgba(0,51,102,0.2)'
              }

              return (
                <button
                  key={step.n}
                  onClick={() => isComplete ? setUncheckStep(step.n) : setSelectedStep(step.n)}
                  title={isComplete
                    ? `Step ${step.n} complete — click to mark incomplete`
                    : `Mark Step ${step.n} complete`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 3, padding: '12px 6px', borderRadius: 10, border, background: bg,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color, lineHeight: 1 }}>
                    {isComplete ? '✓' : step.n}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color, textAlign: 'center', lineHeight: 1.3 }}>{step.s}</span>
                  {isCurrent && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.4px', textTransform: 'uppercase' as const, marginTop: 1 }}>Current</span>
                  )}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, color: 'var(--mid)', flexWrap: 'wrap' as const }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(39,174,96,0.3)', display: 'inline-block' }} /> Completed
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(0,51,102,0.15)', display: 'inline-block' }} /> Current step
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--warm-gray)', border: '1px solid var(--border)', display: 'inline-block' }} /> Not started
            </span>
          </div>
        </div>
      )}

      {/* ── Uncheck confirmation modal ── */}
      {uncheckStep !== null && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={closeModal}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--navy)', margin: '0 0 8px' }}>
              Mark Step {uncheckStep} as incomplete?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 24, lineHeight: 1.6 }}>
              {STEPS[uncheckStep - 1]?.s} · {sponseeName}<br />
              This will clear the completion record and update their current step.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={closeModal}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--mid)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={saveUncompletion}
                disabled={saving}
                style={{ flex: 2, padding: '10px', borderRadius: 8, border: '1.5px solid rgba(192,57,43,0.4)', background: 'rgba(192,57,43,0.06)', fontSize: 13, fontWeight: 700, color: '#C0392B', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving…' : `Mark Incomplete`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark complete modal ── */}
      {selectedStep !== null && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={closeModal}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--navy)', margin: '0 0 4px' }}>
              Mark Step {selectedStep} Complete
            </h3>
            <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 22 }}>
              {STEPS[selectedStep - 1]?.s} · {sponseeName}
            </p>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 10 }}>How was this step completed?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {METHODS.map(m => (
                  <label
                    key={m.value}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${method === m.value ? 'var(--teal)' : 'var(--border)'}`,
                      background: method === m.value ? 'rgba(42,138,153,0.05)' : '#fff',
                    }}
                  >
                    <input
                      type="radio" name="method" value={m.value}
                      checked={method === m.value}
                      onChange={() => setMethod(m.value)}
                      style={{ marginTop: 2, accentColor: 'var(--teal)', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 1 }}>{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>
                Sponsor note <span style={{ fontWeight: 400, color: 'var(--mid)' }}>(optional)</span>
              </div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Any notes about how this step was worked…"
                rows={3}
                style={{
                  width: '100%', borderRadius: 8, border: '1.5px solid var(--border)',
                  padding: '8px 12px', fontSize: 13, fontFamily: 'var(--font-body)',
                  resize: 'vertical', color: 'var(--dark)', boxSizing: 'border-box' as const,
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={closeModal}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', fontSize: 13, fontWeight: 600, color: 'var(--mid)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={saveCompletion}
                disabled={saving}
                style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--teal)', fontSize: 13, fontWeight: 700, color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving…' : `✓ Mark Step ${selectedStep} Complete`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
