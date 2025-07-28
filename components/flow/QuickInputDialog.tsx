'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { BrainDumpNode } from '@/store/braindumpStore'

interface QuickInputDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (nodes: Partial<BrainDumpNode>[]) => void
  position?: { x: number; y: number }
}

const categoryKeywords = {
  tasks: ['todo', 'task', 'do', 'complete', 'finish', 'need to', 'have to', 'must'],
  ideas: ['idea', 'maybe', 'what if', 'could', 'should', 'thought', 'consider'],
  questions: ['?', 'how', 'what', 'when', 'where', 'why', 'who', 'which'],
  problems: ['problem', 'issue', 'bug', 'broken', 'error', 'wrong', 'fix', 'solve'],
  insights: ['realize', 'understand', 'insight', 'aha', 'discover', 'learn'],
}

function categorizeThought(text: string): string {
  const lowerText = text.toLowerCase()
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category
    }
  }
  
  return 'misc'
}

export function QuickInputDialog({ isOpen, onClose, onSubmit, position }: QuickInputDialogProps) {
  const [input, setInput] = useState('')
  const [thoughts, setThoughts] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = () => {
    const allThoughts = [...thoughts]
    
    // Add current input if not empty
    if (input.trim()) {
      allThoughts.push(input.trim())
    }
    
    if (allThoughts.length === 0) return
    
    // Convert thoughts to nodes
    const nodes: Partial<BrainDumpNode>[] = allThoughts.map((thought, index) => ({
      data: {
        label: thought,
        category: categorizeThought(thought),
        nodeType: 'thought',
      },
      position: position ? {
        x: position.x + (index % 3) * 200,
        y: position.y + Math.floor(index / 3) * 100,
      } : undefined,
    }))
    
    onSubmit(nodes)
    setInput('')
    setThoughts([])
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter adds current thought to list
        e.preventDefault()
        if (input.trim()) {
          setThoughts([...thoughts, input.trim()])
          setInput('')
        }
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+Enter submits all
        e.preventDefault()
        handleSubmit()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text')
    
    // Check if pasted text has multiple lines
    const lines = pastedText.split('\n').map(line => line.trim()).filter(line => line)
    
    if (lines.length > 1) {
      e.preventDefault()
      setThoughts([...thoughts, ...lines])
      setInput('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-lg">Quick Brain Dump</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type your thoughts... (Shift+Enter for new thought, Ctrl+Enter to submit all)"
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          
          {/* Thought preview */}
          {thoughts.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Thoughts to add ({thoughts.length}):</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {thoughts.map((thought, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <span className="flex-1 truncate">{thought}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {categorizeThought(thought)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Tips */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Paste multiple lines to add them as separate thoughts</p>
            <p>• Categories are auto-detected from keywords</p>
            <p>• Shift+Enter: Add thought to list | Ctrl+Enter: Submit all</p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={thoughts.length === 0 && !input.trim()}
          >
            Add {thoughts.length + (input.trim() ? 1 : 0)} Thought{thoughts.length + (input.trim() ? 1 : 0) !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}