'use client'

import { lazy, Suspense } from 'react'
import type { Node, Edge } from '@xyflow/react'

// Lazy load the entire BrainDumpFlow component and its @xyflow/react dependencies
const BrainDumpFlowComponent = lazy(() => 
  import('./BrainDumpFlow').then(mod => ({ 
    default: mod.BrainDumpFlow 
  }))
)

interface LazyBrainDumpFlowProps {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onBack?: () => void
  userId?: string
}

// Loading skeleton that matches the flow view dimensions
function FlowSkeleton() {
  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-gray-400 dark:text-gray-600">
        <svg className="w-12 h-12 mb-2 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p className="text-sm">Loading brain dump flow...</p>
      </div>
    </div>
  )
}

export function LazyBrainDumpFlow(props: LazyBrainDumpFlowProps) {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <BrainDumpFlowComponent {...props} />
    </Suspense>
  )
}