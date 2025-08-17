'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Heart } from '@/lib/icons'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface GratitudeSectionProps {
  gratitude: string[]
  onChange: (gratitude: string[]) => void
}

export function GratitudeSection({ gratitude, onChange }: GratitudeSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [tempValue, setTempValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
      const newGratitude = [...gratitude]
      newGratitude[index] = trimmedValue
      onChange(newGratitude)
      setEditingIndex(null)
    } else {
      // Adding new item
      onChange([...gratitude, trimmedValue])
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
    const newGratitude = gratitude.filter((_, i) => i !== index)
    onChange(newGratitude)
  }

  const handleKeyDown = (e: React.KeyboardEvent, index?: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave(index)
      
      // If adding new and there's content, immediately show the add button again
      if (index === undefined && tempValue.trim()) {
        // Small delay to ensure state updates properly
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
    setTempValue(gratitude[index])
    setIsAddingNew(false)
  }

  return (
    <div className="space-y-3">
      {/* Existing gratitude items */}
      {gratitude.map((item, index) => (
        <div key={index} className="group">
          {editingIndex === index ? (
            <div className="space-y-2">
              <Input
                ref={inputRef}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder="What are you grateful for?"
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
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Heart className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span 
                className="flex-1 cursor-pointer"
                onClick={() => handleEditStart(index)}
              >
                {item}
              </span>
              <button
                onClick={() => handleRemove(index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                aria-label="Remove gratitude item"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add new gratitude */}
      {isAddingNew ? (
        <div className="space-y-2">
          <Input
            ref={inputRef}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e)}
            placeholder="What are you grateful for?"
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
          Add gratitude
        </Button>
      )}

      {/* Show at least one item hint */}
      {gratitude.length === 0 && !isAddingNew && (
        <p className="text-sm text-gray-500 italic">
          Start by adding something you're grateful for today
        </p>
      )}
    </div>
  )
}