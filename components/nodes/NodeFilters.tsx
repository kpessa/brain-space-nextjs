'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Search, Grid3x3, TreePine, Share2 } from '@/lib/icons'
import type { NodeType } from '@/types/node'

interface NodeFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  viewMode: 'grid' | 'tree' | 'graph'
  onViewModeChange: (mode: 'grid' | 'tree' | 'graph') => void
  selectedType: NodeType | 'all'
  onTypeChange: (type: NodeType | 'all') => void
  selectedTag: string
  onTagChange: (tag: string) => void
  showCompleted: boolean
  onShowCompletedChange: (show: boolean) => void
  showSnoozed: boolean
  onShowSnoozedChange: (show: boolean) => void
  snoozedCount: number
  availableTags: string[]
}

export function NodeFilters({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  selectedType,
  onTypeChange,
  selectedTag,
  onTagChange,
  showCompleted,
  onShowCompletedChange,
  showSnoozed,
  onShowSnoozedChange,
  snoozedCount,
  availableTags
}: NodeFiltersProps) {
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search nodes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-gray-300">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`px-3 py-2 flex items-center gap-2 rounded-l-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-brain-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
                <span className="text-sm">Grid</span>
              </button>
              <button
                onClick={() => onViewModeChange('tree')}
                className={`px-3 py-2 flex items-center gap-2 transition-colors ${
                  viewMode === 'tree' 
                    ? 'bg-brain-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <TreePine className="w-4 h-4" />
                <span className="text-sm">Tree</span>
              </button>
              <button
                onClick={() => onViewModeChange('graph')}
                className={`px-3 py-2 flex items-center gap-2 rounded-r-lg transition-colors ${
                  viewMode === 'graph' 
                    ? 'bg-brain-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Graph</span>
              </button>
            </div>
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value as NodeType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="goal">Goals</option>
              <option value="project">Projects</option>
              <option value="task">Tasks</option>
              <option value="idea">Ideas</option>
              <option value="question">Questions</option>
              <option value="problem">Problems</option>
              <option value="insight">Insights</option>
              <option value="thought">Thoughts</option>
              <option value="concern">Concerns</option>
            </select>
            
            <select
              value={selectedTag}
              onChange={(e) => onTagChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
            >
              <option value="all">All Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>#{tag}</option>
              ))}
            </select>
            
            {/* Show Completed Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
              <input
                type="checkbox"
                id="showCompleted"
                checked={showCompleted}
                onChange={(e) => onShowCompletedChange(e.target.checked)}
                className="rounded border-gray-300 text-brain-600 focus:ring-brain-500"
              />
              <label htmlFor="showCompleted" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                Show completed
              </label>
            </div>
            
            {/* Show Snoozed Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
              <input
                type="checkbox"
                id="showSnoozed"
                checked={showSnoozed}
                onChange={(e) => onShowSnoozedChange(e.target.checked)}
                className="rounded border-gray-300 text-brain-600 focus:ring-brain-500"
              />
              <label htmlFor="showSnoozed" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                Show snoozed ({snoozedCount})
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}