'use client'

import { Button } from '@/components/ui/Button'
import { Grid3x3, TreePine, Network } from 'lucide-react'

interface NodeViewToggleProps {
  viewMode: 'grid' | 'tree' | 'graph'
  onViewModeChange: (mode: 'grid' | 'tree' | 'graph') => void
}

export function NodeViewToggle({ viewMode, onViewModeChange }: NodeViewToggleProps) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <Button
        variant={viewMode === 'grid' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className="flex items-center gap-2"
        title="Grid View"
      >
        <Grid3x3 className="h-4 w-4" />
        <span className="hidden sm:inline">Grid</span>
      </Button>
      <Button
        variant={viewMode === 'tree' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('tree')}
        className="flex items-center gap-2"
        title="Tree View"
      >
        <TreePine className="h-4 w-4" />
        <span className="hidden sm:inline">Tree</span>
      </Button>
      <Button
        variant={viewMode === 'graph' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('graph')}
        className="flex items-center gap-2"
        title="Graph View"
      >
        <Network className="h-4 w-4" />
        <span className="hidden sm:inline">Graph</span>
      </Button>
    </div>
  )
}