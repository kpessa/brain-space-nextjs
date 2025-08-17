'use client'

/**
 * Haptic Feedback Service for iOS and supported devices
 * Provides tactile feedback for user interactions
 */

// Haptic feedback types matching iOS patterns
export type HapticFeedbackType = 
  | 'light'
  | 'medium'
  | 'heavy'
  | 'soft'
  | 'rigid'
  | 'selection'
  | 'success'
  | 'warning'
  | 'error'

// Check if vibration API is supported
const isHapticSupported = (): boolean => {
  if (typeof window === 'undefined') return false
  
  // Check for Vibration API support
  return 'vibrate' in navigator || 'mozVibrate' in navigator || 'webkitVibrate' in navigator
}

// Check if running on iOS
const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent) || 
         (navigator.maxTouchPoints > 0 && /macintosh/.test(userAgent))
}

// Vibration patterns for different feedback types (in milliseconds)
const hapticPatterns: Record<HapticFeedbackType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  soft: [10, 10, 10],
  rigid: 40,
  selection: 10,
  success: [10, 20, 30],
  warning: [30, 10, 30],
  error: [50, 10, 50, 10, 50]
}

/**
 * Trigger haptic feedback
 * @param type - Type of haptic feedback
 * @param fallbackToVibrate - Whether to use vibration API as fallback on non-iOS devices
 */
export function triggerHaptic(
  type: HapticFeedbackType = 'light',
  fallbackToVibrate = true
): void {
  // Skip if not supported or if running in development with frequent hot reloads
  if (!isHapticSupported()) return
  
  try {
    // For iOS devices, try to use the Taptic Engine via WebKit
    if (isIOS() && (window as any).webkit?.messageHandlers?.haptic) {
      // This would work in a native WebView with custom message handlers
      (window as any).webkit.messageHandlers.haptic.postMessage(type)
      return
    }
    
    // Fallback to Vibration API
    if (fallbackToVibrate && navigator.vibrate) {
      const pattern = hapticPatterns[type]
      navigator.vibrate(pattern)
    }
  } catch (error) {
    // Silently fail - haptic feedback is enhancement only
    console.debug('Haptic feedback not available:', error)
  }
}

/**
 * React hook for haptic feedback
 */
export function useHaptic() {
  const isSupported = isHapticSupported()
  const deviceIsIOS = isIOS()
  
  return {
    isSupported,
    isIOS: deviceIsIOS,
    trigger: triggerHaptic,
    
    // Convenience methods for common patterns
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy'),
    success: () => triggerHaptic('success'),
    warning: () => triggerHaptic('warning'),
    error: () => triggerHaptic('error'),
    selection: () => triggerHaptic('selection')
  }
}

/**
 * Higher-order component to add haptic feedback to any clickable element
 */
export function withHaptic<T extends HTMLElement = HTMLElement>(
  callback?: (event: React.MouseEvent<T> | React.TouchEvent<T>) => void,
  hapticType: HapticFeedbackType = 'light'
) {
  return (event: React.MouseEvent<T> | React.TouchEvent<T>) => {
    // Trigger haptic on touch/click
    triggerHaptic(hapticType)
    
    // Call original callback if provided
    if (callback) {
      callback(event)
    }
  }
}

/**
 * Button click handler with haptic feedback
 */
export function createHapticHandler<T extends HTMLElement = HTMLElement>(
  handler: (event: React.MouseEvent<T> | React.TouchEvent<T>) => void,
  hapticType: HapticFeedbackType = 'light'
) {
  return (event: React.MouseEvent<T> | React.TouchEvent<T>) => {
    // Only trigger on actual touch events on mobile
    if (event.type === 'touchstart' || event.type === 'click') {
      triggerHaptic(hapticType)
    }
    handler(event)
  }
}

// Export default haptic service
export default {
  trigger: triggerHaptic,
  isSupported: isHapticSupported,
  isIOS,
  patterns: hapticPatterns,
  useHaptic,
  withHaptic,
  createHapticHandler
}