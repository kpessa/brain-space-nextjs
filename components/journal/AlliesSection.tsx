'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Users, User, Wrench, BookOpen, Lightbulb, List, LayoutGrid } from '@/lib/icons'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

interface AlliesSectionProps {
  allies: string[]
  onChange: (allies: string[]) => void
}

type AllyType = 'person' | 'resource' | 'tool' | 'knowledge'

interface AllyItem {
  text: string
  type: AllyType
}

// For now, we'll store allies as strings but display with enhanced UI
export function AlliesSection({ allies, onChange }: AlliesSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [tempValue, setTempValue] = useState('')
  const [allyTypes, setAllyTypes] = useState<Record<number, AllyType>>({})
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('compact')
  const inputRef = useRef<HTMLInputElement>(null)

  // Load view preference from local storage
  useEffect(() => {
    const savedView = localStorage.getItem('allies-view-mode')
    if (savedView === 'compact' || savedView === 'list') {
      setViewMode(savedView)
    }
  }, [])

  // Focus input when editing starts
  useEffect(() => {
    if ((editingIndex !== null || isAddingNew) && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingIndex, isAddingNew])

  const handleAdd = () => {
    setIsAddingNew(true)
    setTempValue('')
  }

  const handleSave = (index?: number) => {
    const trimmedValue = tempValue.trim()
    if (!trimmedValue) return

    if (index !== undefined) {
      // Editing existing item
      const newAllies = [...allies]
      newAllies[index] = trimmedValue
      onChange(newAllies)
      setEditingIndex(null)
    } else {
      // Adding new item
      onChange([...allies, trimmedValue])
      setIsAddingNew(false)
    }
    setTempValue('')
  }

  const handleCancel = () => {
    setEditingIndex(null)
    setIsAddingNew(false)
    setTempValue('')
  }

  const handleRemove = (index: number) => {
    const newAllies = allies.filter((_, i) => i !== index)
    onChange(newAllies)
    // Update types mapping
    const newTypes: Record<number, AllyType> = {}
    Object.entries(allyTypes).forEach(([i, type]) => {
      const idx = parseInt(i)
      if (idx < index) newTypes[idx] = type
      else if (idx > index) newTypes[idx - 1] = type
    })
    setAllyTypes(newTypes)
  }

  const handleKeyDown = (e: React.KeyboardEvent, index?: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave(index)
      
      // If adding new and there's content, immediately show the add button again
      if (index === undefined && tempValue.trim()) {
        setTimeout(() => {
          setIsAddingNew(true)
          setTempValue('')
        }, 50)
      }
    } else if (e.key === 'Escape') {
      setEditingIndex(null)
      setIsAddingNew(false)
      setTempValue('')
    }
  }

  const handleEditStart = (index: number) => {
    setEditingIndex(index)
    setTempValue(allies[index])
    setIsAddingNew(false)
  }

  // Auto-detect ally type based on content
  const detectAllyType = (ally: string): AllyType => {
    const lower = ally.toLowerCase()
    
    // Person indicators
    if (lower.includes('friend') || lower.includes('mentor') || lower.includes('colleague') || 
        lower.includes('family') || lower.includes('partner') || lower.includes('team') ||
        lower.includes('coach') || lower.includes('therapist')) {
      return 'person'
    }
    
    // Tool indicators
    if (lower.includes('app') || lower.includes('software') || lower.includes('tool') || 
        lower.includes('system') || lower.includes('platform') || lower.includes('device')) {
      return 'tool'
    }
    
    // Knowledge indicators
    if (lower.includes('book') || lower.includes('course') || lower.includes('video') || 
        lower.includes('tutorial') || lower.includes('guide') || lower.includes('documentation') ||
        lower.includes('skill') || lower.includes('experience')) {
      return 'knowledge'
    }
    
    // Default to resource
    return 'resource'
  }

  const getTypeIcon = (type: AllyType) => {
    switch (type) {
      case 'person':
        return <User className="w-4 h-4 text-blue-500" />
      case 'tool':
        return <Wrench className="w-4 h-4 text-purple-500" />
      case 'knowledge':
        return <BookOpen className="w-4 h-4 text-green-500" />
      default:
        return <Lightbulb className="w-4 h-4 text-orange-500" />
    }
  }

  const getTypeColor = (type: AllyType) => {
    switch (type) {
      case 'person':
        return "bg-blue-50 hover:bg-blue-100"
      case 'tool':
        return "bg-purple-50 hover:bg-purple-100"
      case 'knowledge':
        return "bg-green-50 hover:bg-green-100"
      default:
        return "bg-orange-50 hover:bg-orange-100"
    }
  }

  const cycleType = (index: number) => {
    const currentType = allyTypes[index] || detectAllyType(allies[index])
    const types: AllyType[] = ['person', 'resource', 'tool', 'knowledge']
    const currentIndex = types.indexOf(currentType)
    const nextType = types[(currentIndex + 1) % types.length]
    setAllyTypes({ ...allyTypes, [index]: nextType })
  }

  const toggleViewMode = () => {
    const newMode = viewMode === 'list' ? 'compact' : 'list'
    setViewMode(newMode)
    localStorage.setItem('allies-view-mode', newMode)
  }

  const getCompactTypeColor = (type: AllyType) => {
    switch (type) {
      case 'person':
        return "bg-blue-100 hover:bg-blue-200 border-blue-300"
      case 'tool':
        return "bg-purple-100 hover:bg-purple-200 border-purple-300"
      case 'knowledge':
        return "bg-green-100 hover:bg-green-200 border-green-300"
      default:
        return "bg-orange-100 hover:bg-orange-200 border-orange-300"
    }
  }

  return (
    <div className="space-y-3">
      {/* View mode toggle */}
      {allies.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={toggleViewMode}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={viewMode === 'list' ? 'Switch to compact view' : 'Switch to list view'}
          >
            {viewMode === 'list' ? (
              <>
                <LayoutGrid className="w-4 h-4" />
                <span>Compact View</span>
              </>
            ) : (
              <>
                <List className="w-4 h-4" />
                <span>List View</span>
              </>
            )}
          </button>
        </div>
      )}
      {/* Existing ally items */}
      {viewMode === 'list' ? (
        // List View (existing implementation)
        allies.map((ally, index) => {
          const type = allyTypes[index] || detectAllyType(ally)
          
          return (
            <div key={index} className="group">
              {editingIndex === index ? (
              <div className="space-y-2">
                <Input
                  ref={inputRef}
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder="Who or what can help you?"
                  className="w-full"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => handleSave(index)}
                    disabled={!tempValue.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg transition-colors",
                getTypeColor(type)
              )}>
                <button
                  onClick={() => cycleType(index)}
                  className="flex-shrink-0"
                  title="Click to change type"
                >
                  {getTypeIcon(type)}
                </button>
                <span 
                  className="flex-1 cursor-pointer"
                  onClick={() => handleEditStart(index)}
                >
                  {ally}
                </span>
                <button
                  onClick={() => handleRemove(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                  aria-label="Remove ally"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              )}
            </div>
          )
        })
      ) : (
        // Compact View (new chip-style implementation)
        <div className="flex flex-wrap gap-2">
          {allies.map((ally, index) => {
            const type = allyTypes[index] || detectAllyType(ally)
            
            if (editingIndex === index) {
              return (
                <div key={index} className="flex-1 min-w-[200px] max-w-[300px]">
                  <Input
                    ref={inputRef}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onBlur={() => handleSave(index)}
                    placeholder="Edit ally..."
                    className="h-8 text-sm"
                  />
                </div>
              )
            }
            
            return (
              <div
                key={index}
                className={cn(
                  "group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all",
                  "cursor-pointer select-none",
                  getCompactTypeColor(type)
                )}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    cycleType(index)
                  }}
                  className="flex-shrink-0"
                  title="Click to change type"
                >
                  {getTypeIcon(type)}
                </button>
                <span 
                  className="text-sm font-medium"
                  onClick={() => handleEditStart(index)}
                >
                  {ally}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(index)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 -mr-1"
                  aria-label="Remove ally"
                >
                  <X className="w-3 h-3 text-gray-600 hover:text-gray-900" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add new ally */}
      {isAddingNew ? (
        <div className="space-y-2">
          <Input
            ref={inputRef}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e)}
            placeholder="Who or what can help you?"
            className="w-full"
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => handleSave()}
              disabled={!tempValue.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="w-full justify-start gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        >
          <Plus className="w-4 h-4" />
          Add ally or resource
        </Button>
      )}

      {/* Show hint */}
      {allies.length === 0 && !isAddingNew && (
        <p className="text-sm text-gray-500 italic">
          Identify people, tools, or resources that can support you
        </p>
      )}

      {/* Type hint */}
      {allies.length > 0 && (
        <p className="text-xs text-gray-500">
          Click the icon to change ally type: 
          <span className="inline-flex items-center gap-2 ml-1">
            <User className="w-3 h-3" /> Person
            <Lightbulb className="w-3 h-3" /> Resource
            <Wrench className="w-3 h-3" /> Tool
            <BookOpen className="w-3 h-3" /> Knowledge
          </span>
        </p>
      )}
    </div>
  )
}