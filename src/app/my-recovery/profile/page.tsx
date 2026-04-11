import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import BackButton from '@/components/find/BackButton'
import ProfileForm from '@/components/dashboard/ProfileForm'
import SobrietyMilestonesSection from '@/components/dashboard/SobrietyMilestonesSection'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=required')

  const admin = createAdminClient()

  const [profileRes, fellowshipsRes] = await Promise.all([
    supabase.from('user_profiles').select('display_name, bio, primary_fellowship_id').eq('id', user.id).single(),
    admin.from('fellowships').select('id, name, abbreviation').order('name'),
  ])

  const profile = profileRes.data
  const fellowships = (fellowshipsRes.data ?? []) as { id: string; name: string; abbreviation: string | null }[]

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
          My Profile
        </h1>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 20 }}>Profile Information</h2>
        <ProfileForm
          userId={user.id}
          initialDisplayName={profile?.display_name ?? null}
          initialBio={profile?.bio ?? null}
          initialFellowshipId={profile?.primary_fellowship_id ?? null}
          fellowships={fellowships}
        />
      </div>

      <SobrietyMilestonesSection userId={user.id} />
    </div>
  )
}
