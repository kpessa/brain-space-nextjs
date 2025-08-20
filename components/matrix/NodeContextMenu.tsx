'use client'

import { useState } from 'react'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Trash2, 
  Edit3, 
  Tag,
  ChevronRight,
  AlertTriangle,
  Plus,
  Link,
  Unlink,
  FolderPlus,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { isSnoozed, formatSnoozeUntil } from '@/lib/snooze'
import { SnoozeInput } from '@/components/nodes/SnoozeInput'

interface NodeContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  node: {
    id: string
    title: string
    description?: string
    urgency?: number
    importance?: number
    status?: 'pending' | 'in-progress' | 'completed'
    completed?: boolean
    tags?: string[]
    snoozedUntil?: string
    parent?: string
    children?: string[]
  } | null
  onClose: () => void
  onUpdateNode: (nodeId: string, updates: any) => void
  onDeleteNode?: (nodeId: string) => void
  onSnoozeNode?: (nodeId: string, until: Date) => void
  onUnsnoozeNode?: (nodeId: string) => void
  onCreateSubtask?: (nodeId: string) => void
  onLinkToParent?: (nodeId: string) => void
  onUnlinkFromParent?: (nodeId: string) => void
  onShowRelated?: (nodeId: string) => void
}

export function NodeContextMenu({
  isOpen,
  position,
  node,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onSnoozeNode,
  onUnsnoozeNode,
  onCreateSubtask,
  onLinkToParent,
  onUnlinkFromParent,
  onShowRelated
}: NodeContextMenuProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [localUrgency, setLocalUrgency] = useState(5)
  const [localImportance, setLocalImportance] = useState(5)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSnoozeInput, setShowSnoozeInput] = useState(false)

  // Update local values when node changes
  useState(() => {
    if (node) {
      setEditedTitle(node.title)
      setLocalUrgency(node.urgency || 5)
      setLocalImportance(node.importance || 5)
    }
  })

  if (!node) return null

  const handleStatusChange = (newStatus: string) => {
    const updates: any = { status: newStatus }
    
    // Map status to completed field for proper filtering
    if (newStatus === 'completed') {
      updates.completed = true
      updates.completedAt = new Date().toISOString()
    } else {
      updates.completed = false
      updates.completedAt = null
    }
    
    onUpdateNode(node.id, updates)
    onClose()
  }

  const handleTitleSave = () => {
    if (editedTitle.trim() && editedTitle !== node.title) {
      onUpdateNode(node.id, { title: editedTitle.trim() })
    }
    setIsEditingTitle(false)
  }

  const handlePriorityUpdate = () => {
    onUpdateNode(node.id, {
      urgency: localUrgency,
      importance: localImportance
    })
    onClose()
  }

  const handleDelete = () => {
    if (onDeleteNode) {
      onDeleteNode(node.id)
      onClose()
    }
  }
  
  const handleSnooze = (until: Date) => {
    if (onSnoozeNode) {
      onSnoozeNode(node.id, until)
      setShowSnoozeInput(false)
    }
  }
  
  const handleUnsnooze = () => {
    if (onUnsnoozeNode) {
      onUnsnoozeNode(node.id)
    }
  }

  const getStatusIcon = () => {
    // Check both status field and completed boolean
    if (node.status === 'completed' || node.completed) {
      return <CheckCircle className="w-4 h-4 text-green-600" />
    }
    if (node.status === 'in-progress') {
      return <Clock className="w-4 h-4 text-blue-600" />
    }
    return <Circle className="w-4 h-4 text-gray-400" />
  }
  
  const getCurrentStatus = () => {
    // Determine current status from both fields
    if (node.completed || node.status === 'completed') return 'completed'
    if (node.status === 'in-progress') return 'in-progress'
    return 'pending'
  }

  const getQuadrantLabel = () => {
    const urgency = node.urgency || 5
    const importance = node.importance || 5
    
    if (urgency >= 7 && importance >= 7) return 'Do First'
    if (urgency < 7 && importance >= 7) return 'Schedule'
    if (urgency >= 7 && importance < 7) return 'Delegate'
    return 'Eliminate'
  }

  return (
    <ContextMenu isOpen={isOpen} position={position} onClose={onClose}>
      <div className="p-4">
        {/* Header with title */}
        <div className="mb-4 pr-6">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave()
                  if (e.key === 'Escape') setIsEditingTitle(false)
                }}
                className="text-sm"
                autoFocus
              />
              <Button size="sm" onClick={handleTitleSave}>
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {getStatusIcon()}
                  {node.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{getQuadrantLabel()}</p>
              </div>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Edit3 className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          )}
        </div>

        {/* Status Actions */}
        <div className="space-y-2 mb-4">
          <Label className="text-xs text-gray-600">Status</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={getCurrentStatus() === 'pending' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('pending')}
              className="flex-1 text-xs"
            >
              <Circle className="w-3 h-3 mr-1" />
              Pending
            </Button>
            <Button
              size="sm"
              variant={getCurrentStatus() === 'in-progress' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('in-progress')}
              className="flex-1 text-xs"
            >
              <Clock className="w-3 h-3 mr-1" />
              In Progress
            </Button>
            <Button
              size="sm"
              variant={getCurrentStatus() === 'completed' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('completed')}
              className="flex-1 text-xs"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Done
            </Button>
          </div>
        </div>

        {/* Snooze Actions */}
        {showSnoozeInput ? (
          <div className="mb-4">
            <SnoozeInput
              onSnooze={handleSnooze}
              onCancel={() => setShowSnoozeInput(false)}
            />
          </div>
        ) : (
          <div className="mb-4">
            {isSnoozed(node) ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleUnsnooze}
                className="w-full text-xs"
              >
                <Clock className="w-3 h-3 mr-1" />
                Unsnooze ({formatSnoozeUntil(node.snoozedUntil!)})
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSnoozeInput(true)}
                className="w-full text-xs"
              >
                <Clock className="w-3 h-3 mr-1" />
                Snooze
              </Button>
            )}
          </div>
        )}

        {/* Priority Sliders */}
        <div className="space-y-3 mb-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-xs text-gray-600">Importance</Label>
              <span className="text-xs font-medium text-gray-700">{localImportance}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={localImportance}
              onChange={(e) => setLocalImportance(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer 
                slider-thumb:bg-brain-600 slider-thumb:hover:bg-brain-700"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-xs text-gray-600">Urgency</Label>
              <span className="text-xs font-medium text-gray-700">{localUrgency}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={localUrgency}
              onChange={(e) => setLocalUrgency(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                slider-thumb:bg-space-600 slider-thumb:hover:bg-space-700"
            />
          </div>
          
          <Button 
            size="sm" 
            onClick={handlePriorityUpdate}
            className="w-full"
            disabled={localUrgency === node.urgency && localImportance === node.importance}
          >
            Update Priority
          </Button>
        </div>

        {/* Tags */}
        {node.tags && node.tags.length > 0 && (
          <div className="mb-4">
            <Label className="text-xs text-gray-600">Tags</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {node.tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                >
                  <Tag className="w-3 h-3 inline mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Relationship Actions */}
        <div className="space-y-2 mb-4 pt-2 border-t">
          <Label className="text-xs text-gray-600">Relationships</Label>
          <div className="flex flex-wrap gap-2">
            {onCreateSubtask && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onCreateSubtask(node.id)
                  onClose()
                }}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Subtask
              </Button>
            )}
            
            {onLinkToParent && !node.parent && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onLinkToParent(node.id)
                  onClose()
                }}
                className="text-xs"
              >
                <Link className="w-3 h-3 mr-1" />
                Link to Parent
              </Button>
            )}
            
            {onUnlinkFromParent && node.parent && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onUnlinkFromParent(node.id)
                  onClose()
                }}
                className="text-xs"
              >
                <Unlink className="w-3 h-3 mr-1" />
                Unlink from Parent
              </Button>
            )}
            
            {onShowRelated && (node.parent || (node.children && node.children.length > 0)) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onShowRelated(node.id)
                  onClose()
                }}
                className="text-xs"
              >
                <Users className="w-3 h-3 mr-1" />
                Show Family
              </Button>
            )}
          </div>
          
          {/* Show current relationships */}
          {(node.parent || (node.children && node.children.length > 0)) && (
            <div className="text-xs text-gray-500 mt-2">
              {node.parent && <div>Has parent</div>}
              {node.children && node.children.length > 0 && (
                <div>{node.children.length} subtask{node.children.length !== 1 ? 's' : ''}</div>
              )}
            </div>
          )}
        </div>

        {/* Delete Action */}
        <div className="pt-2 border-t">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-600 flex-1">Delete this task?</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={handleDelete}
                className="text-xs bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete Task
            </Button>
          )}
        </div>
      </div>
    </ContextMenu>
  )
}