'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

interface Props {
  /** Href used when the user is signed out (typically "/?auth=signup" or "/?auth=login"). */
  signedOutHref: string
  /** Href used when the user is signed in (typically "/my-recovery" or similar). */
  signedInHref: string
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

/**
 * A CTA link whose destination depends on whether the viewer is signed in.
 *
 * Use on marketing pages where a "Get started" / "Sign up" button should
 * open the signup modal for visitors, but route signed-in users to their
 * dashboard (since they've already signed up).
 *
 * While auth state is still loading (hasn't hydrated yet), renders the
 * signed-out href — this is the safer default since it always has valid
 * behavior via AuthQueryOpener.
 */
export default function AuthAwareCTA({
  signedOutHref,
  signedInHref,
  className,
  style,
  children,
}: Props) {
  const { user, loading } = useAuth()
  const href = !loading && user ? signedInHref : signedOutHref
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  )
}
