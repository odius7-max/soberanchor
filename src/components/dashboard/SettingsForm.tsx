'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NotifPrefs {
  sponsor_feedback_on_step_work: boolean
  sponsee_submits_step_work:     boolean
  sponsor_connection_request:    boolean
  milestone_reminders:           boolean
  weekly_recovery_summary:       boolean
  meeting_reminders:             boolean
  sponsor_assigns_task:          boolean
  sponsee_completes_task:        boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  sponsor_feedback_on_step_work: true,
  sponsee_submits_step_work:     true,
  sponsor_connection_request:    true,
  milestone_reminders:           true,
  weekly_recovery_summary:       false,
  meeting_reminders:             false,
  sponsor_assigns_task:          true,
  sponsee_completes_task:        true,
}

const NOTIF_ITEMS: { key: keyof NotifPrefs; label: string }[] = [
  { key: 'sponsor_feedback_on_step_work', label: 'Sponsor leaves feedback on my step work'  },
  { key: 'sponsee_submits_step_work',     label: 'Sponsee submits step work for review'     },
  { key: 'sponsor_connection_request',    label: 'New sponsor/sponsee connection request'   },
  { key: 'milestone_reminders',           label: 'Sobriety milestone reminders'             },
  { key: 'sponsor_assigns_task',          label: 'Sponsor assigns me a task'                },
  { key: 'sponsee_completes_task',        label: 'Sponsee completes a task'                 },
]

interface FellowshipOption {
  fellowshipId: string
  fellowshipName: string
  sobrietyDate: string
}

interface Props {
  email:  string | null
  userId: string
  primaryFellowshipId?: string | null
  fellowshipOptions?: FellowshipOption[]
}

