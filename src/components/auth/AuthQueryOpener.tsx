'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

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
  const { user, openAuthModal, loading } = useAuth()
  // Guard against StrictMode double-invoke + repeated navigations to same URL.
  // Scoped to the current ?auth= OCCURRENCE, not to the component's lifetime —
  // see the reset below.
  const handledFor = useRef<string | null>(null)

  useEffect(() => {
    if (loading) return
    const authParam = searchParams.get('auth')
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

    const key = `${pathname}?auth=${authParam}`
    if (handledFor.current === key) return
    handledFor.current = key

    if (!user) {
      if (authParam === 'signup') openAuthModal('signup')
      else if (authParam === 'login' || authParam === 'required') openAuthModal('login')
    }

    // Strip the auth param, preserve everything else
    const next = new URLSearchParams(searchParams.toString())
    next.delete('auth')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [loading, user, pathname, searchParams, openAuthModal, router])

  return null
}
