'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Fellowship { id: string; name: string; abbreviation: string | null }

type Step = 1 | 2 | 3 | 4
type Role = 'none' | 'sponsee' | 'sponsor' | 'both'

const ROLE_OPTIONS: { value: Role; emoji: string; title: string; desc: string }[] = [
  { value: 'none',    emoji: '🌱', title: 'Not yet',              desc: "I'm just getting started — no sponsor yet"       },
  { value: 'sponsee', emoji: '🧭', title: 'I have a sponsor',    desc: "I'm working the steps with someone guiding me"   },
  { value: 'sponsor', emoji: '⚓', title: 'I sponsor others',    desc: 'I guide others through the program'              },
  { value: 'both',    emoji: '🤝', title: 'Both',                desc: 'I have a sponsor and I also sponsor others'      },
]

export default function OnboardingCard({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]               = useState<Step>(1)
  const [fellowships, setFellowships] = useState<Fellowship[]>([])
  const [displayName, setDisplayName] = useState('')
  const [fellowshipId, setFellowshipId] = useState('')
  const [sobrietyDate, setSobrietyDate] = useState('')
  const [role, setRole]               = useState<Role>('none')
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)
  const [dismissed, setDismissed]     = useState(false)

  useEffect(() => {
    supabase.from('fellowships').select('id, name, abbreviation').order('name').then(({ data }) => {
      setFellowships(data ?? [])
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function dismiss() {
    // Save whatever the user already entered, but don't require it.
    // Only mark onboarding_completed=true if we have a display_name — otherwise
    // the user would be stuck as "Friend" on every surface. (CLAUDE.md pitfall #3)
    const hasName = displayName.trim().length >= 2
    const profileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (hasName) {
      profileUpdates.display_name = displayName.trim()
      profileUpdates.onboarding_completed = true
    }
    if (fellowshipId)       profileUpdates.primary_fellowship_id = fellowshipId
    if (sobrietyDate)       profileUpdates.sobriety_date = sobrietyDate
    if (role === 'sponsor' || role === 'both') profileUpdates.is_available_sponsor = true

    await supabase.from('user_profiles').update(profileUpdates).eq('id', userId)

    if (sobrietyDate) {
      const fellowship = fellowships.find(f => f.id === fellowshipId)
      await supabase.from('sobriety_milestones').upsert(
        {
          user_id:      userId,
          fellowship_id: fellowshipId || null,
          label:         fellowship?.abbreviation ?? fellowship?.name ?? 'Sobriety',
          sobriety_date: sobrietyDate,
          is_primary:    true,
        },
        { onConflict: 'user_id,label' }
      )
    }

    setDismissed(true)
    router.refresh()
  }

  async function complete() {
    setSaving(true)
    setSaveError(null)

    // 1 — Save profile fields (excluding onboarding_completed)
    const profileUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (displayName.trim()) profileUpdates.display_name = displayName.trim()
    if (fellowshipId)       profileUpdates.primary_fellowship_id = fellowshipId
    if (sobrietyDate)       profileUpdates.sobriety_date = sobrietyDate
    if (role === 'sponsor' || role === 'both') profileUpdates.is_available_sponsor = true

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(profileUpdates)
      .eq('id', userId)

    if (profileError) {
      setSaveError('Failed to save your profile. Please try again.')
      setSaving(false)
      return
    }

    // 2 — Create sobriety milestone if a date was entered
    if (sobrietyDate) {
      const fellowship = fellowships.find(f => f.id === fellowshipId)
      const { error: milestoneError } = await supabase
        .from('sobriety_milestones')
        .upsert(
          {
            user_id:       userId,
            fellowship_id: fellowshipId || null,
            label:         fellowship?.abbreviation ?? fellowship?.name ?? 'Sobriety',
            sobriety_date: sobrietyDate,
            is_primary:    true,
          },
          { onConflict: 'user_id,label' }
        )

      if (milestoneError) {
        setSaveError('Failed to save your sobriety date. Please try again.')
        setSaving(false)
        return
      }
    }

    // 3 — Mark onboarding complete only after all other writes succeeded
    const { error: completeError } = await supabase
      .from('user_profiles')
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (completeError) {
      setSaveError('Setup almost done — tap again to finish.')
      setSaving(false)
      return
    }

    setSaving(false)
    setDismissed(true)
    router.refresh()
  }

  if (dismissed) return null

  // "Next" requires a name (step 1), fellowship (step 2), sobriety date (step 3).
  // Role step is always advanceable. Name gate prevents the "Friend" fallback
  // from being permanent (CLAUDE.md pitfall #3).
  const nextEnabled =
    step === 1 ? displayName.trim().length >= 2 :
    step === 2 ? !!fellowshipId :
    step === 3 ? !!sobrietyDate :
    true

  const progress = ((step - 1) / 4) * 100

  return (
    <div style={{ borderRadius: 18, marginBottom: 24, overflow: 'hidden', border: '1.5px solid rgba(42,138,153,0.3)', background: 'linear-gradient(135deg, rgba(42,138,153,0.04) 0%, rgba(0,51,102,0.03) 100%)' }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(42,138,153,0.12)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #2A8A99, #003366)', transition: 'width 0.4s' }} />
      </div>

      <div style={{ padding: '24px 28px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 4 }}>
              Step {step} of 4 · Setup
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
              {step === 1 && 'What should we call you?'}
              {step === 2 && 'What fellowship are you working?'}
              {step === 3 && "What's your sobriety date?"}
              {step === 4 && 'What best describes your role?'}
            </h3>
          </div>
          <button onClick={dismiss} style={{ fontSize: 12, color: 'var(--mid)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', flexShrink: 0, marginTop: 2 }}>
            Skip for now
          </button>
        </div>

        {/* Step 1 — Name */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--mid)', marginBottom: 16, lineHeight: 1.6 }}>
              This is what shows on your dashboard. Use your first name or an alias — whatever feels right.
            </p>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={50}
              autoFocus
              style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fff', fontFamily: 'var(--font-body)', width: '100%', maxWidth: 280, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderColor = '#2A8A99')}
              onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        )}

        {/* Step 2 — Fellowship */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--mid)', marginBottom: 16, lineHeight: 1.6 }}>
              This determines which step work program is shown on your dashboard. You can change it any time.
            </p>
            <div style={{ position: 'relative', maxWidth: 380 }}>
              <select
                value={fellowshipId}
                onChange={e => setFellowshipId(e.target.value)}
                style={{ width: '100%', fontSize: 14, fontWeight: 600, color: fellowshipId ? 'var(--navy)' : 'var(--mid)', padding: '11px 36px 11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fff', cursor: 'pointer', appearance: 'none', fontFamily: 'var(--font-body)' }}
              >
                <option value="">— Choose your program —</option>
                {fellowships.map(f => (
                  <option key={f.id} value={f.id}>{f.abbreviation ? `${f.abbreviation} — ${f.name}` : f.name}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 12, color: 'var(--mid)' }}>▾</span>
            </div>
          </div>
        )}

        {/* Step 3 — Sobriety date */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--mid)', marginBottom: 16, lineHeight: 1.6 }}>
              This starts your day counter. You can add multiple dates later (e.g. alcohol, gambling) from your profile settings.
            </p>
            <input
              type="date"
              value={sobrietyDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setSobrietyDate(e.target.value)}
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fff', fontFamily: 'var(--font-body)', cursor: 'pointer' }}
            />
          </div>
        )}

        {/* Step 4 — Role */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ROLE_OPTIONS.map(opt => (
              <label
                key={opt.value}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${role === opt.value ? 'var(--teal)' : 'var(--border)'}`, background: role === opt.value ? 'rgba(42,138,153,0.05)' : '#fff', transition: 'all 0.15s' }}
              >
                <input type="radio" name="role" value={opt.value} checked={role === opt.value} onChange={() => setRole(opt.value)} style={{ accentColor: 'var(--teal)', flexShrink: 0 }} />
                <span style={{ fontSize: 22, flexShrink: 0 }}>{opt.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{opt.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 1 }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        {saveError && (
          <div style={{ marginTop: 14, fontSize: 13, color: '#C0392B', fontWeight: 500 }}>{saveError}</div>
        )}

        {/* Footer nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => (s - 1) as Step)} style={{ fontSize: 13, fontWeight: 600, color: 'var(--mid)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}>
              ← Back
            </button>
          ) : <span />}

          {step < 4 ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {/* Skip is always available — it advances without requiring input */}
              {!nextEnabled && (
                <button
                  onClick={() => setStep(s => (s + 1) as Step)}
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--mid)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}
                >
                  Skip this step →
                </button>
              )}
              <button
                onClick={() => setStep(s => (s + 1) as Step)}
                disabled={!nextEnabled}
                style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: nextEnabled ? 'var(--navy)' : 'var(--mid)', border: 'none', borderRadius: 10, padding: '10px 24px', cursor: nextEnabled ? 'pointer' : 'default', transition: 'background 0.2s' }}
              >
                Next →
              </button>
            </div>
          ) : (
            <button
              onClick={complete}
              disabled={saving}
              style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--teal)', border: 'none', borderRadius: 10, padding: '10px 28px', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : '✓ Done — take me to my dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
