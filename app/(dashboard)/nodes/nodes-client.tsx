'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useNodesStore } from '@/store/nodeStore'
import { createAIService } from '@/services/ai'
import type { Node, NodeType } from '@/types/node'
import { getNodeTypeColor, getNodeTypeIcon, getEisenhowerQuadrant } from '@/types/node'
import { AIProviderSelector } from '@/components/AIProviderSelector'
import { NodeRelationshipModal } from '@/components/nodes/NodeRelationshipModal'
import { NodeHierarchyView } from '@/components/nodes/NodeHierarchyView'
import { NodeBreadcrumb } from '@/components/nodes/NodeBreadcrumb'
import { NodeGraphView } from '@/components/nodes/NodeGraphView'
import { NodeUpdateModal } from '@/components/nodes/NodeUpdateModal'
import { NodeDetailModal } from '@/components/nodes/NodeDetailModal'
import { UpdateExportModal } from '@/components/nodes/UpdateExportModal'
import { BulkTagModal } from '@/components/nodes/BulkTagModal'
import { useUserPreferencesStore, shouldShowNode } from '@/store/userPreferencesStore'
import { ModeToggle } from '@/components/ModeToggle'
import { RecurrenceDialog } from '@/components/RecurrenceDialog'
import { RecurrencePattern } from '@/types/recurrence'
import { 
  Network, 
  Plus, 
  Search, 
  Zap, 
  MoreHorizontal,
  Tag,
  CheckCircle,
  Circle,
  Clock,
  Target,
  Download,
  Upload,
  GitBranch,
  GitMerge,
  Grid3x3,
  TreePine,
  Share2,
  CheckSquare,
  Square,
  LinkIcon,
  Trash2,
  MessageSquare,
  FileText,
  Mic,
  Pin,
  Repeat,
  Edit,
  Calendar,
  CalendarPlus
} from 'lucide-react'
import { format } from 'date-fns'
import StandupSummaryDialog from '@/components/StandupSummaryDialog'
import { CalendarEventModal } from '@/components/CalendarEventModal'
import { BulkScheduleImportModal } from '@/components/BulkScheduleImportModal'

interface NodeCreateModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

interface BulkLinkModalProps {
  isOpen: boolean
  onClose: () => void
  selectedNodes: Set<string>
  nodes: Node[]
}

