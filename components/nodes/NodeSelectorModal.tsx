'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useNodesStore } from '@/store/nodeStore'
import type { Node } from '@/types/node'
import { getNodeTypeIcon } from '@/types/node'
import { Search, CheckCircle, Circle } from 'lucide-react'

interface NodeSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectNode: (node: Node) => void
  userId: string
  excludeTaskTypes?: string[]
}

export function NodeSelectorModal({ 
  isOpen, 
  onClose, 
  onSelectNode, 
  userId,
  excludeTaskTypes = ['recurring', 'habit']
}: NodeSelectorModalProps) {
  const { nodes, loadNodes } = useNodesStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  useEffect(() => {
    if (isOpen && userId) {
      loadNodes(userId)
    }
  }, [isOpen, userId, loadNodes])

  // Filter nodes that are not recurring
  const availableNodes = nodes.filter(node => {
    const taskType = (node as any).taskType || 'one-time'
    return !excludeTaskTypes.includes(taskType)
  })

  // Filter by search query
  const filteredNodes = availableNodes.filter(node => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      node.title?.toLowerCase().includes(query) ||
      node.description?.toLowerCase().includes(query) ||
      node.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  })

  const handleSelect = () => {
    if (selectedNode) {
      onSelectNode(selectedNode)
      onClose()
      setSelectedNode(null)
      setSearchQuery('')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Node to Make Recurring"
      className="max-w-2xl"
    >
      <div className="p-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search nodes by title, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Nodes List */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredNodes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {searchQuery ? 'No nodes found matching your search' : 'No available nodes to make recurring'}
            </p>
          ) : (
            filteredNodes.map(node => (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedNode?.id === node.id
                    ? 'border-brain-600 bg-brain-50 dark:bg-brain-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedNode(node)
                    }}
                    className="mt-1"
                  >
                    {selectedNode?.id === node.id ? (
                      <CheckCircle className="w-5 h-5 text-brain-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getNodeTypeIcon(node.type)}</span>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {node.title || node.description?.substring(0, 50) || 'Untitled'}
                      </h4>
                    </div>
                    
                    {node.description && node.description !== node.title && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {node.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        node.type === 'thought' ? 'bg-purple-100 text-purple-700' :
                        node.type === 'topic' ? 'bg-blue-100 text-blue-700' :
                        node.type === 'task' ? 'bg-green-100 text-green-700' :
                        node.type === 'question' ? 'bg-yellow-100 text-yellow-700' :
                        node.type === 'note' ? 'bg-gray-100 text-gray-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {node.type}
                      </span>
                      
                      {node.tags && node.tags.length > 0 && (
                        <div className="flex gap-1">
                          {node.tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                              #{tag}
                            </span>
                          ))}
                          {node.tags.length > 3 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                              +{node.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t dark:border-gray-700">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSelect}
            disabled={!selectedNode}
          >
            Select Node
          </Button>
        </div>
      </div>
    </Modal>
  )
}