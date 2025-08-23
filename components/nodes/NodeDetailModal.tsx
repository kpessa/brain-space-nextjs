'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useNodesStore } from '@/store/nodes'
import { useToast } from '@/hooks/useToast'
import type { Node, Recurrence } from '@/types/node'
import { getNodeTypeIcon } from '@/types/node'
import { NodeBreadcrumb } from './NodeBreadcrumb'
import { ReenhanceNodeDialog } from './ReenhanceNodeDialog'
import { NodeDetailsTab } from './tabs/NodeDetailsTab'
import { NodeUpdatesTab } from './tabs/NodeUpdatesTab'
import { NodeRelationshipsTab } from './tabs/NodeRelationshipsTab'
import { NodeRecurrenceConfig } from './NodeRecurrenceConfig'
import { CheckCircle, Circle, Calendar, CalendarPlus, Trash2, Edit3, Save, X, MessageSquare, Info, Link, Repeat } from '@/lib/icons'
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
  const [saving, setSaving] = useState(false)
  const [showReenhanceDialog, setShowReenhanceDialog] = useState(false)
  const [showRecurrenceConfig, setShowRecurrenceConfig] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  const toast = useToast()
  
  const { 
    updateNode, 
    deleteNode, 
    getNodeChildren, 
    getNodeParent,
    getNodeById 
  } = useNodesStore()
  
  // Always get fresh node data from store
  const [nodeId] = useState(node.id)
  const currentNode = getNodeById(nodeId) || node
  
  // Get parent and children with refresh dependency
  const parent = getNodeParent(currentNode.id)
  const children = getNodeChildren(currentNode.id)
  
  // Force refresh function that re-fetches node data
  const forceRefresh = async () => {
    setRefreshKey(prev => prev + 1)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Reset state when node changes
  useEffect(() => {
    setEditedNode(currentNode)
    setIsEditing(false)
    setActiveTab('details')
  }, [currentNode])
  
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
        isPersonal: editedNode.isPersonal,
      })
      setIsEditing(false)
      toast.showSuccess('Node updated successfully!')
    } catch (error) {
      toast.showError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }
  
  const handleSaveRecurrence = async (recurrencePattern: Recurrence | null) => {
    setSaving(true)
    try {
      await updateNode(currentNode.id, {
        recurrence: recurrencePattern || undefined,
        taskType: recurrencePattern ? 'recurring' : 'one-time'
      })
      setShowRecurrenceConfig(false)
      toast.showSuccess('Recurrence pattern updated!')
    } catch (error) {
      toast.showError('Failed to update recurrence pattern')
    } finally {
      setSaving(false)
    }
  }
  
  const handleCancel = () => {
    setEditedNode(currentNode)
    setIsEditing(false)
  }
  
  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${currentNode.title}"?`)) {
      try {
        await deleteNode(currentNode.id)
        toast.showSuccess('Node deleted')
        onClose()
      } catch (error) {
        toast.showError('Failed to delete node')
      }
    }
  }
  
  const handleCompletionToggle = async () => {
    await updateNode(currentNode.id, { completed: !currentNode.completed })
  }
  
  const handleEnhanceContent = async () => {
    if (!editedNode.description?.trim() || isEnhancing) return
    
    setIsEnhancing(true)
    try {
      const response = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editedNode.description,
          type: 'description',
          nodeContext: {
            title: editedNode.title,
            type: editedNode.type
          }
        }),
      })
      
      if (response.ok) {
        const { enhanced } = await response.json()
        setEditedNode({ ...editedNode, description: enhanced })
        toast.showSuccess('Content enhanced with AI!')
      } else {
        toast.showError('Failed to enhance content')
      }
    } catch (error) {
      toast.showError('Failed to enhance content')
    } finally {
      setIsEnhancing(false)
    }
  }
  
  return (
    <>
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
                      onClick={() => setShowRecurrenceConfig(true)}
                      title={currentNode.recurrence ? "Edit recurrence" : "Make recurring"}
                      className={currentNode.recurrence ? "text-purple-600 border-purple-600" : ""}
                    >
                      <Repeat className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDelete}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b">
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
                <span className="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-brain-700 bg-brain-100 rounded-full">
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
              <NodeDetailsTab
                node={currentNode}
                isEditing={isEditing}
                editedNode={editedNode}
                setEditedNode={setEditedNode}
                onEnhanceContent={handleEnhanceContent}
                isEnhancing={isEnhancing}
                userId={userId}
              />
            )}
            
            {activeTab === 'updates' && (
              <NodeUpdatesTab
                node={currentNode}
                userId={userId}
                userName={userName}
              />
            )}
            
            {activeTab === 'relationships' && (
              <NodeRelationshipsTab
                node={currentNode}
                parent={parent}
                children={children}
                onCreateChild={onCreateChild}
                onCreateParent={onCreateParent}
                onRelationshipChange={() => {
                  forceRefresh()
                  onRelationshipChange?.()
                }}
                refreshKey={refreshKey}
              />
            )}
          </div>
        </div>
      </Modal>
      
      {/* Modals */}
      {showReenhanceDialog && (
        <ReenhanceNodeDialog
          isOpen={showReenhanceDialog}
          onClose={() => setShowReenhanceDialog(false)}
          node={currentNode}
        />
      )}
      
      {showRecurrenceConfig && (
        <NodeRecurrenceConfig
          isOpen={showRecurrenceConfig}
          onClose={() => setShowRecurrenceConfig(false)}
          recurrence={currentNode.recurrence || null}
          onSave={handleSaveRecurrence}
          saving={saving}
        />
      )}
      
      {showCalendarModal && (
        <CalendarEventModal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          node={currentNode}
        />
      )}
    </>
  )
}
