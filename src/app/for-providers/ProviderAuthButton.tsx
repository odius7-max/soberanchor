'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { CONTINUATION_PARAM, WELCOME_PATH, validateContinuation } from '@/lib/claim-continuation'

/**
 * The /for-providers auth doors (PROVIDER-PATH-SPEC §2, E08 + the new door).
 *
 * "Signed in" is not the same as "provider" (A2), so this renders three
 * authenticated states rather than one, and never opens a login modal in any
 * of them. It also renders NEUTRAL while the session is still resolving — the
 * previous version showed the signed-out CTA immediately, which flashed the
 * wrong action at every returning provider.
 *
 * An in-flight claim continuation always outranks generic welcome.
 */

function pendingContinuation(): string | null {
  if (typeof window === 'undefined') return null
  return validateContinuation(new URLSearchParams(window.location.search).get(CONTINUATION_PARAM))
}

const OUTLINE =
  'border-2 border-teal text-teal font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-[var(--teal-10)] transition-colors'
const SOLID =
  'bg-teal text-white font-semibold text-base px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity'

export default function ProviderAuthButton() {
  const { user, isProvider, loading } = useAuth()
  const router = useRouter()

  // Neutral placeholder: same footprint, no CTA, so nothing wrong can flash.
  if (loading) {
    return (
      <span aria-hidden="true" className={OUTLINE} style={{ opacity: 0.35, pointerEvents: 'none' }}>
        &nbsp;
      </span>
    )
  }

  // Signed out → provider-context modal, carrying whichever continuation applies.
  if (!user) {
    return (
      <button
        onClick={() => {
          const next = pendingContinuation() ?? WELCOME_PATH
          const q = new URLSearchParams({ auth: 'login' })
          q.set(CONTINUATION_PARAM, next)
          router.push(`/?${q.toString()}`)
        }}
        className={OUTLINE}
      >
        Already listed? Sign in
      </button>
    )
  }

  // Signed in with an active provider account → their dashboard. Never asked
  // to sign in or sign up again.
  if (isProvider) {
    return (
      <button onClick={() => router.push('/dashboard?mode=facility')} className={OUTLINE}>
        Go to your dashboard
      </button>
    )
  }

  // Signed in, member-only → an explicit provider-setup action. This is an
  // opt-in; it does not change their primary workspace (dual by capability).
  return (
    <button onClick={() => router.push(pendingContinuation() ?? WELCOME_PATH)} className={OUTLINE}>
      Set up a provider account
    </button>
  )
}

/**
 * The NEW primary door: "Create your provider account →".
 *
 * Session-aware for the same reason — a signed-in user must never be asked to
 * create a second account — and an in-flight claim outranks welcome.
 */
export function ProviderSignupButton() {
  const { user, isProvider, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <span aria-hidden="true" className={SOLID} style={{ opacity: 0.35, pointerEvents: 'none' }}>
        &nbsp;
      </span>
    )
  }

  if (!user) {
    return (
      <button
        onClick={() => {
          const next = pendingContinuation() ?? WELCOME_PATH
          const q = new URLSearchParams({ auth: 'signup' })
          q.set(CONTINUATION_PARAM, next)
          // Navigate only. The modal snapshots `next` once when it opens
          // (E01/A2), so opening it here — before ?next= is in the URL —
          // would snapshot an empty continuation.
          router.push(`/?${q.toString()}`)
        }}
        className={SOLID}
      >
        Create your provider account →
      </button>
    )
  }

  return (
    <button
      onClick={() => router.push(isProvider ? '/dashboard?mode=facility' : (pendingContinuation() ?? WELCOME_PATH))}
      className={SOLID}
    >
      {isProvider ? 'Go to your dashboard' : 'Set up a provider account →'}
    </button>
  )
}
