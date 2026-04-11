'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Workbook {
  id: string
  title: string
  slug: string
  step_number: number
  description: string | null
  sort_order: number
  prompts: Array<{ id: string; type: string }> | null
}

interface Entry {
  workbook_id: string
  review_status: string
  responses: Record<string, unknown> | null
}

interface FellowshipInfo {
  id: string
  name: string
  abbreviation: string | null
}

const STEP_NAMES = [
  '', // 0-index placeholder
  'Powerlessness', 'Hope', 'Decision', 'Inventory',
  'Admission', 'Readiness', 'Humility', 'Amends List',
  'Amends', 'Daily Inventory', 'Spiritual Growth', 'Service',
]

const STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  not_started:       { label: 'Not started',           bg: 'var(--warm-gray)',          color: 'var(--mid)',    border: 'var(--border)' },
  draft:             { label: 'In progress',            bg: 'rgba(42,138,153,0.07)',     color: 'var(--teal)',   border: 'rgba(42,138,153,0.2)' },
  submitted:         { label: 'Awaiting review',        bg: 'rgba(212,165,116,0.1)',     color: '#9A7B54',       border: 'rgba(212,165,116,0.3)' },
  reviewed:          { label: 'Reviewed ✓',             bg: 'rgba(39,174,96,0.08)',      color: '#27AE60',       border: 'rgba(39,174,96,0.2)' },
  needs_revision:    { label: 'Needs revision',         bg: 'rgba(231,76,60,0.07)',      color: '#C0392B',       border: 'rgba(231,76,60,0.2)' },
  sponsor_completed: { label: 'Completed via sponsor',  bg: 'rgba(39,174,96,0.06)',      color: '#27AE60',       border: 'rgba(39,174,96,0.12)' },
}

/**
 * Returns the effective display status for a workbook section.
 *
 * If the parent step is sponsor-completed and the user has no digital entry
 * (or only a draft), we show 'sponsor_completed' so the section doesn't appear
 * as "Not started" when the step was actually worked through with a sponsor
 * outside the app. Submitted / reviewed digital entries take priority because
 * they carry more specific information.
 */
function effectiveStatus(entry: Entry | undefined, stepCompleted: boolean): string {
  if (!entry) return stepCompleted ? 'sponsor_completed' : 'not_started'
  if (entry.review_status === 'draft' && stepCompleted) return 'sponsor_completed'
  return entry.review_status ?? 'draft'
}

function stepProgress(
  workbooks: Workbook[],
  entries: Entry[],
  stepNum: number,
  completedStepNums: Set<number>,
) {
  const sections = workbooks.filter(w => w.step_number === stepNum)
  const total = sections.length
  if (total === 0) return { total: 0, done: 0, pct: 0 }

  // If the step is marked complete via sponsor, all sections count as done
  if (completedStepNums.has(stepNum)) return { total, done: total, pct: 100 }

  const done = sections.filter(w => {
    const e = entries.find(e => e.workbook_id === w.id)
    return e && (e.review_status === 'reviewed' || e.review_status === 'submitted')
  }).length
  return { total, done, pct: Math.round((done / total) * 100) }
}

