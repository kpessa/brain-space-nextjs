'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useNodesStore } from '@/store/nodeStore'
import { useUserPreferencesStore, TAG_CATEGORIES } from '@/store/userPreferencesStore'
import type { Node } from '@/types/node'
import { 
  Plus,
  Minus,
  RefreshCw,
  Briefcase,
  Home,
  X,
  Check
} from 'lucide-react'

interface BulkTagModalProps {
  isOpen: boolean
  onClose: () => void
  selectedNodeIds: Set<string>
}

type OperationType = 'add' | 'remove' | 'replace' | 'setWorkPersonal'

export function BulkTagModal({ isOpen, onClose, selectedNodeIds }: BulkTagModalProps) {
  const [operation, setOperation] = useState<OperationType>('add')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [oldTag, setOldTag] = useState('')
  const [replacementTag, setReplacementTag] = useState('')
  const [workPersonalValue, setWorkPersonalValue] = useState<'work' | 'personal'>('work')
  const [loading, setLoading] = useState(false)
  
  const { nodes, bulkUpdateNodes } = useNodesStore()
  const { currentMode, frequentTags, addFrequentTag } = useUserPreferencesStore()
  
  // Get selected nodes
  const selectedNodes = nodes.filter(node => selectedNodeIds.has(node.id))
  
  // Get all unique tags from all nodes
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    nodes.forEach(node => {
      node.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [nodes])
  
  // Get common tags across selected nodes (for remove operation)
  const commonTags = useMemo(() => {
    if (selectedNodes.length === 0) return []
    
    const firstNodeTags = new Set(selectedNodes[0].tags || [])
    return Array.from(firstNodeTags).filter(tag =>
      selectedNodes.every(node => node.tags?.includes(tag))
    ).sort()
  }, [selectedNodes])
  
  // Get suggested tags based on mode
  const suggestedTags = useMemo(() => {
    const modeTags = currentMode === 'work' 
      ? TAG_CATEGORIES.work 
      : currentMode === 'personal' 
      ? TAG_CATEGORIES.personal 
      : [...TAG_CATEGORIES.work, ...TAG_CATEGORIES.personal]
    
    return [...new Set([...frequentTags.slice(0, 5), ...modeTags])]
  }, [currentMode, frequentTags])
  
  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      const updates: Array<{ nodeId: string; updates: Partial<Node> }> = []
      
      switch (operation) {
        case 'add':
          const tagsToAdd = [...selectedTags, ...(newTag ? [newTag.trim()] : [])]
          selectedNodes.forEach(node => {
            const existingTags = node.tags || []
            const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]))
            updates.push({ nodeId: node.id, updates: { tags: newTags } })
          })
          // Track tag usage
          tagsToAdd.forEach(tag => addFrequentTag(tag))
          break
          
        case 'remove':
          selectedNodes.forEach(node => {
            const existingTags = node.tags || []
            const newTags = existingTags.filter(tag => !selectedTags.includes(tag))
            updates.push({ nodeId: node.id, updates: { tags: newTags } })
          })
          break
          
        case 'replace':
          if (oldTag && replacementTag) {
            selectedNodes.forEach(node => {
              const existingTags = node.tags || []
              const newTags = existingTags.map(tag => 
                tag === oldTag ? replacementTag.trim() : tag
              )
              updates.push({ nodeId: node.id, updates: { tags: newTags } })
            })
            addFrequentTag(replacementTag.trim())
          }
          break
          
        case 'setWorkPersonal':
          const isPersonal = workPersonalValue === 'personal'
          selectedNodes.forEach(node => {
            updates.push({ nodeId: node.id, updates: { isPersonal } })
          })
          break
      }
      
      // Apply all updates
      await bulkUpdateNodes(updates)
      
      // Reset and close
      setSelectedTags([])
      setNewTag('')
      setOldTag('')
      setReplacementTag('')
      onClose()
    } catch (error) {
      // Failed to update tags
    } finally {
      setLoading(false)
    }
  }
  
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }
  
  const handleAddNewTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      setSelectedTags(prev => [...prev, newTag.trim()])
      setNewTag('')
    }
  }
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Bulk Tag Operations"
      size="lg"
    >
      <div className="space-y-6">
        {/* Operation selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Operation Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOperation('add')}
              className={`px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors ${
                operation === 'add'
                  ? 'bg-brain-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              Add Tags
            </button>
            <button
              onClick={() => setOperation('remove')}
              className={`px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors ${
                operation === 'remove'
                  ? 'bg-brain-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Minus className="w-4 h-4" />
              Remove Tags
            </button>
            <button
              onClick={() => setOperation('replace')}
              className={`px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors ${
                operation === 'replace'
                  ? 'bg-brain-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Replace Tag
            </button>
            <button
              onClick={() => setOperation('setWorkPersonal')}
              className={`px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors ${
                operation === 'setWorkPersonal'
                  ? 'bg-brain-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Set Work/Personal
            </button>
          </div>
        </div>
        
        {/* Operation-specific UI */}
        {operation === 'add' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add these tags to {selectedNodes.length} node{selectedNodes.length !== 1 ? 's' : ''}
              </label>
              
              {/* Suggested tags */}
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-2">Suggested tags:</p>
                <div className="flex flex-wrap gap-1">
                  {suggestedTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-brain-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* All tags */}
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 border rounded-lg">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-brain-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              
              {/* Add new tag */}
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleAddNewTag}
                placeholder="Type a new tag and press Enter"
                className="mt-3 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500"
              />
              
              {/* Selected tags preview */}
              {selectedTags.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-1">Tags to add:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                        {tag}
                        <button onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {operation === 'remove' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remove these tags from {selectedNodes.length} node{selectedNodes.length !== 1 ? 's' : ''}
              </label>
              
              {commonTags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {commonTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No common tags found across selected nodes</p>
              )}
              
              {selectedTags.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-1">Tags to remove:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {operation === 'replace' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Replace tag across {selectedNodes.length} node{selectedNodes.length !== 1 ? 's' : ''}
              </label>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tag to replace:</label>
                  <select
                    value={oldTag}
                    onChange={(e) => setOldTag(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500"
                  >
                    <option value="">Select a tag...</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Replace with:</label>
                  <input
                    type="text"
                    value={replacementTag}
                    onChange={(e) => setReplacementTag(e.target.value)}
                    placeholder="New tag name"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500"
                  />
                </div>
              </div>
              
              {oldTag && replacementTag && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Replace &quot;<strong>{oldTag}</strong>&quot; with &quot;<strong>{replacementTag}</strong>&quot;
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {operation === 'setWorkPersonal' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Set {selectedNodes.length} node{selectedNodes.length !== 1 ? 's' : ''} as:
              </label>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setWorkPersonalValue('work')}
                  className={`flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    workPersonalValue === 'work'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                  Work
                </button>
                <button
                  onClick={() => setWorkPersonalValue('personal')}
                  className={`flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    workPersonalValue === 'personal'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  Personal
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || (
              operation === 'add' && selectedTags.length === 0 && !newTag.trim() ||
              operation === 'remove' && selectedTags.length === 0 ||
              operation === 'replace' && (!oldTag || !replacementTag.trim())
            )}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Updating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Apply Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}