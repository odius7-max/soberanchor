'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StepAccordion from './StepAccordion'
import type { TaskCardData } from './TaskCard'
import {
  createLibraryTask,
  updateLibraryTask,
  deleteLibraryTask,
  reorderTasks,
  ungroupSubsection,
  addFromExamples,
  addFromLibrary,
} from '@/app/dashboard/sponsees/program/actions'

interface StepDef {
  step_number: number
  name: string
}

interface LibraryTask {
  id: string
  program_id: string
  step_number: number
  title: string
  description: string | null
  category: string
  sort_order: number
  subsection: string | null
  source: string
}

interface ExampleTaskData {
  id: string
  step_number: number
  title: string
  description: string | null
  category: string
}

interface Props {
  programId: string
  fellowshipId: string
  steps: StepDef[]
  initialTasks: LibraryTask[]
  initialExamples: ExampleTaskData[]
  activeStep: number | null
}

export default function ProgramBuilder({ programId, fellowshipId, steps, initialTasks, initialExamples, activeStep }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState<LibraryTask[]>(initialTasks)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(() => {
    const set = new Set<number>()
    // Auto-expand active step
    if (activeStep) set.add(activeStep)
    // Also expand steps that have tasks
    for (const t of initialTasks) {
      if (!set.has(t.step_number) && t.step_number === activeStep) set.add(t.step_number)
    }
    return set
  })
  const [allExpanded, setAllExpanded] = useState(false)
  const [flashTaskId, setFlashTaskId] = useState<string | null>(null)

  // Clear flash after animation
  useEffect(() => {
    if (flashTaskId) {
      const timer = setTimeout(() => setFlashTaskId(null), 1500)
      return () => clearTimeout(timer)
    }
  }, [flashTaskId])

  // Group tasks by step
  function tasksByStep(stepNum: number): TaskCardData[] {
    return tasks
      .filter(t => t.step_number === stepNum)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        sort_order: t.sort_order,
        subsection: t.subsection,
        source: t.source,
      }))
  }

  function toggleStep(stepNum: number) {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepNum)) next.delete(stepNum)
      else next.add(stepNum)
      return next
    })
  }

  function toggleAll() {
    if (allExpanded) {
      setExpandedSteps(new Set())
      setAllExpanded(false)
    } else {
      setExpandedSteps(new Set(steps.map(s => s.step_number)))
      setAllExpanded(true)
    }
  }

  // ── CRUD handlers ──

  const handleEditTask = useCallback(async (id: string, updates: { title: string; description: string | null; category: string }) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const result = await updateLibraryTask(id, updates)
    if (result.error) router.refresh()
  }, [router])

  const handleDeleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    const result = await deleteLibraryTask(id)
    if (result.error) router.refresh()
  }, [router])

  const handleReorder = useCallback(async (stepNumber: number, orderedIds: string[]) => {
    // Optimistic: update sort_order locally
    setTasks(prev => {
      const updated = [...prev]
      for (let i = 0; i < orderedIds.length; i++) {
        const idx = updated.findIndex(t => t.id === orderedIds[i])
        if (idx !== -1) updated[idx] = { ...updated[idx], sort_order: i }
      }
      return updated
    })
    await reorderTasks(programId, stepNumber, orderedIds)
  }, [programId])

  const handleCreateTask = useCallback(async (stepNumber: number, title: string, description: string | null, category: string, subsection: string | null) => {
    const result = await createLibraryTask({
      programId,
      stepNumber,
      title,
      description,
      category,
      subsection,
    })
    if (result.task) {
      setTasks(prev => [...prev, result.task!])
      setFlashTaskId(result.task.id)
    }
  }, [programId])

  const handleUngroupSubsection = useCallback(async (stepNumber: number, subsection: string) => {
    setTasks(prev => prev.map(t =>
      t.step_number === stepNumber && t.subsection === subsection
        ? { ...t, subsection: null }
        : t
    ))
    await ungroupSubsection(programId, stepNumber, subsection)
  }, [programId])

  const handleAddFromExamples = useCallback(async (
    stepNumber: number,
    examples: { title: string; description: string | null; category: string }[]
  ) => {
    const result = await addFromExamples({ programId, stepNumber, examples })
    if (result.tasks.length > 0) {
      setTasks(prev => [...prev, ...result.tasks])
      setFlashTaskId(result.tasks[0].id)
    }
  }, [programId])

  const handleAddFromLibrary = useCallback(async (
    stepNumber: number,
    libraryItems: { title: string; description: string | null; category: string }[]
  ) => {
    const result = await addFromLibrary({ programId, targetStepNumber: stepNumber, tasks: libraryItems })
    if (result.tasks.length > 0) {
      setTasks(prev => [...prev, ...result.tasks])
      setFlashTaskId(result.tasks[0].id)
    }
  }, [programId])

  // Examples for each step
  function examplesForStep(stepNum: number) {
    return initialExamples
      .filter(e => e.step_number === stepNum)
      .map(e => ({ id: e.id, title: e.title, description: e.description, category: e.category }))
  }

  // Library tasks NOT in the current step (available for cross-step reuse)
  function libraryForStep(stepNum: number) {
    return tasks
      .filter(t => t.step_number !== stepNum)
      .map(t => ({
        id: t.id, title: t.title, description: t.description,
        category: t.category, step_number: t.step_number,
      }))
  }

  // Titles already in a step (to detect duplicates from examples)
  function existingTitlesForStep(stepNum: number): Set<string> {
    return new Set(tasks.filter(t => t.step_number === stepNum).map(t => t.title))
  }

  const totalTasks = tasks.length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
            color: 'var(--navy)', letterSpacing: '-0.5px', margin: 0,
          }}>
            Program Builder
          </h2>
          <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 4 }}>
            {totalTasks} task{totalTasks !== 1 ? 's' : ''} across {steps.length} steps
          </p>
        </div>
        <button
          onClick={toggleAll}
          style={{
            fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: '#fff', color: 'var(--mid)',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Empty state */}
      {totalTasks === 0 && expandedSteps.size === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 20px', marginBottom: 20,
          background: 'rgba(42,157,143,0.03)', border: '1.5px dashed rgba(42,157,143,0.2)',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>
            Your program is empty
          </h3>
          <p style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
            Start by expanding a step and adding tasks. You can create your own or add SoberAnchor example tasks.
          </p>
        </div>
      )}

      {/* Step accordions */}
      {steps.map(step => (
        <StepAccordion
          key={step.step_number}
          stepNumber={step.step_number}
          stepName={step.name}
          tasks={tasksByStep(step.step_number)}
          examples={examplesForStep(step.step_number)}
          libraryTasks={libraryForStep(step.step_number)}
          existingTitles={existingTitlesForStep(step.step_number)}
          isActive={step.step_number === activeStep}
          isExpanded={expandedSteps.has(step.step_number)}
          onToggle={() => toggleStep(step.step_number)}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onReorder={handleReorder}
          onCreateTask={handleCreateTask}
          onAddFromExamples={(examples) => handleAddFromExamples(step.step_number, examples)}
          onAddFromLibrary={(items) => handleAddFromLibrary(step.step_number, items)}
          onUngroupSubsection={handleUngroupSubsection}
        />
      ))}
    </div>
  )
}
