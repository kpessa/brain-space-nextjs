'use client'

import { useEffect } from 'react'
import { useUserPreferencesStore } from '@/store/userPreferencesStore'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { darkMode, getEffectiveTheme } = useUserPreferencesStore()
  const effectiveTheme = getEffectiveTheme()
  
  useEffect(() => {
    // Debug logging

    // Remove any existing theme classes
    document.documentElement.classList.remove('dark', 'light', 'theme-professional', 'theme-colorful')
    
    // Add dark/light mode class
    document.documentElement.classList.add(darkMode ? 'dark' : 'light')
    
    // Add theme class
    document.documentElement.classList.add(`theme-${effectiveTheme}`)
    
    // Log final classes

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      if (darkMode) {
        metaThemeColor.setAttribute('content', '#1a1a1a')
      } else if (effectiveTheme === 'professional') {
        metaThemeColor.setAttribute('content', '#000000')
      } else {
        metaThemeColor.setAttribute('content', '#7C3AED')
      }
    }
  }, [darkMode, effectiveTheme])
  
  return <>{children}</>
}