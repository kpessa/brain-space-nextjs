'use client'

import { memo } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { calculatePriority, getPriorityLevel, getFamilyColor, hasChildren } from './utils'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, MessageSquare } from 'lucide-react'

interface MatrixNodeCardProps {
  node: any
  index: number
  isCollapsed?: boolean
  isDragging?: boolean
  isContextMenuOpen?: boolean
  onContextMenu?: (e: React.MouseEvent, node: any) => void
  onDoubleClick?: (node: any) => void
  isParent?: boolean
  isChild?: boolean
  familyColor?: string
  indentLevel?: number
  allNodes?: any[]
  parentNode?: any
  isExpanded?: boolean
  onToggleExpand?: () => void
  childCount?: number
}

export const MatrixNodeCard = memo(function MatrixNodeCard({ 
  node, 
  index, 
  isCollapsed = false,
  isContextMenuOpen = false,
  onContextMenu,
  onDoubleClick,
  isParent = false,
  isChild = false,
  familyColor,
  indentLevel = 0,
  allNodes = [],
  parentNode,
  isExpanded = true,
  onToggleExpand,
  childCount = 0
}: MatrixNodeCardProps) {
  // Check node relationship properties
  
  // Determine if this node is a parent (has children)
  const nodeIsParent = isParent || (allNodes.length > 0 && hasChildren(node.id, allNodes))
  const actualChildCount = childCount || (nodeIsParent ? allNodes.filter(n => n.parent === node.id).length : 0)
  
  // Get family color for consistent styling
  const color = familyColor || (nodeIsParent ? getFamilyColor(node.id) : parentNode ? getFamilyColor(parentNode.id) : null)
  
  // Calculate border width and style based on relationship
  const borderWidth = nodeIsParent ? '4px' : isChild ? '2px' : '1px'
  const borderStyle = color ? `border-left-width: ${borderWidth}; border-left-color: ${color?.accent}` : ''
  
  // Calculate indentation
  const marginLeft = indentLevel * 16
  
  return (
    <Draggable key={node.id} draggableId={node.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${isCollapsed ? 'p-2' : 'p-3'} bg-white rounded-lg shadow-sm border transition-all cursor-move ${
            snapshot.isDragging
              ? 'shadow-lg ring-2 ring-brain-500 opacity-90'
              : 'hover:shadow-md'
          } ${isContextMenuOpen ? 'ring-2 ring-brain-400' : ''} ${
            isChild && color ? 'bg-opacity-50' : ''
          }`}
          style={{
            marginLeft: `${marginLeft}px`,
            borderLeftWidth: borderWidth,
            borderLeftColor: color?.accent || undefined,
            backgroundColor: isChild && color ? color.bg : undefined
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            onContextMenu?.(e, node)
          }}
          onDoubleClick={() => {
            onDoubleClick?.(node)
          }}
        >
          {isCollapsed ? (
            // Collapsed view - just title and priority
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 flex-1 text-sm flex items-center gap-1">
                {nodeIsParent && onToggleExpand && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleExpand()
                    }}
                    className="hover:bg-gray-100 rounded p-0.5 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-500" />
                    )}
                  </button>
                )}
                {nodeIsParent && (isExpanded ? <FolderOpen className="w-3 h-3 text-gray-500" /> : <Folder className="w-3 h-3 text-gray-500" />)}
                {isChild && !nodeIsParent && <ChevronRight className="w-3 h-3 text-gray-400" />}
                <span className={nodeIsParent ? 'font-semibold' : ''}>{node.title}</span>
                {nodeIsParent && !isExpanded && actualChildCount > 0 && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded ml-1">
                    {actualChildCount}
                  </span>
                )}
                {node.updates && node.updates.length > 0 && (
                  <span className="text-xs text-brain-600 bg-brain-100 px-1 py-0.5 rounded ml-1 flex items-center gap-0.5">
                    <MessageSquare className="w-3 h-3" />
                    {node.updates.length}
                  </span>
                )}
              </h4>
              {(() => {
                const priority = calculatePriority(node.urgency, node.importance)
                const { colorClass, bgClass } = getPriorityLevel(priority)
                return (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${bgClass} ${colorClass}`}>
                    P{priority}
                  </span>
                )
              })()}
            </div>
          ) : (
            // Expanded view - full details
            <>
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900 flex-1 flex items-center gap-2">
                  {nodeIsParent && onToggleExpand && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleExpand()
                      }}
                      className="hover:bg-gray-100 rounded p-0.5 transition-colors flex-shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  )}
                  {nodeIsParent && (isExpanded ? <FolderOpen className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <Folder className="w-4 h-4 text-gray-500 flex-shrink-0" />)}
                  {isChild && !nodeIsParent && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  <span className={nodeIsParent ? 'font-semibold' : ''}>{node.title}</span>
                  {nodeIsParent && actualChildCount > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {actualChildCount} {isExpanded ? 'subtasks' : 'hidden'}
                    </span>
                  )}
                  {node.updates && node.updates.length > 0 && (
                    <span className="text-xs text-brain-600 bg-brain-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <MessageSquare className="w-3 h-3" />
                      {node.updates.length} update{node.updates.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-2">
                  {(() => {
                    const priority = calculatePriority(node.urgency, node.importance)
                    const { colorClass, bgClass } = getPriorityLevel(priority)
                    return (
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${bgClass} ${colorClass}`}>
                        P: {priority}
                      </span>
                    )
                  })()}
                </div>
              </div>
              
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="font-medium">Urgency:</span>
                  <span className="text-gray-700">{node.urgency || 5}/10</span>
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="font-medium">Importance:</span>
                  <span className="text-gray-700">{node.importance || 5}/10</span>
                </span>
              </div>
              
              {node.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {node.description}
                </p>
              )}
              {node.tags && node.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {node.tags.slice(0, 3).map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Draggable>
  )
})