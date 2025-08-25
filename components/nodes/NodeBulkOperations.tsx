'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useNodesStore } from '@/store/nodes'
import type { Node } from '@/types/node'

interface BulkLinkModalProps {
  isOpen: boolean
  onClose: () => void
  selectedNodes: Set<string>
  nodes: Node[]
}

export function BulkLinkModal({ isOpen, onClose, selectedNodes, nodes }: BulkLinkModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const linkAsChild = useNodesStore(state => state.linkAsChild)
  
  // Filter out selected nodes from parent options
  const availableParents = nodes.filter(node => !selectedNodes.has(node.id))
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedParentId) return
    
    setLoading(true)
    try {
      // Link all selected nodes as children of the selected parent
      const promises = Array.from(selectedNodes).map(childId => 
        linkAsChild(selectedParentId, childId)
      )
      await Promise.all(promises)
      onClose()
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Link Selected Nodes">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="parent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Select Parent Node
          </label>
          <select
            id="parent"
            value={selectedParentId}
            onChange={(e) => setSelectedParentId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            required
          >
            <option value="">Choose a parent node...</option>
            {availableParents.map(node => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedNodes.size} node(s) will be linked as children of the selected parent node.
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !selectedParentId}
          >
            {loading ? 'Linking...' : 'Link Nodes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}