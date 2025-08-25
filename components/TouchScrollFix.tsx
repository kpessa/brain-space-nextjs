'use client'

import { useEffect } from 'react'

/**
 * TouchScrollFix component that applies JavaScript-based fixes
 * for touch scrolling issues on iOS Safari and PWA mode
 */
export function TouchScrollFix() {
  useEffect(() => {
    // Only run on iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (!isIOS) return

    // Function to apply touch scrolling fixes
    const applyTouchScrollFixes = () => {
      // Force enable touch scrolling on body and html
      const style = document.createElement('style')
      style.textContent = `
        html, body {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch !important;
          touch-action: pan-y !important;
          position: relative !important;
        }
        
        main, .main-content, .dashboard-content {
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          position: relative !important;
        }
        
        /* Override any fixed positioning */
        html[style*="position: fixed"], body[style*="position: fixed"] {
          position: relative !important;
        }
        
        /* Override any overflow hidden */
        html[style*="overflow: hidden"], body[style*="overflow: hidden"] {
          overflow-y: auto !important;
        }
      `
      document.head.appendChild(style)

      // Apply inline styles to ensure they take precedence
      document.documentElement.style.setProperty('overflow-y', 'auto', 'important')
      document.documentElement.style.setProperty('overflow-x', 'hidden', 'important')
      document.documentElement.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important')
      document.documentElement.style.setProperty('touch-action', 'pan-y', 'important')
      document.documentElement.style.setProperty('position', 'relative', 'important')

      document.body.style.setProperty('overflow-y', 'auto', 'important')
      document.body.style.setProperty('overflow-x', 'hidden', 'important')
      document.body.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important')
      document.body.style.setProperty('touch-action', 'pan-y', 'important')
      document.body.style.setProperty('position', 'relative', 'important')

      // Apply to main content areas
      const mainElements = document.querySelectorAll('main, .main-content, .dashboard-content')
      mainElements.forEach(element => {
        if (element instanceof HTMLElement) {
          element.style.setProperty('overflow-y', 'auto', 'important')
          element.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important')
          element.style.setProperty('position', 'relative', 'important')
        }
      })

    }

    // Apply fixes immediately
    applyTouchScrollFixes()

    // Apply fixes after a short delay to ensure DOM is ready
    setTimeout(applyTouchScrollFixes, 100)
    setTimeout(applyTouchScrollFixes, 500)
    setTimeout(applyTouchScrollFixes, 1000)

    // Apply fixes on orientation change
    const handleOrientationChange = () => {
      setTimeout(applyTouchScrollFixes, 100)
    }

    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', handleOrientationChange)

    // Apply fixes when the page becomes visible (for PWA mode)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(applyTouchScrollFixes, 100)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleOrientationChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null // This component doesn't render anything
}
