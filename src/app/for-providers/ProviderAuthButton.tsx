'use client'

import { useAuth } from '@/context/AuthContext'

export default function ProviderAuthButton() {
  const { openAuthModal } = useAuth()

  return (
    <button
      onClick={openAuthModal}
      className="border-2 border-teal text-teal font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-[var(--teal-10)] transition-colors"
    >
      Already listed? Sign in
    </button>
  )
}
