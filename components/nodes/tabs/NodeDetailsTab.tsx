'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useNodesStore } from '@/store/nodeStore'
import { useToast } from '@/hooks/useToast'
import type { Node, NodeType } from '@/types/node'
import { getNodeTypeIcon, getNodeTypeColor, getEisenhowerQuadrant } from '@/types/node'
import { Tag, Sparkles } from '@/lib/icons'

interface NodeDetailsTabProps {
  node: Node
  isEditing: boolean
  editedNode: Node
  setEditedNode: (node: Node) => void
  onEnhanceContent: () => void
  isEnhancing: boolean
  userId: string
}

export function NodeDetailsTab({
  node,
  isEditing,
  editedNode,
  setEditedNode,
  onEnhanceContent,
  isEnhancing,
  userId
}: NodeDetailsTabProps) {
  const [newTag, setNewTag] = useState('')
  const toast = useToast()

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      const tags = editedNode.tags || []
      if (!tags.includes(newTag.trim())) {
        setEditedNode({ ...editedNode, tags: [...tags, newTag.trim()] })
        setNewTag('')
      }
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const tags = editedNode.tags || []
    setEditedNode({ ...editedNode, tags: tags.filter(tag => tag !== tagToRemove) })
  }

  const getTextColor = (node: Node) => {
    if (node.completed) return 'text-gray-500'
    const quadrant = getEisenhowerQuadrant(node.urgency, node.importance)
    switch (quadrant) {
      case 'urgent-important': return 'text-red-600'
      case 'not-urgent-important': return 'text-blue-600'
      case 'urgent-not-important': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedNode.description || ''}
              onChange={(e) => setEditedNode({ ...editedNode, description: e.target.value })}
              className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-brain-500 min-h-[100px]"
              placeholder="Add a description..."
            />
            <Button
              size="sm"
              variant="outline"
              onClick={onEnhanceContent}
              disabled={isEnhancing || !editedNode.description?.trim()}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
            </Button>
          </div>
        ) : (
          <p className={`whitespace-pre-wrap ${node.description ? getTextColor(node) : 'text-gray-400 italic'}`}>
            {node.description || 'No description'}
          </p>
        )}
      </div>

      {/* Node Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type
        </label>
        {isEditing ? (
          <select
            value={editedNode.type}
            onChange={(e) => setEditedNode({ ...editedNode, type: e.target.value as NodeType })}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brain-500"
          >
            <option value="task">Task</option>
            <option value="project">Project</option>
            <option value="idea">Idea</option>
            <option value="note">Note</option>
            <option value="goal">Goal</option>
            <option value="reference">Reference</option>
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getNodeTypeColor(node.type)}`}>
              {getNodeTypeIcon(node.type)} {node.type}
            </span>
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Urgency
          </label>
          {isEditing ? (
            <select
              value={editedNode.urgency || 'low'}
              onChange={(e) => setEditedNode({ ...editedNode, urgency: Number(e.target.value) })}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brain-500"
            >
              <option value="1">Low</option>
              <option value="2">Medium</option>
              <option value="3">High</option>
            </select>
          ) : (
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              node.urgency === 3 ? 'bg-red-100 text-red-800' :
              node.urgency === 2 ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {node.urgency === 3 ? 'High' : node.urgency === 2 ? 'Medium' : 'Low'}
            </span>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Importance
          </label>
          {isEditing ? (
            <select
              value={editedNode.importance || 'low'}
              onChange={(e) => setEditedNode({ ...editedNode, importance: Number(e.target.value) })}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brain-500"
            >
              <option value="1">Low</option>
              <option value="2">Medium</option>
              <option value="3">High</option>
            </select>
          ) : (
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              node.importance === 3 ? 'bg-blue-100 text-blue-800' :
              node.importance === 2 ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {node.importance === 3 ? 'High' : node.importance === 2 ? 'Medium' : 'Low'}
            </span>
          )}
        </div>
      </div>

      {/* Work/Personal Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        {isEditing ? (
          <select
            value={editedNode.isPersonal ? 'personal' : 'work'}
            onChange={(e) => setEditedNode({ ...editedNode, isPersonal: e.target.value === 'personal' })}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brain-500"
          >
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </select>
        ) : (
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            node.isPersonal ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {node.isPersonal ? 'Personal' : 'Work'}
          </span>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Tag className="w-4 h-4 inline mr-1" />
          Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {editedNode.tags?.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
            >
              {tag}
              {isEditing && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-gray-500 hover:text-red-600"
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {isEditing && (
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tag..."
              className="px-3 py-1 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brain-500"
            />
          )}
          {!isEditing && (!editedNode.tags || editedNode.tags.length === 0) && (
            <span className="text-gray-400 italic">No tags</span>
          )}
        </div>
      </div>

      {/* Metadata */}
      {!isEditing && (
        <div className="pt-4 border-t text-sm text-gray-500">
          <div className="grid grid-cols-2 gap-2">
            <div>Created: {new Date(node.createdAt).toLocaleString()}</div>
            <div>Updated: {new Date(node.updatedAt).toLocaleString()}</div>
            {node.completedAt && (
              <div className="col-span-2">
                Completed: {new Date(node.completedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}