function BulkLinkModal({ isOpen, onClose, selectedNodes, nodes }: BulkLinkModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { linkAsChild } = useNodesStore()
  
  // Filter out selected nodes from parent options
  const availableParents = nodes.filter(node => !selectedNodes.has(node.id))
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedParentId) return
    
    setLoading(true)
    try {
      // Link all selected nodes as children of the selected parent
      for (const nodeId of selectedNodes) {
        await linkAsChild(selectedParentId, nodeId)
      }
      onClose()
    } catch (error) {
      // Failed to link nodes
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Link Selected Nodes as Children">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Parent Node
          </label>
          <select
            value={selectedParentId}
            onChange={(e) => setSelectedParentId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
            required
          >
            <option value="">Choose a parent node...</option>
            {availableParents.map(node => (
              <option key={node.id} value={node.id}>
                {node.title || 'Untitled'} ({node.type})
              </option>
            ))}
          </select>
        </div>
        
        <div className="text-sm text-gray-600">
          <p>This will link {selectedNodes.size} selected node{selectedNodes.size > 1 ? 's' : ''} as children of the selected parent.</p>
        </div>
        
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
            disabled={loading || !selectedParentId}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Linking...
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4 mr-2" />
                Link as Children
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function NodeCreateModal({ isOpen, onClose, userId }: NodeCreateModalProps) {
  const [text, setText] = useState('')
  const [shouldUseAI, setShouldUseAI] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createNode, loadNodes, nodes } = useNodesStore()
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

interface NodeCardProps {
  node: Node
  onCreateChild?: (node: Node) => void
  onCreateParent?: (node: Node) => void
  onNodeClick?: (node: Node) => void
  isSelected?: boolean
  onSelect?: (nodeId: string, selected: boolean) => void
  selectMode?: boolean
  userId: string
  userName?: string
}

function NodeCard({ node, onCreateChild, onCreateParent, onNodeClick, isSelected = false, onSelect, selectMode = false, userId, userName }: NodeCardProps) {
  const { updateNode, deleteNode, getNodeChildren, getNodeParent, toggleNodePin } = useNodesStore()
  const [showDetails, setShowDetails] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showRecurrenceDialog, setShowRecurrenceDialog] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const parent = getNodeParent(node.id)
  const children = getNodeChildren(node.id)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as HTMLElement)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const handleCompletionToggle = () => {
    updateNode(node.id, { completed: !node.completed })
  }
  
  const handlePinToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await toggleNodePin(node.id)
  }

  const handleSaveRecurrence = async (
    nodeId: string, 
    pattern: RecurrencePattern | undefined,
    taskType: 'recurring' | 'habit'
  ) => {
    console.log('=== handleSaveRecurrence called ===')
    console.log('nodeId:', nodeId)
    console.log('pattern:', pattern)
    console.log('taskType:', taskType)
    
    if (!pattern) {
      // Remove recurrence
      console.log('Removing recurrence')
      await updateNode(nodeId, {
        taskType: 'one-time',
        recurrence: undefined,
      } as any)
    } else {
      // Transform RecurrencePattern to Recurrence structure
      const recurrence: any = {
        frequency: pattern.type as any,
        interval: pattern.frequency || 1,
      }
      
      // Only add optional fields if they have values
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        recurrence.daysOfWeek = pattern.daysOfWeek.map(d => {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          return days[d] as any
        })
      }
      
      if (pattern.endDate) {
        recurrence.endDate = pattern.endDate
      }
      
      console.log('Transformed recurrence object:', recurrence)
      
      const updateData = {
        taskType,
        recurrence,
      }
      
      console.log('Updating node with:', updateData)
      
      await updateNode(nodeId, updateData as any)
      
      // Wait a moment and then check if the update persisted
      setTimeout(async () => {
        const { db } = await import('@/lib/firebase')
        const { doc, getDoc } = await import('firebase/firestore')
        
        // Get the node from the store
        const nodeStore = useNodesStore.getState()
        const currentNode = nodeStore.nodes.find(n => n.id === nodeId)
        if (currentNode) {
          const docRef = doc(db, 'users', currentNode.userId, 'nodes', nodeId)
          const docSnap = await getDoc(docRef)
          
          if (docSnap.exists()) {
            const data = docSnap.data()
            console.log('Direct Firestore check after 1 second:', {
              id: nodeId,
              taskType: data.taskType,
              recurrence: data.recurrence,
              allKeys: Object.keys(data)
            })
          }
        }
      }, 1000)
    }
    setShowRecurrenceDialog(false)
  }

  const getQuadrantColor = (urgency?: number, importance?: number) => {
    const quadrant = getEisenhowerQuadrant(urgency, importance)
    switch (quadrant) {
      case 'do-first': return 'text-red-600 bg-red-100'
      case 'schedule': return 'text-blue-600 bg-blue-100'
      case 'delegate': return 'text-yellow-600 bg-yellow-100'
      case 'eliminate': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <Card className={`hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${isSelected ? 'ring-2 ring-brain-500' : ''} ${node.isPinned ? 'bg-yellow-50 border-yellow-300' : ''}`}>
      <CardContent className="p-3" onClick={() => !selectMode && onNodeClick?.(node)}>
        <div className="flex items-start gap-2 mb-2">
          {/* Checkbox/Complete button */}
          {selectMode ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelect?.(node.id, !isSelected)
              }}
              className="flex-shrink-0 mt-0.5"
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-brain-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCompletionToggle()
              }}
              className="flex-shrink-0 mt-0.5"
            >
              {node.completed ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
          
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <span className="text-base flex-shrink-0">{getNodeTypeIcon(node.type)}</span>
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium text-sm ${node.completed ? 'line-through text-gray-500' : 'text-gray-900'} line-clamp-1`}>
                  {node.title || node.description?.substring(0, 100) || 'Untitled'}
                </h3>
                {node.description && node.description !== node.title && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {node.description}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {node.isPinned && (
              <Pin className={`w-3 h-3 fill-yellow-500 text-yellow-500`} />
            )}
            <div className="relative" ref={dropdownRef}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDropdown(!showDropdown)
                }}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
              
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-card dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-50">
                  <div className="py-1">
                    <button
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePinToggle(e)
                        setShowDropdown(false)
                      }}
                    >
                      <Pin className="w-4 h-4 mr-2" />
                      {node.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowRecurrenceDialog(true)
                        setShowDropdown(false)
                      }}
                    >
                      <Repeat className="w-4 h-4 mr-2" />
                      {(node as any).taskType === 'recurring' || (node as any).taskType === 'habit' 
                        ? 'Edit Recurrence' 
                        : 'Make Recurring'}
                    </button>
                    <button
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowUpdateModal(true)
                        setShowDropdown(false)
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Updates {node.updates && node.updates.length > 0 && `(${node.updates.length})`}
                    </button>
                    <button
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowCalendarModal(true)
                        setShowDropdown(false)
                      }}
                    >
                      {node.calendarEventId ? (
                        <>
                          <Calendar className="w-4 h-4 mr-2" />
                          View Calendar Event
                        </>
                      ) : (
                        <>
                          <CalendarPlus className="w-4 h-4 mr-2" />
                          Add to Calendar
                        </>
                      )}
                    </button>
                    <button
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCreateChild?.(node)
                        setShowDropdown(false)
                      }}
                    >
                      <GitBranch className="w-4 h-4 mr-2" />
                      Add Child Node
                    </button>
                    <button
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCreateParent?.(node)
                        setShowDropdown(false)
                      }}
                    >
                      <GitMerge className="w-4 h-4 mr-2" />
                      Add Parent Node
                    </button>
                    <button
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDetails(!showDetails)
                        setShowDropdown(false)
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {showDetails ? 'Hide' : 'Show'} Details
                    </button>
                    <div className="border-t border-border dark:border-gray-700 my-1"></div>
                    <button
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const hasRelationships = parent || children.length > 0
                        if (hasRelationships) {
                          const message = `This node has relationships:\n${parent ? '- 1 parent node\n' : ''}${children.length > 0 ? `- ${children.length} child node(s)\n` : ''}\nDeleting will unlink all relationships. Continue?`
                          if (window.confirm(message)) {
                            await deleteNode(node.id)
                          }
                        } else {
                          if (window.confirm('Are you sure you want to delete this node?')) {
                            await deleteNode(node.id)
                          }
                        }
                        setShowDropdown(false)
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags and metadata */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getNodeTypeColor(node.type)} bg-opacity-10`}>
              {node.type}
            </span>
            <span className={`px-1.5 py-0.5 text-xs rounded-full ${getQuadrantColor(node.urgency, node.importance)}`}>
              {getEisenhowerQuadrant(node.urgency, node.importance).replace('-', ' ')}
            </span>
            {node.tags && node.tags.length > 0 && (
              <>
                {node.tags.slice(0, 2).map((tag: string) => (
                  <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    #{tag}
                  </span>
                ))}
                {node.tags.length > 2 && (
                  <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    +{node.tags.length - 2}
                  </span>
                )}
              </>
            )}
            {parent && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded flex items-center gap-0.5">
                <GitMerge className="w-2.5 h-2.5" />
                Child
              </span>
            )}
            {children.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded flex items-center gap-0.5">
                <GitBranch className="w-2.5 h-2.5" />
                {children.length}
              </span>
            )}
            {((node as any).taskType === 'recurring' || (node as any).taskType === 'habit') && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded flex items-center gap-0.5">
                <Repeat className="w-2.5 h-2.5" />
              </span>
            )}
            {node.calendarEventId && (
              <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            {/* Relationships */}
            {(parent || children.length > 0) && (
              <div className="space-y-1">
                {parent && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Parent:</span>{' '}
                    <span className="text-purple-600 hover:underline cursor-pointer">
                      {parent.title || 'Untitled'}
                    </span>
                  </div>
                )}
                
                {children.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Children ({children.length}):</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {children.map((child) => (
                        <span 
                          key={child.id}
                          className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 cursor-pointer"
                        >
                          {child.title || 'Untitled'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Metadata */}
            <div className="text-xs text-gray-500">
              {node.urgency && node.importance && (
                <div>Priority: Urgency {node.urgency}/10, Importance {node.importance}/10</div>
              )}
              {node.dueDate?.type === 'exact' && (
                <div>Due: {new Date(node.dueDate.date).toLocaleDateString()}</div>
              )}
              <div>Updated: {node.updatedAt ? new Date(node.updatedAt).toLocaleDateString() : 'Unknown'}</div>
            </div>
          </div>
        )}

      </CardContent>
      
      {showUpdateModal && (
        <NodeUpdateModal
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          node={node}
          userId={userId}
          userName={userName}
        />
      )}
      
      {showRecurrenceDialog && (
        <RecurrenceDialog
          taskId={node.id}
          taskLabel={node.title || node.description || 'Untitled'}
          currentPattern={(node as any).recurrence ? {
            type: (node as any).recurrence.frequency,
            frequency: (node as any).recurrence.interval,
            daysOfWeek: (node as any).recurrence.daysOfWeek?.map((day: string) => {
              const dayMap: Record<string, number> = {
                'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                'Thursday': 4, 'Friday': 5, 'Saturday': 6
              }
              return dayMap[day]
            }),
            startDate: node.createdAt?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
            endDate: (node as any).recurrence.endDate,
          } : undefined}
          currentTaskType={(node as any).taskType}
          onSave={handleSaveRecurrence}
          onClose={() => setShowRecurrenceDialog(false)}
        />
      )}
      
      {showCalendarModal && (
        <CalendarEventModal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          node={node}
          onEventCreated={async (eventId, calendarId) => {
            // Update node with calendar event info
            await updateNode(node.id, {
              calendarEventId: eventId,
              calendarId: calendarId
            })
            setShowCalendarModal(false)
          }}
        />
      )}
    </Card>
  )
}

export default function NodesClient({ userId }: { userId: string }) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<NodeType | 'all'>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'tree' | 'graph'>('grid')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [showCompleted, setShowCompleted] = useState(false)
  const [relationshipModal, setRelationshipModal] = useState<{
    isOpen: boolean
    sourceNode: Node | null
    type: 'child' | 'parent'
  }>({ isOpen: false, sourceNode: null, type: 'child' })
  const [bulkLinkModalOpen, setBulkLinkModalOpen] = useState(false)
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false)
  const [nodeDetailModal, setNodeDetailModal] = useState<{
    isOpen: boolean
    node: Node | null
  }>({ isOpen: false, node: null })
  const [showExportModal, setShowExportModal] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  
  const { nodes, isLoading, loadNodes, deleteNode } = useNodesStore()
  const { currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode } = useUserPreferencesStore()

  useEffect(() => {
    loadNodes(userId)
  }, [userId, loadNodes])

  // Filter nodes based on search and filters
  const filteredNodes = nodes.filter(node => {
    // First check if node should be shown based on mode
    if (!shouldShowNode(node.tags, node.isPersonal, currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode)) {
      return false
    }
    
    // Filter out completed nodes if showCompleted is false
    if (!showCompleted && node.completed) {
      return false
    }
    
    const matchesSearch = !searchQuery || 
      node.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesType = selectedType === 'all' || node.type === selectedType
    const matchesTag = selectedTag === 'all' || node.tags?.includes(selectedTag)
    
    return matchesSearch && matchesType && matchesTag
  })

  // Get unique tags
  const allTags = Array.from(new Set(nodes.flatMap(node => node.tags || []))).sort()

  // Handlers for relationship creation
  const handleCreateChild = (parentNode: Node) => {
    setRelationshipModal({
      isOpen: true,
      sourceNode: parentNode,
      type: 'child'
    })
  }

  const handleCreateParent = (childNode: Node) => {
    setRelationshipModal({
      isOpen: true,
      sourceNode: childNode,
      type: 'parent'
    })
  }

  const closeRelationshipModal = () => {
    setRelationshipModal({
      isOpen: false,
      sourceNode: null,
      type: 'child'
    })
  }

  // Selection handlers
  const handleNodeSelect = (nodeId: string, selected: boolean) => {
    setSelectedNodes(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(nodeId)
      } else {
        next.delete(nodeId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedNodes(new Set(filteredNodes.map(n => n.id)))
  }

  const handleDeselectAll = () => {
    setSelectedNodes(new Set())
  }

  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    if (selectMode) {
      // Exiting select mode, clear selections
      setSelectedNodes(new Set())
    }
  }

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedNodes.size === 0) return
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedNodes.size} nodes?`)
    if (!confirmed) return

    for (const nodeId of selectedNodes) {
      await deleteNode(nodeId)
    }
    
    setSelectedNodes(new Set())
    setSelectMode(false)
  }

  const handleBulkLinkAsChildren = () => {
    if (selectedNodes.size === 0) {
      alert('Please select at least one node to link')
      return
    }
    
    setBulkLinkModalOpen(true)
  }

  const handleBulkTagOperations = () => {
    if (selectedNodes.size === 0) {
      alert('Please select at least one node to modify tags')
      return
    }
    
    setBulkTagModalOpen(true)
  }

  // Export nodes to JSON
  const exportNodes = () => {
    const dataStr = JSON.stringify(nodes, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
    const exportFileDefaultName = `brain-space-nodes-${format(new Date(), 'yyyy-MM-dd')}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Handle node click in tree view
  const handleNodeClick = (node: Node) => {
    setNodeDetailModal({ isOpen: true, node })
  }
  
  const closeNodeDetailModal = () => {
    setNodeDetailModal({ isOpen: false, node: null })
  }
  
  // Import nodes from JSON
  const importNodes = async (event: React.ChangeEvent<HTMLInputElement>) => {
    
    const file = event.target.files?.[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const importedNodes = JSON.parse(text) as Node[]
      
      // Import each node
      for (const node of importedNodes) {
        const { id: _, userId: __, ...nodeData } = node
        await useNodesStore.getState().createNode({
          ...nodeData,
          userId: userId,
        })
      }
      
      await loadNodes(userId)
      alert(`Successfully imported ${importedNodes.length} nodes`)
    } catch (error) {
      // Failed to import nodes
      alert('Failed to import nodes. Please check the file format.')
    }
    
    // Reset input
    event.target.value = ''
  }

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brain-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading nodes...</p>
          </div>
        </div>
    )
  }

  return (
      <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 min-h-screen">
        <div className="max-w-7xl mx-auto overflow-x-hidden">
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Network className="w-12 h-12 text-primary-foreground" />
                <div>
                  <h1 className="text-4xl font-bold text-primary-foreground">My Nodes</h1>
                  <p className="text-primary-foreground/80 text-lg">
                    Organize your thoughts, tasks, and ideas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Select Mode Toggle */}
                <Button
                  variant="outline"
                  onClick={toggleSelectMode}
                  className={`flex items-center gap-2 ${
                    selectMode 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary' 
                      : 'bg-background/10 border-background/20 text-primary-foreground hover:bg-background/20'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  {selectMode ? 'Exit Select' : 'Select'}
                </Button>
                
                {/* Import */}
                <label className="cursor-pointer">
                  <input type="file" accept=".json" onChange={importNodes} className="hidden" />
                  <Button variant="outline" className="flex items-center gap-2 bg-background/10 border-background/20 text-primary-foreground hover:bg-background/20">
                    <Upload className="w-4 h-4" />
                    Import
                  </Button>
                </label>
                
                {/* Export */}
                <Button
                  variant="outline"
                  onClick={exportNodes}
                  className="flex items-center gap-2 bg-background/10 border-background/20 text-primary-foreground hover:bg-background/20"
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                
                {/* Export Updates */}
                <Button
                  variant="outline"
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 bg-background/10 border-background/20 text-primary-foreground hover:bg-background/20"
                >
                  <FileText className="w-4 h-4" />
                  Export Updates
                </Button>
                
                {/* Bulk Import */}
                <Button
                  variant="outline"
                  onClick={() => setShowBulkImportModal(true)}
                  className="flex items-center gap-2 bg-background/10 border-background/20 text-primary-foreground hover:bg-background/20"
                >
                  <Calendar className="w-4 h-4" />
                  Bulk Import
                </Button>
                
                {/* Daily Standup (Work Mode Only) */}
                {currentMode === 'work' && (
                  <StandupSummaryDialog
                    trigger={
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 bg-background/10 border-background/20 text-primary-foreground hover:bg-background/20"
                      >
                        <Mic className="w-4 h-4" />
                        Daily Standup
                      </Button>
                    }
                  />
                )}
                
                {/* Add Node */}
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Node
                </Button>
              </div>
            </div>
            
            {/* AI Provider Selector and Mode Toggle */}
            <div className="mt-4 flex justify-between items-center">
              <ModeToggle />
              <AIProviderSelector />
            </div>
          </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-brain-100 rounded-lg flex items-center justify-center">
                  <Network className="w-4 h-4 text-brain-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Nodes</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredNodes.length}</p>
                  {currentMode !== 'all' && (
                    <p className="text-xs text-gray-500">{currentMode} mode</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {nodes.filter(n => n.completed).length}
                  </p>
                  {!showCompleted && nodes.filter(n => n.completed).length > 0 && (
                    <p className="text-xs text-gray-500">Hidden</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredNodes.filter(n => n.type === 'task').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Tag className="w-4 h-4 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tags</p>
                  <p className="text-2xl font-bold text-gray-900">{allTags.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search nodes..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                {/* View Mode Toggle */}
                <div className="flex rounded-lg border border-gray-300">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 flex items-center gap-2 rounded-l-lg transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-brain-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                    <span className="text-sm">Grid</span>
                  </button>
                  <button
                    onClick={() => setViewMode('tree')}
                    className={`px-3 py-2 flex items-center gap-2 transition-colors ${
                      viewMode === 'tree' 
                        ? 'bg-brain-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <TreePine className="w-4 h-4" />
                    <span className="text-sm">Tree</span>
                  </button>
                  <button
                    onClick={() => setViewMode('graph')}
                    className={`px-3 py-2 flex items-center gap-2 rounded-r-lg transition-colors ${
                      viewMode === 'graph' 
                        ? 'bg-brain-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm">Graph</span>
                  </button>
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as NodeType | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="goal">Goals</option>
                  <option value="project">Projects</option>
                  <option value="task">Tasks</option>
                  <option value="idea">Ideas</option>
                  <option value="question">Questions</option>
                  <option value="problem">Problems</option>
                  <option value="insight">Insights</option>
                  <option value="thought">Thoughts</option>
                  <option value="concern">Concerns</option>
                </select>
                
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>#{tag}</option>
                  ))}
                </select>
                
                {/* Show Completed Toggle */}
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
                  <input
                    type="checkbox"
                    id="showCompleted"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="rounded border-gray-300 text-brain-600 focus:ring-brain-500"
                  />
                  <label htmlFor="showCompleted" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                    Show completed
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Toolbar */}
        {selectMode && selectedNodes.size > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedNodes.size} node{selectedNodes.size > 1 ? 's' : ''} selected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAll}
                    className="text-xs"
                  >
                    Select All ({filteredNodes.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeselectAll}
                    className="text-xs"
                  >
                    Deselect All
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkTagOperations}
                    className="flex items-center gap-1"
                  >
                    <Tag className="w-4 h-4" />
                    Bulk Tags
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkLinkAsChildren}
                    className="flex items-center gap-1"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Link as Children
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nodes Display - Grid, Tree, or Graph */}
        {viewMode === 'grid' ? (
          // Grid View
          filteredNodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNodes
                .sort((a, b) => {
                  // Sort pinned nodes first
                  if (a.isPinned && !b.isPinned) return -1
                  if (!a.isPinned && b.isPinned) return 1
                  // Then by priority (urgency + importance)
                  const priorityA = (a.urgency || 0) + (a.importance || 0)
                  const priorityB = (b.urgency || 0) + (b.importance || 0)
                  return priorityB - priorityA
                })
                .map((node) => (
                  <NodeCard 
                    key={node.id} 
                    node={node} 
                    onCreateChild={handleCreateChild}
                    onCreateParent={handleCreateParent}
                    onNodeClick={handleNodeClick}
                    isSelected={selectedNodes.has(node.id)}
                    onSelect={handleNodeSelect}
                    selectMode={selectMode}
                    userId={userId}
                    userName="Me"
                  />
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-brain-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Network className="w-8 h-8 text-brain-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No nodes found</h3>
                <p className="text-gray-500 mb-4">
                  {nodes.length === 0 
                    ? "Create your first node to start organizing your thoughts with AI assistance."
                    : "Try adjusting your search or filters."}
                </p>
                {nodes.length === 0 && (
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    variant="primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Node
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        ) : viewMode === 'tree' ? (
          // Tree View
          <NodeHierarchyView
            nodes={filteredNodes}
            onCreateChild={handleCreateChild}
            onCreateParent={handleCreateParent}
            onNodeClick={handleNodeClick}
            searchQuery={searchQuery}
            selectMode={selectMode}
            selectedNodes={selectedNodes}
            onNodeSelect={handleNodeSelect}
          />
        ) : (
          // Graph View
          <Card>
            <CardContent className="p-0">
              <NodeGraphView
                nodes={filteredNodes}
                onCreateChild={handleCreateChild}
                onCreateParent={handleCreateParent}
              />
            </CardContent>
          </Card>
        )}

        <NodeCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          userId={userId}
        />
        
        {relationshipModal.sourceNode && (
          <NodeRelationshipModal
            isOpen={relationshipModal.isOpen}
            onClose={closeRelationshipModal}
            sourceNode={relationshipModal.sourceNode}
            relationshipType={relationshipModal.type}
          />
        )}
        
        <BulkLinkModal
          isOpen={bulkLinkModalOpen}
          onClose={() => {
            setBulkLinkModalOpen(false)
            setSelectedNodes(new Set())
            setSelectMode(false)
          }}
          selectedNodes={selectedNodes}
          nodes={nodes}
        />
        
        {nodeDetailModal.node && (
          <NodeDetailModal
            isOpen={nodeDetailModal.isOpen}
            onClose={closeNodeDetailModal}
            node={nodeDetailModal.node}
            userId={userId}
            userName="Me"
            onCreateChild={handleCreateChild}
            onCreateParent={handleCreateParent}
            onRelationshipChange={() => {
              // Force reload nodes to update tree view
              loadNodes(userId)
            }}
          />
        )}
        
        <UpdateExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />
        
        <BulkTagModal
          isOpen={bulkTagModalOpen}
          onClose={() => {
            setBulkTagModalOpen(false)
            setSelectedNodes(new Set())
            setSelectMode(false)
          }}
          selectedNodeIds={selectedNodes}
        />
        
        <BulkScheduleImportModal
          isOpen={showBulkImportModal}
          onClose={() => {
            setShowBulkImportModal(false)
            // Reload nodes to show newly imported ones
            loadNodes(userId)
          }}
          userId={userId}
        />
        </div>
      </div>
  )
}