export default function SettingsForm({ email, userId, primaryFellowshipId, fellowshipOptions = [] }: Props) {
  const supabase = createClient()

  // ── Password state ──────────────────────────────────────────────────────────
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving]               = useState(false)
  const [pwError, setPwError]                 = useState<string | null>(null)
  const [pwSaved, setPwSaved]                 = useState(false)

  // ── Primary fellowship state ────────────────────────────────────────────────
  const [selectedFellowship, setSelectedFellowship] = useState<string>(primaryFellowshipId ?? '')
  const [savingFellowship, setSavingFellowship]     = useState(false)
  const [savedFellowship, setSavedFellowship]       = useState(false)

  async function savePrimaryFellowship() {
    if (!selectedFellowship) return
    setSavingFellowship(true)
    const opt = fellowshipOptions.find(o => o.fellowshipId === selectedFellowship)
    await supabase.from('sobriety_milestones').update({ is_primary: false }).eq('user_id', userId)
    await supabase.from('sobriety_milestones').update({ is_primary: true }).eq('user_id', userId).eq('fellowship_id', selectedFellowship)
    await supabase.from('user_profiles').update({
      primary_fellowship_id: selectedFellowship,
      ...(opt ? { sobriety_date: opt.sobrietyDate } : {}),
    }).eq('id', userId)
    setSavedFellowship(true)
    setTimeout(() => setSavedFellowship(false), 3000)
    setSavingFellowship(false)
  }

  // ── Notification preferences state ─────────────────────────────────────────
  const [prefs, setPrefs]           = useState<NotifPrefs>(DEFAULT_PREFS)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [toast, setToast]           = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load preferences (upsert defaults if no row yet)
  useEffect(() => {
    async function loadPrefs() {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (data) {
        setPrefs({
          sponsor_feedback_on_step_work: data.sponsor_feedback_on_step_work ?? DEFAULT_PREFS.sponsor_feedback_on_step_work,
          sponsee_submits_step_work:     data.sponsee_submits_step_work     ?? DEFAULT_PREFS.sponsee_submits_step_work,
          sponsor_connection_request:    data.sponsor_connection_request    ?? DEFAULT_PREFS.sponsor_connection_request,
          milestone_reminders:           data.milestone_reminders           ?? DEFAULT_PREFS.milestone_reminders,
          weekly_recovery_summary:       data.weekly_recovery_summary       ?? DEFAULT_PREFS.weekly_recovery_summary,
          meeting_reminders:             data.meeting_reminders             ?? DEFAULT_PREFS.meeting_reminders,
          sponsor_assigns_task:          data.sponsor_assigns_task          ?? DEFAULT_PREFS.sponsor_assigns_task,
          sponsee_completes_task:        data.sponsee_completes_task        ?? DEFAULT_PREFS.sponsee_completes_task,
        })
      } else {
        // First time — insert default row
        await supabase
          .from('notification_preferences')
          .upsert({ user_id: userId, ...DEFAULT_PREFS }, { onConflict: 'user_id' })
        // state is already set to DEFAULT_PREFS
      }
      setPrefsLoaded(true)
    }
    loadPrefs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function showToast() {
    setToast(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(false), 2500)
  }

  async function togglePref(key: keyof NotifPrefs) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)  // optimistic

    await supabase
      .from('notification_preferences')
      .update({ [key]: next[key], updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    showToast()
  }

  // ── Password handlers ───────────────────────────────────────────────────────

  async function changePassword() {
    setPwError(null)
    if (newPassword.length < 8)          { setPwError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword)  { setPwError('Passwords do not match.'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPwError(error.message)
    } else {
      setPwSaved(true)
      setNewPassword(''); setConfirmPassword('')
      setTimeout(() => setPwSaved(false), 3000)
    }
    setPwSaving(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: 14, padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid var(--border)', background: '#fff',
    fontFamily: 'var(--font-body)', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Email — read-only ── */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--mid)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Email Address
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="email"
            value={email ?? ''}
            readOnly
            style={{ ...inputStyle, background: 'var(--warm-gray)', color: 'var(--mid)', cursor: 'default' }}
          />
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(42,138,153,0.08)', border: '1px solid rgba(42,138,153,0.2)', color: 'var(--teal)', whiteSpace: 'nowrap' as const }}>
            Verified
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 5 }}>To change your email address, contact support.</div>
      </div>

      {/* ── Change Password ── */}
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
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mid)', marginBottom: 5 }}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              style={{
                ...inputStyle,
                border: `1.5px solid ${confirmPassword && confirmPassword !== newPassword ? '#C0392B' : 'var(--border)'}`,
              }}
            />
          </div>
          {pwError && <div style={{ fontSize: 13, color: '#C0392B', fontWeight: 500 }}>{pwError}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={changePassword}
              disabled={pwSaving || !newPassword || !confirmPassword}
              style={{
                fontSize: 13, fontWeight: 700, color: '#fff',
                background: 'var(--navy)', border: 'none', borderRadius: 10,
                padding: '10px 24px',
                cursor: pwSaving || !newPassword || !confirmPassword ? 'default' : 'pointer',
                opacity: !newPassword || !confirmPassword ? 0.5 : 1,
              }}
            >
              {pwSaving ? 'Saving…' : 'Update Password'}
            </button>
            {pwSaved && <span style={{ fontSize: 13, color: '#27AE60', fontWeight: 600 }}>✓ Password updated</span>}
          </div>
        </div>
      </div>

      {/* ── Primary fellowship (only shown when user has 2+ declared fellowships) ── */}
      {fellowshipOptions.length > 1 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>Primary Fellowship</div>
          <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 12, lineHeight: 1.6 }}>
            The primary fellowship drives your main sobriety counter on the dashboard.
          </div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <select
              value={selectedFellowship}
              onChange={e => setSelectedFellowship(e.target.value)}
              style={{ ...inputStyle, padding: '10px 32px 10px 14px', appearance: 'none' as const, cursor: 'pointer' }}
            >
              {fellowshipOptions.map(o => (
                <option key={o.fellowshipId} value={o.fellowshipId}>{o.fellowshipName}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 11, color: 'var(--mid)' }}>▾</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={savePrimaryFellowship}
              disabled={savingFellowship || selectedFellowship === (primaryFellowshipId ?? '')}
              style={{
                fontSize: 13, fontWeight: 700, color: '#fff',
                background: 'var(--navy)', border: 'none', borderRadius: 10,
                padding: '10px 24px',
                cursor: savingFellowship || selectedFellowship === (primaryFellowshipId ?? '') ? 'default' : 'pointer',
                opacity: selectedFellowship === (primaryFellowshipId ?? '') ? 0.5 : 1,
              }}
            >
              {savingFellowship ? 'Saving…' : 'Save Primary Fellowship'}
            </button>
            {savedFellowship && <span style={{ fontSize: 13, color: '#27AE60', fontWeight: 600 }}>✓ Saved</span>}
          </div>
        </div>
      )}

      {/* ── Notification Preferences ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Notification Preferences</div>
          {toast && (
            <span style={{
              fontSize: 12, fontWeight: 600, color: '#27AE60',
              background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.2)',
              borderRadius: 20, padding: '3px 10px',
              transition: 'opacity 0.2s',
            }}>
              ✓ Preferences saved
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 14, lineHeight: 1.6 }}>
          Choose which email notifications you'd like to receive.
        </div>

        {NOTIF_ITEMS.map((item, i) => (
          <label
            key={item.key}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 0',
              borderTop: i === 0 ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(0,0,0,0.05)',
              cursor: prefsLoaded ? 'pointer' : 'default',
              opacity: prefsLoaded ? 1 : 0.4,
            }}
          >
            <input
              type="checkbox"
              checked={prefs[item.key]}
              onChange={() => prefsLoaded && togglePref(item.key)}
              disabled={!prefsLoaded}
              style={{ accentColor: 'var(--teal)', width: 15, height: 15, flexShrink: 0, cursor: prefsLoaded ? 'pointer' : 'default' }}
            />
            <span style={{ fontSize: 13, color: 'var(--dark)' }}>{item.label}</span>
          </label>
        ))}
      </div>

    </div>
  )
}
