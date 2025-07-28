'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useNodesStore } from '@/store/nodeStore'
import { createAIService } from '@/services/ai'
import type { Node, NodeType } from '@/types/node'
import { Zap, GitBranch, GitMerge } from 'lucide-react'

interface NodeRelationshipModalProps {
  isOpen: boolean
  onClose: () => void
  sourceNode: Node
  relationshipType: 'child' | 'parent'
}

export function NodeRelationshipModal({ 
  isOpen, 
  onClose, 
  sourceNode, 
  relationshipType 
}: NodeRelationshipModalProps) {
  const [text, setText] = useState('')
  const [shouldUseAI, setShouldUseAI] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { createChildNode, createParentNode, loadNodes } = useNodesStore()
  const aiService = createAIService()

  const getInitialText = () => {
    if (relationshipType === 'child') {
      return `Sub-task or detail of "${sourceNode.title || 'the parent node'}":\n\n`
    } else {
      return `Parent goal or category for "${sourceNode.title || 'the child node'}":\n\n`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setLoading(true)
    setError(null)

    try {
      let nodeData: Partial<Node> = {
        title: text.substring(0, 100),
        description: text,
        type: relationshipType === 'child' ? 'task' : 'goal',
        tags: sourceNode.tags || ['misc'],
        urgency: sourceNode.urgency || 5,
        importance: sourceNode.importance || 5,
      }

      // Add context about the relationship
      const contextText = relationshipType === 'child' 
        ? `Create a sub-node/child of "${sourceNode.title}". ${text}`
        : `Create a parent/category node for "${sourceNode.title}". ${text}`

      if (shouldUseAI) {
        const result = await aiService.enhanceNode(contextText)
        
        nodeData = {
          ...nodeData,
          type: result.nodeData.type as NodeType,
          title: result.nodeData.title || text.substring(0, 100),
          description: result.nodeData.description || text,
          tags: result.nodeData.tags || sourceNode.tags || ['misc'],
          urgency: result.nodeData.urgency || sourceNode.urgency || 5,
          importance: result.nodeData.importance || sourceNode.importance || 5,
        }
        
        if (result.nodeData.dueDate && result.nodeData.dueDate.date) {
          nodeData.dueDate = { type: 'exact', date: result.nodeData.dueDate.date }
        }
      }

      
      let nodeId: string | null = null
      if (relationshipType === 'child') {
        nodeId = await createChildNode(sourceNode.id, nodeData)
      } else {
        nodeId = await createParentNode(sourceNode.id, nodeData)
      }
      
      
      if (nodeId) {
        setText('')
        onClose()
        // Reload nodes to ensure the new relationships appear
        await loadNodes(sourceNode.userId)
      } else {
        throw new Error(`Failed to create ${relationshipType} node`)
      }
    } catch (error) {
      console.error(`Failed to create ${relationshipType} node:`, error)
      setError(error instanceof Error ? error.message : `Failed to create ${relationshipType} node`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Create ${relationshipType === 'child' ? 'Child' : 'Parent'} Node`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source node info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">
            {relationshipType === 'child' ? 'Creating child of:' : 'Creating parent for:'}
          </div>
          <div className="font-medium text-gray-900 flex items-center gap-2">
            {relationshipType === 'child' ? (
              <GitMerge className="w-4 h-4 text-purple-600" />
            ) : (
              <GitBranch className="w-4 h-4 text-blue-600" />
            )}
            {sourceNode.title || 'Untitled Node'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {relationshipType === 'child' 
              ? 'What sub-task, detail, or component belongs under this node?'
              : 'What parent goal, project, or category does this node belong to?'
            }
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-brain-500 focus:border-transparent"
            placeholder={getInitialText()}
            autoFocus
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
                Create {relationshipType === 'child' ? 'Child' : 'Parent'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}