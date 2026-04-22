'use client'

// Phase R.5 — /find/meetings entry-first rework.
// Inline add form is always visible at top. Saved meetings list below.
// Directory demoted to a <details> collapse at bottom.
// Unauthenticated users see a signup prompt instead of the Save button.

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AddMeetingModal from '@/components/dashboard/meetings/AddMeetingModal'
import MeetingsDirectory from '@/components/find/MeetingsDirectory'
import type { FellowshipOption, UserCustomMeeting, MeetingFormat } from '@/components/dashboard/meetings/types'
import { DAY_LABELS, FORMAT_LABELS } from '@/components/dashboard/meetings/types'

interface Props {
  userId: string | null
  availableFellowships: FellowshipOption[]
  primaryFellowshipId: string | null
  initialMeetings: UserCustomMeeting[]
  savedIds: Record<string, string>
  userCity: string | null
  userState: string | null
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function normalizeTime(t: string | null | undefined): string {
  if (!t) return ''
  return t.length >= 5 ? t.slice(0, 5) : t
}

function fmtDayTime(day: number | null, time: string | null): string {
  const dayLabel = day !== null ? DAY_LABELS.find(d => d.value === day)?.long : null
  let timeLabel: string | null = null
  if (time) {
    const [hStr, mStr] = time.split(':')
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      const period = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 === 0 ? 12 : h % 12
      timeLabel = `${h12}:${String(m).padStart(2, '0')} ${period}`
    }
  }
  if (dayLabel && timeLabel) return `${dayLabel} ${timeLabel}`
  if (dayLabel) return dayLabel
  if (timeLabel) return timeLabel
  return ''
}

function fellowshipAbbr(m: UserCustomMeeting, fellowships: FellowshipOption[]): string | null {
  if (!m.fellowship_id) return null
  const f = fellowships.find(x => x.id === m.fellowship_id)
  return f?.abbreviation ?? f?.name ?? null
}

// ─── Inline add form ──────────────────────────────────────────────────────────

interface InlineFormProps {
  userId: string | null
  availableFellowships: FellowshipOption[]
  primaryFellowshipId: string | null
  onSaved: (m: UserCustomMeeting) => void
}

