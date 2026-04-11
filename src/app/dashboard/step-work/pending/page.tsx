import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BackButton from '@/components/find/BackButton'

export default async function PendingReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ sponsee?: string }>
}) {
  const { sponsee: sponseeId } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  if (!sponseeId) redirect('/dashboard')

  // Verify relationship
  const { data: rel } = await supabase
    .from('sponsor_relationships')
    .select('id')
    .eq('sponsor_id', user.id)
    .eq('sponsee_id', sponseeId)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel) redirect('/dashboard')

  // Fetch submitted entries for this sponsee
  const { data: entries } = await supabase
    .from('step_work_entries')
    .select('id, workbook_id, review_status, submitted_at, reviewed_at')
    .eq('user_id', sponseeId)
    .eq('sponsor_relationship_id', rel.id)
    .in('review_status', ['submitted', 'reviewed'])
    .order('submitted_at', { ascending: false })

  // Fetch workbook titles
  const workbookIds = (entries ?? []).map(e => e.workbook_id)
  const { data: workbooks } = workbookIds.length > 0
    ? await supabase.from('program_workbooks').select('id, title, step_number').in('id', workbookIds)
    : { data: [] }

  const wbMap = Object.fromEntries((workbooks ?? []).map(w => [w.id, w]))

  // Fetch sponsee name
  const { data: sponseeProfile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', sponseeId)
    .single()

  const name = sponseeProfile?.display_name ?? 'Your Sponsee'

  const STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
    submitted: { label: 'Awaiting your review', bg: 'rgba(212,165,116,0.1)',   color: '#9A7B54',  border: 'rgba(212,165,116,0.3)' },
    reviewed:  { label: 'Reviewed',             bg: 'rgba(39,174,96,0.08)',    color: '#27AE60',  border: 'rgba(39,174,96,0.2)' },
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 py-8 pb-20">
      <BackButton fallback="/dashboard" label="← Back to Dashboard" />

      <div style={{ margin: '20px 0 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--navy)', margin: 0 }}>
          {name}&apos;s Step Work
        </h1>
        <p style={{ fontSize: 14, color: 'var(--mid)', marginTop: 6 }}>
          {(entries ?? []).filter(e => e.review_status === 'submitted').length} awaiting review · {(entries ?? []).filter(e => e.review_status === 'reviewed').length} reviewed
        </p>
      </div>

      {(entries ?? []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mid)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 15 }}>No submitted step work yet.</p>
          <p style={{ fontSize: 13 }}>You&apos;ll be notified when {name} submits a section for review.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(entries ?? []).map(e => {
            const wb = wbMap[e.workbook_id]
            const meta = STATUS_META[e.review_status] ?? STATUS_META.reviewed
            return (
              <Link
                key={e.id}
                href={`/dashboard/step-work/review/${e.id}`}
                className="bg-white border border-border rounded-[14px] block"
                style={{ textDecoration: 'none', color: 'inherit', padding: '16px 18px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    {wb?.step_number && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 3 }}>
                        Step {wb.step_number}
                      </div>
                    )}
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)' }}>{wb?.title ?? 'Untitled section'}</div>
                    <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 3 }}>
                      Submitted {e.submitted_at ? new Date(e.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--mid)' }}>→</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
