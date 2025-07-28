'use client'

import { Handle, Position } from '@xyflow/react'
import { getNodeTypeIcon, getNodeTypeColor } from '@/types/node'

interface MinimalNodeProps {
  id: string
  data: {
    label: string
    nodeType?: string // Using nodeType to match BrainDumpNode structure
    description?: string
    tags?: string[]
    urgency?: number
    importance?: number
    priority?: number
  }
  selected?: boolean
}

export function MinimalNode({ data, selected }: MinimalNodeProps) {
  const icon = getNodeTypeIcon(data.nodeType as any)
  const colorClass = getNodeTypeColor(data.nodeType as any)
  
  return (
    <div className="group relative">
      {/* Minimal display - just icon and title */}
      <div
        className={`
          px-3 py-1.5 rounded-lg border-2 bg-white shadow-sm
          transition-all duration-200 cursor-pointer
          ${selected ? 'ring-2 ring-blue-400 border-blue-400' : 'border-gray-300'}
          hover:shadow-md hover:border-gray-400
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className={`text-sm font-medium ${colorClass}`}>
            {data.label}
          </span>
        </div>
      </div>
      
      {/* Hover details */}
      <div className="
        absolute top-full left-0 mt-2 z-50
        opacity-0 group-hover:opacity-100 pointer-events-none
        transition-opacity duration-200
        min-w-[200px] max-w-[300px]
      ">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3">
          {data.description && (
            <p className="text-sm text-gray-600 mb-2">{data.description}</p>
          )}
          
          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {data.tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {(data.urgency !== undefined || data.importance !== undefined) && (
            <div className="flex gap-4 text-xs text-gray-500">
              {data.urgency !== undefined && (
                <span>Urgency: {data.urgency}/10</span>
              )}
              {data.importance !== undefined && (
                <span>Importance: {data.importance}/10</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Connection handles - simplified to just left/right */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 !bg-gray-400"
        style={{ background: '#9CA3AF' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 !bg-gray-400"
        style={{ background: '#9CA3AF' }}
      />
    </div>
  )
}