'use client'

import { ThemeProvider } from './ThemeProvider'

export function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  )
}