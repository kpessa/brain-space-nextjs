'use client'

import { Button } from '@/components/ui/Button'
import { 
  Trash2, 
  Link2, 
  Tag, 
  X, 
  CheckSquare,
  Calendar,
  FileText
} from 'lucide-react'

interface NodeBulkActionsProps {
  selectedCount: number
  onDelete: () => void
  onLink: () => void
  onTag: () => void
  onSchedule: () => void
  onExport: () => void
  onClearSelection: () => void
  onExitSelectMode: () => void
}

export function NodeBulkActions({
  selectedCount,
  onDelete,
  onLink,
  onTag,
  onSchedule,
  onExport,
  onClearSelection,
  onExitSelectMode
}: NodeBulkActionsProps) {
  if (selectedCount === 0) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select nodes to perform bulk actions
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExitSelectMode}
          className="text-sm"
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 bg-brain-50 dark:bg-brain-900/20 rounded-lg border border-brain-200 dark:border-brain-800">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-brain-700 dark:text-brain-300">
          {selectedCount} node{selectedCount > 1 ? 's' : ''} selected
        </span>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLink}
            className="flex items-center gap-2"
            title="Link as children"
          >
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Link</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onTag}
            className="flex items-center gap-2"
            title="Add tags"
          >
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Tag</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onSchedule}
            className="flex items-center gap-2"
            title="Schedule nodes"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="flex items-center gap-2"
            title="Export nodes"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            title="Delete selected"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-sm"
        >
          Clear
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExitSelectMode}
          className="text-sm"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}