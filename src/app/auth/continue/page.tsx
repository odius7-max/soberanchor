'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CONTINUATION_PARAM, validateContinuation } from '@/lib/claim-continuation'

/**
 * Email-confirmation landing page (CLAIM-FLOW-SPEC §2, ODI-66).
 *
 * Deliberately UNGATED. `emailRedirectTo` used to point at /dashboard, which
 * the middleware auth-gates — a confirmation link arrives before any session
 * exists, so the gate fired first and bounced the visitor to the homepage,
 * dropping whichever claim they were part-way through.
 *
 * Flow-agnostic on purpose. The browser client is created by
 * @supabase/ssr's createBrowserClient with detectSessionInUrl on, which
 * handles BOTH shapes a confirmation link can arrive in:
 *   - PKCE     → `?code=…` is auto-exchanged for a session on load
 *   - implicit → `#access_token=…` is read straight out of the hash
 * Either way the result surfaces as an auth state change, so this page never
 * has to know which one Supabase is configured for.
 *
 * Never a dead end: an error, an expired or already-used link, or a stalled
 * exchange all fall through to the login modal with the claim continuation
 * still attached, so the visitor can sign in and resume where they left off.
 */

const FALLBACK_DESTINATION = '/dashboard'
const SETTLE_TIMEOUT_MS = 8000

export default function AuthContinuePage() {
  const router = useRouter()
  const [stalled, setStalled] = useState(false)
  // The escape-hatch link keeps the continuation too, so using it doesn't
  // quietly drop the claim either.
  const [manualHref, setManualHref] = useState('/?auth=required')
  const settled = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const continuation = validateContinuation(params.get(CONTINUATION_PARAM))
    const destination = continuation ?? FALLBACK_DESTINATION

    if (continuation) {
      setManualHref(`/?auth=required&${CONTINUATION_PARAM}=${encodeURIComponent(continuation)}`)
    }

    function succeed() {
      if (settled.current) return
      settled.current = true
      router.replace(destination)
    }

    /** Recoverable exit: the login modal, continuation preserved. */
    function recover() {
      if (settled.current) return
      settled.current = true
      const q = new URLSearchParams({ auth: 'required' })
      if (continuation) q.set(CONTINUATION_PARAM, continuation)
      router.replace(`/?${q.toString()}`)
    }

    // Supabase reports a bad/expired/used link as an `error` param, in the
    // query under PKCE and in the hash under implicit. The hash is read ONLY
    // to look for that key — no token material is logged or forwarded.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (params.get('error') || hashParams.get('error')) {
      setStalled(true)
      recover()
      return
    }

    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION covers the race where detectSessionInUrl finished
      // before this listener attached; SIGNED_IN covers the normal case.
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) succeed()
    })

    // Same race, belt and braces — if a session already exists we're done.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) succeed()
    })

    // A PKCE link opened in a DIFFERENT browser than the one that signed up
    // has no code_verifier to exchange with, so nothing will ever resolve.
    // That lands here, and the login modal is the correct recovery.
    const timer = setTimeout(() => {
      setStalled(true)
      recover()
    }, SETTLE_TIMEOUT_MS)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [router])

  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '40px 24px', gap: 14,
    }}>
      <div
        aria-hidden="true"
        style={{
          width: 34, height: 34, borderRadius: '50%',
          border: '3px solid var(--border)', borderTopColor: 'var(--teal)',
          animation: 'sa-spin 0.8s linear infinite',
        }}
      />
      <p role="status" style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)', margin: 0 }}>
        {stalled ? 'Taking you to sign in…' : 'Finishing sign-in…'}
      </p>
      <p style={{ fontSize: 14, color: 'var(--mid)', margin: 0, maxWidth: 360, lineHeight: 1.6 }}>
        {stalled
          ? 'We couldn’t finish automatically. Sign in and you’ll pick up right where you left off.'
          : 'One moment while we confirm your account.'}
      </p>
      <a href={manualHref} style={{ fontSize: 13, color: 'var(--mid)', textDecoration: 'underline' }}>
        Continue manually
      </a>

      <style>{`@keyframes sa-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
