'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  display_name: string | null
  sobriety_date: string | null
  primary_fellowship_id: string | null
  current_step: number
  is_available_sponsor: boolean
}

export interface AuthPromptOptions {
  title?: string
  body?: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  isProvider: boolean
  loading: boolean
  isAuthModalOpen: boolean
  authModalInitialStep: 'login' | 'signup'
  openAuthModal: (step?: 'login' | 'signup') => void
  closeAuthModal: () => void
  authPrompt: Required<AuthPromptOptions> | null
  openAuthPrompt: (opts?: AuthPromptOptions) => void
  closeAuthPrompt: () => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isProvider, setIsProvider] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalInitialStep, setAuthModalInitialStep] = useState<'login' | 'signup'>('login')
  const [authPrompt, setAuthPrompt] = useState<Required<AuthPromptOptions> | null>(null)
  const mounted = useRef(true)

  const fetchProfile = useCallback(
    async (userId: string) => {
      const [{ data: profileData }, { data: providerData }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('display_name, sobriety_date, primary_fellowship_id, current_step, is_available_sponsor')
          .eq('id', userId)
          .single(),
        supabase
          .from('provider_accounts')
          .select('id')
          .eq('auth_user_id', userId)
          .eq('is_active', true)
          .maybeSingle(),
      ])
      if (mounted.current) {
        setProfile(profileData ?? null)
        setIsProvider(!!providerData)
      }
      return profileData
    },
    [supabase]
  )

  useEffect(() => {
    mounted.current = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted.current) return
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          if (mounted.current) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (!mounted.current) return
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setIsProvider(false)
      }
    })

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, supabase.auth])

  const openAuthModal = useCallback((step: 'login' | 'signup' = 'login') => {
    setAuthModalInitialStep(step)
    setIsAuthModalOpen(true)
  }, [])
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), [])

  const openAuthPrompt = useCallback((opts?: AuthPromptOptions) => {
    setAuthPrompt({
      title: opts?.title ?? 'Join SoberAnchor',
      body:  opts?.body  ?? 'Create a free account to access this feature.',
    })
  }, [])
  const closeAuthPrompt = useCallback(() => setAuthPrompt(null), [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase.auth])

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (u) await fetchProfile(u.id)
  }, [fetchProfile, supabase.auth])

  return (
    <AuthContext.Provider value={{ user, profile, isProvider, loading, isAuthModalOpen, authModalInitialStep, openAuthModal, closeAuthModal, authPrompt, openAuthPrompt, closeAuthPrompt, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
