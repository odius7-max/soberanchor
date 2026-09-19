'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { CONTINUATION_PARAM, validateContinuation } from '@/lib/claim-continuation'
import { clearAuthCancelled, wasAuthCancelled } from '@/lib/auth-cancellation'

/** PP-R2 is deliberately NOT applied here — the callback owns its own screen. */
const R2_EXCLUDED_PATHS = ['/auth/continue']

/**
 * Reads ?auth=... on any page and opens the AuthModal in the appropriate step,
 * then strips the query param so it doesn't linger in history / shareable URLs.
 *
 * Supported values:
 *   ?auth=signup   → opens modal in signup mode (used by email invite CTAs)
 *   ?auth=login    → opens modal in login mode
 *   ?auth=required → opens modal in login mode (used by redirect() from
 *                    protected routes when the user isn't authenticated)
 *
 * Mount once at the root of the app tree (src/app/providers.tsx) so it runs on
 * every navigation. If the user is already signed in (common when a redirect
 * loop races with auth state rehydration), it skips opening the modal and
 * still cleans up the param.
 */
export default function AuthQueryOpener() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, openAuthModal, loading, isAuthModalOpen } = useAuth()
  // Guard against StrictMode double-invoke + repeated navigations to same URL.
  // Scoped to the current ?auth= OCCURRENCE, not to the component's lifetime —
  // see the reset below.
  const handledFor = useRef<string | null>(null)

  useEffect(() => {
    if (loading) return
    const authParam = searchParams.get('auth')

    // ── PP-R2 ──
    // A signed-out RELOAD keeps `next` but loses `auth` (we strip it after the
    // first open), so the visitor was left on a page with a pending claim and
    // no visible way forward. Reconstruct the prompt from `next` alone.
    //
    // Scoped, per A3: never on /auth/continue, where opening auth mid-PKCE
    // would fight the callback for its own screen; only once the session has
    // resolved; and only while signed out. Cancellation is respected without a
    // flag because cancelling now NAVIGATES to the destination's exit, which
    // leaves no `next` behind for this branch to find.
    // Must not fire while a modal is already open: after the normal branch
    // strips `auth`, this effect re-runs with `next` still present, and without
    // this guard it reopened the modal in LOGIN mode — silently overriding a
    // signup intent the user had just chosen. PP-R2 exists to restore a prompt
    // when there ISN'T one.
    if (!authParam && !user && !isAuthModalOpen && !R2_EXCLUDED_PATHS.includes(pathname)) {
      const pending = validateContinuation(searchParams.get(CONTINUATION_PARAM))
      // Never restore a prompt the user just dismissed — that is the R1
      // residual, where the modal reappeared over the destination listing.
      if (pending && !wasAuthCancelled(pending)) {
        const key = `${pathname}?reconstructed&to=${pending}`
        if (handledFor.current !== key) {
          handledFor.current = key
          openAuthModal('login')
        }
        return
      }
    }

    if (!authParam) {
      // The param is gone, so this occurrence is finished. Clearing the guard
      // here is what makes the NEXT ?auth=… count as a fresh occurrence.
      //
      // Without it the ref stayed set for the life of the mount, and since this
      // component is mounted once at the app root, the modal would open exactly
      // once per session: dismiss → Back (URL regains ?auth=required) → the key
      // still matched and the effect bailed out, so nothing reopened (ODI-67).
      handledFor.current = null
      return
    }

    // R2: occurrence identity includes the validated destination and the auth
    // mode, so a welcome intent and a claim intent on the same path are not
    // conflated into one already-handled occurrence.
    const destination = validateContinuation(searchParams.get(CONTINUATION_PARAM)) ?? ''
    const key = `${pathname}?auth=${authParam}&to=${destination}`
    clearAuthCancelled()   // explicit ?auth= is a deliberate retry
    if (handledFor.current === key) return
    handledFor.current = key

    if (!user) {
      if (authParam === 'signup') openAuthModal('signup')
      else if (authParam === 'login' || authParam === 'required') openAuthModal('login')
    } else {
      // Already authenticated. Previously this fell straight through to the
      // strip below, which removed ?auth= and left ?next= sitting in the URL
      // unused — the visitor landed on the homepage, signed in, with their
      // claim silently abandoned (ODI-66/R5). If there's a valid continuation,
      // consume it: that's the whole point of having carried it this far, and
      // it's what makes the /auth/continue manual fallback recover properly.
      const continuation = validateContinuation(searchParams.get(CONTINUATION_PARAM))
      if (continuation) {
        router.replace(continuation)
        return
      }
    }

    // Strip the auth param, preserve everything else
    const next = new URLSearchParams(searchParams.toString())
    next.delete('auth')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [loading, user, isAuthModalOpen, pathname, searchParams, openAuthModal, router])

  return null
}
