'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ReadingAssignment { id: string; title: string; source: string | null; is_completed: boolean; due_date: string | null; created_at: string }
interface Props { readingAssignments: ReadingAssignment[]; hasSponsor: boolean }

export default function TasksTab({ readingAssignments, hasSponsor }: Props) {
  const router = useRouter()
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggleTask(id: string, current: boolean) {
    setToggling(id)
    const supabase = createClient()
    await supabase.from('reading_assignments').update({ is_completed: !current, completed_at: !current ? new Date().toISOString() : null }).eq('id', id)
    router.refresh()
    setToggling(null)
  }

  function fmtDate(s: string) {
    return new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!hasSponsor) return (
    <div className="text-center py-16 text-mid">
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
      <div className="font-semibold text-dark mb-1.5" style={{ fontSize: '16px' }}>No sponsor connected yet</div>
      <div style={{ fontSize: '14px' }}>Once you connect with a sponsor, they can assign reading tasks here.</div>
    </div>
  )

  if (readingAssignments.length === 0) return (
    <div className="text-center py-16 text-mid">
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
      <div className="font-semibold text-dark mb-1.5" style={{ fontSize: '16px' }}>No tasks yet</div>
      <div style={{ fontSize: '14px' }}>Your sponsor hasn&apos;t assigned any tasks yet. Check back soon.</div>
    </div>
  )

  const pending = readingAssignments.filter(t => !t.is_completed)
  const completed = readingAssignments.filter(t => t.is_completed)

  return (
    <div>
      <p className="text-mid mb-5" style={{ fontSize: '14px' }}>Tasks assigned by your sponsor</p>
      {pending.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {pending.map(task => (
            <div key={task.id} className="card-hover rounded-[14px] flex gap-4 items-start px-5 py-4 bg-white border border-[var(--border)]">
              <button onClick={() => toggleTask(task.id, task.is_completed)} disabled={toggling === task.id}
                className="flex items-center justify-center flex-shrink-0 rounded-lg transition-colors"
                style={{ width: '26px', height: '26px', marginTop: '1px', background: '#fff', border: '2px solid #D0CBC4', cursor: 'pointer' }} />
              <div className="flex-1">
                <div className="font-medium text-dark" style={{ fontSize: '15px' }}>{task.title}</div>
                {task.source && <div style={{ fontSize: '13px', color: 'var(--mid)', marginTop: '3px' }}>{task.source}</div>}
                <div style={{ fontSize: '12px', color: '#bbb', marginTop: '4px' }}>{task.due_date ? `Due ${fmtDate(task.due_date)}` : `Assigned ${fmtDate(task.created_at)}`}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {completed.length > 0 && (
        <>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--mid)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Completed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completed.map(task => (
              <div key={task.id} className="rounded-[14px] flex gap-4 items-start px-5 py-4 border border-[var(--border)]" style={{ background: 'var(--warm-gray)' }}>
                <button onClick={() => toggleTask(task.id, task.is_completed)} disabled={toggling === task.id}
                  className="flex items-center justify-center flex-shrink-0 rounded-lg"
                  style={{ width: '26px', height: '26px', marginTop: '1px', background: '#27AE60', border: '2px solid #27AE60', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>✓</button>
                <div className="flex-1">
                  <div className="font-medium" style={{ fontSize: '15px', color: 'var(--mid)', textDecoration: 'line-through' }}>{task.title}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
