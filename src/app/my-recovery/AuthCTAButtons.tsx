'use client'

import { useAuth } from '@/context/AuthContext'

export function HeroCTAButtons() {
  const { openAuthModal } = useAuth()

  return (
    <div className="flex gap-3 justify-center flex-wrap mb-4">
      <button
        onClick={() => openAuthModal('signup')}
        className="bg-teal text-white font-semibold text-base px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity"
      >
        Sign up free
      </button>
      <button
        onClick={() => openAuthModal('login')}
        className="border-2 border-teal text-teal font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-[var(--teal-10)] transition-colors"
      >
        Sign in
      </button>
    </div>
  )
}

export function GetStartedButton() {
  const { openAuthModal } = useAuth()

  return (
    <button
      onClick={() => openAuthModal('signup')}
      className="inline-block bg-navy text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-navy-dark transition-colors"
    >
      Get started — it&apos;s free →
    </button>
  )
}
