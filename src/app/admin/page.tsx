import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — SoberAnchor' }

async function getMetrics() {
  const admin = createAdminClient()

  const [
    { count: totalFacilities },
    { count: claimed },
    { count: verified },
    { count: leadsThisMonth },
    { count: pendingClaims },
    { data: recentClaims },
    { data: recentLeads },
    { data: recentProviders },
  ] = await Promise.all([
    admin.from('facilities').select('*', { count: 'exact', head: true }),
    admin.from('facilities').select('*', { count: 'exact', head: true }).eq('is_claimed', true),
    admin.from('facilities').select('*', { count: 'exact', head: true }).eq('is_verified', true),
    admin.from('leads').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    admin.from('facilities').select('*', { count: 'exact', head: true }).eq('is_claimed', true).eq('is_verified', false),
    admin.from('facilities')
      .select('id, name, city, is_verified, updated_at, provider_accounts(contact_name, contact_email)')
      .eq('is_claimed', true)
      .order('updated_at', { ascending: false })
      .limit(5),
    admin.from('leads')
      .select('id, first_name, seeking, created_at, facilities(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    admin.from('provider_accounts')
      .select('id, contact_name, contact_email, subscription_tier, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    totalFacilities: totalFacilities ?? 0,
    claimed: claimed ?? 0,
    verified: verified ?? 0,
    leadsThisMonth: leadsThisMonth ?? 0,
    pendingClaims: pendingClaims ?? 0,
    recentClaims: recentClaims ?? [],
    recentLeads: recentLeads ?? [],
    recentProviders: recentProviders ?? [],
  }
}

function StatCard({ label, value, href, accent }: { label: string; value: number; href?: string; accent?: boolean }) {
  const content = (
    <div style={{
      background: accent ? 'var(--navy)' : '#fff',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '24px 28px',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: accent ? 'rgba(255,255,255,0.6)' : 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600, color: accent ? '#fff' : 'var(--navy)', letterSpacing: '-1.0px', lineHeight: 1 }}>{value.toLocaleString()}</div>
    </div>
  )
  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link>
  return content
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function AdminPage() {
  const m = await getMetrics()

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.75px', margin: 0 }}>Dashboard Overview</h1>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 48 }}>
        <StatCard label="Total Facilities" value={m.totalFacilities} href="/admin/facilities" />
        <StatCard label="Claimed" value={m.claimed} href="/admin/facilities" />
        <StatCard label="Verified" value={m.verified} href="/admin/facilities" />
        <StatCard label="Leads This Month" value={m.leadsThisMonth} href="/admin/leads" />
        <StatCard label="Pending Claims" value={m.pendingClaims} href="/admin/claims" accent />
      </div>

      {/* Quick links */}
      {m.pendingClaims > 0 && (
        <div style={{ background: 'rgba(212,165,116,0.12)', border: '1.5px solid var(--gold)', borderRadius: 12, padding: '16px 20px', marginBottom: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 15 }}>
              {m.pendingClaims} pending claim{m.pendingClaims !== 1 ? 's' : ''} waiting for review
            </div>
            <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>Providers have claimed facilities that need verification.</div>
          </div>
          <Link href="/admin/claims" style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Review Claims →
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
        {/* Recent Claims */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase' }}>Recent Claims</div>
            <Link href="/admin/claims" style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          {m.recentClaims.length === 0 ? (
            <div style={{ color: 'var(--mid)', fontSize: 13 }}>No claims yet.</div>
          ) : m.recentClaims.map((c: any) => (
            <div key={c.id} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                {(c.provider_accounts as any)?.contact_email ?? '—'} · {timeAgo(c.updated_at)}
                {!c.is_verified && <span style={{ color: '#E67E22', fontWeight: 600 }}> · Pending</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Leads */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase' }}>Recent Leads</div>
            <Link href="/admin/leads" style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          {m.recentLeads.length === 0 ? (
            <div style={{ color: 'var(--mid)', fontSize: 13 }}>No leads yet.</div>
          ) : m.recentLeads.map((l: any) => (
            <div key={l.id} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)' }}>{l.first_name ?? 'Anonymous'}</div>
              <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                {(l.facilities as any)?.name ?? '—'} · {l.seeking ?? '—'} · {timeAgo(l.created_at)}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Signups */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', letterSpacing: '2px', textTransform: 'uppercase' }}>New Providers</div>
            <Link href="/admin/users" style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          {m.recentProviders.length === 0 ? (
            <div style={{ color: 'var(--mid)', fontSize: 13 }}>No providers yet.</div>
          ) : m.recentProviders.map((p: any) => (
            <div key={p.id} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy)' }}>{p.contact_name ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                {p.contact_email} · <span style={{ textTransform: 'capitalize', color: p.subscription_tier === 'premium' ? 'var(--gold)' : p.subscription_tier === 'enhanced' ? 'var(--teal)' : 'var(--mid)' }}>{p.subscription_tier}</span> · {timeAgo(p.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
