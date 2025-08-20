'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { XPGainAnimation } from './XPGainAnimationCSS'
import { useScheduleMode } from '@/hooks/useScheduleMode'

function ScheduleModeProvider({ children }: { children: React.ReactNode }) {
  useScheduleMode()
  return <>{children}</>
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ScheduleModeProvider>
        {children}
        <XPGainAnimation />
      </ScheduleModeProvider>
    </AuthProvider>
  )
}