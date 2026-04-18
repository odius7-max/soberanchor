'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import FromProgramTab from './FromProgramTab'
import CustomTaskTab from './CustomTaskTab'
import type { SponsorTask } from '@/app/actions/sponsorTasks'

interface Props {
  sponseeId: string
  sponseeName: string
  relationshipId: string
  fellowshipId: string | null
  currentStep: number | null
  completedCount: number
  lastSubmittedAt: string | null
  onClose: () => void
  onAssigned: (tasks: SponsorTask[]) => void
}

interface LibraryTaskRow {
  id: string
  step_number: number
  title: string
  description: string | null
  category: string
  sort_order: number
  subsection: string | null
}

interface StepInfo {
  step_number: number
  name: string
}

export default function AssignTaskModal({
  sponseeId,
  sponseeName,
  relationshipId,
  fellowshipId,
  currentStep,
  completedCount,
  lastSubmittedAt,
  onClose,
  onAssigned,
}: Props) {
  const [activeTab, setActiveTab] = useState<'program' | 'custom'>('program')
  const [programId, setProgramId] = useState<string | null>(null)
  const [library, setLibrary] = useState<LibraryTaskRow[]>([])
  const [steps, setSteps] = useState<StepInfo[]>([])
  const [assignedLibraryIds, setAssignedLibraryIds] = useState<Set<string>>(new Set())
  const [assignedMeta, setAssignedMeta] = useState<Record<string, { assignedAt: string; completedAt: string | null }>>({})
  const [loading, setLoading] = useState(fellowshipId !== null)

  const close = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Load sponsor's program, library, step names, and already-assigned library IDs
  useEffect(() => {
    if (!fellowshipId) return
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }

      // Program (may not yet exist — that's fine; just show empty library)
      const { data: program } = await supabase
        .from('sponsor_program_templates')
        .select('id')
        .eq('sponsor_id', user.id)
        .eq('fellowship_id', fellowshipId)
        .maybeSingle()

      const libP = program
        ? supabase
            .from('sponsor_task_library')
            .select('id, step_number, title, description, category, sort_order, subsection')
            .eq('program_id', program.id)
            .order('step_number')
            .order('sort_order')
        : Promise.resolve({ data: [] as LibraryTaskRow[] })

      const workbooksP = supabase
        .from('program_workbooks')
        .select('step_number, title, sort_order')
        .eq('fellowship_id', fellowshipId)
        .eq('is_active', true)
        .order('step_number')
        .order('sort_order')

      const assignedP = supabase
        .from('sponsor_tasks')
        .select('library_task_id, assigned_at, completed_at')
        .eq('sponsor_id', user.id)
        .eq('sponsee_id', sponseeId)
        .not('library_task_id', 'is', null)

      const [libRes, workbooksRes, assignedRes] = await Promise.all([libP, workbooksP, assignedP])
      if (cancelled) return

      const libraryRows = (libRes.data ?? []) as LibraryTaskRow[]
      const stepMap = new Map<number, string>()
      for (const wb of (workbooksRes.data ?? [])) {
        if (!stepMap.has(wb.step_number)) {
          const title = wb.title as string
          const match = title.match(/Step \d+[:\s—–-]+(.+?)(?:\s*[—–-]|$)/)
          stepMap.set(wb.step_number, match ? match[1].trim() : title)
        }
      }
      const stepList = Array.from(stepMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([step_number, name]) => ({ step_number, name }))

      const assignedIds = new Set<string>()
      const assignedDetails: Record<string, { assignedAt: string; completedAt: string | null }> = {}
      for (const row of (assignedRes.data ?? [])) {
        const id = row.library_task_id as string | null
        if (!id) continue
        assignedIds.add(id)
        const prev = assignedDetails[id]
        // Keep the most recent assignment
        if (!prev || new Date(row.assigned_at as string) > new Date(prev.assignedAt)) {
          assignedDetails[id] = {
            assignedAt: row.assigned_at as string,
            completedAt: (row.completed_at as string | null) ?? null,
          }
        }
      }

      setProgramId(program?.id ?? null)
      setLibrary(libraryRows)
      setSteps(stepList)
      setAssignedLibraryIds(assignedIds)
      setAssignedMeta(assignedDetails)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [fellowshipId, sponseeId])

  function handleAssignedFromProgram(tasks: SponsorTask[]) {
    // Update local set so re-open doesn't re-offer them
    setAssignedLibraryIds(prev => {
      const next = new Set(prev)
      for (const t of tasks) if (t.library_task_id) next.add(t.library_task_id)
      return next
    })
    onAssigned(tasks)
    close()
  }

  function handleAssignedCustom(task: SponsorTask) {
    if (task.library_task_id) {
      setAssignedLibraryIds(prev => new Set(prev).add(task.library_task_id!))
    }
    onAssigned([task])
    close()
  }

  function fmtDate(s: string | null) {
    if (!s) return null
    return new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
          width: '100%', maxWidth: 560,
          maxHeight: '92vh', overflowY: 'auto',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>
            Assign task to {sponseeName}
          </div>
          <button
            onClick={close}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--mid)', lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* Sponsee context bar */}
        <div style={{
          margin: '12px 24px 0',
          padding: '10px 14px',
          borderRadius: 10,
          background: 'var(--warm-gray)',
          display: 'flex', gap: 14, flexWrap: 'wrap' as const, alignItems: 'center',
          fontSize: 12, color: 'var(--mid)',
        }}>
          {currentStep !== null && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              background: 'rgba(240,192,64,0.18)', color: '#9A7B54', letterSpacing: '0.5px',
            }}>
              CURRENT STEP {currentStep}
            </span>
          )}
          <span>{assignedLibraryIds.size} assigned · {completedCount} completed</span>
          {lastSubmittedAt && <span>Last submitted {fmtDate(lastSubmittedAt)}</span>}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '14px 24px 0', borderBottom: '1px solid var(--border)' }}>
          {([
            { k: 'program', label: 'From Program' },
            { k: 'custom',  label: 'Custom Task' },
          ] as const).map(t => {
            const isActive = activeTab === t.k
            return (
              <button
                key={t.k}
                onClick={() => setActiveTab(t.k)}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  padding: '10px 16px', fontSize: 13, fontWeight: 600,
                  color: isActive ? 'var(--teal)' : 'var(--mid)',
                  borderBottom: isActive ? '2.5px solid var(--teal)' : '2.5px solid transparent',
                  marginBottom: -1,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: 'var(--mid)' }}>
              Loading program…
            </div>
          ) : activeTab === 'program' ? (
            <FromProgramTab
              library={library}
              steps={steps}
              currentStep={currentStep}
              assignedLibraryIds={assignedLibraryIds}
              assignedMeta={assignedMeta}
              sponseeId={sponseeId}
              relationshipId={relationshipId}
              fellowshipId={fellowshipId}
              onAssigned={handleAssignedFromProgram}
              onCancel={close}
            />
          ) : (
            <CustomTaskTab
              sponseeId={sponseeId}
              sponseeName={sponseeName}
              relationshipId={relationshipId}
              programId={programId}
              currentStep={currentStep}
              steps={steps}
              onAssigned={handleAssignedCustom}
              onCancel={close}
            />
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
