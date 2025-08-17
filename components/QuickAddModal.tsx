'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useNodesStore } from '@/store/nodeStore'
import { createAIService } from '@/services/ai'
import type { Node, NodeType, Recurrence } from '@/types/node'
import dayjs from 'dayjs'
import { 
  Zap, 
  Brain,
  Keyboard,
  Send,
  Loader2,
  Target,
  Folder,
  CheckSquare,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  Search,
  MessageSquare,
  Puzzle,
  Calendar,
  Repeat,
  Sparkles
} from 'lucide-react'

interface QuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
}

// Simple cache for AI recurrence suggestions
const recurrenceCache = new Map<string, { suggestion: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const NODE_TYPE_ICONS: Record<NodeType, React.ReactNode> = {
  goal: <Target className="w-4 h-4" />,
  project: <Folder className="w-4 h-4" />,
  task: <CheckSquare className="w-4 h-4" />,
  option: <Puzzle className="w-4 h-4" />,
  idea: <Lightbulb className="w-4 h-4" />,
  question: <HelpCircle className="w-4 h-4" />,
  problem: <AlertTriangle className="w-4 h-4" />,
  insight: <Search className="w-4 h-4" />,
  thought: <MessageSquare className="w-4 h-4" />,
  concern: <AlertTriangle className="w-4 h-4" />
}

export function QuickAddModal({ isOpen, onClose, userId }: QuickAddModalProps) {
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [useAI, setUseAI] = useState(true)
  const [createCalendarEvent, setCreateCalendarEvent] = useState(false)
  const [makeRecurring, setMakeRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<Recurrence | null>(null)
  const [aiSuggestedRecurrence, setAiSuggestedRecurrence] = useState<any>(null)
  const [isCheckingRecurrence, setIsCheckingRecurrence] = useState(false)
  const [autoDetectRecurrence, setAutoDetectRecurrence] = useState(() => {
    // Load preference from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('autoDetectRecurrence') !== 'false'
    }
    return true
  })
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  const { createNode } = useNodesStore()
  const aiService = createAIService()

  // Check for recurrence pattern when input changes
  useEffect(() => {
    const checkRecurrence = async () => {
      if (!autoDetectRecurrence || !input.trim() || input.length < 10) {
        setAiSuggestedRecurrence(null)
        return
      }

      // Check cache first
      const cacheKey = input.trim().toLowerCase()
      const cached = recurrenceCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setAiSuggestedRecurrence(cached.suggestion)
        if (cached.suggestion.shouldRecur && cached.suggestion.confidence > 0.7) {
          setMakeRecurring(true)
          setRecurrencePattern(cached.suggestion.pattern)
        }
        return
      }

      setIsCheckingRecurrence(true)
      try {
        const response = await fetch('/api/ai/suggest-recurrence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input })
        })

        if (response.ok) {
          const suggestion = await response.json()
          setAiSuggestedRecurrence(suggestion)
          
          // Cache the result
          recurrenceCache.set(cacheKey, { suggestion, timestamp: Date.now() })
          
          // Auto-enable recurring if AI is confident
          if (suggestion.shouldRecur && suggestion.confidence > 0.7) {
            setMakeRecurring(true)
            setRecurrencePattern(suggestion.pattern)
          }
        }
      } catch (error) {
        // Failed to check recurrence
      } finally {
        setIsCheckingRecurrence(false)
      }
    }

    const timer = setTimeout(checkRecurrence, 1000) // Increased debounce to 1s
    return () => clearTimeout(timer)
  }, [input, autoDetectRecurrence])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInput('')
      setPreview(null)
      setError(null)
      setCreateCalendarEvent(false)
      setMakeRecurring(false)
      setRecurrencePattern(null)
      setAiSuggestedRecurrence(null)
      setIsCheckingRecurrence(false)
    }
  }, [isOpen])

  const handleAutoDetectToggle = (checked: boolean) => {
    setAutoDetectRecurrence(checked)
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoDetectRecurrence', checked.toString())
    }
  }

  const handleCheckRecurrence = async () => {
    if (!input.trim() || input.length < 10 || isCheckingRecurrence) return

    // Check cache first
    const cacheKey = input.trim().toLowerCase()
    const cached = recurrenceCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setAiSuggestedRecurrence(cached.suggestion)
      if (cached.suggestion.shouldRecur && cached.suggestion.confidence > 0.7) {
        setMakeRecurring(true)
        setRecurrencePattern(cached.suggestion.pattern)
      }
      return
    }

    setIsCheckingRecurrence(true)
    try {
      const response = await fetch('/api/ai/suggest-recurrence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input })
      })

      if (response.ok) {
        const suggestion = await response.json()
        setAiSuggestedRecurrence(suggestion)
        
        // Cache the result
        recurrenceCache.set(cacheKey, { suggestion, timestamp: Date.now() })
        
        // Auto-enable recurring if AI is confident
        if (suggestion.shouldRecur && suggestion.confidence > 0.7) {
          setMakeRecurring(true)
          setRecurrencePattern(suggestion.pattern)
        }
      }
    } catch (error) {
      // Failed to check recurrence
    } finally {
      setIsCheckingRecurrence(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || !userId || isProcessing) return

    setIsProcessing(true)
    setError(null)

    try {
      let nodeData: Partial<Node> = {
        title: input.substring(0, 100),
        description: input,
        type: 'thought',
        tags: ['quick-add'],
        urgency: 5,
        importance: 5,
        userId: userId || 'anonymous',
      }

      if (useAI) {
        const result = await aiService.enhanceNode(input)
        
        // Build enhanced node data, excluding undefined values
        nodeData = {
          ...nodeData,
          type: result.nodeData.type as NodeType,
          title: result.nodeData.title || input.substring(0, 100),
          description: result.nodeData.description || input,
          tags: result.nodeData.tags || ['quick-add'],
          urgency: result.nodeData.urgency || 5,
          importance: result.nodeData.importance || 5,
        }
        
        // Only add dueDate if it exists
        if (result.nodeData.dueDate && result.nodeData.dueDate.date) {
          nodeData.dueDate = { type: 'exact', date: result.nodeData.dueDate.date }
        }
        
        // Add recurrence if enabled
        if (makeRecurring && recurrencePattern) {
          nodeData.recurrence = recurrencePattern
          nodeData.taskType = 'recurring'
        }
        
        setPreview(result.nodeData)
      }

      if (!preview) {
        // Direct submission
        // Add recurrence if enabled (for non-AI path)
        if (makeRecurring && recurrencePattern) {
          nodeData.recurrence = recurrencePattern
          nodeData.taskType = 'recurring'
        }
        
        const newNode = await createNode(nodeData)
        
        // Handle calendar event creation if requested
        if (createCalendarEvent && newNode) {
          window.dispatchEvent(new CustomEvent('createCalendarEventForNode', { 
            detail: { nodeId: newNode.id, node: newNode }
          }))
        }
        
        onClose()
      } else {
        // Show preview
        setPreview(nodeData)
      }
    } catch (error) {
      // Failed to process input
      setError(error instanceof Error ? error.message : 'Failed to process input')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmPreview = async () => {
    if (!preview || !userId) return

    try {
      const nodeData = {
        ...preview,
        userId: userId || 'anonymous',
      }
      
      // Add recurrence if enabled
      if (makeRecurring && recurrencePattern) {
        nodeData.recurrence = recurrencePattern
        nodeData.taskType = 'recurring'
      }
      
      const newNode = await createNode(nodeData)
      
      // Handle calendar event creation if requested
      if (createCalendarEvent && newNode) {
        // Store a flag to handle calendar creation after modal closes
        // This will be handled by the parent component or a separate service
        window.dispatchEvent(new CustomEvent('createCalendarEventForNode', { 
          detail: { nodeId: newNode.id, node: newNode }
        }))
      }
      
      onClose()
    } catch (error) {
      // Failed to create node
      setError(error instanceof Error ? error.message : 'Failed to create node')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Add">
      <div className="space-y-4">
        {!preview ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What&apos;s on your mind?
              </label>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a thought, idea, task, or question..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                disabled={isProcessing}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="quickAddUseAI"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                    className="rounded"
                    disabled={isProcessing}
                  />
                  <label htmlFor="quickAddUseAI" className="text-sm text-gray-700 flex items-center gap-1">
                    <Brain className="w-4 h-4" />
                    AI Enhancement
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="quickAddCalendarEvent"
                    checked={createCalendarEvent}
                    onChange={(e) => setCreateCalendarEvent(e.target.checked)}
                    className="rounded"
                    disabled={isProcessing}
                  />
                  <label htmlFor="quickAddCalendarEvent" className="text-sm text-gray-700 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Create Event
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="quickAddRecurring"
                    checked={makeRecurring}
                    onChange={(e) => setMakeRecurring(e.target.checked)}
                    className="rounded"
                    disabled={isProcessing}
                  />
                  <label htmlFor="quickAddRecurring" className="text-sm text-gray-700 flex items-center gap-1">
                    <Repeat className="w-4 h-4" />
                    Recurring Task
                    {isCheckingRecurrence && autoDetectRecurrence && (
                      <Loader2 className="w-3 h-3 animate-spin ml-1" />
                    )}
                  </label>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Keyboard className="w-3 h-3" />
                Press ⌘+Enter to submit
              </div>
            </div>

            {/* Recurrence Detection Settings */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoDetectRecurrence"
                    checked={autoDetectRecurrence}
                    onChange={(e) => handleAutoDetectToggle(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="autoDetectRecurrence" className="text-sm text-gray-700 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    Auto-detect recurrence patterns
                  </label>
                </div>
                {!autoDetectRecurrence && input.trim().length >= 10 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCheckRecurrence}
                    disabled={isCheckingRecurrence}
                    className="text-xs"
                  >
                    {isCheckingRecurrence ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Repeat className="w-3 h-3 mr-1" />
                        Check recurrence
                      </>
                    )}
                  </Button>
                )}
              </div>
              {autoDetectRecurrence && (
                <p className="text-xs text-gray-500">AI will automatically suggest recurrence patterns as you type</p>
              )}
            </div>

            {/* AI Recurrence Suggestion */}
            {aiSuggestedRecurrence && aiSuggestedRecurrence.shouldRecur && !makeRecurring && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-purple-800">
                    AI detected this might be a recurring task: <strong>{aiSuggestedRecurrence.reasoning}</strong>
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMakeRecurring(true)
                      setRecurrencePattern(aiSuggestedRecurrence.pattern)
                    }}
                    className="mt-2"
                  >
                    Make it recurring
                  </Button>
                </div>
              </div>
            )}

            {/* Recurrence Configuration */}
            {makeRecurring && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Recurrence Pattern</h4>
                  {aiSuggestedRecurrence && (
                    <span className="text-xs text-purple-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI suggested
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {(['daily', 'weekly', 'monthly', 'custom'] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setRecurrencePattern({ 
                        ...recurrencePattern,
                        frequency: freq 
                      } as Recurrence)}
                      className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
                        recurrencePattern?.frequency === freq
                          ? 'bg-brain-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>

                {recurrencePattern?.frequency === 'weekly' && (
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Days of Week</label>
                    <div className="grid grid-cols-7 gap-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                            const currentDays = recurrencePattern.daysOfWeek || []
                            const dayName = days[idx]
                            setRecurrencePattern({
                              ...recurrencePattern,
                              daysOfWeek: currentDays.includes(dayName as any)
                                ? currentDays.filter(d => d !== dayName)
                                : [...currentDays, dayName as any]
                            })
                          }}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            recurrencePattern.daysOfWeek?.includes(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][idx] as any)
                              ? 'bg-brain-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleSubmit()}
                disabled={isProcessing || !input.trim()}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {useAI ? <Zap className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    {useAI ? 'Add with AI' : 'Add Node'}
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          // Preview mode
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {NODE_TYPE_ICONS[preview.type as NodeType] || <Brain className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{preview.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{preview.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brain-100 text-brain-800">
                      {preview.type}
                    </span>
                    {preview.tags?.map((tag: string, index: number) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  {(preview.urgency || preview.importance) && (
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      {preview.urgency && <span>Urgency: {preview.urgency}/10</span>}
                      {preview.importance && <span>Importance: {preview.importance}/10</span>}
                    </div>
                  )}
                  
                  {preview.dueDate && (
                    <div className="mt-2 text-xs text-gray-500">
                      Due: {dayjs(preview.dueDate.date).format('MMM D, YYYY')}
                    </div>
                  )}
                  
                  {(makeRecurring && recurrencePattern) && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
                      <Repeat className="w-3 h-3" />
                      <span>
                        Recurring {recurrencePattern.frequency}
                        {recurrencePattern.frequency === 'weekly' && recurrencePattern.daysOfWeek?.length ? 
                          ` on ${recurrencePattern.daysOfWeek.join(', ')}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {createCalendarEvent && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  A Google Calendar event will be created for this node
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreview(null)}
                className="flex-1"
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmPreview}
                className="flex-1"
              >
                Confirm & Create
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}