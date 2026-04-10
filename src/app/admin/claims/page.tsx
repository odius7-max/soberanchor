import { createAdminClient } from '@/lib/supabase/admin'
import ClaimsQueue from '@/components/admin/ClaimsQueue'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Claims Queue — Admin' }

export default async function ClaimsPage() {
  const admin = createAdminClient()
  const { data: claims } = await admin
    .from('facilities')
    .select('id, name, city, state, website, is_verified, updated_at, provider_accounts(id, contact_name, contact_email)')
    .eq('is_claimed', true)
    .order('updated_at', { ascending: false })

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.75px', margin: 0, marginBottom: 8 }}>Claims Queue</h1>
        <p style={{ color: 'var(--mid)', fontSize: 15, margin: 0 }}>
          Review provider claims. Domain mismatches are highlighted in red — these require manual verification.
        </p>
      </div>

      <ClaimsQueue claims={(claims ?? []) as any} />
    </div>
  )
}
