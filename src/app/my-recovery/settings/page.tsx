import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BackButton from '@/components/find/BackButton'
import SettingsForm from '@/components/dashboard/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=required')

  // Fetch milestones + fellowships for the primary-fellowship dropdown
  const [milestonesRes, fellowshipsRes] = await Promise.all([
    supabase.from('sobriety_milestones').select('id,fellowship_id,sobriety_date,is_primary').eq('user_id', user.id),
    supabase.from('fellowships').select('id,name,abbreviation'),
  ])
  const milestones = (milestonesRes.data ?? []) as { id: string; fellowship_id: string | null; sobriety_date: string; is_primary: boolean | null }[]
  const fellowshipsAll = (fellowshipsRes.data ?? []) as { id: string; name: string; abbreviation: string | null }[]

  const primaryMilestone = milestones.find(m => m.is_primary) ?? milestones[0] ?? null
  const primaryFellowshipId = primaryMilestone?.fellowship_id ?? null

  // One option per declared fellowship (null-fellowship milestones excluded — no meaningful label)
  const seenFids = new Set<string>()
  const fellowshipOptions = milestones
    .filter(m => m.fellowship_id)
    .reduce<{ fellowshipId: string; fellowshipName: string; sobrietyDate: string }[]>((acc, m) => {
      const fid = m.fellowship_id as string
      if (seenFids.has(fid)) return acc
      seenFids.add(fid)
      const f = fellowshipsAll.find(f => f.id === fid)
      acc.push({ fellowshipId: fid, fellowshipName: f ? (f.abbreviation ?? f.name) : fid, sobrietyDate: m.sobriety_date })
      return acc
    }, [])

  const card: React.CSSProperties = {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '24px 28px',
    marginBottom: 20,
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '36px 20px 64px' }}>
      <BackButton fallback="/dashboard" label="← Back to Dashboard" />

      <div style={{ marginTop: 24, marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 6 }}>
          Account
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
          Settings
        </h1>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 20 }}>Account & Security</h2>
        <SettingsForm
          email={user.email ?? null}
          userId={user.id}
          primaryFellowshipId={primaryFellowshipId}
          fellowshipOptions={fellowshipOptions}
        />
      </div>
    </div>
  )
}
