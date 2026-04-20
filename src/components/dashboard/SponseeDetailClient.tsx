'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SponseeProgram, { type Fellowship, type StepCompletion } from './SponseeProgram'
import SponseeTasksSection from './SponseeTasksSection'
import type { SponsorTask } from '@/app/actions/sponsorTasks'

interface Props {
  // Program
  fellowships: Fellowship[]
  initialFellowshipId: string | null
  suggestedFellowshipId: string | null
  relationshipId: string
  sponseeId: string
  sponseeName: string
  currentStep: number
  initialCompletions: StepCompletion[]
  // Tasks
  nextStep: number | null
  completedTasksCount: number
  lastSubmittedAt: string | null
  initialTasks: SponsorTask[]
  // Ready-to-sponsor
  sponsorMarkedReadyAt: string | null
  sponsorId: string
}

/**
 * Shared client wrapper for the Program card + Tasks card on the sponsee detail page.
 * Lifts fellowshipId state so that:
 *   1. If the sponsor hasn't picked a program yet, we default to the sponsee's own fellowship
 *      (suggestedFellowshipId) rather than forcing them to pick again.
 *   2. When the sponsor changes the fellowship via the Program dropdown, the Tasks section
 *      sees the new value immediately (no page refresh needed) — so "+ Assign Task" lands
 *      on the right program.
 *   3. Clicking "+ Assign Task" with no program selected scrolls to the dropdown, highlights
 *      it, and shows an inline "Select a Program first" message in the Tasks card.
 */
export default function SponseeDetailClient({
  fellowships,
  initialFellowshipId,
  suggestedFellowshipId,
  relationshipId,
  sponseeId,
  sponseeName,
  currentStep,
  initialCompletions,
  nextStep,
  completedTasksCount,
  lastSubmittedAt,
  initialTasks,
  sponsorMarkedReadyAt,
  sponsorId,
}: Props) {
  const seed = initialFellowshipId ?? suggestedFellowshipId
  const [fellowshipId, setFellowshipId] = useState<string | null>(seed)
  const [highlightProgram, setHighlightProgram] = useState(false)
  const programAnchorRef = useRef<HTMLDivElement>(null)
  const [markedReadyAt, setMarkedReadyAt] = useState<string | null>(sponsorMarkedReadyAt)
  const [savingReady, setSavingReady] = useState(false)

  async function markReady() {
    setSavingReady(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    await supabase.from('user_profiles').update({
      sponsor_marked_ready_at: now,
      sponsor_marked_ready_by: sponsorId,
    }).eq('id', sponseeId)
    setMarkedReadyAt(now)
    setSavingReady(false)
  }

  async function unmarkReady() {
    setSavingReady(true)
    const supabase = createClient()
    await supabase.from('user_profiles').update({
      sponsor_marked_ready_at: null,
      sponsor_marked_ready_by: null,
      is_available_sponsor: false,
    }).eq('id', sponseeId)
    setMarkedReadyAt(null)
    setSavingReady(false)
  }

  function handleAssignBlocked() {
    setHighlightProgram(true)
    programAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Fade the highlight out after ~4s so the dropdown returns to neutral.
    setTimeout(() => setHighlightProgram(false), 4000)
  }

  function handleFellowshipChanged(newId: string | null) {
    setFellowshipId(newId)
    if (newId) setHighlightProgram(false)
  }

  const card = {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '20px 24px',
    marginBottom: 16,
  } as const

  return (
    <>
      <div ref={programAnchorRef} style={{ scrollMarginTop: 20 }}>
        <SponseeProgram
          fellowships={fellowships}
          initialFellowshipId={initialFellowshipId}
          suggestedFellowshipId={suggestedFellowshipId}
          relationshipId={relationshipId}
          sponseeId={sponseeId}
          sponseeName={sponseeName}
          currentStep={currentStep}
          initialCompletions={initialCompletions}
          onFellowshipChange={handleFellowshipChanged}
          highlightMissing={highlightProgram && !fellowshipId}
        />
      </div>
      {/* Ready-to-sponsor gate */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 3 }}>
            Ready to sponsor others
          </div>
          <div style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.5 }}>
            {markedReadyAt
              ? `You marked ${sponseeName} ready on ${new Date(markedReadyAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. This unlocks their availability toggle.`
              : `Mark ${sponseeName} ready when they're prepared to sponsor others. This unlocks their availability toggle in settings.`}
          </div>
        </div>
        {markedReadyAt ? (
          <button
            onClick={unmarkReady}
            disabled={savingReady}
            style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: '1.5px solid #C0392B', background: 'none', color: '#C0392B', cursor: savingReady ? 'wait' : 'pointer', opacity: savingReady ? 0.6 : 1 }}
          >
            {savingReady ? '…' : 'Unmark'}
          </button>
        ) : (
          <button
            onClick={markReady}
            disabled={savingReady}
            style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--teal)', color: '#fff', cursor: savingReady ? 'wait' : 'pointer', opacity: savingReady ? 0.6 : 1 }}
          >
            {savingReady ? '…' : 'Mark ready'}
          </button>
        )}
      </div>

      <div style={card}>
        <SponseeTasksSection
          sponseeId={sponseeId}
          sponseeName={sponseeName}
          relationshipId={relationshipId}
          fellowshipId={fellowshipId}
          currentStep={nextStep}
          completedTasksCount={completedTasksCount}
          lastSubmittedAt={lastSubmittedAt}
          initialTasks={initialTasks}
          onAssignBlocked={handleAssignBlocked}
        />
      </div>
    </>
  )
}
