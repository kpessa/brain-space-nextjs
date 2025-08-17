'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Card, CardContent } from '@/components/ui/Card'
import { useNodesStore } from '@/store/nodeStore'
import { createAIService } from '@/services/ai'
import type { NodeType } from '@/types/node'
import { Zap, Plus, GitBranch, Info, ChevronRight, X } from '@/lib/icons'
import { cn } from '@/lib/utils'

interface BulkNodeCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  trigger?: React.ReactNode
}

interface ParsedNode {
  text: string
  level: number
  children: ParsedNode[]
}

export function BulkNodeCreationDialog({ 
  isOpen, 
  onClose, 
  userId,
  trigger
}: BulkNodeCreationDialogProps) {
  const [text, setText] = useState('')
  const [shouldUseAI, setShouldUseAI] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedNodes, setParsedNodes] = useState<ParsedNode[]>([])
  const [showPreview, setShowPreview] = useState(false)
  
  const { createNode, updateNode, loadNodes } = useNodesStore()
  const aiService = createAIService()

  const parseTextToHierarchy = (inputText: string): ParsedNode[] => {
    const lines = inputText.split('\n').filter(line => line.trim())
    const nodes: ParsedNode[] = []
    const stack: { node: ParsedNode; level: number }[] = []
    
    lines.forEach(line => {
      // Determine indentation level (2 spaces = 1 level, or tab = 1 level)
      const indentMatch = line.match(/^(\s*)/);
      const indentLength = indentMatch ? indentMatch[1].length : 0;
      const level = Math.floor(indentLength / 2); // Assuming 2 spaces per level
      
      // Remove bullets, numbers, and whitespace
      const cleanText = line.trim().replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '')
      
      const node: ParsedNode = {
        text: cleanText,
        level,
        children: []
      }
      
      // Find parent based on level
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop()
      }
      
      if (stack.length === 0) {
        // Root level node
        nodes.push(node)
      } else {
        // Child node
        stack[stack.length - 1].node.children.push(node)
      }
      
      stack.push({ node, level })
    })
    
    return nodes
  }

  const handlePreview = () => {
    if (!text.trim()) return
    
    const parsed = parseTextToHierarchy(text)
    setParsedNodes(parsed)
    setShowPreview(true)
  }

  const createNodesRecursively = async (
    nodes: ParsedNode[], 
    parentId?: string
  ): Promise<number> => {
    let count = 0
    
    for (const node of nodes) {
      let nodeData: any = {
        userId,
        title: node.text.substring(0, 100),
        description: node.text,
        type: node.children.length > 0 ? 'project' : 'task',
        tags: ['bulk-created'],
        urgency: 5,
        importance: 5,
      }
      
      if (parentId) {
        nodeData.parent = parentId
      }
      
      // Enhance with AI if enabled
      if (shouldUseAI) {
        try {
          const enhanced = await aiService.enhanceNode(node.text)
          nodeData = {
            ...nodeData,
            ...enhanced.nodeData,
            title: enhanced.nodeData.title || nodeData.title,
            description: enhanced.nodeData.description || nodeData.description,
          }
        } catch (err) {
          console.warn('AI enhancement failed, using default values', err)
        }
      }
      
      const createdId = await createNode(nodeData)
      
      if (createdId) {
        count++
        
        // Create children
        if (node.children.length > 0) {
          const childCount = await createNodesRecursively(node.children, createdId)
          count += childCount
          
          // Update parent with children IDs
          const childIds = node.children.map((_, idx) => `${createdId}-child-${idx}`)
          await updateNode(createdId, {
            children: childIds
          })
        }
      }
    }
    
    return count
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setLoading(true)
    setError(null)

    try {
      const parsed = parseTextToHierarchy(text)
      const count = await createNodesRecursively(parsed)
      
      setText('')
      setShowPreview(false)
      setParsedNodes([])
      onClose()
      
      // Reload nodes to ensure the new relationships appear
      await loadNodes(userId)
      
      alert(`Successfully created ${count} nodes with hierarchy!`)
    } catch (error) {
      console.error('Failed to create nodes:', error)
      setError(error instanceof Error ? error.message : 'Failed to create nodes')
    } finally {
      setLoading(false)
    }
  }

  const renderNodePreview = (nodes: ParsedNode[], depth = 0) => {
    return nodes.map((node, idx) => (
      <div key={`${depth}-${idx}`} className={cn("ml-" + (depth * 4))}>
        <div className="flex items-center gap-2 py-1">
          {depth > 0 && <ChevronRight className="w-3 h-3 text-gray-400" />}
          <span className={cn(
            "text-sm",
            node.children.length > 0 ? "font-medium text-gray-900" : "text-gray-700"
          )}>
            {node.text}
          </span>
          {node.children.length > 0 && (
            <span className="text-xs text-gray-500">
              ({node.children.length} subtasks)
            </span>
          )}
        </div>
        {node.children.length > 0 && renderNodePreview(node.children, depth + 1)}
      </div>
    ))
  }

  return (
    <>
      {trigger && (
        <div onClick={() => setIsOpen(true)}>
          {trigger}
        </div>
      )}
      
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Bulk Create Nodes with Hierarchy"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Create multiple nodes at once with parent-child relationships:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Use indentation (2 spaces or tab) to create child nodes</li>
                  <li>Bullets (-, *, •) and numbers are automatically removed</li>
                  <li>Each line becomes a separate node</li>
                  <li>Example format:</li>
                </ul>
                <pre className="mt-2 p-2 bg-white rounded text-xs">
{`Prepare for work trip
  Pack clothes
  Arrange childcare
  Prepare electronics`}
                </pre>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your tasks (use indentation for subtasks):
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-brain-500 focus:border-transparent font-mono text-sm"
              placeholder={`Project: Website Redesign
  Research competitors
  Create wireframes
  Design mockups
    Homepage design
    Product page design
  Implement frontend
  Test and deploy`}
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
              Enhance with AI (categorize, extract tags, set priorities)
            </label>
          </div>

          {showPreview && parsedNodes.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">Preview Structure</h4>
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {renderNodePreview(parsedNodes)}
                </div>
              </CardContent>
            </Card>
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
              onClick={handlePreview}
              disabled={!text.trim() || loading}
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Preview Structure
            </Button>
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
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Nodes
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}