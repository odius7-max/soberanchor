import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import BackButton from '@/components/find/BackButton'
import SponseeProgram from '@/components/dashboard/SponseeProgram'

const MOOD_META: Record<string, { emoji: string; label: string; color: string }> = {
  great:      { emoji: '😊', label: 'great',      color: '#27AE60' },
  good:       { emoji: '🙂', label: 'good',       color: '#2A8A99' },
  okay:       { emoji: '😐', label: 'okay',       color: '#D4A574' },
  struggling: { emoji: '😔', label: 'struggling', color: '#E67E22' },
  crisis:     { emoji: '😰', label: 'crisis',     color: '#C0392B' },
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:          { label: 'Draft',          color: '#888',    bg: 'rgba(136,136,136,0.08)' },
  submitted:      { label: 'Needs Review',   color: '#D4A574', bg: 'rgba(212,165,116,0.12)' },
  reviewed:       { label: 'Reviewed',       color: '#27AE60', bg: 'rgba(39,174,96,0.1)'   },
  needs_revision: { label: 'Needs Revision', color: '#E67E22', bg: 'rgba(230,126,34,0.1)'  },
}

function calcDays(d: string | null): number | null {
  if (!d) return null
  return Math.floor((Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000)
}

function fmtDate(s: string) {
  return new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function relDate(s: string) {
  const days = Math.floor((Date.now() - new Date(s.includes('T') ? s : s + 'T00:00:00').getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export default async function SponseePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: sponseeId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=required')

  // Verify current user is an active sponsor of this sponsee
  const { data: rel } = await supabase
    .from('sponsor_relationships')
    .select('id, fellowship_id')
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', sponseeId)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel) notFound()

  const admin = createAdminClient()

  // Parallel fetch all sponsee data + program data
  const [
    profileRes,
    checkInsRes,
    journalRes,
    stepWorkRes,
    fellowshipsRes,
    completionsRes,
  ] = await Promise.all([
    admin.from('user_profiles').select('display_name, sobriety_date, current_step').eq('id', sponseeId).single(),
    admin.from('check_ins').select('id, check_in_date, mood, notes, sober_today, meetings_attended').eq('user_id', sponseeId).order('check_in_date', { ascending: false }).limit(5),
    admin.from('journal_entries').select('id, title, entry_date, excerpt, step_number').eq('user_id', sponseeId).eq('is_shared_with_sponsor', true).order('entry_date', { ascending: false }).limit(10),
    admin.from('step_work_entries')
      .select('id, workbook_id, review_status, submitted_at, reviewed_at, program_workbooks(title, step_number, slug)')
      .eq('user_id', sponseeId)
      .order('submitted_at', { ascending: false }),
    admin.from('fellowships').select('id, name, abbreviation, slug').order('name'),
    rel.fellowship_id
      ? admin.from('step_completions').select('step_number, is_completed, completed_method, sponsor_note, completed_at').eq('user_id', sponseeId).eq('fellowship_id', rel.fellowship_id)
      : Promise.resolve({ data: [] as { step_number: number; is_completed: boolean | null; completed_method: string | null; sponsor_note: string | null; completed_at: string | null }[], error: null }),
  ])

  if (!profileRes.data) notFound()

  const profile = profileRes.data
  const checkIns = checkInsRes.data ?? []
  const journalEntries = journalRes.data ?? []
  const stepEntries = stepWorkRes.data ?? []
  const fellowships = (fellowshipsRes.data ?? []) as { id: string; name: string; abbreviation: string | null; slug: string }[]
  const initialCompletions = (completionsRes.data ?? []) as { step_number: number; is_completed: boolean | null; completed_method: string | null; sponsor_note: string | null; completed_at: string | null }[]

  const sobrietyDays = calcDays(profile.sobriety_date)
  const submittedEntries = stepEntries.filter(e => e.review_status === 'submitted')
  const otherEntries = stepEntries.filter(e => e.review_status !== 'submitted')

  const card = { background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 16 } as const

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px' }}>
      <BackButton fallback="/dashboard" label="← Back to Dashboard" />

      {/* Header */}
      <div style={{ ...card, marginTop: 20, display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' as const }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#2A8A99,#003366)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {profile.display_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy)', margin: '0 0 4px' }}>{profile.display_name ?? 'Anonymous'}</h1>
          <div style={{ fontSize: 14, color: 'var(--mid)', display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
            {sobrietyDays !== null
              ? <span><strong style={{ color: 'var(--navy)' }}>{sobrietyDays}</strong> days sober · since {fmtDate(profile.sobriety_date!)}</span>
              : <span>No sobriety date set</span>}
            <span>Step <strong style={{ color: 'var(--navy)' }}>{profile.current_step ?? 1}</strong> of 12</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {submittedEntries.length > 0 && (
            <a href={`/dashboard/step-work/pending?sponsee=${sponseeId}`} style={{ display: 'inline-block', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8, background: '#2A8A99', color: '#fff', textDecoration: 'none' }}>
              Review Work ({submittedEntries.length})
            </a>
          )}
        </div>
      </div>

      {/* Program selector + step grid */}
      <SponseeProgram
        fellowships={fellowships}
        initialFellowshipId={rel.fellowship_id ?? null}
        relationshipId={rel.id}
        sponseeId={sponseeId}
        sponseeName={profile.display_name ?? 'your sponsee'}
        currentStep={profile.current_step ?? 1}
        initialCompletions={initialCompletions}
      />

      {/* Submitted step work — needs review */}
      {submittedEntries.length > 0 && (
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>📬 Pending Your Review</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {submittedEntries.map(e => {
              const wb = e.program_workbooks as unknown as { title: string; step_number: number | null; slug: string } | null
              return (
                <a key={e.id} href={`/dashboard/step-work/review/${e.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'rgba(212,165,116,0.06)', border: '1px solid rgba(212,165,116,0.2)', textDecoration: 'none', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{wb?.title ?? 'Step Work'}</div>
                    {e.submitted_at && <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>Submitted {relDate(e.submitted_at)}</div>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: STATUS_META.submitted.bg, color: STATUS_META.submitted.color, whiteSpace: 'nowrap' as const }}>Needs Review</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* All step work */}
      {otherEntries.length > 0 && (
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>📖 Step Work History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {otherEntries.map(e => {
              const wb = e.program_workbooks as unknown as { title: string; step_number: number | null; slug: string } | null
              const meta = STATUS_META[e.review_status] ?? STATUS_META.draft
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{wb?.title ?? 'Step Work'}</div>
                    {e.reviewed_at && <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>Reviewed {relDate(e.reviewed_at)}</div>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: meta.bg, color: meta.color, whiteSpace: 'nowrap' as const }}>{meta.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {stepEntries.length === 0 && (
        <div style={{ ...card, textAlign: 'center', color: 'var(--mid)', padding: '32px 24px' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📖</div>
          <div style={{ fontSize: 14 }}>No step work submitted yet.</div>
        </div>
      )}

      {/* Recent check-ins */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>💬 Recent Check-ins</h2>
        {checkIns.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--mid)', textAlign: 'center', padding: '16px 0' }}>No check-ins yet.</div>
        ) : checkIns.map((ci, i) => {
          const m = ci.mood ? MOOD_META[ci.mood] : null
          return (
            <div key={ci.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{m?.emoji ?? '😶'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{fmtDate(ci.check_in_date)}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {m && <span style={{ fontSize: 11, fontWeight: 600, color: m.color }}>{m.label}</span>}
                    {ci.sober_today && <span style={{ fontSize: 11, fontWeight: 600, color: '#27AE60' }}>✓ Sober</span>}
                  </div>
                </div>
                {ci.notes && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{ci.notes}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Shared journal entries */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>📓 Shared Journal Entries</h2>
        {journalEntries.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--mid)', textAlign: 'center', padding: '16px 0' }}>No journal entries shared yet.</div>
        ) : journalEntries.map((e, i) => (
          <div key={e.id} style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{e.title || 'Untitled'}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {e.step_number && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)' }}>Step {e.step_number}</span>}
                <span style={{ fontSize: 12, color: 'var(--mid)' }}>{fmtDate(e.entry_date)}</span>
              </div>
            </div>
            {e.excerpt && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 3, lineHeight: 1.5 }}>{e.excerpt}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
