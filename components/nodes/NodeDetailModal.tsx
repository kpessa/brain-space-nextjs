'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useNodesStore } from '@/store/nodeStore'
import { useXPStore } from '@/store/xpStore'
import { useCalendarStore } from '@/store/calendarStore'
import { XPEventType } from '@/types/xp'
import type { Node, NodeType, NodeUpdate } from '@/types/node'
import { getNodeTypeIcon, getNodeTypeColor, getEisenhowerQuadrant } from '@/types/node'
import { NodeBreadcrumb } from './NodeBreadcrumb'
import { ReenhanceNodeDialog } from './ReenhanceNodeDialog'
import { useToast } from '@/hooks/useToast'
import { useXPAnimation } from '@/components/XPGainAnimation'
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Calendar,
  CalendarPlus,
  Tag,
  GitBranch,
  GitMerge,
  Trash2,
  Edit3,
  Save,
  X,
  MessageSquare,
  Info,
  Link,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { CalendarEventModal } from '@/components/CalendarEventModal'

interface NodeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  node: Node
  userId: string
  userName?: string
  onCreateChild?: (node: Node) => void
  onCreateParent?: (node: Node) => void
  onRelationshipChange?: () => void
}

type TabType = 'details' | 'updates' | 'relationships'

export function NodeDetailModal({ 
  isOpen, 
  onClose, 
  node, 
  userId, 
  userName,
  onCreateChild,
  onCreateParent,
  onRelationshipChange 
}: NodeDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [isEditing, setIsEditing] = useState(false)
  const [editedNode, setEditedNode] = useState(node)
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [showReenhanceDialog, setShowReenhanceDialog] = useState(false)
  
  // Updates state
  const [newUpdateContent, setNewUpdateContent] = useState('')
  const [updateType, setUpdateType] = useState<'note' | 'status' | 'progress'>('note')
  const [isAddingUpdate, setIsAddingUpdate] = useState(false)
  const [enableAIEnhancement, setEnableAIEnhancement] = useState(true) // Default checked
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  
  const toast = useToast()
  const { awardXP } = useXPStore()
  const { showXPGain } = useXPAnimation()
  
  const { 
    updateNode, 
    deleteNode, 
    getNodeChildren, 
    getNodeParent,
    addNodeUpdate,
    deleteNodeUpdate,
    unlinkNodes,
    getNodeById 
  } = useNodesStore()
  
  const { calendars } = useCalendarStore()
  
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Get fresh node data from store
  // Always get fresh node data from store
  const [nodeId] = useState(node.id)
  const currentNode = getNodeById(nodeId) || node
  
  // Get parent and children with refresh dependency
  const parent = getNodeParent(currentNode.id)
  const children = getNodeChildren(currentNode.id)
  
  // Force refresh function that re-fetches node data
  const forceRefresh = async () => {
    // Force a re-render to get fresh data from store
    setRefreshKey(prev => prev + 1)
    // Small delay to ensure store has updated
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Reset state when node changes
  useEffect(() => {
    setEditedNode(currentNode)
    setIsEditing(false)
    setActiveTab('details')
  }, [currentNode])
  
  // Refresh relationships when key changes
  useEffect(() => {
    // This will cause parent and children to be re-evaluated
  }, [refreshKey])
  
  const handleSave = async () => {
    setSaving(true)
    try {
      await updateNode(currentNode.id, {
        title: editedNode.title,
        description: editedNode.description,
        type: editedNode.type,
        tags: editedNode.tags,
        urgency: editedNode.urgency,
        importance: editedNode.importance,
      })
      setIsEditing(false)
    } catch (error) {
      // Failed to save
    } finally {
      setSaving(false)
    }
  }
  
  const handleCancel = () => {
    setEditedNode(node)
    setIsEditing(false)
  }
  
  const handleDelete = async () => {
    const hasRelationships = parent || children.length > 0
    let confirmMessage = 'Are you sure you want to delete this node?'
    
    if (hasRelationships) {
      confirmMessage = 'This node has relationships:\n'
      if (parent) confirmMessage += '- 1 parent node\n'
      if (children.length > 0) confirmMessage += `- ${children.length} child node(s)\n`
      confirmMessage += '\nDeleting will unlink all relationships. This action cannot be undone. Continue?'
    } else {
      confirmMessage += ' This action cannot be undone.'
    }
    
    if (window.confirm(confirmMessage)) {
      await deleteNode(currentNode.id)
      onClose()
    }
  }
  
  const handleCompletionToggle = async () => {
    await updateNode(currentNode.id, { completed: !currentNode.completed })
  }
  
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      const tags = editedNode.tags || []
      if (!tags.includes(newTag.trim())) {
        setEditedNode({ ...editedNode, tags: [...tags, newTag.trim()] })
      }
      setNewTag('')
    }
  }
  
  const handleRemoveTag = (tagToRemove: string) => {
    setEditedNode({
      ...editedNode,
      tags: editedNode.tags?.filter(tag => tag !== tagToRemove) || []
    })
  }
  
  const handleEnhanceContent = async () => {
    if (!newUpdateContent.trim() || isEnhancing) return
    
    setIsEnhancing(true)
    try {
      const response = await fetch('/api/ai/enhance-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newUpdateContent,
          isWorkNode: !currentNode.isPersonal,
          updateType,
        }),
      })
      
      if (response.ok) {
        const { enhancedText } = await response.json()
        setNewUpdateContent(enhancedText)
        toast.success('Update enhanced with AI!')
      } else {
        toast.error('Failed to enhance update')
      }
    } catch (error) {
      console.error('Error enhancing update:', error)
      toast.error('Failed to enhance update')
    } finally {
      setIsEnhancing(false)
    }
  }
  
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUpdateContent.trim()) return
    
    try {
      await addNodeUpdate(currentNode.id, {
        content: newUpdateContent.trim(),
        type: updateType,
        userId,
        userName,
      })
      
      // Award XP based on update type
      const xpEventType = updateType === 'progress' 
        ? XPEventType.NODE_UPDATE_PROGRESS 
        : updateType === 'status'
        ? XPEventType.NODE_UPDATE_STATUS
        : XPEventType.NODE_UPDATE_ADDED
        
      const { xpAwarded, leveledUp } = await awardXP(xpEventType, {
        nodeId: currentNode.id,
        nodeTitle: currentNode.title,
        updateCount: currentNode.updates?.length || 0
      })
      
      // Show XP animation
      showXPGain(xpAwarded, e.nativeEvent as MouseEvent)
      
      if (leveledUp) {
        toast.success('Level Up! 🎉')
      }
      
      setNewUpdateContent('')
      setIsAddingUpdate(false)
      toast.success('Update added successfully!')
    } catch (error) {
      console.error('Failed to add update:', error)
      toast.error('Failed to add update')
    }
  }
  
  const handleDeleteUpdate = async (updateId: string) => {
    if (window.confirm('Delete this update?')) {
      await deleteNodeUpdate(currentNode.id, updateId)
    }
  }
  
  const getUpdateTypeColor = (type?: NodeUpdate['type']) => {
    switch (type) {
      case 'status': return 'bg-blue-100 text-blue-800'
      case 'progress': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const sortedUpdates = [...(currentNode.updates || [])]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title=""
      size="xl"
    >
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b">
          <div className="flex items-start gap-3 flex-1">
            <button
              onClick={handleCompletionToggle}
              className="flex-shrink-0 mt-1"
            >
              {currentNode.completed ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <Circle className="w-6 h-6 text-gray-400" />
              )}
            </button>
            
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editedNode.title || ''}
                  onChange={(e) => setEditedNode({ ...editedNode, title: e.target.value })}
                  className="w-full text-xl font-semibold border-b-2 border-brain-500 focus:outline-none"
                  placeholder="Node title"
                  autoFocus
                />
              ) : (
                <h2 className={`text-xl font-semibold ${currentNode.completed ? 'line-through text-gray-500' : ''}`}>
                  <span className="mr-2">{getNodeTypeIcon(currentNode.type)}</span>
                  {currentNode.title || 'Untitled Node'}
                </h2>
              )}
              
              {/* Breadcrumb */}
              {parent && !isEditing && (
                <div className="mt-1">
                  <NodeBreadcrumb node={currentNode} />
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCalendarModal(true)}
                    title={currentNode.calendarEventId ? "View calendar event" : "Add to calendar"}
                  >
                    {currentNode.calendarEventId ? (
                      <Calendar className="w-4 h-4" />
                    ) : (
                      <CalendarPlus className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowReenhanceDialog(true)}
                    title="Re-enhance this node with AI"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b mt-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-brain-600 text-brain-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Info className="w-4 h-4 inline mr-1" />
            Details
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
              activeTab === 'updates'
                ? 'border-brain-600 text-brain-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-1" />
            Updates
            {currentNode.updates && currentNode.updates.length > 0 && (
              <span className="ml-2 bg-brain-600 text-white text-xs rounded-full px-2 py-0.5">
                {currentNode.updates.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'relationships'
                ? 'border-brain-600 text-brain-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Link className="w-4 h-4 inline mr-1" />
            Relationships
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pt-4">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                {isEditing ? (
                  <textarea
                    value={editedNode.description || ''}
                    onChange={(e) => setEditedNode({ ...editedNode, description: e.target.value })}
                    className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                    placeholder="Add a description..."
                  />
                ) : (
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {currentNode.description || <span className="text-gray-400 italic">No description</span>}
                  </p>
                )}
              </div>
              
              {/* Type and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  {isEditing ? (
                    <select
                      value={editedNode.type || 'thought'}
                      onChange={(e) => setEditedNode({ ...editedNode, type: e.target.value as NodeType })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500"
                    >
                      <option value="goal">Goal</option>
                      <option value="project">Project</option>
                      <option value="task">Task</option>
                      <option value="idea">Idea</option>
                      <option value="question">Question</option>
                      <option value="problem">Problem</option>
                      <option value="insight">Insight</option>
                      <option value="thought">Thought</option>
                      <option value="concern">Concern</option>
                      <option value="option">Option</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${getNodeTypeColor(currentNode.type)} bg-opacity-10`}>
                      {getNodeTypeIcon(currentNode.type)} {currentNode.type}
                    </span>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
                    getEisenhowerQuadrant(currentNode.urgency, currentNode.importance) === 'do-first' ? 'bg-red-100 text-red-800' :
                    getEisenhowerQuadrant(currentNode.urgency, currentNode.importance) === 'schedule' ? 'bg-blue-100 text-blue-800' :
                    getEisenhowerQuadrant(currentNode.urgency, currentNode.importance) === 'delegate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getEisenhowerQuadrant(currentNode.urgency, currentNode.importance).replace('-', ' ')}
                  </span>
                </div>
              </div>
              
              {/* Urgency and Importance */}
              {isEditing && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Urgency: {editedNode.urgency || 5}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={editedNode.urgency || 5}
                      onChange={(e) => setEditedNode({ ...editedNode, urgency: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Importance: {editedNode.importance || 5}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={editedNode.importance || 5}
                      onChange={(e) => setEditedNode({ ...editedNode, importance: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
              
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(isEditing ? editedNode.tags : currentNode.tags)?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-gray-100 text-gray-700"
                    >
                      #{tag}
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-gray-500 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {isEditing && (
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Add tag and press Enter"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500"
                  />
                )}
              </div>
              
              {/* Due Date */}
              {currentNode.dueDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Due Date
                  </label>
                  <div className="text-gray-800">
                    {currentNode.dueDate.type === 'exact' 
                      ? format(new Date(currentNode.dueDate.date), 'PPP')
                      : `${currentNode.dueDate.offset} ${currentNode.dueDate.unit} from creation`
                    }
                  </div>
                </div>
              )}
              
              {/* Calendar Event */}
              {currentNode.calendarEventId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarPlus className="w-4 h-4 inline mr-1" />
                    Calendar Event
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Event Created
                    </span>
                    {currentNode.calendarId && currentNode.calendarId !== 'primary' && (
                      <span className="text-sm text-gray-600">
                        in {calendars.find(cal => cal.id === currentNode.calendarId)?.summary || currentNode.calendarId}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Metadata */}
              <div className="pt-4 border-t space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Created: {currentNode.createdAt ? format(new Date(currentNode.createdAt), 'PPp') : 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Updated: {currentNode.updatedAt ? format(new Date(currentNode.updatedAt), 'PPp') : 'Unknown'}</span>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'updates' && (
            <div className="space-y-4">
              {/* Add Update Form */}
              {isAddingUpdate ? (
                <form onSubmit={handleAddUpdate} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Update Type
                    </label>
                    <div className="flex gap-2">
                      {(['note', 'status', 'progress'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setUpdateType(type)}
                          className={`px-3 py-1 text-sm rounded-lg capitalize transition-colors ${
                            updateType === type
                              ? getUpdateTypeColor(type)
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Update Content
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={enableAIEnhancement}
                          onChange={(e) => setEnableAIEnhancement(e.target.checked)}
                          className="rounded text-brain-600"
                        />
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-4 h-4 text-yellow-500" />
                          AI Enhancement
                        </span>
                      </label>
                    </div>
                    <div className="relative">
                      <textarea
                        value={newUpdateContent}
                        onChange={(e) => setNewUpdateContent(e.target.value)}
                        className="w-full h-20 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-brain-500"
                        placeholder="What's the update?"
                        autoFocus
                      />
                      {enableAIEnhancement && newUpdateContent.trim() && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleEnhanceContent}
                          disabled={isEnhancing}
                          className="absolute bottom-2 right-2"
                        >
                          {isEnhancing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                              Enhancing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-1" />
                              Enhance
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!newUpdateContent.trim()}
                      size="sm"
                    >
                      Add Update
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddingUpdate(false)
                        setNewUpdateContent('')
                      }}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  onClick={() => setIsAddingUpdate(true)}
                  variant="outline"
                  className="w-full"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add Update
                </Button>
              )}
              
              {/* Updates List */}
              {sortedUpdates.length > 0 ? (
                sortedUpdates.map((update) => (
                  <div
                    key={update.id}
                    className="p-4 rounded-lg border border-gray-200 bg-white"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-1 text-xs rounded-md ${getUpdateTypeColor(update.type)}`}>
                        {update.type || 'note'}
                      </span>
                      
                      {update.userId === userId && (
                        <button
                          onClick={() => handleDeleteUpdate(update.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <p className="text-gray-800 whitespace-pre-wrap mb-2">{update.content}</p>
                    
                    <div className="text-xs text-gray-500">
                      <span>{update.userName || 'Unknown'}</span>
                      <span className="mx-1">•</span>
                      <span>{formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No updates yet</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'relationships' && (
            <div className="space-y-6">
              {/* Parent */}
              <div key={`parent-${refreshKey}`}>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <GitMerge className="w-4 h-4" />
                  Parent Node
                </h3>
                {parent ? (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getNodeTypeIcon(parent.type)}</span>
                        <span className="font-medium">{parent.title || 'Untitled'}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${getNodeTypeColor(parent.type)} bg-opacity-10`}>
                          {parent.type}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            // Unlink the nodes
                            const result = await unlinkNodes(parent.id, currentNode.id)
                            
                            // Wait for state to update and refresh
                            await forceRefresh()
                            
                            if (result && result.success) {
                              // Show detailed success message
                              const actions = result.actions.join('. ')
                              toast.success(`Successfully unlinked! ${actions}`)
                              // Notify parent component
                              onRelationshipChange?.()
                            } else {
                              toast.error('Failed to unlink from parent. Please try again.')
                            }
                          } catch (error) {
                            console.error('Failed to unlink parent:', error)
                            const errorMessage = error instanceof Error ? error.message : 'Failed to unlink from parent'
                            toast.error(errorMessage)
                          }
                        }}
                        className="text-xs text-red-600 hover:bg-red-50"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg text-gray-500">
                    No parent node
                  </div>
                )}
                {!parent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose()
                      onCreateParent?.(currentNode)
                    }}
                    className="mt-2"
                  >
                    <GitMerge className="w-4 h-4 mr-1" />
                    Add Parent
                  </Button>
                )}
              </div>
              
              {/* Children */}
              <div key={`children-${refreshKey}`}>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Child Nodes ({children.length})
                </h3>
                {children.length > 0 ? (
                  <div className="space-y-2">
                    {children.map((child) => (
                      <div key={child.id} className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getNodeTypeIcon(child.type)}</span>
                            <span className="font-medium">{child.title || 'Untitled'}</span>
                            <span className={`px-2 py-0.5 text-xs rounded ${getNodeTypeColor(child.type)} bg-opacity-10`}>
                              {child.type}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                // Unlink the nodes
                                const result = await unlinkNodes(currentNode.id, child.id)
                                
                                // Wait for state to update and refresh
                                await forceRefresh()
                                
                                if (result && result.success) {
                                  // Show detailed success message
                                  const actions = result.actions.join('. ')
                                  toast.success(`Successfully unlinked! ${actions}`)
                                  // Notify parent component
                                  onRelationshipChange?.()
                                } else {
                                  toast.error('Failed to unlink child. Please try again.')
                                }
                              } catch (error) {
                                console.error('Failed to unlink child:', error)
                                const errorMessage = error instanceof Error ? error.message : 'Failed to unlink child'
                                toast.error(errorMessage)
                              }
                            }}
                            className="text-xs text-red-600 hover:bg-red-50"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Unlink
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg text-gray-500">
                    No child nodes
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose()
                    onCreateChild?.(currentNode)
                  }}
                  className="mt-2"
                >
                  <GitBranch className="w-4 h-4 mr-1" />
                  Add Child
                </Button>
              </div>
              
              {/* Relationship Info */}
              <div className="pt-4 border-t">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <p>
                    Nodes can have parent-child relationships to organize your thoughts hierarchically. 
                    A node can have one parent and multiple children.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Re-enhance Dialog */}
      <ReenhanceNodeDialog
        isOpen={showReenhanceDialog}
        onClose={() => setShowReenhanceDialog(false)}
        node={currentNode}
        onSuccess={forceRefresh}
      />
      
      {/* Calendar Event Modal */}
      {showCalendarModal && (
        <CalendarEventModal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          node={currentNode}
          onEventCreated={async (eventId, calendarId) => {
            // Update node with calendar event info
            await updateNode(currentNode.id, {
              calendarEventId: eventId,
              calendarId: calendarId
            })
            setShowCalendarModal(false)
            forceRefresh()
          }}
        />
      )}
    </Modal>
  )
}