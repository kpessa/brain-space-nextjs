'use client'

import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { NodeType } from '@/types/node'

interface NodeFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedType: NodeType | 'all'
  onTypeChange: (type: NodeType | 'all') => void
  selectedTag: string
  onTagChange: (tag: string) => void
  showCompleted: boolean
  onShowCompletedChange: (show: boolean) => void
  availableTags: string[]
}

const nodeTypes: (NodeType | 'all')[] = [
  'all',
  'goal',
  'project',
  'task',
  'option',
  'idea',
  'question',
  'problem',
  'insight',
  'thought',
  'concern'
]

export function NodeFilters({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedTag,
  onTagChange,
  showCompleted,
  onShowCompletedChange,
  availableTags
}: NodeFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasActiveFilters = selectedType !== 'all' || selectedTag !== 'all' || showCompleted

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-brain-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {[selectedType !== 'all', selectedTag !== 'all', showCompleted].filter(Boolean).length}
            </span>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onTypeChange('all')
              onTagChange('all')
              onShowCompletedChange(false)
            }}
            className="text-xs"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Node Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value as NodeType | 'all')}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {nodeTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tag
            </label>
            <select
              value={selectedTag}
              onChange={(e) => onTagChange(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* Show Completed Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Show Completed
            </label>
            <button
              onClick={() => onShowCompletedChange(!showCompleted)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showCompleted ? 'bg-brain-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showCompleted ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}