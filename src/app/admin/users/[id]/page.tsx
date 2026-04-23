'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Fellowship { id: string; name: string; abbreviation: string }
interface SponsorRel { id: string; sponsee_id: string; sponsee_name: string; status: string; started_at: string }
interface SponseeRel { id: string; sponsor_id: string; sponsor_name: string; status: string; started_at: string }
interface ProviderAccount { id: string; organization_name: string | null; subscription_tier: string; is_active: boolean }

interface UserDetail {
  id: string
  email: string | null
  phone: string | null
  created_at: string
  last_sign_in_at: string | null
  is_banned: boolean
  banned_until: string | null
  display_name: string | null
  sobriety_date: string | null
  bio: string | null
  is_available_sponsor: boolean
  onboarding_completed: boolean | null
  current_step: number | null
  recovery_program: string | null
  city: string | null
  state: string | null
  primary_fellowship: Fellowship | null
  is_sponsor: boolean
  is_sponsee: boolean
  is_provider: boolean
  as_sponsor: SponsorRel[]
  as_sponsee: SponseeRel[]
  step_work: { total: number; reviewed: number; submitted: number; draft: number }
  provider_account: ProviderAccount | null
  subscription: {
    plan: string
    status: string
    granted_by: string | null
    granted_note: string | null
    granted_at: string | null
  } | null
}

