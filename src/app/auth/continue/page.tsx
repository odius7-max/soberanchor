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
 * Flow-agnostic by construction, not by branching. This page never inspects
 * the link shape: it waits for the client to report a session and then routes.
 *
 * The configured path here is PKCE — @supabase/ssr's createBrowserClient
 * hardcodes flowType 'pkce' and leaves detectSessionInUrl on, so `?code=` is
 * auto-exchanged on load. supabase-js checks for an implicit `#access_token`
 * callback first and independently of flowType, so that shape would be picked
 * up too; note that a magiclink landing in this hash shape did NOT establish a
 * session in local testing, so treat implicit as unverified here rather than
 * relied upon. Nothing below depends on which one arrives.
 *
 * THIS PAGE OWNS POST-AUTH NAVIGATION (ODI-66/R5). AuthHydrationListener
 * explicitly stands down here — it used to strip the query and call
 * router.refresh() on the same SIGNED_IN event, which clobbered the replace
 * below and stranded an authenticated visitor on this page. Because
 * createBrowserClient returns a browser singleton, every listener in the app
 * sees that one event, so ownership has to be settled by path, not by racing.
 *
 * Never a dead end: an error, an expired or already-used link, or an exchange
 * that never resolves all fall through to the login modal with the claim
 * continuation still attached.
 */

const FALLBACK_DESTINATION = '/dashboard'
const CONTINUE_PATH = '/auth/continue'
/** How long to let client-side routing land before forcing a full navigation. */
const HARD_FALLBACK_MS = 3000
/** How long to wait for a session at all before offering sign-in. */
const SETTLE_TIMEOUT_MS = 8000

export default function AuthContinuePage() {
  const router = useRouter()
  const [stalled, setStalled] = useState(false)
  // The escape-hatch link keeps the continuation too, so using it doesn't
  // quietly drop the claim either.
  const [manualHref, setManualHref] = useState('/?auth=required')
  const navigated = useRef(false)
  const authenticated = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const continuation = validateContinuation(params.get(CONTINUATION_PARAM))
    const destination = continuation ?? FALLBACK_DESTINATION

    if (continuation) {
      setManualHref(`/?auth=required&${CONTINUATION_PARAM}=${encodeURIComponent(continuation)}`)
    }

    const timers: ReturnType<typeof setTimeout>[] = []

    function succeed() {
      authenticated.current = true
      if (navigated.current) return
      navigated.current = true

      router.replace(destination)

      // Client routing here is genuinely fragile: a competing refresh, a
      // replaceState from another listener, or a slow RSC fetch can all leave
      // us sitting on this page. The session is real by this point, so a full
      // page load is a safe, correct exit — and it lands authenticated.
      timers.push(setTimeout(() => {
        if (window.location.pathname === CONTINUE_PATH) {
          window.location.assign(destination)
        }
      }, HARD_FALLBACK_MS))
    }

    /** Recoverable exit: the login modal, continuation preserved. */
    function recover() {
      if (navigated.current) return
      navigated.current = true
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

    // Only reached when no session ever materialised — e.g. a PKCE link opened
    // in a DIFFERENT browser than the one that signed up, which has no
    // code_verifier to exchange with. Never shown once authentication
    // succeeded; telling a signed-in person we couldn't finish is a lie that
    // sends them somewhere useless.
    timers.push(setTimeout(() => {
      if (authenticated.current) return
      setStalled(true)
      recover()
    }, SETTLE_TIMEOUT_MS))

    return () => {
      subscription.unsubscribe()
      timers.forEach(clearTimeout)
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
