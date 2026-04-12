'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export type SponsorAccessStatus =
  | 'loading'
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'expired'
  | 'canceled'

export interface SponsorAccess {
  hasAccess: boolean
  status: SponsorAccessStatus
  daysRemaining: number
  trialAvailable: boolean
  planName: string | null
  loading: boolean
  refresh: () => void
}

interface CachedAccess {
  hasAccess: boolean
  status: SponsorAccessStatus
  daysRemaining: number
  trialAvailable: boolean
  planName: string | null
}

// Module-level cache — persists for the browser session, cleared on refresh()
const cache = new Map<string, CachedAccess>()

export function useSponsorAccess(userId: string | null): SponsorAccess {
  const [data, setData] = useState<CachedAccess | null>(
    userId && cache.has(userId) ? (cache.get(userId) ?? null) : null
  )
  const [loading, setLoading] = useState<boolean>(() => !userId || !cache.has(userId ?? ''))
  const fetchCountRef = useRef(0)

  const fetchAccess = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    const tick = ++fetchCountRef.current
    try {
      const supabase = createClient()
      const { data: raw } = await supabase.rpc('get_sponsor_access', { p_user_id: userId })
      if (fetchCountRef.current !== tick) return // stale response
      const result: CachedAccess = {
        hasAccess: raw?.has_access ?? false,
        status: (raw?.status ?? 'none') as SponsorAccessStatus,
        daysRemaining: raw?.days_remaining ?? 0,
        trialAvailable: raw?.trial_available ?? true,
        planName: raw?.plan_name ?? null,
      }
      cache.set(userId, result)
      setData(result)
    } catch {
      // On error, default to none (don't block access)
      const fallback: CachedAccess = {
        hasAccess: false,
        status: 'none',
        daysRemaining: 0,
        trialAvailable: true,
        planName: null,
      }
      setData(fallback)
    } finally {
      if (fetchCountRef.current === tick) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    if (cache.has(userId)) return // already cached, skip fetch
    fetchAccess()
  }, [userId, fetchAccess])

  const refresh = useCallback(() => {
    if (userId) cache.delete(userId)
    fetchAccess()
  }, [userId, fetchAccess])

  return {
    hasAccess: data?.hasAccess ?? false,
    status: (loading ? 'loading' : (data?.status ?? 'none')) as SponsorAccessStatus,
    daysRemaining: data?.daysRemaining ?? 0,
    trialAvailable: data?.trialAvailable ?? false,
    planName: data?.planName ?? null,
    loading,
    refresh,
  }
}
