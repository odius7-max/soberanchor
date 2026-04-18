'use client'

import { Suspense } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import AuthModal from '@/components/auth/AuthModal'
import AuthPromptModal from '@/components/auth/AuthPromptModal'
import AuthQueryOpener from '@/components/auth/AuthQueryOpener'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthModal />
      <AuthPromptModal />
      {/* Suspense is required because AuthQueryOpener uses useSearchParams() */}
      <Suspense fallback={null}>
        <AuthQueryOpener />
      </Suspense>
    </AuthProvider>
  )
}
