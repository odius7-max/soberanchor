'use client'

import { AuthProvider } from '@/context/AuthContext'
import AuthModal from '@/components/auth/AuthModal'
import AuthPromptModal from '@/components/auth/AuthPromptModal'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthModal />
      <AuthPromptModal />
    </AuthProvider>
  )
}
