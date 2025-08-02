'use client'

import { useState, useRef, useEffect } from 'react'
import { Edit3, Eye, EyeOff, Scroll, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'

interface NotesSectionProps {
  notes: string
  onChange: (notes: string) => void
}

export function NotesSection({ notes, onChange }: NotesSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [tempNotes, setTempNotes] = useState(notes)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Set cursor to end of text
      const length = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(length, length)
    }
  }, [isEditing])

  const handleSave = () => {
    const trimmed = tempNotes.trim()
    onChange(trimmed)
    setIsEditing(false)
    if (!trimmed) {
      setIsExpanded(false)
    }
  }

  const handleCancel = () => {
    setTempNotes(notes)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    }
    // Allow Enter for new lines in textarea
  }

  const wordCount = notes.split(/\s+/).filter(word => word.length > 0).length
  const charCount = notes.length

  // Determine if we should show preview or full text
  const previewLength = 150
  const showPreview = notes.length > previewLength && !isExpanded

  return (
    <div className="space-y-3">
      {!notes && !isEditing ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsEditing(true)
            setTempNotes('')
          }}
          className="w-full justify-start gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        >
          <Scroll className="w-4 h-4" />
          Add adventure notes
        </Button>
      ) : isEditing ? (
        <div className="space-y-3">
          <Textarea
            ref={textareaRef}
            value={tempNotes}
            onChange={(e) => setTempNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Any other thoughts, reflections, or observations from your journey..."
            className="min-h-[150px]"
          />
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {tempNotes.length > 0 && (
                <>
                  {tempNotes.split(/\s+/).filter(word => word.length > 0).length} words, {tempNotes.length} characters
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className={cn(
            "relative p-4 rounded-lg transition-colors cursor-pointer group",
            "bg-purple-50 hover:bg-purple-100"
          )}
          onClick={() => {
            setIsEditing(true)
            setTempNotes(notes)
          }}
        >
          <div className="flex items-start gap-3">
            <Scroll className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-purple-900 mb-2">Adventure Notes</p>
              <div className="text-purple-800 whitespace-pre-wrap break-words">
                {showPreview ? (
                  <>
                    {notes.substring(0, previewLength).trim()}...
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsExpanded(true)
                      }}
                      className="ml-2 text-purple-600 hover:text-purple-700 text-sm font-medium inline-flex items-center gap-1"
                    >
                      <span>Read more</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  notes
                )}
              </div>
              {isExpanded && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(false)
                  }}
                  className="mt-2 text-purple-600 hover:text-purple-700 text-sm font-medium inline-flex items-center gap-1"
                >
                  <span>Show less</span>
                  <ChevronUp className="w-3 h-3" />
                </button>
              )}
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-purple-600">
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}, {charCount} {charCount === 1 ? 'character' : 'characters'}
                </p>
                <Edit3 className="w-4 h-4 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievement hint */}
      {notes.length >= 100 && !isEditing && (
        <p className="text-xs text-purple-600 font-medium">
          ✨ Substantial notes bonus: +{10} XP
        </p>
      )}
    </div>
  )
}