'use client'

import { Button } from '@/components/ui/Button'
import { ModeToggle } from '@/components/ModeToggle'
import { 
  Plus,
  Zap,
  CheckSquare,
  Upload,
  CalendarPlus,
  MessageSquare,
  MoreHorizontal
} from 'lucide-react'
import { useState } from 'react'

interface NodeToolbarProps {
  onCreateNode: () => void
  onBulkCreate: () => void
  onBulkImport: () => void
  onSelectMode: () => void
  onShowStandup: () => void
  selectMode: boolean
  nodeCount: number
}

export function NodeToolbar({
  onCreateNode,
  onBulkCreate,
  onBulkImport,
  onSelectMode,
  onShowStandup,
  selectMode,
  nodeCount
}: NodeToolbarProps) {
  const [showMoreActions, setShowMoreActions] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button
          onClick={onCreateNode}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Node
        </Button>
        
        <Button
          variant="outline"
          onClick={onSelectMode}
          className={`flex items-center gap-2 ${selectMode ? 'bg-brain-50 dark:bg-brain-900/20 border-brain-500' : ''}`}
        >
          <CheckSquare className="h-4 w-4" />
          {selectMode ? 'Exit Select' : 'Select'}
        </Button>

        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowMoreActions(!showMoreActions)}
            className="flex items-center gap-2"
          >
            <MoreHorizontal className="h-4 w-4" />
            More
          </Button>
          
          {showMoreActions && (
            <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10 min-w-[200px]">
              <button
                onClick={() => {
                  onBulkCreate()
                  setShowMoreActions(false)
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
              >
                <Zap className="h-4 w-4 text-gray-500" />
                Bulk Create
              </button>
              
              <button
                onClick={() => {
                  onBulkImport()
                  setShowMoreActions(false)
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
              >
                <CalendarPlus className="h-4 w-4 text-gray-500" />
                Import Schedule
              </button>
              
              <button
                onClick={() => {
                  onShowStandup()
                  setShowMoreActions(false)
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
              >
                <MessageSquare className="h-4 w-4 text-gray-500" />
                Daily Standup
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {nodeCount} nodes
        </span>
        <ModeToggle />
      </div>
    </div>
  )
}