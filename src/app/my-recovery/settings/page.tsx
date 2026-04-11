import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BackButton from '@/components/find/BackButton'
import SettingsForm from '@/components/dashboard/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=required')

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
        <SettingsForm email={user.email ?? null} />
      </div>
    </div>
  )
}
