'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WELCOME_PATH } from '@/lib/claim-continuation'

/**
 * The quiet wrong-door escape (PROVIDER-PATH-SPEC §0 / §3).
 *
 * Shared by BOTH recovery first-setup implementations — the modal's
 * "Almost There!" step and the dashboard OnboardingCard. They are separate code
 * paths (the email callback bypasses the modal entirely), so a switch added to
 * only one of them would be missing for exactly the users who arrived by email.
 *
 * Two different corrections, never conflated:
 *
 *   "I chose the wrong signup path" — nothing written in the origin workspace.
 *     A CORRECTION: primary switches, the unused enablement clears, no data is
 *     deleted. The server decides whether this is allowed; the client cannot
 *     assert emptiness.
 *
 *   "I want both" — recovery-personal data already exists (completed
 *     onboarding, a sobriety date, check-ins, journal entries, or a
 *     sponsor/sponsee relationship). The endpoint 409s with offer:'keep-both'
 *     and we enable the provider workspace ADDITIVELY instead, leaving primary
 *     and every piece of recovery data untouched.
 *
 * Saved listings deliberately don't block: they are generic bookmarks a
 * provider would accumulate too.
 */
export default function WrongDoorSwitch({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [offerBoth, setOfferBoth] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function post(body: Record<string, unknown>) {
    return fetch('/api/workspace/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async function correct() {
    setBusy(true); setNote(null)
    const res = await post({ action: 'correct-wrong-door', to: 'provider' }).catch(() => null)
    setBusy(false)
    if (!res) { setNote('We could not switch that. Please try again.'); return }

    if (res.status === 409) {
      const payload = await res.json().catch(() => null)
      setOfferBoth(true)
      setNote(payload?.error ?? 'You already have recovery data on this account.')
      return
    }
    if (!res.ok) { setNote('We could not switch that. Please try again.'); return }
    router.push(WELCOME_PATH)
  }

  async function keepBoth() {
    setBusy(true)
    const res = await post({ action: 'enable-provider' }).catch(() => null)
    setBusy(false)
    if (!res || !res.ok) { setNote('We could not set that up. Please try again.'); return }
    router.push(WELCOME_PATH)
  }

  const link: React.CSSProperties = {
    background: 'none', border: 'none', padding: 0, cursor: busy ? 'wait' : 'pointer',
    color: 'var(--teal)', fontWeight: 600, fontSize: compact ? 12 : 13,
    fontFamily: 'var(--font-body)', textDecoration: 'underline',
  }

  return (
    <div style={{ textAlign: 'center', marginTop: compact ? 10 : 14 }}>
      {!offerBoth ? (
        <button type="button" onClick={correct} disabled={busy} style={link}>
          Here for your facility instead? Switch to provider setup →
        </button>
      ) : (
        <div style={{ fontSize: compact ? 12 : 13, color: 'var(--mid)', lineHeight: 1.6 }}>
          {note}
          <div style={{ marginTop: 6 }}>
            <button type="button" onClick={keepBoth} disabled={busy} style={link}>
              Keep both — add a provider workspace →
            </button>
          </div>
        </div>
      )}
      {note && !offerBoth && (
        <p role="alert" style={{ fontSize: 12, color: '#C0392B', marginTop: 6 }}>{note}</p>
      )}
    </div>
  )
}
