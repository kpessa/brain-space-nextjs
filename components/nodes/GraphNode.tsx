'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { GitBranch, GitMerge, Circle, CheckCircle } from '@/lib/icons'
import { Button } from '@/components/ui/Button'
import type { Node } from '@/types/node'
import { getNodeTypeIcon, getNodeTypeColor, getEisenhowerQuadrant } from '@/types/node'
import { useNodesStore } from '@/store/nodeStore'

interface GraphNodeProps {
  data: {
    node: Node
    onNodeClick?: (node: Node) => void
    onCreateChild?: (node: Node) => void
    onCreateParent?: (node: Node) => void
  }
}

export const GraphNode = memo(({ data }: GraphNodeProps) => {
  const { node, onNodeClick, onCreateChild, onCreateParent } = data
  const { updateNode, getNodeChildren } = useNodesStore()
  const children = getNodeChildren(node.id)

  const handleCompletionToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateNode(node.id, { completed: !node.completed })
  }

  const getQuadrantColor = (urgency?: number, importance?: number) => {
    const quadrant = getEisenhowerQuadrant(urgency, importance)
    switch (quadrant) {
      case 'do-first': return 'border-red-400 bg-red-50'
      case 'schedule': return 'border-blue-400 bg-blue-50'
      case 'delegate': return 'border-yellow-400 bg-yellow-50'
      case 'eliminate': return 'border-gray-300 bg-gray-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  const typeColor = getNodeTypeColor(node.type)
  const borderColor = typeColor.replace('text-', 'border-').replace('-600', '-400')

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-2 !h-2"
      />
      
      <div
        className={`
          px-4 py-3 rounded-lg border-2 bg-white shadow-lg min-w-[200px] max-w-[300px]
          ${getQuadrantColor(node.urgency, node.importance)}
          ${node.completed ? 'opacity-60' : ''}
          hover:shadow-xl transition-shadow cursor-pointer
        `}
        onClick={() => onNodeClick?.(node)}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={handleCompletionToggle}
            className="flex-shrink-0"
          >
            {node.completed ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5 text-gray-400" />
            )}
          </button>
          <span className="text-lg flex-shrink-0">{getNodeTypeIcon(node.type)}</span>
          <h3 className={`font-medium text-sm ${node.completed ? 'line-through text-gray-500' : 'text-gray-900'} line-clamp-2`}>
            {node.title || 'Untitled'}
          </h3>
        </div>

        {/* Type and Children Count */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium ${typeColor}`}>
            {node.type}
          </span>
          {children.length > 0 && (
            <span className="text-xs text-gray-500">
              {children.length} {children.length === 1 ? 'child' : 'children'}
            </span>
          )}
        </div>

        {/* Tags */}
        {node.tags && node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {node.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                #{tag}
              </span>
            ))}
            {node.tags.length > 2 && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                +{node.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-1 mt-2 opacity-0 hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onCreateChild?.(node)
            }}
            className="p-1 h-6"
            title="Add child node"
          >
            <GitBranch className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onCreateParent?.(node)
            }}
            className="p-1 h-6"
            title="Add parent node"
          >
            <GitMerge className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-2 !h-2"
      />
    </>
  )
})