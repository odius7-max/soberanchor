import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { recoveryWorkspaceAvailable, type UserSetup } from '@/lib/workspace'
import BackButton from '@/components/find/BackButton'
import ProfileForm from '@/components/dashboard/ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=required')

  // E07: these are recovery-only surfaces. A provider-primary account that has
  // never enabled recovery gets its provider workspace instead of a page full
  // of sobriety and fellowship fields that mean nothing to it. Anyone who has
  // enabled recovery — including dual accounts — still sees Profile normally.
  const { data: setupRow } = await supabase
    .from('user_setup').select('*').eq('user_id', user.id).maybeSingle()
  if (!recoveryWorkspaceAvailable((setupRow ?? null) as UserSetup | null)) {
    redirect('/dashboard?mode=facility')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, bio')
    .eq('id', user.id)
    .single()

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
        />
      </div>
    </div>
  )
}
