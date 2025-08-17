import { useEffect, useRef } from 'react'

/**
 * Custom hook for trapping focus within a container element
 * Ensures keyboard navigation stays within modal/dialog components
 * for better accessibility (WCAG 2.1 compliance)
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    // Store the currently focused element to restore later
    previousActiveElement.current = document.activeElement as HTMLElement

    const container = containerRef.current
    if (!container) return

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      const focusableSelectors = [
        'a[href]:not([disabled])',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ')

      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter(el => {
        // Filter out elements that are not visible
        const style = window.getComputedStyle(el)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
    }

    // Focus the first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      // Small delay to ensure the modal is rendered
      setTimeout(() => {
        focusableElements[0].focus()
      }, 0)
    }

    // Handle Tab key navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      // Trap focus at the end
      if (!e.shiftKey && activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }

      // Trap focus at the beginning
      if (e.shiftKey && activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
    }

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Find and click the close button if it exists
        const closeButton = container.querySelector<HTMLButtonElement>(
          '[aria-label="Close"], [data-close-button], button[class*="close"]'
        )
        if (closeButton) {
          closeButton.click()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleEscape)

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleEscape)

      // Restore focus to the previously focused element
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive])

  return containerRef
}

/**
 * Alternative hook that accepts a ref from the parent component
 * Useful when the modal component already has its own ref
 */
export function useFocusTrapWithRef(
  ref: React.RefObject<HTMLElement>,
  isActive: boolean = true
) {
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    previousActiveElement.current = document.activeElement as HTMLElement

    const container = ref.current
    if (!container) return

    const getFocusableElements = () => {
      const focusableSelectors = [
        'a[href]:not([disabled])',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ')

      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter(el => {
        const style = window.getComputedStyle(el)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
    }

    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      setTimeout(() => {
        focusableElements[0].focus()
      }, 0)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (!e.shiftKey && activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }

      if (e.shiftKey && activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const closeButton = container.querySelector<HTMLButtonElement>(
          '[aria-label="Close"], [data-close-button], button[class*="close"]'
        )
        if (closeButton) {
          closeButton.click()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleEscape)

      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus()
      }
    }
  }, [ref, isActive])
}