'use client'

import { lazy, Suspense } from 'react'
import type { Node } from '@/types/node'

// Lazy load the entire NodeGraphView component and its @xyflow/react dependencies
const NodeGraphViewComponent = lazy(() => 
  import('./NodeGraphView').then(mod => ({ 
    default: mod.NodeGraphView 
  }))
)

interface LazyNodeGraphViewProps {
  nodes: Node[]
  onNodeClick?: (node: Node) => void
  onCreateChild?: (parentNode: Node) => void
  onCreateParent?: (childNode: Node) => void
}

// Loading skeleton that matches the graph view dimensions
function GraphViewSkeleton() {
  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-gray-400 dark:text-gray-600">
        <svg className="w-12 h-12 mb-2 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">Loading graph view...</p>
      </div>
    </div>
  )
}

export function LazyNodeGraphView(props: LazyNodeGraphViewProps) {
  return (
    <Suspense fallback={<GraphViewSkeleton />}>
      <NodeGraphViewComponent {...props} />
    </Suspense>
  )
}