export default function StepWorkOverview({ userId, fellowshipId: fellowshipIdProp }: { userId: string; fellowshipId?: string | null }) {
  const router = useRouter()
  const [workbooks, setWorkbooks] = useState<Workbook[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [completedStepNums, setCompletedStepNums] = useState<Set<number>>(new Set())
  const [fellowship, setFellowship] = useState<FellowshipInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedStep, setExpandedStep] = useState<number | null>(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      const supabase = createClient()
      let fellowshipInfo: FellowshipInfo | null = null

      if (fellowshipIdProp !== undefined) {
        // Milestone-driven: fellowship provided directly from the active milestone tab
        if (fellowshipIdProp) {
          const { data: fw } = await supabase
            .from('fellowships').select('name, abbreviation').eq('id', fellowshipIdProp).single()
          if (fw) fellowshipInfo = { id: fellowshipIdProp, name: fw.name, abbreviation: fw.abbreviation }
        }
        // fellowshipIdProp === null means milestone has no fellowship linked → fellowshipInfo stays null
      } else {
        // Legacy fallback: derive fellowship from the user's active sponsor relationship
        const { data: rel } = await supabase
          .from('sponsor_relationships')
          .select('fellowship_id, fellowships(name, abbreviation)')
          .eq('sponsee_id', userId)
          .eq('status', 'active')
          .maybeSingle()
        const fid = (rel as { fellowship_id?: string } | null)?.fellowship_id ?? null
        const fw = (rel as { fellowships?: { name: string; abbreviation: string | null } } | null)?.fellowships ?? null
        if (fid && fw) fellowshipInfo = { id: fid, name: fw.name, abbreviation: fw.abbreviation }
      }

      if (cancelled) return
      setFellowship(fellowshipInfo)

      const fid = fellowshipInfo?.id ?? null
      const [wb, en, sc] = await Promise.all([
        fid
          ? supabase
              .from('program_workbooks')
              .select('id, title, slug, step_number, description, sort_order, prompts')
              .eq('is_active', true)
              .eq('fellowship_id', fid)
              .order('sort_order')
          : Promise.resolve({ data: [] as Workbook[] }),
        supabase.from('step_work_entries').select('workbook_id, review_status, responses').eq('user_id', userId),
        fid
          ? supabase
              .from('step_completions')
              .select('step_number')
              .eq('user_id', userId)
              .eq('fellowship_id', fid)
              .eq('is_completed', true)
          : Promise.resolve({ data: [] as { step_number: number }[] }),
      ])

      if (cancelled) return
      setWorkbooks((wb.data ?? []) as unknown as Workbook[])
      setEntries((en.data ?? []) as unknown as Entry[])
      setCompletedStepNums(new Set((sc.data ?? []).map(r => r.step_number)))
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [userId, fellowshipIdProp])

  const steps = Array.from({ length: 12 }, (_, i) => i + 1)
  const totalSections = workbooks.length

  // Sections Reviewed = digitally reviewed OR under a sponsor-completed step
  const reviewedCount = workbooks.filter(w => {
    const entry = entries.find(e => e.workbook_id === w.id)
    return entry?.review_status === 'reviewed' || completedStepNums.has(w.step_number)
  }).length

  // In-progress = draft entries for steps NOT sponsor-completed
  const inProgressCount = entries.filter(e => {
    if (e.review_status !== 'draft') return false
    const wb = workbooks.find(w => w.id === e.workbook_id)
    return wb && !completedStepNums.has(wb.step_number)
  }).length

  if (!fellowship) {
    return (
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center', color: 'var(--mid)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
        {fellowshipIdProp !== undefined ? (
          // Milestone-driven but no fellowship linked to this milestone
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>No fellowship linked to this milestone</div>
            <div style={{ fontSize: 14 }}>Edit this milestone in Privacy → Sobriety Dates to link a fellowship and unlock step work for it.</div>
          </>
        ) : (
          // No active sponsor relationship (legacy path)
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>No active sponsor relationship</div>
            <div style={{ fontSize: 14 }}>Ask your sponsor to connect with you on SoberAnchor to unlock step work.</div>
          </>
        )}
      </div>
    )
  }

  const totalPrompts = workbooks.reduce((sum, w) => sum + (w.prompts?.length ?? 0), 0)

  return (
    <div>
      {/* Fellowship subtitle */}
      <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 16, marginTop: 0 }}>
        {fellowship.abbreviation ?? fellowship.name} — {workbooks.length} sections, {totalPrompts} prompts. Click any section to begin or continue.
      </p>
      {/* Summary bar */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {[
          { label: 'Sections Reviewed', val: reviewedCount, of: totalSections, color: '#27AE60' },
          { label: 'In Progress',       val: inProgressCount, of: null, color: 'var(--teal)' },
          { label: 'Total Sections',    val: totalSections,   of: null, color: 'var(--navy)' },
        ].map(s => (
          <div key={s.label} className="rounded-[14px] bg-white border border-border flex-1" style={{ minWidth: 130, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, letterSpacing: '-1px', color: s.color, lineHeight: 1 }}>
              {s.val}{s.of !== null && <span style={{ fontSize: 20, color: 'var(--mid)', fontWeight: 400 }}> / {s.of}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Steps accordion */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map(stepNum => {
          const sections   = workbooks.filter(w => w.step_number === stepNum)
          const { done, pct } = stepProgress(workbooks, entries, stepNum, completedStepNums)
          const isOpen     = expandedStep === stepNum
          const stepDone   = done === sections.length && sections.length > 0
          const sponsorDone = completedStepNums.has(stepNum)
          const hasAny     = entries.some(e => sections.some(w => w.id === e.workbook_id))

          return (
            <div key={stepNum} className="bg-white border border-border rounded-[14px] overflow-hidden">
              {/* Step header */}
              <button
                onClick={() => setExpandedStep(isOpen ? null : stepNum)}
                className="w-full text-left"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {/* Step badge */}
                <div
                  className="flex items-center justify-center rounded-xl font-bold flex-shrink-0"
                  style={{
                    width: 40, height: 40, fontSize: 15,
                    background: stepDone ? 'rgba(39,174,96,0.1)' : hasAny ? 'rgba(42,138,153,0.09)' : 'var(--warm-gray)',
                    color: stepDone ? '#27AE60' : hasAny ? 'var(--teal)' : 'var(--mid)',
                  }}
                >
                  {stepDone ? '✓' : stepNum}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
                      Step {stepNum}: {STEP_NAMES[stepNum]}
                    </span>
                    {sponsorDone && !hasAny && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(39,174,96,0.06)', color: '#27AE60', border: '1px solid rgba(39,174,96,0.12)' }}>
                        via sponsor
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div className="rounded-full overflow-hidden" style={{ flex: 1, maxWidth: 160, height: 5, background: 'var(--warm-gray)' }}>
                      <div className="rounded-full h-full" style={{ width: `${pct}%`, background: stepDone ? '#27AE60' : 'var(--teal)', transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--mid)', whiteSpace: 'nowrap' }}>{done}/{sections.length} sections</span>
                  </div>
                </div>

                <span style={{ fontSize: 13, color: 'var(--mid)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▼</span>
              </button>

              {/* Section list */}
              {isOpen && sections.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {sections.map((w, idx) => {
                    const entry   = entries.find(e => e.workbook_id === w.id)
                    const status  = effectiveStatus(entry, completedStepNums.has(stepNum))
                    const meta    = STATUS_META[status] ?? STATUS_META.not_started
                    const isSponsorCompleted = status === 'sponsor_completed'
                    const promptCount = w.prompts?.length ?? 0

                    return (
                      <button
                        key={w.id}
                        onClick={() => router.push(`/dashboard/step-work/${w.slug}`)}
                        className="w-full text-left"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'none', border: 'none', borderTop: idx > 0 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--warm-gray)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 2 }}>{w.title}</div>
                          {isSponsorCompleted ? (
                            <div style={{ fontSize: 11, color: '#27AE60', fontStyle: 'italic' }}>
                              Completed outside app — click to fill in prompts retroactively
                            </div>
                          ) : w.description ? (
                            <div style={{ fontSize: 12, color: 'var(--mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.description}</div>
                          ) : null}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: 'var(--mid)' }}>{promptCount} prompts</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, whiteSpace: 'nowrap' }}>
                            {meta.label}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--mid)' }}>→</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
