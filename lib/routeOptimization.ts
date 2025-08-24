import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { prefetch } from 'next/navigation'

/**
 * Route priorities for prefetching
 */
const ROUTE_PRIORITIES = {
  high: ['/todos', '/nodes', '/braindump'],
  medium: ['/journal', '/matrix', '/timebox'],
  low: ['/progress', '/calendar', '/recurring', '/routines', '/status-update'],
}

/**
 * Prefetch strategies
 */
export const PrefetchStrategy = {
  // Prefetch on hover
  HOVER: 'hover',
  // Prefetch on viewport
  VIEWPORT: 'viewport',
  // Prefetch immediately
  IMMEDIATE: 'immediate',
  // Prefetch on idle
  IDLE: 'idle',
} as const

type PrefetchStrategyType = typeof PrefetchStrategy[keyof typeof PrefetchStrategy]

/**
 * Hook to prefetch routes based on priority
 */
export function useRoutePrefetch(strategy: PrefetchStrategyType = 'idle') {
  const router = useRouter()

  useEffect(() => {
    if (strategy === 'immediate') {
      // Prefetch high priority routes immediately
      ROUTE_PRIORITIES.high.forEach(route => {
        router.prefetch(route)
      })
    } else if (strategy === 'idle') {
      // Use requestIdleCallback for lower priority routes
      if ('requestIdleCallback' in window) {
        const handle = requestIdleCallback(() => {
          // Prefetch high priority first
          ROUTE_PRIORITIES.high.forEach(route => {
            router.prefetch(route)
          })

          // Then medium priority
          requestIdleCallback(() => {
            ROUTE_PRIORITIES.medium.forEach(route => {
              router.prefetch(route)
            })
          })
        })

        return () => {
          if ('cancelIdleCallback' in window) {
            cancelIdleCallback(handle)
          }
        }
      } else {
        // Fallback to setTimeout
        const timeout = setTimeout(() => {
          ROUTE_PRIORITIES.high.forEach(route => {
            router.prefetch(route)
          })
        }, 1000)

        return () => clearTimeout(timeout)
      }
    }
  }, [router, strategy])
}

/**
 * Prefetch on hover with debounce
 */
export function usePrefetchOnHover(href: string, delay: number = 100) {
  const router = useRouter()
  let timeoutId: NodeJS.Timeout

  const handleMouseEnter = () => {
    timeoutId = setTimeout(() => {
      router.prefetch(href)
    }, delay)
  }

  const handleMouseLeave = () => {
    clearTimeout(timeoutId)
  }

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  }
}

/**
 * Prefetch when element is in viewport
 */
export function usePrefetchInViewport(
  ref: React.RefObject<HTMLElement>,
  href: string,
  options?: IntersectionObserverInit
) {
  const router = useRouter()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          router.prefetch(href)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px',
        ...options,
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [ref, href, router, options])
}

/**
 * Progressive enhancement for route transitions
 */
export function useRouteTransition() {
  const router = useRouter()

  const navigateWithTransition = async (href: string) => {
    // Check if View Transitions API is available
    if ('startViewTransition' in document) {
      // @ts-ignore - View Transitions API
      document.startViewTransition(() => {
        router.push(href)
      })
    } else {
      // Fallback to regular navigation
      router.push(href)
    }
  }

  return { navigateWithTransition }
}

/**
 * Route loading states
 */
import { create } from 'zustand'

interface RouteLoadingState {
  isLoading: boolean
  loadingRoute: string | null
  setLoading: (route: string | null) => void
}

export const useRouteLoading = create<RouteLoadingState>((set) => ({
  isLoading: false,
  loadingRoute: null,
  setLoading: (route) => set({ 
    isLoading: route !== null, 
    loadingRoute: route 
  }),
}))

/**
 * Critical CSS for above-the-fold content
 */
export const criticalCSS = `
  /* Reset and base styles */
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  
  /* Loading skeleton */
  .skeleton { 
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
  }
  
  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  
  /* Above-the-fold layout */
  .nav-skeleton { height: 64px; }
  .content-skeleton { min-height: calc(100vh - 64px); }
`

/**
 * Resource hints for faster loading
 */
export function ResourceHints() {
  return (
    <>
      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* DNS prefetch for Firebase */}
      <link rel="dns-prefetch" href="https://firebaseapp.com" />
      <link rel="dns-prefetch" href="https://firebaseio.com" />
      
      {/* Preload critical fonts */}
      <link
        rel="preload"
        href="/fonts/inter-var.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      
      {/* Prefetch next likely navigation */}
      <link rel="prefetch" href="/todos" />
      <link rel="prefetch" href="/nodes" />
    </>
  )
}

/**
 * Service Worker registration for offline support
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
      
      // Check for updates periodically
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000) // Check every hour
      
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }
}

/**
 * Network Information API for adaptive loading
 */
export function useNetworkStatus() {
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const [effectiveType, setEffectiveType] = useState<string>('4g')
  const [saveData, setSaveData] = useState(false)

  useEffect(() => {
    if ('connection' in navigator) {
      // @ts-ignore - Network Information API
      const connection = navigator.connection
      
      const updateConnectionInfo = () => {
        setConnectionType(connection.type || 'unknown')
        setEffectiveType(connection.effectiveType || '4g')
        setSaveData(connection.saveData || false)
      }

      updateConnectionInfo()
      connection.addEventListener('change', updateConnectionInfo)

      return () => {
        connection.removeEventListener('change', updateConnectionInfo)
      }
    }
  }, [])

  return {
    connectionType,
    effectiveType,
    saveData,
    isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g',
    isFastConnection: effectiveType === '4g',
  }
}

import { useState } from 'react'

/**
 * Adaptive image loading based on network
 */
export function useAdaptiveImage(
  highResSrc: string,
  lowResSrc: string,
  placeholder?: string
) {
  const { isSlowConnection, saveData } = useNetworkStatus()
  const [currentSrc, setCurrentSrc] = useState(
    placeholder || lowResSrc
  )

  useEffect(() => {
    if (saveData || isSlowConnection) {
      setCurrentSrc(lowResSrc)
    } else {
      // Load high-res image
      const img = new Image()
      img.src = highResSrc
      img.onload = () => setCurrentSrc(highResSrc)
    }
  }, [highResSrc, lowResSrc, isSlowConnection, saveData])

  return currentSrc
}