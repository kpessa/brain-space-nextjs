'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useNodesStore } from '@/store/nodes'
import { createAIService } from '@/services/ai'
import type { Node, NodeType } from '@/types/node'
import { useUserPreferencesStore } from '@/store/userPreferencesStore'
import { Zap } from '@/lib/icons'

interface NodeCreateModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

export function NodeCreateModal({ isOpen, onClose, userId }: NodeCreateModalProps) {
  const [text, setText] = useState('')
  const [shouldUseAI, setShouldUseAI] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const createNode = useNodesStore(state => state.createNode)
  const loadNodes = useNodesStore(state => state.loadNodes)
  const nodes = useNodesStore(state => state.nodes)
  const { currentMode, addFrequentTag } = useUserPreferencesStore()
  const aiService = createAIService()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setLoading(true)
    setError(null)

    try {
      let nodeData: Partial<Node> = {
        title: text.substring(0, 100),
        description: text,
        type: 'thought',
        tags: ['misc'],
        urgency: 5,
        importance: 5,
        userId: userId,
      }

      if (shouldUseAI) {
        // Get all existing tags from nodes
        const existingTags = Array.from(new Set(
          nodes.flatMap(node => node.tags || [])
        ))
        
        const result = await aiService.enhanceNode(text, currentMode, existingTags)
        
        // Build enhanced node data, excluding undefined values
        nodeData = {
          ...nodeData,
          type: result.nodeData.type as NodeType,
          title: result.nodeData.title || text.substring(0, 100),
          description: result.nodeData.description || text,
          tags: result.nodeData.tags || ['misc'],
          urgency: result.nodeData.urgency || 5,
          importance: result.nodeData.importance || 5,
          isPersonal: result.nodeData.isPersonal !== undefined 
            ? result.nodeData.isPersonal 
            : currentMode === 'personal',
        }
        
        // Track used tags
        result.nodeData.tags?.forEach(tag => addFrequentTag(tag))
        
        // Only add dueDate if it exists
        if (result.nodeData.dueDate && result.nodeData.dueDate.date) {
          nodeData.dueDate = { type: 'exact', date: result.nodeData.dueDate.date }
        }
      } else {
        // When not using AI, set isPersonal based on current mode
        nodeData.isPersonal = currentMode === 'personal'
      }

      const nodeId = await createNode(nodeData)
      
      if (nodeId) {
        setText('')
        onClose()
        // Reload nodes to ensure the new node appears
        await loadNodes(userId)
      } else {
        throw new Error('Failed to create node - no ID returned')
      }
    } catch (error) {
      // Failed to create node
      setError(error instanceof Error ? error.message : 'Failed to create node')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Node">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What&apos;s on your mind?
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-brain-500 focus:border-transparent"
            placeholder="Enter a thought, idea, task, or question..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="checkbox"
            id="useAI"
            checked={shouldUseAI}
            onChange={(e) => setShouldUseAI(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="useAI" className="text-sm text-gray-700">
            Enhance with AI (categorize, extract tags, expand ideas)
          </label>
        </div>

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
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !text.trim()}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {shouldUseAI ? 'Create & Enhance' : 'Create Node'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}