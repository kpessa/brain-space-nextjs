import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Target, Filter, Eye, Search } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { type Node, type NodeType, getNodeTypeIcon } from '@/types/node'
import { type TimeboxTask } from '@/store/timeboxStore'
import { getPriorityColor } from './TimeboxConstants'

interface TimeboxNodePoolProps {
  unscheduledNodes: Node[]
  nodeFilterMode: 'filtered' | 'all'
  selectedNodeType: NodeType | 'all'
  searchQuery: string
  availableNodeTypes: NodeType[]
  currentMode: string
  onSetNodeFilterMode: (mode: 'filtered' | 'all') => void
  onSetSelectedNodeType: (type: NodeType | 'all') => void
  onSetSearchQuery: (query: string) => void
  onClearFilters: () => void
  onHandleDragStart: (e: React.DragEvent, task: TimeboxTask) => void
  onHandleDragEnd: () => void
}

export function TimeboxNodePool({
  unscheduledNodes,
  nodeFilterMode,
  selectedNodeType,
  searchQuery,
  availableNodeTypes,
  currentMode,
  onSetNodeFilterMode,
  onSetSelectedNodeType,
  onSetSearchQuery,
  onClearFilters,
  onHandleDragStart,
  onHandleDragEnd
}: TimeboxNodePoolProps) {
  return (
    <Card className="lg:col-span-1 flex flex-col overflow-hidden order-2 lg:order-1 h-[40vh] lg:h-auto">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Node Pool
            </CardTitle>
            <CardDescription>
              Drag nodes into time blocks
            </CardDescription>
          </div>
          <span className="text-sm font-medium text-gray-600">
            {unscheduledNodes.length}
          </span>
        </div>
        
        {/* Filter Controls */}
        <div className="space-y-1.5">
          {/* Filter Mode Toggle */}
          <div className="flex items-center gap-1">
            <Button
              variant={nodeFilterMode === 'filtered' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onSetNodeFilterMode('filtered')}
              className="flex-1 text-xs py-1 px-2 h-8"
              title={`Show ${currentMode === 'all' ? 'all' : currentMode} nodes only`}
            >
              <Filter className="w-3 h-3" />
            </Button>
            <Button
              variant={nodeFilterMode === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onSetNodeFilterMode('all')}
              className="flex-1 text-xs py-1 px-2 h-8"
              title="Show all nodes"
            >
              <Eye className="w-3 h-3" />
            </Button>
          </div>
          
          {/* Type Filter and Search in one row */}
          <div className="flex gap-1">
            <select
              value={selectedNodeType}
              onChange={(e) => onSetSelectedNodeType(e.target.value as NodeType | 'all')}
              className="flex-1 px-1.5 py-1 text-xs border border-gray-300 rounded bg-white h-8"
            >
              <option value="all">All Types</option>
              {availableNodeTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search className="w-3 h-3 absolute left-1.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSetSearchQuery(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-xs border border-gray-300 rounded bg-white h-8"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-y-auto p-2 flex-1">
        <div className="space-y-1.5">
          {unscheduledNodes.map((node) => (
            <div
              key={node.id}
              className={cn(
                "p-2 rounded border cursor-move hover:shadow-sm transition-shadow",
                getPriorityColor(node.importance, node.urgency)
              )}
              draggable
              onDragStart={(e) => onHandleDragStart(e, {
                id: `task-${node.id}-${Date.now()}`,
                label: node.title || 'Untitled',
                nodeId: node.id,
                importance: node.importance,
                urgency: node.urgency,
                category: node.type,
                isPersonal: node.isPersonal,
              })}
              onDragEnd={onHandleDragEnd}
            >
              <div className="flex items-start justify-between">
                <div className="text-xs font-medium text-gray-900 leading-tight flex-1 mr-1">
                  {node.title || 'Untitled'}
                </div>
                {node.isPersonal !== undefined && (
                  <span className={cn(
                    "text-xs px-1 py-0.5 rounded-full flex-shrink-0",
                    node.isPersonal 
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  )}>
                    {node.isPersonal ? 'P' : 'W'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {node.type && (
                  <span className="text-xs text-gray-600 flex items-center gap-0.5">
                    <span className="text-xs">{getNodeTypeIcon(node.type)}</span>
                    <span className="truncate">{node.type}</span>
                  </span>
                )}
                {node.urgency !== undefined && node.importance !== undefined && (
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    U:{node.urgency} I:{node.importance}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {unscheduledNodes.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            {nodeFilterMode === 'filtered' || selectedNodeType !== 'all' || searchQuery.trim() ? (
              <div>
                <p className="text-xs">No nodes match filters</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs py-1 px-2 h-6"
                  onClick={onClearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-xs">No unscheduled nodes</p>
                <p className="text-xs mt-1 text-gray-400">Create nodes from the Nodes page</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
