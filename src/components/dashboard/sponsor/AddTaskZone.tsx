'use client'

import { useState } from 'react'
import ExampleTaskPicker, { type ExampleTask } from './ExampleTaskPicker'
import LibraryTaskPicker, { type LibraryPickerTask } from './LibraryTaskPicker'
import CreateTaskForm from './CreateTaskForm'

type SourceAccordion = 'examples' | 'library' | 'create' | null

interface Props {
  stepNumber: number
  examples: ExampleTask[]
  libraryTasks: LibraryPickerTask[]
  existingTitles: Set<string>
  onClose: () => void
  onAddFromExamples: (tasks: ExampleTask[]) => void
  onAddFromLibrary: (tasks: LibraryPickerTask[]) => void
  onCreateNew: (task: { title: string; description: string | null; category: string; saveToLibrary: boolean }) => void
}

export default function AddTaskZone({
  stepNumber, examples, libraryTasks, existingTitles,
  onClose, onAddFromExamples, onAddFromLibrary, onCreateNew,
}: Props) {
  const [openSource, setOpenSource] = useState<SourceAccordion>('examples')

  function toggleSource(source: SourceAccordion) {
    setOpenSource(prev => prev === source ? null : source)
  }

  const availableExamples = examples.filter(e => !existingTitles.has(e.title)).length

  return (
    <div style={{
      marginTop: 12,
      border: '1.5px dashed var(--teal)',
      borderRadius: 14,
      background: 'rgba(42,157,143,0.02)',
      overflow: 'hidden',
    }}>
      {/* Zone header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(42,157,143,0.12)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>
          + Add task to Step {stepNumber}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, color: 'var(--mid)', padding: '2px 6px', lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '8px 16px 16px' }}>
        {/* ── SoberAnchor Examples ── */}
        <SourceAccordionHeader
          title="SoberAnchor Examples"
          subtitle={`${availableExamples} available`}
          icon="📚"
          isOpen={openSource === 'examples'}
          onToggle={() => toggleSource('examples')}
        />
        {openSource === 'examples' && (
          <div style={{ padding: '10px 0 14px' }}>
            <ExampleTaskPicker
              examples={examples}
              existingTitles={existingTitles}
              onAdd={onAddFromExamples}
            />
          </div>
        )}

        {/* ── My Library ── */}
        <SourceAccordionHeader
          title="My Library"
          subtitle={`${libraryTasks.length} saved`}
          icon="📁"
          isOpen={openSource === 'library'}
          onToggle={() => toggleSource('library')}
        />
        {openSource === 'library' && (
          <div style={{ padding: '10px 0 14px' }}>
            <LibraryTaskPicker tasks={libraryTasks} onAdd={onAddFromLibrary} />
          </div>
        )}

        {/* ── Create New ── */}
        <SourceAccordionHeader
          title="Create New Task"
          subtitle=""
          icon="✨"
          isOpen={openSource === 'create'}
          onToggle={() => toggleSource('create')}
        />
        {openSource === 'create' && (
          <div style={{ padding: '10px 0 4px' }}>
            <CreateTaskForm stepNumber={stepNumber} onAdd={onCreateNew} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Reusable source accordion header ──

function SourceAccordionHeader({
  title, subtitle, icon, isOpen, onToggle,
}: {
  title: string; subtitle: string; icon: string; isOpen: boolean; onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '10px 0',
        background: 'none', border: 'none', borderTop: '1px solid rgba(42,157,143,0.1)',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
      }}
    >
      <span style={{
        fontSize: 11, color: 'var(--teal)', transition: 'transform 0.2s',
        display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        flexShrink: 0,
      }}>
        ▶
      </span>
      <span style={{ fontSize: 14, marginRight: 2 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', flex: 1 }}>{title}</span>
      {subtitle && (
        <span style={{ fontSize: 11, color: 'var(--mid)', flexShrink: 0 }}>{subtitle}</span>
      )}
    </button>
  )
}
