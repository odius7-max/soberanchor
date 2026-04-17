'use client'

import { useScrollFade } from '@/hooks/useScrollFade'

export type JourneyTab = 'today' | 'stepwork' | 'journal' | 'meetings' | 'tasks' | 'saved'

const TABS: { id: JourneyTab; label: string }[] = [
  { id: 'today',    label: 'Today' },
  { id: 'stepwork', label: 'Step Work' },
  { id: 'journal',  label: 'Journal' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'tasks',    label: 'Tasks' },
  { id: 'saved',    label: 'Saved' },
]

interface Props {
  activeTab: JourneyTab
  onTabChange: (tab: JourneyTab) => void
}

export default function JourneySubNav({ activeTab, onTabChange }: Props) {
  const { ref, fadeLeft, fadeRight } = useScrollFade()

  return (
    <div className="relative" style={{ borderBottom: '2px solid var(--border)' }}>
      {fadeLeft && (
        <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 40, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(to right, #fff, transparent)' }} />
      )}
      {fadeRight && (
        <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 40, zIndex: 1, pointerEvents: 'none', background: 'linear-gradient(to left, #fff, transparent)' }} />
      )}
      <div ref={ref} className="flex overflow-x-auto" style={{ scrollbarWidth: 'none', gap: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className="font-semibold flex-shrink-0 transition-colors"
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              whiteSpace: 'nowrap',
              color: activeTab === t.id ? 'var(--navy)' : 'var(--mid)',
              borderBottom: activeTab === t.id ? '2px solid var(--navy)' : '2px solid transparent',
              marginBottom: '-2px',
              minHeight: 44,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
