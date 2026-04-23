'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SubscriptionState {
  plan: 'free' | 'pro' | 'founding'
  status: 'active' | 'past_due' | 'canceled'
  isPro: boolean
  isFounding: boolean
  sponseeCount: number
  canAddSponsee: boolean
  hasProFeatures: boolean
  loading: boolean
  refresh: () => void
}

interface CachedState {
  plan: 'free' | 'pro' | 'founding'
  status: 'active' | 'past_due' | 'canceled'
  isPro: boolean
  isFounding: boolean
  sponseeCount: number
  canAddSponsee: boolean
  hasProFeatures: boolean
}

// Module-level cache — persists for the browser session, cleared on refresh()
const cache = new Map<string, CachedState>()

export function useSubscription(userId: string | null): SubscriptionState {
  const [data, setData] = useState<CachedState | null>(
    userId && cache.has(userId) ? (cache.get(userId) ?? null) : null
  )
  const [loading, setLoading] = useState<boolean>(() => !userId || !cache.has(userId ?? ''))
  const fetchCountRef = useRef(0)

  const fetchState = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    const tick = ++fetchCountRef.current
    try {
      const supabase = createClient()
      const { data: raw } = await supabase.rpc('get_subscription_state', { p_user_id: userId })
      if (fetchCountRef.current !== tick) return // stale response
      const result: CachedState = {
        plan:           (raw?.plan   ?? 'free')   as 'free' | 'pro' | 'founding',
        status:         (raw?.status ?? 'active') as 'active' | 'past_due' | 'canceled',
        isPro:          raw?.is_pro          ?? false,
        isFounding:     raw?.is_founding     ?? false,
        sponseeCount:   raw?.sponsee_count   ?? 0,
        canAddSponsee:  raw?.can_add_sponsee ?? true,
        hasProFeatures: raw?.has_pro_features ?? false,
      }
      cache.set(userId, result)
      setData(result)
    } catch {
      const fallback: CachedState = {
        plan: 'free', status: 'active',
        isPro: false, isFounding: false,
        sponseeCount: 0, canAddSponsee: true, hasProFeatures: false,
      }
      setData(fallback)
    } finally {
      if (fetchCountRef.current === tick) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    if (cache.has(userId)) return
    fetchState()
  }, [userId, fetchState])

  const refresh = useCallback(() => {
    if (userId) cache.delete(userId)
    fetchState()
  }, [userId, fetchState])

  return {
    plan:           data?.plan           ?? 'free',
    status:         data?.status         ?? 'active',
    isPro:          data?.isPro          ?? false,
    isFounding:     data?.isFounding     ?? false,
    sponseeCount:   data?.sponseeCount   ?? 0,
    canAddSponsee:  data?.canAddSponsee  ?? true,
    hasProFeatures: data?.hasProFeatures ?? false,
    loading,
    refresh,
  }
}

// Backwards-compat alias — existing imports keep working
export { useSubscription as useSponsorAccess }
