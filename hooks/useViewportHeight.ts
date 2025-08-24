'use client'

import { useEffect } from 'react'

/**
 * Hook to handle viewport height correctly on iOS Safari
 * Sets a CSS custom property --vh that can be used instead of vh units
 * 
 * Usage in CSS:
 * Instead of: height: calc(100vh - 4rem)
 * Use: height: calc(var(--vh, 1vh) * 100 - 4rem)
 */
export function useViewportHeight() {
  useEffect(() => {
    // Function to update the viewport height
    const updateViewportHeight = () => {
      // Get the actual viewport height
      const vh = window.innerHeight * 0.01
      // Set the custom property on the root element
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    // Update on mount
    updateViewportHeight()

    // Update on resize (handles orientation change and address bar show/hide)
    window.addEventListener('resize', updateViewportHeight)
    window.addEventListener('orientationchange', updateViewportHeight)

    // Also update when the visual viewport changes (iOS specific)
    if ('visualViewport' in window && window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight)
    }

    return () => {
      window.removeEventListener('resize', updateViewportHeight)
      window.removeEventListener('orientationchange', updateViewportHeight)
      if ('visualViewport' in window && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportHeight)
      }
    }
  }, [])
}

/**
 * Get the CSS value for viewport height
 * @param percentage - The percentage of viewport height (default 100)
 * @param subtract - Amount to subtract (e.g., '4rem', '60px')
 * @returns CSS calc string
 */
export function getViewportHeight(percentage = 100, subtract?: string): string {
  const base = `calc(var(--vh, 1vh) * ${percentage}`
  return subtract ? `${base} - ${subtract})` : `${base})`
}