function InlineAddForm({ userId, availableFellowships, primaryFellowshipId, onSaved }: InlineFormProps) {
  const [name, setName] = useState('')
  const [fellowshipId, setFellowshipId] = useState<string | null>(
    primaryFellowshipId ?? (availableFellowships[0]?.id ?? null)
  )
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null)
  const [timeLocal, setTimeLocal] = useState('')
  const [format, setFormat] = useState<MeetingFormat | null>(null)
  const [location, setLocation] = useState('')
  const [topic, setTopic] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const showFellowshipPills = availableFellowships.length > 1
  const canSave = name.trim().length > 0 && !saving

  function reset() {
    setName('')
    setDayOfWeek(null)
    setTimeLocal('')
    setFormat(null)
    setLocation('')
    setTopic('')
    setError(null)
    setSaved(false)
  }

  async function handleSave() {
    if (!canSave || !userId) return
    setError(null)
    setSaving(true)
    const supabase = createClient()
    const payload = {
      user_id: userId,
      fellowship_id: fellowshipId ?? null,
      name: name.trim(),
      day_of_week: dayOfWeek,
      time_local: timeLocal ? `${timeLocal}:00` : null,
      format: format,
      location: location.trim() || null,
      topic: topic.trim() || null,
      is_active: true,
      type: 'public' as const,
      recurrence: (dayOfWeek !== null ? 'weekly' : 'once') as 'weekly' | 'once',
      is_private: false,
    }
    try {
      const { data, error: insErr } = await supabase
        .from('user_custom_meetings')
        .insert(payload)
        .select()
        .single()
      if (insErr) throw insErr
      onSaved(data as UserCustomMeeting)
      setSaved(true)
      setTimeout(reset, 1200)
    } catch (e: any) {
      setError(e?.message ?? 'Could not save meeting. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 border border-[var(--border)] rounded-lg text-sm text-navy bg-white outline-none focus:border-teal'
  const labelCls = 'block text-xs font-semibold text-mid uppercase tracking-wide mb-1.5'
  const pillActive = 'bg-[rgba(42,138,153,0.1)] border-teal text-navy font-semibold'
  const pillInactive = 'bg-white border-[var(--border)] text-dark'

  return (
    <div
      className="bg-white rounded-[14px] p-6 mb-5"
      style={{ border: '1.5px solid rgba(42,138,153,0.25)', boxShadow: '0 4px 18px rgba(0,0,0,0.04)' }}
    >
      <div className="font-bold text-teal text-[15px] mb-1">+ Add a meeting</div>
      <p className="text-xs text-mid mb-4">Regular meeting? Add it once — we&apos;ll have it ready next time you check in.</p>

      {/* Name */}
      <div className="mb-3">
        <label className={labelCls}>Meeting name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Sunday Serenity"
          className={inputCls}
          maxLength={120}
        />
      </div>

      {/* Fellowship pills — only for multi-program users */}
      {showFellowshipPills && (
        <div className="mb-3">
          <div className={labelCls}>Fellowship</div>
          <div className="flex flex-wrap gap-2">
            {availableFellowships.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFellowshipId(f.id)}
                className={`px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-colors ${fellowshipId === f.id ? pillActive : pillInactive}`}
              >
                {f.abbreviation ?? f.name}
                {f.id === primaryFellowshipId && <span className="opacity-60 ml-1">primary</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Day picker */}
      <div className="mb-3">
        <div className={labelCls}>Day <span className="normal-case font-normal text-mid">(optional)</span></div>
        <div className="flex gap-1">
          {DAY_LABELS.map(d => (
            <button
              key={d.value}
              type="button"
              title={d.long}
              onClick={() => setDayOfWeek(prev => prev === d.value ? null : d.value)}
              className={`flex-1 py-2 rounded-lg border text-xs text-center cursor-pointer transition-colors ${dayOfWeek === d.value ? pillActive : pillInactive}`}
            >
              {d.short}
            </button>
          ))}
        </div>
      </div>

      {/* Time + Format row */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className={labelCls}>Start time <span className="normal-case font-normal">(optional)</span></label>
          <input
            type="time"
            value={timeLocal}
            onChange={e => setTimeLocal(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <div className={labelCls}>Format</div>
          <div className="flex gap-1.5">
            {FORMAT_LABELS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(prev => prev === f.value ? null : f.value)}
                className={`flex-1 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${format === f.value ? pillActive : pillInactive}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="mb-3">
        <label className={labelCls}>Where <span className="normal-case font-normal">(optional)</span></label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="City, venue, or Zoom link"
          className={inputCls}
          maxLength={200}
        />
      </div>

      {/* Topic */}
      <div className="mb-4">
        <label className={labelCls}>Topic <span className="normal-case font-normal">(optional)</span></label>
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g., Step 4 · gratitude · speaker"
          className={inputCls}
          maxLength={200}
        />
      </div>

      {error && (
        <div className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded-lg">{error}</div>
      )}

      {/* CTA — authenticated vs not */}
      {userId ? (
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3 rounded-xl font-bold text-sm text-white transition-opacity"
          style={{ background: canSave ? 'var(--teal)' : 'rgba(42,138,153,0.35)', cursor: canSave ? 'pointer' : 'default' }}
        >
          {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save meeting'}
        </button>
      ) : (
        <Link
          href="/sign-up"
          className="w-full py-3 rounded-xl font-bold text-sm text-white text-center block"
          style={{ background: 'var(--teal)' }}
        >
          Create an account to save your meetings
        </Link>
      )}
    </div>
  )
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

interface ArchiveConfirmProps {
  name: string
  onConfirm: () => void
  onCancel: () => void
}

function ArchiveConfirm({ name, onConfirm, onCancel }: ArchiveConfirmProps) {
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>
          Archive this meeting?
        </div>
        <div style={{ fontSize: 14, color: 'var(--mid)', marginBottom: 24 }}>
          &ldquo;{name}&rdquo; will stop appearing in pickers. Past check-ins will still reference it.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: '#E74C3C', border: 'none', color: '#fff', fontFamily: 'var(--font-body)' }}>
            Archive
          </button>
          <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'var(--warm-gray)', border: '1.5px solid var(--border)', color: 'var(--dark)', fontFamily: 'var(--font-body)' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MeetingsPageClient({
  userId,
  availableFellowships,
  primaryFellowshipId,
  initialMeetings,
  savedIds,
  userCity,
  userState,
}: Props) {
  const router = useRouter()
  const [meetings, setMeetings] = useState<UserCustomMeeting[]>(initialMeetings)
  const [editTarget, setEditTarget] = useState<UserCustomMeeting | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<UserCustomMeeting | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function handleNewMeeting(m: UserCustomMeeting) {
    setMeetings(prev => [m, ...prev.filter(x => x.id !== m.id)])
    showToast('Meeting saved')
    router.refresh()
  }

  function handleEditSaved(m: UserCustomMeeting) {
    setMeetings(prev => prev.map(x => x.id === m.id ? m : x))
    setEditTarget(null)
    showToast('Meeting updated')
    router.refresh()
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget || !userId) return
    const target = archiveTarget
    setArchiveTarget(null)
    const prev = meetings
    setMeetings(prev.map(m => m.id === target.id ? { ...m, is_active: false } : m))
    const supabase = createClient()
    const { error } = await supabase
      .from('user_custom_meetings')
      .update({ is_active: false })
      .eq('id', target.id)
      .eq('user_id', userId)
    if (error) {
      setMeetings(prev)
      showToast('Failed to archive — please try again')
      return
    }
    showToast('Meeting archived')
    router.refresh()
  }

  const activeMeetings = meetings.filter(m => m.is_active)

  return (
    <div className="max-w-[640px] mx-auto">
      {/* Page header */}
      <div className="text-center mb-6">
        <h1
          className="text-[26px] font-semibold text-navy mb-1.5"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}
        >
          Your meetings
        </h1>
        <p className="text-sm text-mid">Add one below — it&apos;ll be ready at every check-in.</p>
      </div>

      {/* Inline add form */}
      <InlineAddForm
        userId={userId}
        availableFellowships={availableFellowships}
        primaryFellowshipId={primaryFellowshipId}
        onSaved={handleNewMeeting}
      />

      {/* Saved meetings list — only shown when authenticated and has entries */}
      {userId && activeMeetings.length > 0 && (
        <div
          className="bg-white rounded-[14px] mb-5 overflow-hidden"
          style={{ border: '1px solid var(--border)', boxShadow: '0 4px 18px rgba(0,0,0,0.04)' }}
        >
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <span className="font-semibold text-navy text-sm">Your saved meetings</span>
            <span className="text-mid text-xs ml-1.5">· {activeMeetings.length}</span>
          </div>
          {activeMeetings.map((m, idx) => {
            const abbr = fellowshipAbbr(m, availableFellowships)
            const when = fmtDayTime(m.day_of_week, m.time_local)
            const meta = [when, abbr, m.location].filter(Boolean).join(' · ')
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: idx < activeMeetings.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy text-sm truncate">{m.name}</div>
                  {meta && <div className="text-xs text-mid mt-0.5">{meta}</div>}
                  {m.topic && <div className="text-xs text-mid mt-0.5 italic">{m.topic}</div>}
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => setEditTarget(m)}
                    className="text-xs font-semibold text-teal bg-none border-none cursor-pointer"
                    style={{ background: 'none', border: 'none', fontFamily: 'var(--font-body)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setArchiveTarget(m)}
                    className="text-xs text-mid bg-none border-none cursor-pointer"
                    style={{ background: 'none', border: 'none', fontFamily: 'var(--font-body)' }}
                  >
                    Archive
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Directory — collapsed by default */}
      <details
        className="bg-white rounded-[14px] overflow-hidden"
        style={{ border: '1px solid var(--border)', boxShadow: '0 4px 18px rgba(0,0,0,0.04)' }}
      >
        <summary
          className="px-5 py-4 font-semibold text-navy text-sm cursor-pointer list-none flex items-center justify-between select-none"
          style={{ userSelect: 'none' }}
        >
          <span>
            Browse meeting directory
            <span className="font-normal text-mid text-xs ml-2">· search by city, fellowship, day</span>
          </span>
          <span className="text-mid text-base" aria-hidden="true">▾</span>
        </summary>
        <div className="px-5 pb-5 pt-1" style={{ maxWidth: '100%', overflowX: 'auto' }}>
          <MeetingsDirectory
            savedIds={savedIds}
            userCity={userCity}
            userState={userState}
          />
        </div>
      </details>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg z-[150]"
          style={{ background: 'var(--navy)' }}
        >
          {toast}
        </div>
      )}

      {/* Edit modal */}
      {editTarget && userId && (
        <AddMeetingModal
          userId={userId}
          availableFellowships={availableFellowships}
          primaryFellowshipId={primaryFellowshipId}
          mode="edit"
          initialMeeting={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSaved}
        />
      )}

      {/* Archive confirm */}
      {archiveTarget && (
        <ArchiveConfirm
          name={archiveTarget.name}
          onConfirm={handleArchiveConfirm}
          onCancel={() => setArchiveTarget(null)}
        />
      )}
    </div>
  )
}
