'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Clock, Calendar, Mic, Sparkles, Settings, Settings2, CalendarSync, ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, X } from '@/lib/icons'
import { type TimeboxTask } from '@/store/timeboxStore'
import { 
  useTimeSlots,
  useSelectedDate,
  useCalendarSyncEnabled,
  useHoveredSlotId,
  useTimeboxActions,
  useTimeSlotsWithCalendarEvents,
  useTimeboxStats
} from '@/hooks/useTimeboxSelectors'
import { useNodesStore } from '@/store/nodeStore'
import { useUserPreferencesStore } from '@/store/userPreferencesStore'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import dayjs from '@/lib/dayjs'
import { cn } from '@/lib/utils'

// Dynamic imports for heavy components
import dynamic from 'next/dynamic'
const StandupSummaryDialog = dynamic(() => import('@/components/StandupSummaryDialog'), { ssr: false })
const TimeboxRecommendationsDialog = dynamic(() => import('@/components/TimeboxRecommendationsDialog'), { ssr: false })
const ScheduleSettingsDialog = dynamic(() => import('@/components/ScheduleSettingsDialog'), { ssr: false })
const NodeDetailModal = dynamic(() => import('@/components/nodes/NodeDetailModal').then(mod => ({ default: mod.NodeDetailModal })), { ssr: false })
const NodeRelationshipModal = dynamic(() => import('@/components/nodes/NodeRelationshipModal').then(mod => ({ default: mod.NodeRelationshipModal })), { ssr: false })

// Local component imports
import { TimeboxNodePool } from '@/components/timebox/TimeboxNodePool'
import { TimeSlotsList } from '@/components/timebox/TimeSlotsList'
import { QuickBlockTemplates } from '@/components/timebox/QuickBlockTemplates'
import { useTimeboxCalendar } from '@/hooks/useTimeboxCalendar'
import { useTimeboxNavigation } from '@/hooks/useTimeboxNavigation'
import { useTimeboxDragDrop } from '@/hooks/useTimeboxDragDrop'
import { useTimeboxFilters } from '@/hooks/useTimeboxFilters'

