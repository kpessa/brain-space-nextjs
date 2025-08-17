'use client'

import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Search, Filter } from '@/lib/icons'
import { Button } from '@/components/ui/Button'
import type { Node, NodeType } from '@/types/node'
import type { TimeboxTask } from '@/store/timeboxStore'

interface NodePoolProps {
  nodes: Node[]
  searchQuery: string
  selectedNodeType: NodeType | 'all'
  nodeFilterMode: 'filtered' | 'all'
  onSearchChange: (query: string) => void
  onNodeTypeChange: (type: NodeType | 'all') => void
  onFilterModeChange: (mode: 'filtered' | 'all') => void
  onDragStart: (e: React.DragEvent, task: TimeboxTask) => void
  onDragEnd: () => void
  onNodeClick: (nodeId: string) => void
  shouldShowNode: (node: Node) => boolean
}

function getPriorityColor(importance?: number, urgency?: number) {
  if (importance === undefined || urgency === undefined) {
    return 'bg-gray-100 border-gray-300'
  }
  
  const score = importance + urgency
  if (score >= 16) return 'bg-red-100 border-red-300'
  if (score >= 12) return 'bg-orange-100 border-orange-300'
  if (score >= 8) return 'bg-yellow-100 border-yellow-300'
  return 'bg-green-100 border-green-300'
}

const nodeTypeOptions: Array<NodeType | 'all'> = [
  'all',
  'task',
  'project',
  'idea',
  'note',
  'goal',
  'event',
  'decision',
  'question',
  'learning',
  'person',
  'resource'
]

export const NodePool = memo(function NodePool({
  nodes,
  searchQuery,
  selectedNodeType,
  nodeFilterMode,
  onSearchChange,
  onNodeTypeChange,
  onFilterModeChange,
  onDragStart,
  onDragEnd,
  onNodeClick,
  shouldShowNode
}: NodePoolProps) {
  
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      // Filter by mode
      if (nodeFilterMode === 'filtered' && !shouldShowNode(node)) {
        return false
      }
      
      // Filter by type
      if (selectedNodeType !== 'all' && node.type !== selectedNodeType) {
        return false
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          node.title?.toLowerCase().includes(query) ||
          node.content?.toLowerCase().includes(query) ||
          node.tags?.some(tag => tag.toLowerCase().includes(query))
        )
      }
      
      return true
    })
  }, [nodes, searchQuery, selectedNodeType, nodeFilterMode, shouldShowNode])
  
  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search nodes..."
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button
            size="sm"
            variant={nodeFilterMode === 'filtered' ? 'primary' : 'outline'}
            onClick={() => onFilterModeChange(nodeFilterMode === 'filtered' ? 'all' : 'filtered')}
            className="flex items-center gap-1"
          >
            <Filter className="w-4 h-4" />
            {nodeFilterMode === 'filtered' ? 'Filtered' : 'All'}
          </Button>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {nodeTypeOptions.map((type) => (
            <button
              key={type}
              onClick={() => onNodeTypeChange(type)}
              className={cn(
                "px-3 py-1 text-xs rounded-full border transition-colors",
                selectedNodeType === type
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              )}
            >
              {type === 'all' ? 'All Types' : type}
            </button>
          ))}
        </div>
      </div>
      
      {/* Nodes List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredNodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No nodes match your filters
          </div>
        ) : (
          filteredNodes.map((node) => (
            <div
              key={node.id}
              className={cn(
                "p-2 rounded border cursor-move hover:shadow-sm transition-shadow",
                getPriorityColor(node.importance, node.urgency)
              )}
              draggable
              onDragStart={(e) => onDragStart(e, {
                id: `task-${node.id}-${Date.now()}`,
                label: node.title || 'Untitled',
                nodeId: node.id,
                importance: node.importance,
                urgency: node.urgency,
                category: node.type,
                isPersonal: node.isPersonal,
              })}
              onDragEnd={onDragEnd}
              onClick={() => onNodeClick(node.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">
                    {node.title || 'Untitled'}
                  </h4>
                  {node.content && (
                    <p className="text-xs text-gray-600 truncate mt-1">
                      {node.content}
                    </p>
                  )}
                  {node.tags && node.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {node.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {node.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{node.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-gray-500 capitalize">
                    {node.type}
                  </span>
                  {node.isPersonal && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">
                      Personal
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        {filteredNodes.length} of {nodes.length} nodes
      </div>
    </div>
  )
})