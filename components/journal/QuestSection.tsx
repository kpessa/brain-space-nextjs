'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Sword } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface QuestSectionProps {
  quests: string[]
  onChange: (quests: string[]) => void
}

export function QuestSection({ quests, onChange }: QuestSectionProps) {
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
      const newQuests = [...quests]
      newQuests[index] = trimmedValue
      onChange(newQuests)
      setEditingIndex(null)
    } else {
      // Adding new item
      onChange([...quests, trimmedValue])
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
    const newQuests = quests.filter((_, i) => i !== index)
    onChange(newQuests)
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
      handleCancel()
    }
  }

  const handleEditStart = (index: number) => {
    setEditingIndex(index)
    setTempValue(quests[index])
    setIsAddingNew(false)
  }

  return (
    <div className="space-y-3">
      {/* Existing quest items */}
      {quests.map((quest, index) => (
        <div key={index} className="group">
          {editingIndex === index ? (
            <div className="space-y-2">
              <Input
                ref={inputRef}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder="What's your quest?"
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
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Sword className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span 
                className="flex-1 cursor-pointer"
                onClick={() => handleEditStart(index)}
              >
                {quest}
              </span>
              <button
                onClick={() => handleRemove(index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-200 rounded"
                aria-label="Remove quest"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add new quest */}
      {isAddingNew ? (
        <div className="space-y-2">
          <Input
            ref={inputRef}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e)}
            placeholder="What's your quest?"
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
          Add quest
        </Button>
      )}

      {/* Show at least one item hint */}
      {quests.length === 0 && !isAddingNew && (
        <p className="text-sm text-gray-500 italic">
          Define your quests for today
        </p>
      )}
    </div>
  )
}