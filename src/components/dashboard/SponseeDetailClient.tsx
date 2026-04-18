'use client'

import { useRef, useState } from 'react'
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
}: Props) {
  const seed = initialFellowshipId ?? suggestedFellowshipId
  const [fellowshipId, setFellowshipId] = useState<string | null>(seed)
  const [highlightProgram, setHighlightProgram] = useState(false)
  const programAnchorRef = useRef<HTMLDivElement>(null)

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
