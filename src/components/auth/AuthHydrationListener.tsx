'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Detects when a user lands on a page from an auth redirect (email confirmation,
 * OAuth callback, magic link) and the server-side render happened before the
 * Supabase session was established. Triggers a router.refresh() once the session
 * settles so server components re-render with proper auth, and shows a brief
 * loading overlay during the gap.
 *
 * Mount once in a layout that wraps authenticated routes. Renders nothing in
 * the normal case — only activates when an auth redirect is in progress.
 */
export default function AuthHydrationListener() {
  const router = useRouter()
  const [isHydrating, setIsHydrating] = useState(false)
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return

    // Detect post-auth-redirect arrival via URL signals:
    // - hash contains access_token / refresh_token (Supabase implicit grant)
    // - query has 'code' param (Supabase PKCE flow)
    const hash = window.location.hash
    const search = window.location.search
    const isAuthRedirect =
      hash.includes('access_token') ||
      hash.includes('refresh_token') ||
      search.includes('code=')

    if (!isAuthRedirect) return

    handledRef.current = true
    setIsHydrating(true)

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Strip auth params from URL so a later refresh doesn't re-trigger
          // this flow.
          if (window.location.hash || window.location.search.includes('code=')) {
            window.history.replaceState(null, '', window.location.pathname)
          }

          // Re-render server components now that session cookies are set.
          router.refresh()

          setTimeout(() => {
            setIsHydrating(false)
            subscription.unsubscribe()
          }, 600)
        }
      },
    )

    // Safety net: if SIGNED_IN never fires, give up after 5s rather than
    // leaving a forever-stuck overlay.
    const timeout = setTimeout(() => {
      setIsHydrating(false)
      subscription.unsubscribe()
    }, 5000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [router])

  if (!isHydrating) return null

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center"
      style={{ background: '#fff' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-[var(--border)] border-t-teal animate-spin" />
        <div className="text-[15px] font-semibold" style={{ color: 'var(--navy)' }}>
          Welcome back. Loading your dashboard…
        </div>
      </div>
    </div>
  )
}
