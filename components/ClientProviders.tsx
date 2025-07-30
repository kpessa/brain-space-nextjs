'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { XPGainAnimation } from './XPGainAnimation'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <XPGainAnimation />
    </AuthProvider>
  )
}