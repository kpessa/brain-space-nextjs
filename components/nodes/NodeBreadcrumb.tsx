'use client'

import { ChevronRight, Home } from '@/lib/icons'
import { useNodesStore } from '@/store/nodes'
import type { Node } from '@/types/node'

interface NodeBreadcrumbProps {
  node: Node
  onNodeClick?: (node: Node) => void
}

export function NodeBreadcrumb({ node, onNodeClick }: NodeBreadcrumbProps) {
  const { getNodeAncestors, getNodeById } = useNodesStore()
  
  // Get ancestors in reverse order (root to current)
  const ancestors = getNodeAncestors(node.id).reverse()
  const breadcrumbPath = [...ancestors, node]

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 overflow-x-auto">
      {breadcrumbPath.length > 1 && (
        <>
          <Home className="w-4 h-4 text-gray-400" />
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </>
      )}
      
      {breadcrumbPath.map((pathNode, index) => (
        <div key={pathNode.id} className="flex items-center gap-2">
          {index > 0 && index < breadcrumbPath.length && (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          
          {index === breadcrumbPath.length - 1 ? (
            // Current node (not clickable)
            <span className="font-medium text-gray-900 whitespace-nowrap">
              {pathNode.title || 'Untitled'}
            </span>
          ) : (
            // Ancestor nodes (clickable)
            <button
              onClick={() => onNodeClick?.(pathNode)}
              className="hover:text-brain-600 transition-colors whitespace-nowrap"
            >
              {pathNode.title || 'Untitled'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}