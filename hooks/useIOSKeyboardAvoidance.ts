'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseIOSKeyboardAvoidanceOptions {
  enabled?: boolean
  offset?: number
  scrollBehavior?: 'smooth' | 'instant'
  additionalOffset?: number
}

/**
 * Hook to handle iOS keyboard avoidance for input fields
 * Automatically scrolls the view when keyboard appears to keep input visible
 */
export function useIOSKeyboardAvoidance({
  enabled = true,
  offset = 20,
  scrollBehavior = 'smooth',
  additionalOffset = 0
}: UseIOSKeyboardAvoidanceOptions = {}) {
  const activeElementRef = useRef<HTMLElement | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const originalScrollPosition = useRef<number>(0)

  // Detect if running on iOS
  const isIOS = useCallback(() => {
    if (typeof window === 'undefined') return false
    
    const userAgent = window.navigator.userAgent.toLowerCase()
    return /iphone|ipad|ipod/.test(userAgent) || 
           (navigator.maxTouchPoints > 0 && /macintosh/.test(userAgent))
  }, [])

  // Calculate the viewport height accounting for iOS keyboard
  const getVisibleViewportHeight = useCallback(() => {
    if (typeof window === 'undefined') return 0
    
    // Use visualViewport API if available (iOS 13+)
    if (window.visualViewport) {
      return window.visualViewport.height
    }
    
    // Fallback for older iOS versions
    return window.innerHeight
  }, [])

  // Scroll element into view when keyboard appears
  const scrollElementIntoView = useCallback((element: HTMLElement) => {
    if (!element) return

    const rect = element.getBoundingClientRect()
    const viewportHeight = getVisibleViewportHeight()
    const elementBottom = rect.bottom
    const elementTop = rect.top
    
    // Calculate if element is hidden by keyboard
    const keyboardHeight = window.innerHeight - viewportHeight
    const isHiddenByKeyboard = elementBottom > viewportHeight - offset
    
    if (isHiddenByKeyboard || elementTop < 0) {
      // Calculate scroll amount
      const scrollContainer = document.scrollingElement || document.documentElement
      const currentScroll = scrollContainer.scrollTop
      
      // Determine optimal scroll position
      let targetScroll = currentScroll
      
      if (elementTop < 0) {
        // Element is above viewport
        targetScroll = currentScroll + elementTop - offset - additionalOffset
      } else {
        // Element is below viewport (hidden by keyboard)
        const desiredTop = viewportHeight / 2 - rect.height / 2
        targetScroll = currentScroll + (elementTop - desiredTop)
      }
      
      // Perform scroll with animation
      scrollContainer.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: scrollBehavior
      })
    }
  }, [getVisibleViewportHeight, offset, scrollBehavior, additionalOffset])

  // Handle focus events
  const handleFocus = useCallback((event: FocusEvent) => {
    if (!enabled || !isIOS()) return
    
    const target = event.target as HTMLElement
    
    // Check if it's an input element
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.contentEditable === 'true'
    ) {
      activeElementRef.current = target
      originalScrollPosition.current = window.scrollY
      
      // Delay to wait for keyboard to appear
      scrollTimeoutRef.current = setTimeout(() => {
        scrollElementIntoView(target)
      }, 300)
    }
  }, [enabled, isIOS, scrollElementIntoView])

  // Handle blur events
  const handleBlur = useCallback((event: FocusEvent) => {
    if (!enabled || !isIOS()) return
    
    const target = event.target as HTMLElement
    
    if (target === activeElementRef.current) {
      activeElementRef.current = null
      
      // Clear any pending scroll
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // Optional: Restore original scroll position
      // Uncomment if you want to restore scroll after keyboard hides
      // setTimeout(() => {
      //   window.scrollTo({
      //     top: originalScrollPosition.current,
      //     behavior: scrollBehavior
      //   })
      // }, 100)
    }
  }, [enabled, isIOS])

  // Handle viewport resize (keyboard show/hide)
  const handleViewportChange = useCallback(() => {
    if (!enabled || !isIOS() || !activeElementRef.current) return
    
    // Re-adjust scroll when viewport changes
    scrollElementIntoView(activeElementRef.current)
  }, [enabled, isIOS, scrollElementIntoView])

  // Set up event listeners
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    
    // Use capture phase to handle before other handlers
    document.addEventListener('focus', handleFocus, true)
    document.addEventListener('blur', handleBlur, true)
    
    // Listen for viewport changes (iOS 13+)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange)
      window.visualViewport.addEventListener('scroll', handleViewportChange)
    } else {
      // Fallback for older iOS
      window.addEventListener('resize', handleViewportChange)
    }
    
    return () => {
      document.removeEventListener('focus', handleFocus, true)
      document.removeEventListener('blur', handleBlur, true)
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange)
        window.visualViewport.removeEventListener('scroll', handleViewportChange)
      } else {
        window.removeEventListener('resize', handleViewportChange)
      }
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [enabled, handleFocus, handleBlur, handleViewportChange])

  // Return helper functions
  return {
    isIOS: isIOS(),
    scrollToElement: scrollElementIntoView,
    activeElement: activeElementRef.current
  }
}

/**
 * Component-level hook for individual input handling
 */
export function useIOSInputHandler(inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>) {
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()

  const handleInputFocus = useCallback(() => {
    if (!inputRef.current) return
    
    const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    if (!isIOS) return
    
    // Wait for keyboard to appear
    scrollTimeoutRef.current = setTimeout(() => {
      if (!inputRef.current) return
      
      // Scroll element into center of visible viewport
      const rect = inputRef.current.getBoundingClientRect()
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const elementCenter = rect.top + rect.height / 2
      const viewportCenter = viewportHeight / 2
      
      if (Math.abs(elementCenter - viewportCenter) > 50) {
        const scrollAmount = elementCenter - viewportCenter
        
        window.scrollBy({
          top: scrollAmount,
          behavior: 'smooth'
        })
      }
    }, 300)
  }, [inputRef])

  const handleInputBlur = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    
    input.addEventListener('focus', handleInputFocus)
    input.addEventListener('blur', handleInputBlur)
    
    return () => {
      input.removeEventListener('focus', handleInputFocus)
      input.removeEventListener('blur', handleInputBlur)
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [inputRef, handleInputFocus, handleInputBlur])
}

// Export default for global app-level usage
export default useIOSKeyboardAvoidance