'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useNodesStore } from '@/store/nodes'
import type { Node } from '@/types/node'
import { getNodeTypeColor, getNodeTypeIcon, getEisenhowerQuadrant } from '@/types/node'
import { RecurrenceDialog } from '@/components/RecurrenceDialog'
import { RecurrencePattern } from '@/types/recurrence'
import {
  MoreHorizontal,
  CheckCircle,
  Circle,
  GitBranch,
  GitMerge,
  CheckSquare,
  Square,
  Trash2,
  MessageSquare,
  Pin,
  Repeat,
  Edit,
  Calendar,
  CalendarPlus,
  Clock
} from '@/lib/icons'
import dayjs from '@/lib/dayjs'

// Dynamic imports for modal components
import dynamic from 'next/dynamic'
const NodeUpdateModal = dynamic(() => import('@/components/nodes/NodeUpdateModal').then(mod => ({ default: mod.NodeUpdateModal })), { ssr: false })
const CalendarEventModal = dynamic(() => import('@/components/CalendarEventModal').then(mod => ({ default: mod.CalendarEventModal })), { ssr: false })

import { isSnoozed, formatSnoozeUntil } from '@/lib/snooze'
import { SnoozeInput } from '@/components/nodes/SnoozeInput'

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

export function NodeCard({ node, onCreateChild, onCreateParent, onNodeClick, isSelected = false, onSelect, selectMode = false, userId, userName }: NodeCardProps) {
  const updateNode = useNodesStore(state => state.updateNode)
  const deleteNode = useNodesStore(state => state.deleteNode)
  const getNodeChildren = useNodesStore(state => state.getNodeChildren)
  const getNodeParent = useNodesStore(state => state.getNodeParent)
  const toggleNodePin = useNodesStore(state => state.toggleNodePin)
  const snoozeNode = useNodesStore(state => state.snoozeNode)
  const unsnoozeNode = useNodesStore(state => state.unsnoozeNode)
  const [showDetails, setShowDetails] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showRecurrenceDialog, setShowRecurrenceDialog] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [showSnoozeInput, setShowSnoozeInput] = useState(false)
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
  
  const handleSnooze = async (until: Date) => {
    await snoozeNode(node.id, until)
    setShowSnoozeInput(false)
    setShowDropdown(false)
  }
  
  const handleUnsnooze = async () => {
    await unsnoozeNode(node.id)
    setShowDropdown(false)
  }

  const handleSaveRecurrence = async (
    nodeId: string, 
    pattern: RecurrencePattern | undefined,
    taskType: 'recurring' | 'habit'
  ) => {

    if (!pattern) {
      // Remove recurrence

      await updateNode(nodeId, {
        taskType: 'one-time',
        recurrence: undefined,
      })
    } else {
      // Transform RecurrencePattern to Recurrence structure
      const recurrence: Partial<Node['recurrence']> = {
        frequency: pattern.type as 'daily' | 'weekly' | 'monthly' | 'custom',
        interval: pattern.frequency || 1,
      }
      
      // Only add optional fields if they have values
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        recurrence.daysOfWeek = pattern.daysOfWeek.map(d => {
          const days: Array<'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'> = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          return days[d]
        })
      }
      
      if (pattern.endDate) {
        recurrence.endDate = pattern.endDate
      }

      const updateData = {
        taskType,
        recurrence,
      }

      await updateNode(nodeId, updateData)
      
      // Verify update persisted using proper async pattern instead of setTimeout
      try {
        const { db } = await import('@/lib/firebase')
        const { doc, getDoc } = await import('firebase/firestore')
        
        // Get the node from the store
        const nodeStore = useNodesStore.getState()
        const currentNode = nodeStore.nodes.find(n => n.id === nodeId)
        if (currentNode) {
          const docRef = doc(db, 'users', currentNode.userId, 'nodes', nodeId)
          const docSnap = await getDoc(docRef)
          
          if (docSnap.exists()) {
            // Recurrence update verified in Firestore
          }
        }
      } catch (error) {
        // Failed to verify recurrence update
      }
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
    <Card className={`hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${isSelected ? 'ring-2 ring-brain-500' : ''} ${node.isPinned ? 'bg-yellow-50 border-yellow-300' : ''} ${isSnoozed(node) ? 'opacity-60 bg-gray-50' : ''} ${'isOptimistic' in node && (node as any).isOptimistic ? 'opacity-70 animate-pulse' : ''}`}>
      <CardContent className="p-3" onClick={() => !selectMode && onNodeClick?.(node)}>
        {/* Optimistic update indicator */}
        {'isOptimistic' in node && (node as any).isOptimistic && (
          <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
            <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Creating...</span>
          </div>
        )}
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
            {isSnoozed(node) && (
              <Clock className={`w-3 h-3 text-gray-500`} title={`Snoozed until ${formatSnoozeUntil(node.snoozedUntil!)}`} />
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
              
              {showSnoozeInput && (
                <div className="absolute right-0 mt-2 z-50">
                  <SnoozeInput
                    onSnooze={handleSnooze}
                    onCancel={() => setShowSnoozeInput(false)}
                  />
                </div>
              )}
              
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
                    {isSnoozed(node) ? (
                      <button
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent dark:hover:bg-gray-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUnsnooze()
                        }}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Unsnooze ({formatSnoozeUntil(node.snoozedUntil!)})
                      </button>
                    ) : (
                      <button
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent dark:hover:bg-gray-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowSnoozeInput(true)
                          setShowDropdown(false)
                        }}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Snooze
                      </button>
                    )}
                    <button
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowRecurrenceDialog(true)
                        setShowDropdown(false)
                      }}
                    >
                      <Repeat className="w-4 h-4 mr-2" />
                      {'taskType' in node && ((node as any).taskType === 'recurring' || (node as any).taskType === 'habit')
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
                      onClick={async (e) => {
                        e.stopPropagation()
                        await updateNode(node.id, { isPersonal: !node.isPersonal })
                        setShowDropdown(false)
                      }}
                    >
                      {node.isPersonal ? (
                        <>
                          <span className="w-4 h-4 mr-2">💼</span>
                          Switch to Work
                        </>
                      ) : (
                        <>
                          <span className="w-4 h-4 mr-2">🏠</span>
                          Switch to Personal
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
            {'taskType' in node && ((node as any).taskType === 'recurring' || (node as any).taskType === 'habit') && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded flex items-center gap-0.5">
                <Repeat className="w-2.5 h-2.5" />
              </span>
            )}
            {node.calendarEventId && (
              <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
              </span>
            )}
            {node.isPersonal !== undefined && (
              <span className={`px-1.5 py-0.5 text-xs rounded flex items-center gap-0.5 ${
                node.isPersonal 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {node.isPersonal ? '🏠' : '💼'}
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
                <div>Due: {dayjs(node.dueDate.date).format('MMM D, YYYY')}</div>
              )}
              <div>Updated: {node.updatedAt ? dayjs(node.updatedAt).format('MMM D, YYYY') : 'Unknown'}</div>
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
          currentPattern={node.recurrence ? {
            type: node.recurrence.frequency,
            frequency: node.recurrence.interval,
            daysOfWeek: node.recurrence.daysOfWeek?.map((day) => {
              const dayMap: Record<typeof day, number> = {
                'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                'Thursday': 4, 'Friday': 5, 'Saturday': 6
              }
              return dayMap[day]
            }),
            startDate: node.createdAt?.split('T')[0] || dayjs().format('YYYY-MM-DD'),
            endDate: node.recurrence.endDate,
          } : undefined}
          currentTaskType={'taskType' in node ? (node as any).taskType : undefined}
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

export default NodeCard