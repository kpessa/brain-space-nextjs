'use client'

import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { useIOSKeyboardAvoidance } from '@/hooks/useIOSKeyboardAvoidance'
import { useHaptic } from '@/lib/haptic'
import { useViewportHeight } from '@/hooks/useViewportHeight'

interface IOSContextValue {
  // Keyboard avoidance
  isIOS: boolean
  scrollToElement: (element: HTMLElement) => void
  activeElement: HTMLElement | null
  
  // Haptic feedback
  haptic: {
    isSupported: boolean
    trigger: (type: any) => void
    light: () => void
    medium: () => void
    heavy: () => void
    success: () => void
    warning: () => void
    error: () => void
    selection: () => void
  }
  
  // Device capabilities
  hasNotch: boolean
  isStandalone: boolean
  supportsTouchID: boolean
  supportsFaceID: boolean
  supportsHaptic: boolean
}

const IOSContext = createContext<IOSContextValue | undefined>(undefined)

export function useIOS() {
  const context = useContext(IOSContext)
  if (!context) {
    throw new Error('useIOS must be used within IOSProvider')
  }
  return context
}

interface IOSProviderProps {
  children: React.ReactNode
  keyboardAvoidanceEnabled?: boolean
  hapticEnabled?: boolean
  keyboardOffset?: number
  scrollBehavior?: 'smooth' | 'instant'
}

/**
 * Global iOS Provider that manages iOS-specific features
 * - Keyboard avoidance for all inputs
 * - Haptic feedback system
 * - Safe area handling
 * - iOS-specific optimizations
 */