import { type Node, type NodeType } from '@/types/node'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function TimeboxClient({ userId }: { userId: string }) {
  // Use optimized selectors
  const selectedDate = useSelectedDate()
  const timeSlots = useTimeSlots()
  const hoveredSlotId = useHoveredSlotId()
  const calendarSyncEnabled = useCalendarSyncEnabled()
  const displaySlots = useTimeSlotsWithCalendarEvents()
  const stats = useTimeboxStats()
  
  // Actions
  const {
    setSelectedDate,
    updateTaskInSlot,
    removeTaskFromSlot,
    loadTimeboxData,
    initializeTimeSlots,
    blockTimeSlot,
    unblockTimeSlot,
    setHoveredSlotId
  } = useTimeboxActions()
  
  // Store state
  const { nodes, loadNodes, getNodeById, getNodeChildren } = useNodesStore()
  const { 
    getEffectiveTimeboxInterval, 
    setTimeboxInterval, 
    currentMode, 
    updateSettings,
    hidePersonalInWorkMode,
    hideWorkInPersonalMode
  } = useUserPreferencesStore()
  const { isConnected } = useGoogleCalendar()
  
  // Local state
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [showIntervalSettings, setShowIntervalSettings] = useState(false)
  const [currentTimeSlotId, setCurrentTimeSlotId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showNodeDetail, setShowNodeDetail] = useState(false)
  const [relationshipModal, setRelationshipModal] = useState<{
    isOpen: boolean
    sourceNode: Node | null
    type: 'parent' | 'child'
  }>({
    isOpen: false,
    sourceNode: null,
    type: 'child'
  })
  
  const effectiveInterval = getEffectiveTimeboxInterval()
  
  // Custom hooks for extracted functionality
  const { calendarSyncError, setCalendarSyncError, loadCalendarEvents } = useTimeboxCalendar(userId, selectedDate)
  const { goToPreviousDay, goToNextDay, goToToday, copyIncompleteTasks } = useTimeboxNavigation()
  const { handleDragStart, handleDragEnd, handleDragOver, handleDrop } = useTimeboxDragDrop(userId, selectedDate)
  const {
    nodeFilterMode,
    setNodeFilterMode,
    selectedNodeType,
    setSelectedNodeType,
    searchQuery,
    setSearchQuery,
    unscheduledNodes,
    availableNodeTypes,
    clearFilters
  } = useTimeboxFilters(nodes, timeSlots, currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode)
  
  // Prevent hydration mismatch by ensuring client-side rendering
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Initialize time slots with correct interval
  useEffect(() => {
    initializeTimeSlots(effectiveInterval)
  }, [effectiveInterval, initializeTimeSlots])
  
  // Load data on mount and date change
  useEffect(() => {
    if (selectedDate) {
      loadNodes(userId)
      loadTimeboxData(userId, selectedDate, effectiveInterval)
    }
  }, [userId, selectedDate, effectiveInterval, loadNodes, loadTimeboxData])
  
  // Load calendar events when sync is enabled
  useEffect(() => {
    if (calendarSyncEnabled && isConnected) {
      loadCalendarEvents()
    }
  }, [calendarSyncEnabled, isConnected, loadCalendarEvents])
  
  // Find current time slot for highlighting
  useEffect(() => {
    if (!isClient || !selectedDate) return
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeMinutes = currentHour * 60 + currentMinute
    
    const currentSlot = timeSlots.find(slot => {
      const [startHour, startMinute] = slot.startTime.split(':').map(Number)
      const [endHour, endMinute] = slot.endTime.split(':').map(Number)
      const slotStartMinutes = startHour * 60 + startMinute
      const slotEndMinutes = endHour * 60 + endMinute
      return currentTimeMinutes >= slotStartMinutes && currentTimeMinutes < slotEndMinutes
    })
    
    if (currentSlot) {
      setCurrentTimeSlotId(currentSlot.id)
    }
  }, [timeSlots, selectedDate, isClient])
  
  // Local handlers
  const handleTaskClick = (task: TimeboxTask) => {
    if (task.nodeId) {
      setSelectedNodeId(task.nodeId)
      setShowNodeDetail(true)
    }
  }
  
  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }
  
  const getTaskChildren = (nodeId?: string) => {
    if (!nodeId) return []
    const node = getNodeById(nodeId)
    if (!node?.children || node.children.length === 0) return []
    return getNodeChildren(nodeId)
  }
  
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
  
  // Navigation handlers
  const handleGoToPreviousDay = () => {
    goToPreviousDay(selectedDate)
  }
  
  const handleGoToNextDay = () => {
    goToNextDay(selectedDate)
  }
  
  const handleGoToToday = () => {
    goToToday()
  }
  
  const handlePlanTomorrow = () => {
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
    setSelectedDate(tomorrow)
  }
  
  const handleCopyIncompleteTasks = async () => {
    try {
      return await copyIncompleteTasks(userId, selectedDate, timeSlots)
    } catch (error) {
      setCalendarSyncError('Failed to copy tasks from today')
      return 0
    }
  }
  // Use stats from selector
  const { totalScheduledTasks, completedTasks, occupiedSlots } = stats
  const totalHours = occupiedSlots * (effectiveInterval / 60)

  // Show loading state until client-side hydration and selectedDate is initialized
  if (!isClient || !selectedDate) {
    return (
      <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Timebox Error</h2>
            <p className="text-gray-600 mb-4">Something went wrong with your schedule management. Please refresh the page to continue.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-brain-600 text-white rounded-lg hover:bg-brain-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-4 sm:p-8 h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        <div className="max-w-7xl mx-auto flex-1 flex flex-col overflow-hidden w-full">
          {/* Header Section */}
          <header className="mb-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Timebox Schedule</h1>
                  <p className="text-white/80 text-xs sm:text-sm">
                    {effectiveInterval === 30 ? '30-min' : effectiveInterval === 60 ? '1-hour' : '2-hour'} blocks
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <TimeboxRecommendationsDialog 
                  userId={userId}
                  date={selectedDate}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 text-white hover:bg-white/20 border-white/20 gap-1 px-2 sm:px-3"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden sm:inline">AI Plan</span>
                    </Button>
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIntervalSettings(!showIntervalSettings)}
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20 p-2"
                  title="Time interval settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <ScheduleSettingsDialog 
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 text-white hover:bg-white/20 border-white/20 p-2"
                      title="Schedule settings"
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  }
                />
                {isConnected && (
                  <Button
                    variant={calendarSyncEnabled ? "primary" : "outline"}
                    size="sm"
                    onClick={() => updateSettings({ calendarSyncEnabled: !calendarSyncEnabled })}
                    className={calendarSyncEnabled ? "p-2" : "bg-white/10 text-white hover:bg-white/20 border-white/20 p-2"}
                    title="Toggle calendar sync"
                  >
                    <CalendarSync className="w-4 h-4" />
                  </Button>
                )}
                <div className="flex items-center gap-1 border-l border-white/20 pl-2 ml-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handlePlanTomorrow}
                    className="gap-1 px-2 sm:px-3"
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">Plan Tomorrow</span>
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoToPreviousDay}
                    className="bg-white/10 text-white hover:bg-white/20 border-white/20 p-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoToToday}
                    className="bg-white/10 text-white hover:bg-white/20 border-white/20 px-2 sm:px-4"
                  >
                    <span className="text-xs sm:text-sm">Today</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoToNextDay}
                    className="bg-white/10 text-white hover:bg-white/20 border-white/20 p-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Date Display */}
            <div className="text-center mt-2 sm:mt-0">
              <div className="text-white/90 text-sm sm:text-base">
                {(() => {
                  const today = dayjs().format('YYYY-MM-DD')
                  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
                  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
                  
                  if (selectedDate === today) {
                    return <>Today &bull; {dayjs(selectedDate).format('ddd, MMM D, YYYY')}</>
                  } else if (selectedDate === tomorrow) {
                    return <>Tomorrow &bull; {dayjs(selectedDate).format('ddd, MMM D, YYYY')}</>
                  } else if (selectedDate === yesterday) {
                    return <>Yesterday &bull; {dayjs(selectedDate).format('ddd, MMM D, YYYY')}</>
                  } else {
                    return dayjs(selectedDate).format('ddd, MMM D, YYYY')
                  }
                })()}
              </div>
              <span className={cn(
                "inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1",
                currentMode === 'work' 
                  ? "bg-blue-500/20 text-blue-100 border border-blue-400/30"
                  : currentMode === 'personal'
                  ? "bg-purple-500/20 text-purple-100 border border-purple-400/30"
                  : "bg-gray-500/20 text-gray-100 border border-gray-400/30"
              )}>
                {currentMode === 'work' ? 'Work' : currentMode === 'personal' ? 'Personal' : 'All'}
              </span>
            </div>
            
            {/* Interval Settings */}
            {showIntervalSettings && (
              <div className="mt-2 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-white font-medium text-sm">Duration</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant={effectiveInterval === 30 ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTimeboxInterval(30)}
                      className={cn("text-xs h-7 px-2", effectiveInterval === 30 ? '' : 'bg-white/10 text-white hover:bg-white/20 border-white/20')}
                    >
                      30m
                    </Button>
                    <Button
                      variant={effectiveInterval === 60 ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTimeboxInterval(60)}
                      className={cn("text-xs h-7 px-2", effectiveInterval === 60 ? '' : 'bg-white/10 text-white hover:bg-white/20 border-white/20')}
                    >
                      1h
                    </Button>
                    <Button
                      variant={effectiveInterval === 120 ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTimeboxInterval(120)}
                      className={cn("text-xs h-7 px-2", effectiveInterval === 120 ? '' : 'bg-white/10 text-white hover:bg-white/20 border-white/20')}
                    >
                      2h
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Calendar Sync Error */}
            {calendarSyncError && calendarSyncEnabled && (
              <div className="mt-2 p-3 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-100">{calendarSyncError}</p>
                    <button
                      onClick={() => {
                        setCalendarSyncError(null)
                        loadCalendarEvents()
                      }}
                      className="text-xs text-red-200 hover:text-white underline mt-1"
                    >
                      Try again
                    </button>
                  </div>
                  <button
                    onClick={() => setCalendarSyncError(null)}
                    className="text-red-300 hover:text-red-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Copy Tasks from Today (when viewing tomorrow) */}
            {selectedDate === dayjs().add(1, 'day').format('YYYY-MM-DD') && (
              <div className="mt-2 p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ChevronRightIcon className="w-4 h-4 text-blue-300" />
                    <p className="text-sm text-blue-100">Planning tomorrow? Import incomplete tasks from today.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const count = await handleCopyIncompleteTasks()
                      if (count && count > 0) {
                        loadNodes(userId)
                      }
                    }}
                    className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs"
                  >
                    Copy from Today
                  </Button>
                </div>
              </div>
            )}
            
            {/* Quick Block Templates */}
            <QuickBlockTemplates 
              currentMode={currentMode}
              timeSlots={timeSlots}
              onBlockTimeSlot={blockTimeSlot}
            />
          </header>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 overflow-hidden">
            {/* Node Pool */}
            <TimeboxNodePool
              unscheduledNodes={unscheduledNodes}
              nodeFilterMode={nodeFilterMode}
              selectedNodeType={selectedNodeType}
              searchQuery={searchQuery}
              availableNodeTypes={availableNodeTypes}
              currentMode={currentMode}
              onSetNodeFilterMode={setNodeFilterMode}
              onSetSelectedNodeType={setSelectedNodeType}
              onSetSearchQuery={setSearchQuery}
              onClearFilters={clearFilters}
              onHandleDragStart={handleDragStart}
              onHandleDragEnd={handleDragEnd}
            />
            
            {/* Time Slots */}
            <TimeSlotsList
              displaySlots={displaySlots}
              isClient={isClient}
              selectedDate={selectedDate}
              currentTimeSlotId={currentTimeSlotId}
              hoveredSlotId={hoveredSlotId}
              expandedTasks={expandedTasks}
              onToggleTaskExpanded={toggleTaskExpanded}
              onUpdateTaskInSlot={updateTaskInSlot}
              onRemoveTaskFromSlot={removeTaskFromSlot}
              onHandleTaskClick={handleTaskClick}
              onUnblockTimeSlot={unblockTimeSlot}
              onHandleDragOver={handleDragOver}
              onHandleDrop={(e, slotId) => handleDrop(e, slotId, timeSlots)}
              onSetHoveredSlotId={setHoveredSlotId}
              onHandleDragStart={handleDragStart}
              onHandleDragEnd={handleDragEnd}
              getTaskChildren={getTaskChildren}
            />
          </div>
          
          {/* Daily Summary */}
          <Card className="mt-4 flex-shrink-0 order-3">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium text-sm">Daily Summary</span>
                </div>
                {currentMode === 'work' && (
                  <StandupSummaryDialog 
                    trigger={
                      <Button variant="outline" size="sm" className="gap-1 text-xs h-7 px-2">
                        <Mic className="w-3 h-3" />
                        <span className="hidden sm:inline">Standup</span>
                      </Button>
                    }
                  />
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-brain-600">{totalHours}</div>
                  <div className="text-xs text-gray-600">Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-blue-600">{totalScheduledTasks}</div>
                  <div className="text-xs text-gray-600">Scheduled</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-green-600">{completedTasks}</div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-purple-600">
                    {totalScheduledTasks > 0 ? Math.round((completedTasks / totalScheduledTasks) * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-600">Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Node Detail Modal */}
        {showNodeDetail && selectedNodeId && nodes.find(n => n.id === selectedNodeId) && (
          <NodeDetailModal
            isOpen={showNodeDetail}
            onClose={() => {
              setShowNodeDetail(false)
              setSelectedNodeId(null)
              // Refresh to update any changed node titles in timebox
              loadNodes(userId)
            }}
            node={nodes.find(n => n.id === selectedNodeId)!}
            userId={userId}
            userName="Me"
            onCreateChild={handleCreateChild}
            onCreateParent={handleCreateParent}
            onRelationshipChange={() => {
              // Refresh nodes if relationships change
              loadNodes(userId)
            }}
          />
        )}
        
        {/* Node Relationship Modal */}
        {relationshipModal.sourceNode && (
          <NodeRelationshipModal
            isOpen={relationshipModal.isOpen}
            onClose={() => setRelationshipModal({ ...relationshipModal, isOpen: false })}
            sourceNode={relationshipModal.sourceNode}
            relationshipType={relationshipModal.type}
            userId={userId}
            onSuccess={() => {
              setRelationshipModal({ isOpen: false, sourceNode: null, type: 'child' })
              // Refresh nodes to update relationships
              loadNodes(userId)
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
