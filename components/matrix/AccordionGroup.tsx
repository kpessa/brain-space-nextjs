'use client'

import { memo } from 'react'
import { ChevronDown, ChevronRight } from '@/lib/icons'
import { MatrixNodeCard } from './MatrixNodeCard'

interface AccordionGroupProps {
  label: string
  nodes: any[]
  color: string
  isExpanded: boolean
  isCollapsedView?: boolean
  onToggle: () => void
  onNodeContextMenu?: (e: React.MouseEvent, node: any) => void
  contextMenuNodeId?: string | null
  baseIndex?: number
}

export const AccordionGroup = memo(function AccordionGroup({
  label,
  nodes,
  color,
  isExpanded,
  isCollapsedView = false,
  onToggle,
  onNodeContextMenu,
  contextMenuNodeId,
  baseIndex = 0
}: AccordionGroupProps) {
  if (nodes.length === 0) return null

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors ${color}`}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span className="font-medium">{label}</span>
          <span className="text-sm opacity-75">({nodes.length})</span>
        </div>
      </button>
      {isExpanded && (
        <div className="p-2 space-y-2 bg-gray-50">
          {nodes.map((node, nodeIndex) => (
            <MatrixNodeCard
              key={node.id}
              node={node}
              index={baseIndex + nodeIndex}
              isCollapsed={isCollapsedView}
              isContextMenuOpen={contextMenuNodeId === node.id}
              onContextMenu={onNodeContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
})