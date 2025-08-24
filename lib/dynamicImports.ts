import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

// Loading component for heavy dependencies
const LoadingComponent = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
)

/**
 * React Flow - Heavy dependency (~400KB)
 * Only load when actually viewing the Matrix page
 */
export const DynamicReactFlow = dynamic(
  () => import('@xyflow/react').then(mod => mod.ReactFlow as any),
  {
    loading: LoadingComponent,
    ssr: false,
  }
)

export const DynamicReactFlowProvider = dynamic(
  () => import('@xyflow/react').then(mod => mod.ReactFlowProvider as any),
  {
    loading: LoadingComponent,
    ssr: false,
  }
)

export const DynamicControls = dynamic(
  () => import('@xyflow/react').then(mod => mod.Controls as any),
  {
    ssr: false,
  }
)

export const DynamicBackground = dynamic(
  () => import('@xyflow/react').then(mod => mod.Background as any),
  {
    ssr: false,
  }
)

/**
 * Drag and Drop - Heavy dependency (~200KB)
 * Only load when on pages that need drag/drop
 */
export const DynamicDragDropContext = dynamic(
  () => import('@hello-pangea/dnd').then(mod => mod.DragDropContext as any),
  {
    loading: LoadingComponent,
    ssr: false,
  }
)

export const DynamicDroppable = dynamic(
  () => import('@hello-pangea/dnd').then(mod => mod.Droppable as any),
  {
    ssr: false,
  }
)

export const DynamicDraggable = dynamic(
  () => import('@hello-pangea/dnd').then(mod => mod.Draggable as any),
  {
    ssr: false,
  }
)

/**
 * AI SDKs - Load on demand
 */
export const loadOpenAI = () => import('openai')
export const loadGoogleAI = () => import('@google/generative-ai')

/**
 * Chart libraries (if added in future)
 */
// export const DynamicChart = dynamic(
//   () => import('recharts').then(mod => mod.LineChart),
//   {
//     loading: LoadingComponent,
//     ssr: false,
//   }
// )

/**
 * Heavy UI components
 */
export const DynamicNodeDetailModal = dynamic(
  () => import('@/components/nodes/NodeDetailModal'),
  {
    loading: LoadingComponent,
    ssr: false,
  }
)

export const DynamicBrainDumpFlow = dynamic(
  () => import('@/components/BrainDumpFlow'),
  {
    loading: LoadingComponent,
    ssr: false,
  }
)

export const DynamicMatrixView = dynamic(
  () => import('@/app/(dashboard)/matrix/matrix-client'),
  {
    loading: LoadingComponent,
    ssr: false,
  }
)

/**
 * Utility to preload a dynamic component
 */
export function preloadComponent(loader: () => Promise<any>) {
  // Start loading the component in the background
  loader().catch(() => {
    // Silently catch errors during preload
  })
}

/**
 * Hook to preload components based on route
 */
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function usePreloadComponents() {
  const pathname = usePathname()

  useEffect(() => {
    // Preload components based on current route
    switch (pathname) {
      case '/matrix':
        // Preload React Flow components
        import('@xyflow/react')
        break
      case '/timebox':
        // Preload drag and drop
        import('@hello-pangea/dnd')
        break
      case '/braindump':
        // Preload AI SDKs
        loadOpenAI()
        loadGoogleAI()
        break
    }
  }, [pathname])
}

/**
 * Route-based code splitting helper
 */
export function createLazyRoute<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  return dynamic(importFn, {
    loading: () => fallback || <LoadingComponent />,
    ssr: false,
  })
}

/**
 * Intersection Observer for lazy loading
 */
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  onIntersect: () => void,
  options?: IntersectionObserverInit
) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onIntersect()
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
  }, [ref, onIntersect, options])
}