'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Sword, Target, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'

interface QuestSectionProps {
  dailyQuest: string
  subQuests?: string[]
  onQuestChange: (quest: string) => void
  onSubQuestsChange?: (subQuests: string[]) => void
}

export function QuestSection({ 
  dailyQuest, 
  subQuests = [], 
  onQuestChange, 
  onSubQuestsChange 
}: QuestSectionProps) {
  const [isEditingMain, setIsEditingMain] = useState(false)
  const [tempMainQuest, setTempMainQuest] = useState(dailyQuest)
  const [editingSubIndex, setEditingSubIndex] = useState<number | null>(null)
  const [isAddingSubQuest, setIsAddingSubQuest] = useState(false)
  const [tempSubQuest, setTempSubQuest] = useState('')
  const [completedSubQuests, setCompletedSubQuests] = useState<Set<number>>(new Set())
  
  const mainInputRef = useRef<HTMLTextAreaElement>(null)
  const subInputRef = useRef<HTMLInputElement>(null)

  // Focus inputs when editing starts
  useEffect(() => {
    if (isEditingMain && mainInputRef.current) {
      mainInputRef.current.focus()
      mainInputRef.current.select()
    }
  }, [isEditingMain])

  useEffect(() => {
    if ((editingSubIndex !== null || isAddingSubQuest) && subInputRef.current) {
      subInputRef.current.focus()
    }
  }, [editingSubIndex, isAddingSubQuest])

  const handleMainQuestSave = () => {
    const trimmed = tempMainQuest.trim()
    if (trimmed) {
      onQuestChange(trimmed)
    }
    setIsEditingMain(false)
  }

  const handleMainQuestCancel = () => {
    setTempMainQuest(dailyQuest)
    setIsEditingMain(false)
  }

  const handleMainQuestKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleMainQuestSave()
    } else if (e.key === 'Escape') {
      setTempMainQuest(dailyQuest)
      setIsEditingMain(false)
    }
  }

  const handleSubQuestSave = (index?: number) => {
    const trimmedValue = tempSubQuest.trim()
    if (!trimmedValue || !onSubQuestsChange) return

    if (index !== undefined) {
      // Editing existing sub-quest
      const newSubQuests = [...subQuests]
      newSubQuests[index] = trimmedValue
      onSubQuestsChange(newSubQuests)
      setEditingSubIndex(null)
    } else {
      // Adding new sub-quest
      onSubQuestsChange([...subQuests, trimmedValue])
      setIsAddingSubQuest(false)
    }
    setTempSubQuest('')
  }

  const handleSubQuestCancel = () => {
    setEditingSubIndex(null)
    setIsAddingSubQuest(false)
    setTempSubQuest('')
  }

  const handleSubQuestRemove = (index: number) => {
    if (!onSubQuestsChange) return
    const newSubQuests = subQuests.filter((_, i) => i !== index)
    onSubQuestsChange(newSubQuests)
    
    // Update completed set
    const newCompleted = new Set<number>()
    completedSubQuests.forEach(i => {
      if (i < index) newCompleted.add(i)
      else if (i > index) newCompleted.add(i - 1)
    })
    setCompletedSubQuests(newCompleted)
  }

  const toggleSubQuestComplete = (index: number) => {
    const newCompleted = new Set(completedSubQuests)
    if (newCompleted.has(index)) {
      newCompleted.delete(index)
    } else {
      newCompleted.add(index)
    }
    setCompletedSubQuests(newCompleted)
  }

  const handleSubQuestKeyDown = (e: React.KeyboardEvent, index?: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubQuestSave(index)
      
      // If adding new and there's content, immediately show the add button again
      if (index === undefined && tempSubQuest.trim()) {
        setTimeout(() => {
          setIsAddingSubQuest(true)
          setTempSubQuest('')
        }, 50)
      }
    } else if (e.key === 'Escape') {
      setEditingSubIndex(null)
      setIsAddingSubQuest(false)
      setTempSubQuest('')
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Quest */}
      <div>
        {!dailyQuest && !isEditingMain ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsEditingMain(true)
              setTempMainQuest('')
            }}
            className="w-full justify-start gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            <Sword className="w-4 h-4" />
            Define your main quest
          </Button>
        ) : isEditingMain ? (
          <div className="space-y-2">
            <Textarea
              ref={mainInputRef}
              value={tempMainQuest}
              onChange={(e) => setTempMainQuest(e.target.value)}
              onKeyDown={handleMainQuestKeyDown}
              placeholder="What's your main objective for today?"
              className="min-h-[80px]"
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleMainQuestCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={handleMainQuestSave}
                disabled={!tempMainQuest.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => {
              setIsEditingMain(true)
              setTempMainQuest(dailyQuest)
            }}
          >
            <div className="flex items-start gap-3">
              <Sword className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">Main Quest</p>
                <p className="text-blue-800 mt-1">{dailyQuest}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sub-quests (only show if main quest is defined and handler is provided) */}
      {dailyQuest && onSubQuestsChange && (
        <div className="ml-8 space-y-2">
          <p className="text-sm font-medium text-gray-600 mb-2">Sub-quests</p>
          
          {/* Existing sub-quests */}
          {subQuests.map((subQuest, index) => {
            const isCompleted = completedSubQuests.has(index)
            
            return (
              <div key={index} className="group">
                {editingSubIndex === index ? (
                  <div className="space-y-2">
                    <Input
                      ref={subInputRef}
                      value={tempSubQuest}
                      onChange={(e) => setTempSubQuest(e.target.value)}
                      onKeyDown={(e) => handleSubQuestKeyDown(e, index)}
                      placeholder="Sub-quest objective"
                      className="w-full"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleSubQuestCancel}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => handleSubQuestSave(index)}
                        disabled={!tempSubQuest.trim()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-lg transition-colors",
                    isCompleted 
                      ? "bg-green-50 hover:bg-green-100" 
                      : "bg-gray-50 hover:bg-gray-100"
                  )}>
                    <button
                      onClick={() => toggleSubQuestComplete(index)}
                      className="flex-shrink-0"
                      title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
                    >
                      {isCompleted ? (
                        <Target className="w-4 h-4 text-green-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <span 
                      className={cn(
                        "flex-1 cursor-pointer text-sm",
                        isCompleted && "line-through text-gray-500"
                      )}
                      onClick={() => {
                        if (!isCompleted) {
                          setEditingSubIndex(index)
                          setTempSubQuest(subQuest)
                        }
                      }}
                    >
                      {subQuest}
                    </span>
                    <button
                      onClick={() => handleSubQuestRemove(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                      aria-label="Remove sub-quest"
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add new sub-quest */}
          {isAddingSubQuest ? (
            <div className="space-y-2">
              <Input
                ref={subInputRef}
                value={tempSubQuest}
                onChange={(e) => setTempSubQuest(e.target.value)}
                onKeyDown={(e) => handleSubQuestKeyDown(e)}
                placeholder="Sub-quest objective"
                className="w-full"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSubQuestCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => handleSubQuestSave()}
                  disabled={!tempSubQuest.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingSubQuest(true)
                setTempSubQuest('')
              }}
              className="w-full justify-start gap-2 text-gray-500 hover:text-gray-700"
            >
              <Plus className="w-3 h-3" />
              Add sub-quest
            </Button>
          )}
        </div>
      )}
    </div>
  )
}