export function IOSProvider({
  children,
  keyboardAvoidanceEnabled = true,
  hapticEnabled = true,
  keyboardOffset = 20,
  scrollBehavior = 'smooth'
}: IOSProviderProps) {
  // Initialize viewport height fix for iOS
  useViewportHeight()
  
  // Initialize keyboard avoidance globally
  const keyboardAvoidance = useIOSKeyboardAvoidance({
    enabled: keyboardAvoidanceEnabled,
    offset: keyboardOffset,
    scrollBehavior,
    additionalOffset: 0
  })
  
  // Initialize haptic feedback
  const haptic = useHaptic()
  
  // Detect iOS-specific features
  const deviceCapabilities = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        hasNotch: false,
        isStandalone: false,
        supportsTouchID: false,
        supportsFaceID: false,
        supportsHaptic: false
      }
    }
    
    // Check if device has notch (iPhone X and later)
    const hasNotch = (() => {
      const userAgent = window.navigator.userAgent.toLowerCase()
      const isIPhone = /iphone/.test(userAgent)
      
      if (!isIPhone) return false
      
      // Check screen dimensions for notch detection
      const screenHeight = window.screen.height
      const screenWidth = window.screen.width
      
      // iPhone X, XS, 11 Pro: 812x375
      // iPhone XR, XS Max, 11, 11 Pro Max: 896x414
      // iPhone 12, 13, 14: 844x390 or 926x428
      // iPhone 15: 852x393 or 932x430
      const notchDimensions = [
        { h: 812, w: 375 }, // iPhone X, XS, 11 Pro
        { h: 896, w: 414 }, // iPhone XR, XS Max, 11, 11 Pro Max
        { h: 844, w: 390 }, // iPhone 12 mini, 13 mini
        { h: 926, w: 428 }, // iPhone 12 Pro Max, 13 Pro Max, 14 Plus
        { h: 852, w: 393 }, // iPhone 15, 15 Pro
        { h: 932, w: 430 }, // iPhone 15 Plus, 15 Pro Max
      ]
      
      return notchDimensions.some(
        dim => (screenHeight === dim.h && screenWidth === dim.w) ||
               (screenHeight === dim.w && screenWidth === dim.h)
      )
    })()
    
    // Check if running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true
    
    // Detect biometric capabilities (heuristic based on device)
    const supportsTouchID = keyboardAvoidance.isIOS && !hasNotch
    const supportsFaceID = keyboardAvoidance.isIOS && hasNotch
    
    return {
      hasNotch,
      isStandalone,
      supportsTouchID,
      supportsFaceID,
      supportsHaptic: haptic.isSupported
    }
  }, [keyboardAvoidance.isIOS, haptic.isSupported])
  
  // Apply global iOS optimizations
  useEffect(() => {
    if (!keyboardAvoidance.isIOS) return
    
    // Prevent bounce scroll on iOS
    const preventBounce = (e: TouchEvent) => {
      const scrollable = e.target as HTMLElement
      if (scrollable) {
        const isAtTop = scrollable.scrollTop <= 0
        const isAtBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight
        
        // Only prevent default if we're at the boundaries and trying to scroll beyond
        if ((isAtTop && e.touches[0].clientY > 0) || 
            (isAtBottom && e.touches[0].clientY < 0)) {
          e.preventDefault()
        }
        // Allow normal scrolling in all other cases
      }
    }
    
    // Disable double-tap zoom on iOS - but allow normal touch events
    let lastTouchEnd = 0
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) {
        // Only prevent default for double-tap, not single taps
        e.preventDefault()
      }
      lastTouchEnd = now
    }
    
    // Apply CSS fixes for iOS
    document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)')
    document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)')
    document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)')
    document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)')
    
    // Fix 100vh issue on iOS
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    setViewportHeight()
    
    // Add event listeners
    document.addEventListener('touchmove', preventBounce, { passive: false })
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false })
    window.addEventListener('resize', setViewportHeight)
    window.addEventListener('orientationchange', setViewportHeight)
    
    // Add iOS-specific class to body
    document.body.classList.add('ios-device')
    
    if (deviceCapabilities.hasNotch) {
      document.body.classList.add('ios-notch')
    }
    
    if (deviceCapabilities.isStandalone) {
      document.body.classList.add('ios-standalone')
    }
    
    return () => {
      document.removeEventListener('touchmove', preventBounce)
      document.removeEventListener('touchend', preventDoubleTapZoom)
      window.removeEventListener('resize', setViewportHeight)
      window.removeEventListener('orientationchange', setViewportHeight)
      document.body.classList.remove('ios-device', 'ios-notch', 'ios-standalone')
    }
  }, [keyboardAvoidance.isIOS, deviceCapabilities])
  
  // Create context value
  const contextValue = useMemo<IOSContextValue>(() => ({
    // Keyboard avoidance
    isIOS: keyboardAvoidance.isIOS,
    scrollToElement: keyboardAvoidance.scrollToElement,
    activeElement: keyboardAvoidance.activeElement,
    
    // Haptic feedback (only if enabled)
    haptic: hapticEnabled ? haptic : {
      isSupported: false,
      trigger: () => {},
      light: () => {},
      medium: () => {},
      heavy: () => {},
      success: () => {},
      warning: () => {},
      error: () => {},
      selection: () => {}
    },
    
    // Device capabilities
    ...deviceCapabilities
  }), [
    keyboardAvoidance.isIOS,
    keyboardAvoidance.scrollToElement,
    keyboardAvoidance.activeElement,
    haptic,
    hapticEnabled,
    deviceCapabilities
  ])
  
  return (
    <IOSContext.Provider value={contextValue}>
      {children}
    </IOSContext.Provider>
  )
}

// Optional: Export a hook that can be used without throwing
export function useIOSSafe() {
  const context = useContext(IOSContext)
  
  // Return mock values if not within provider
  if (!context) {
    return {
      isIOS: false,
      scrollToElement: () => {},
      activeElement: null,
      haptic: {
        isSupported: false,
        trigger: () => {},
        light: () => {},
        medium: () => {},
        heavy: () => {},
        success: () => {},
        warning: () => {},
        error: () => {},
        selection: () => {}
      },
      hasNotch: false,
      isStandalone: false,
      supportsTouchID: false,
      supportsFaceID: false,
      supportsHaptic: false
    } as IOSContextValue
  }
  
  return context
}