function fmt(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function RoleBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      background: `${color}18`, color, textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>
      {label}
    </span>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '24px', ...style }}>
      {children}
    </div>
  )
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>
      {children}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--dark)',
  background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box',
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Editable fields
  const [displayName, setDisplayName] = useState('')
  const [sobrietyDate, setSobrietyDate] = useState('')
  const [dirty, setDirty] = useState(false)

  function toast(text: string, ok = true) {
    setToastMsg({ text, ok })
    setTimeout(() => setToastMsg(null), 3500)
  }

  async function loadUser() {
    const res = await fetch(`/api/admin/members/${id}`)
    if (!res.ok) { router.push('/admin/users'); return }
    const data: UserDetail = await res.json()
    setUser(data)
    setDisplayName(data.display_name ?? '')
    setSobrietyDate(data.sobriety_date ?? '')
    setLoading(false)
  }

  useEffect(() => { loadUser() }, [id])

  async function handleSave() {
    setSaving(true)
    const profile: Record<string, unknown> = {}
    if (displayName !== (user?.display_name ?? '')) profile.display_name = displayName || null
    if (sobrietyDate !== (user?.sobriety_date ?? '')) profile.sobriety_date = sobrietyDate || null

    if (Object.keys(profile).length === 0) { setSaving(false); setDirty(false); return }

    const res = await fetch(`/api/admin/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    })
    setSaving(false)
    if (res.ok) { toast('Changes saved'); setDirty(false); await loadUser() }
    else { const d = await res.json(); toast(d.error ?? 'Save failed', false) }
  }

  async function handleToggleBan() {
    if (!user) return
    const action = user.is_banned ? 'reinstate' : 'suspend'
    if (!confirm(`${action === 'suspend' ? 'Suspend' : 'Reinstate'} this account?`)) return
    setSaving(true)
    const res = await fetch(`/api/admin/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ban: !user.is_banned }),
    })
    setSaving(false)
    if (res.ok) { toast(action === 'suspend' ? 'Account suspended' : 'Account reinstated'); await loadUser() }
    else { const d = await res.json(); toast(d.error ?? 'Action failed', false) }
  }

  async function grantPlan(plan: string, note: string) {
    setSaving(true)
    const res = await fetch('/api/admin/grant-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: id, plan, note }),
    })
    setSaving(false)
    if (res.ok) { toast(`Plan set to ${plan}`); await loadUser() }
    else { const d = await res.json(); toast(d.error ?? 'Grant failed', false) }
  }

  async function handleSignOut() {
    if (!confirm('Sign out all sessions for this user?')) return
    setSaving(true)
    const res = await fetch(`/api/admin/members/${id}/signout`, { method: 'POST' })
    setSaving(false)
    if (res.ok) toast('All sessions invalidated')
    else { const d = await res.json(); toast(d.error ?? 'Failed to sign out', false) }
  }

  if (loading) return <div style={{ padding: 60, color: 'var(--mid)', fontSize: 14 }}>Loading…</div>
  if (!user) return null

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100 }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 999,
          background: toastMsg.ok ? 'var(--navy)' : '#C0392B',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          {toastMsg.text}
        </div>
      )}

      {/* Back */}
      <button onClick={() => router.push('/admin/users')}
        style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back to Users
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.75px', margin: 0 }}>
              {user.display_name ?? 'Unnamed User'}
            </h1>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              background: user.is_banned ? 'rgba(192,57,43,0.1)' : 'rgba(39,174,96,0.1)',
              color: user.is_banned ? '#C0392B' : '#27AE60',
            }}>
              {user.is_banned ? 'Suspended' : 'Active'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 12 }}>{user.email ?? user.phone ?? '—'}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <RoleBadge label="member" color="var(--mid)" />
            {user.is_sponsor && <RoleBadge label="sponsor" color="var(--teal)" />}
            {user.is_sponsee && <RoleBadge label="sponsee" color="#7B5EA7" />}
            {user.is_provider && <RoleBadge label="provider" color="var(--gold)" />}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={handleSignOut} disabled={saving}
            style={{ fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'none', border: '1px solid var(--border)', color: 'var(--dark)', opacity: saving ? 0.6 : 1 }}>
            Sign Out All Devices
          </button>
          <button onClick={handleToggleBan} disabled={saving}
            style={{
              fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)',
              background: 'none', opacity: saving ? 0.6 : 1,
              border: user.is_banned ? '1px solid rgba(39,174,96,0.4)' : '1px solid rgba(192,57,43,0.4)',
              color: user.is_banned ? '#27AE60' : '#C0392B',
            }}>
            {user.is_banned ? 'Reinstate Account' : 'Suspend Account'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* LEFT: Editable profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <CardLabel>Profile</CardLabel>
            <FieldRow label="Email">
              <input value={user.email ?? '—'} disabled style={{ ...inputStyle, background: 'var(--off-white)', color: 'var(--mid)' }} />
            </FieldRow>
            <FieldRow label="Display Name">
              <input
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setDirty(true) }}
                style={inputStyle}
                placeholder="No name set"
              />
            </FieldRow>
            <FieldRow label="Sobriety Date">
              <input
                type="date"
                value={sobrietyDate}
                onChange={e => { setSobrietyDate(e.target.value); setDirty(true) }}
                style={inputStyle}
              />
            </FieldRow>
            <FieldRow label="Fellowship">
              <input
                value={user.primary_fellowship ? `${user.primary_fellowship.name} (${user.primary_fellowship.abbreviation})` : '—'}
                disabled
                style={{ ...inputStyle, background: 'var(--off-white)', color: 'var(--mid)' }}
              />
            </FieldRow>
            <FieldRow label="Recovery Program">
              <input value={user.recovery_program ?? '—'} disabled style={{ ...inputStyle, background: 'var(--off-white)', color: 'var(--mid)' }} />
            </FieldRow>
            {dirty && (
              <button onClick={handleSave} disabled={saving}
                style={{
                  marginTop: 4, padding: '10px 20px', background: 'var(--navy)', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', opacity: saving ? 0.7 : 1,
                }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </Card>

          {/* Step Work */}
          <Card>
            <CardLabel>Step Work</CardLabel>
            {user.step_work.total === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--mid)' }}>No step work entries yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Reviewed', value: user.step_work.reviewed, color: '#27AE60' },
                  { label: 'Submitted', value: user.step_work.submitted, color: 'var(--teal)' },
                  { label: 'Draft', value: user.step_work.draft, color: 'var(--mid)' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--off-white)', borderRadius: 10 }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {user.current_step && (
              <div style={{ marginTop: 14, fontSize: 13, color: 'var(--mid)' }}>
                Currently on <span style={{ fontWeight: 600, color: 'var(--navy)' }}>Step {user.current_step}</span>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: Account info + relationships */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Account info */}
          <Card>
            <CardLabel>Account</CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Joined', value: fmt(user.created_at) },
                { label: 'Last Login', value: fmt(user.last_sign_in_at) },
                { label: 'Onboarding', value: user.onboarding_completed ? 'Complete' : 'Incomplete' },
                { label: 'Available as Sponsor', value: user.is_available_sponsor ? 'Yes' : 'No' },
                { label: 'User ID', value: user.id },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: row.label === 'User ID' ? 11 : 12, color: 'var(--dark)', fontFamily: row.label === 'User ID' ? 'monospace' : 'inherit' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Subscription */}
          <Card>
            <CardLabel>Subscription</CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Plan', value: user.subscription?.plan ?? 'free' },
                { label: 'Granted by', value: user.subscription?.granted_by ?? '—' },
                { label: 'Granted at', value: user.subscription?.granted_at ? fmt(user.subscription.granted_at) : '—' },
                ...(user.subscription?.granted_note ? [{ label: 'Note', value: user.subscription.granted_note }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--dark)', textTransform: row.label === 'Plan' ? 'capitalize' : 'none' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['pro', 'founding', 'free'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => grantPlan(p, p === 'founding' ? 'Founding member — admin grant' : p === 'pro' ? 'Admin grant' : 'Reverted to free')}
                  disabled={saving || user.subscription?.plan === p}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', border: '1px solid var(--border)',
                    background: user.subscription?.plan === p ? 'var(--off-white)' : '#fff',
                    color: p === 'founding' ? '#9A7B54' : p === 'pro' ? 'var(--teal)' : 'var(--mid)',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {p === 'founding' ? 'Grant Founding' : p === 'pro' ? 'Grant Pro' : 'Revert to Free'}
                </button>
              ))}
            </div>
          </Card>

          {/* Sponsor relationships */}
          {(user.as_sponsor.length > 0 || user.as_sponsee.length > 0) && (
            <Card>
              <CardLabel>Relationships</CardLabel>
              {user.as_sponsee.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 8 }}>SPONSOR</div>
                  {user.as_sponsee.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <button
                        onClick={() => router.push(`/admin/users/${r.sponsor_id}`)}
                        style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0, textDecoration: 'underline' }}>
                        {r.sponsor_name}
                      </button>
                      <span style={{ fontSize: 11, color: r.status === 'active' ? '#27AE60' : 'var(--mid)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {user.as_sponsor.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 8 }}>SPONSEES</div>
                  {user.as_sponsor.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <button
                        onClick={() => router.push(`/admin/users/${r.sponsee_id}`)}
                        style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0, textDecoration: 'underline' }}>
                        {r.sponsee_name}
                      </button>
                      <span style={{ fontSize: 11, color: r.status === 'active' ? '#27AE60' : 'var(--mid)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Provider account */}
          {user.provider_account && (
            <Card>
              <CardLabel>Provider Account</CardLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Organization', value: user.provider_account.organization_name ?? '—' },
                  { label: 'Tier', value: user.provider_account.subscription_tier },
                  { label: 'Status', value: user.provider_account.is_active ? 'Active' : 'Inactive' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--dark)', textTransform: 'capitalize' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
