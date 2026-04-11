'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  email: string | null
}

export default function SettingsForm({ email }: Props) {
  const supabase = createClient()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaved, setPwSaved] = useState(false)

  async function changePassword() {
    setPwError(null)
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPwError(error.message)
    } else {
      setPwSaved(true)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setTimeout(() => setPwSaved(false), 3000)
    }
    setPwSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Email — read-only */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--mid)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Email Address
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="email"
            value={email ?? ''}
            readOnly
            style={{ flex: 1, fontSize: 14, padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--warm-gray)', fontFamily: 'var(--font-body)', color: 'var(--mid)', cursor: 'default' }}
          />
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(42,138,153,0.08)', border: '1px solid rgba(42,138,153,0.2)', color: 'var(--teal)', whiteSpace: 'nowrap' as const }}>Verified</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 5 }}>To change your email address, contact support.</div>
      </div>

      {/* Password change */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Change Password</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              style={{ width: '100%', fontSize: 14, padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fff', fontFamily: 'var(--font-body)', boxSizing: 'border-box' as const }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              style={{ width: '100%', fontSize: 14, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${confirmPassword && confirmPassword !== newPassword ? '#C0392B' : 'var(--border)'}`, background: '#fff', fontFamily: 'var(--font-body)', boxSizing: 'border-box' as const }}
            />
          </div>
          {pwError && <div style={{ fontSize: 13, color: '#C0392B', fontWeight: 500 }}>{pwError}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={changePassword}
              disabled={pwSaving || !newPassword || !confirmPassword}
              style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--navy)', border: 'none', borderRadius: 10, padding: '10px 24px', cursor: pwSaving || !newPassword || !confirmPassword ? 'default' : 'pointer', opacity: !newPassword || !confirmPassword ? 0.5 : 1 }}
            >
              {pwSaving ? 'Saving…' : 'Update Password'}
            </button>
            {pwSaved && <span style={{ fontSize: 13, color: '#27AE60', fontWeight: 600 }}>✓ Password updated</span>}
          </div>
        </div>
      </div>

      {/* Notification preferences — placeholder */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>Notification Preferences</div>
        <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 14, lineHeight: 1.6 }}>
          Email notifications will be configurable here once custom email delivery is set up.
        </div>
        {[
          { label: 'Sponsor leaves feedback on my step work', coming: true },
          { label: 'Sponsee submits step work for review',   coming: true },
          { label: 'New sponsor/sponsee connection request', coming: true },
          { label: 'Sobriety milestone reminders',           coming: true },
        ].map(item => (
          <label key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.05)', cursor: 'not-allowed', opacity: 0.5 }}>
            <input type="checkbox" disabled style={{ accentColor: 'var(--teal)', width: 15, height: 15, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--dark)' }}>{item.label}</span>
            {item.coming && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'var(--warm-gray)', border: '1px solid var(--border)', color: 'var(--mid)', letterSpacing: '0.4px', textTransform: 'uppercase' as const, marginLeft: 'auto' }}>Soon</span>}
          </label>
        ))}
      </div>
    </div>
  )
}
