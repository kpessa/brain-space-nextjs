'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Eye, ChevronDown, ChevronUp, Users, Stethoscope, Settings, Coffee, Car, User, Lock, Mic, Sparkles, Settings2, CalendarSync, Filter, Search, Clock, Calendar, Zap, Target, ChevronLeft, ChevronRight, CheckCircle, X, MapPin } from 'lucide-react'
import { type TimeboxTask } from '@/store/timeboxStore'
import { 
  useTimeSlots,
  useSelectedDate,
  useCalendarSyncEnabled,
  useTimeInterval,
  useShowPastSlots,
  useHoveredSlotId,
  useTimeboxActions,
  useTimeSlotsWithCalendarEvents,
  useTimeboxStats
} from '@/hooks/useTimeboxSelectors'
import { useNodesStore } from '@/store/nodeStore'
import { useUserPreferencesStore, shouldShowNode } from '@/store/userPreferencesStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { format, addDays, subDays, startOfDay, endOfDay } from 'date-fns'
import { cn } from '@/lib/utils'
import StandupSummaryDialog from '@/components/StandupSummaryDialog'
import TimeboxRecommendationsDialog from '@/components/TimeboxRecommendationsDialog'
import ScheduleSettingsDialog from '@/components/ScheduleSettingsDialog'
import { NodeDetailModal } from '@/components/nodes/NodeDetailModal'
import { NodeRelationshipModal } from '@/components/nodes/NodeRelationshipModal'
import { type Node, type NodeType, getNodeTypeIcon } from '@/types/node'

// Import new components
import { TimeboxHeader } from '@/components/timebox/TimeboxHeader'
import { TimeboxStats } from '@/components/timebox/TimeboxStats'
import { TimeSlot } from '@/components/timebox/TimeSlot'
import { NodePool } from '@/components/timebox/NodePool'

// Helper to get priority color
function getPriorityColor(importance?: number, urgency?: number) {
  if (importance === undefined || urgency === undefined) {
    return 'bg-gray-100 border-gray-300'
  }
  
  const score = importance + urgency
  if (score >= 16) return 'bg-red-100 border-red-300'
  if (score >= 12) return 'bg-orange-100 border-orange-300'
  if (score >= 8) return 'bg-yellow-100 border-yellow-300'
  return 'bg-green-100 border-green-300'
}

const timeBlockColors = {
  'morning': 'bg-blue-500',
  'afternoon': 'bg-green-500',
  'evening': 'bg-purple-500',
  'night': 'bg-indigo-500',
}

const blockReasonIcons = {
  'meeting': <Users className="w-4 h-4" />,
  'patient-care': <Stethoscope className="w-4 h-4" />,
  'admin': <Settings className="w-4 h-4" />,
  'lunch': <Coffee className="w-4 h-4" />,
  'commute': <Car className="w-4 h-4" />,
  'break': <Coffee className="w-4 h-4" />,
  'personal': <User className="w-4 h-4" />,
  'custom': <Lock className="w-4 h-4" />,
}

export default function TimeboxClient({ userId }: { userId: string }) {
  // DEBUG: Log when component renders

  // Use optimized selectors
  const selectedDate = useSelectedDate()
  const timeSlots = useTimeSlots()
  const hoveredSlotId = useHoveredSlotId()
  const calendarSyncEnabled = useCalendarSyncEnabled()
  const timeInterval = useTimeInterval()
  const showPastSlotsState = useShowPastSlots()
  const displaySlots = useTimeSlotsWithCalendarEvents()
  const stats = useTimeboxStats()
  
  // Actions
  const {
    setSelectedDate,
    setHoveredSlotId,
    addTaskToSlot,
    removeTaskFromSlot,
    updateTaskInSlot,
    moveTaskBetweenSlots,
    loadTimeboxData,
    initializeTimeSlots,
    blockTimeSlot,
    unblockTimeSlot,
    setCalendarSyncEnabled,
    setTimeInterval,
    setShowPastSlots: setShowPastSlotsAction,
    loadCalendarEvents
  } = useTimeboxActions()
  
  // Local state for drag and drop
  const [draggedTask, setDraggedTask] = useState<TimeboxTask | null>(null)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const { nodes, loadNodes, getNodeById, getNodeChildren } = useNodesStore()
  const { 
    getEffectiveTimeboxInterval, 
    setTimeboxInterval, 
    currentMode, 
    updateSettings,
    hidePersonalInWorkMode,
    hideWorkInPersonalMode
  } = useUserPreferencesStore()
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskText, setNewTaskText] = useState('')
  const [showIntervalSettings, setShowIntervalSettings] = useState(false)
  const [currentTimeSlotId, setCurrentTimeSlotId] = useState<string | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<TimeboxTask[]>([])
  const [showPastSlots, setShowPastSlots] = useState(showPastSlotsState)
  const [collapsedSlots, setCollapsedSlots] = useState<Set<string>>(new Set())
  
  // Node filtering state
  const [nodeFilterMode, setNodeFilterMode] = useState<'filtered' | 'all'>('filtered')
  const [selectedNodeType, setSelectedNodeType] = useState<NodeType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const dragNodeRef = useRef<HTMLDivElement>(null)
  const { selectedCalendarIds } = useCalendarStore()
  const { isConnected, getEvents } = useGoogleCalendar()
  
  // Node detail modal state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showNodeDetail, setShowNodeDetail] = useState(false)
  
  // Node relationship modal state
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
  
  // Note: selectedDate is now initialized in the store to avoid hydration issues
  
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
      loadTimeboxData(userId, selectedDate)
    }
  }, [userId, selectedDate, loadNodes, loadTimeboxData])
  
  // Load calendar events when sync is enabled
  useEffect(() => {
    if (calendarSyncEnabled && isConnected) {
      loadCalendarEventsLocal()
    } else {
      setCalendarEvents([])
    }
  }, [calendarSyncEnabled, isConnected, selectedDate, selectedCalendarIds])
  
  // Find current time slot for highlighting
  useEffect(() => {
    // Only run on client side to avoid hydration issues
    if (typeof window === 'undefined' || !selectedDate) return
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeMinutes = currentHour * 60 + currentMinute
    
    // Find the time slot that contains the current time
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
  }, [timeSlots, selectedDate])
  
  // Helper to check if a time slot is COMPLETELY in the past (not including current slot)
  const isSlotInPast = useCallback((slot: typeof timeSlots[0]) => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    
    // If not today, don't mark as past
    if (selectedDate !== today) return false
    
    // Get the END time of the slot
    const [endHour, endMinute] = slot.endTime.split(':').map(Number)
    const slotEndTime = new Date()
    slotEndTime.setHours(endHour, endMinute, 0, 0)
    
    // A slot is "past" only if the current time is AFTER the slot's END time
    // This means the slot has completely finished
    return now >= slotEndTime
  }, [selectedDate])
  
  // Toggle slot collapse state
  const toggleSlotCollapse = (slotId: string) => {
    const newCollapsed = new Set(collapsedSlots)
    if (newCollapsed.has(slotId)) {
      newCollapsed.delete(slotId)
    } else {
      newCollapsed.add(slotId)
    }
    setCollapsedSlots(newCollapsed)
  }
  
  // Load calendar events
  const loadCalendarEventsLocal = async () => {
    try {
      // Validate selectedDate before using it
      if (!selectedDate) {
        return
      }

      const dateObj = new Date(selectedDate)
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {

        return
      }

      const startTime = startOfDay(dateObj)
      const endTime = endOfDay(dateObj)
      
      const allEvents: TimeboxTask[] = []
      
      // Get calendars to fetch from
      const calendarsToLoad = selectedCalendarIds.size > 0 
        ? Array.from(selectedCalendarIds)
        : ['primary']
      
      for (const calendarId of calendarsToLoad) {
        try {
          const events = await getEvents(
            calendarId,
            startTime,
            endTime
          )
          
          // Convert calendar events to TimeboxTask format
          const calendarTasks = events.map(event => {
            const startDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!)
            const endDate = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date!)
            
            return {
              id: `cal-${event.id}`,
              label: event.summary || 'Untitled Event',
              calendarEventId: event.id,
              calendarId: calendarId,
              calendarSummary: event.description,
              calendarLocation: (event as any).location,
              isCalendarEvent: true,
              timeboxStartTime: format(startDate, 'HH:mm'),
              timeboxDuration: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)),
              timeboxDate: selectedDate,
              userId: userId,
              status: 'pending' as const,
            } as TimeboxTask
          })
          
          allEvents.push(...calendarTasks)
        } catch (error) {
          console.error(`Error loading events from calendar ${calendarId}:`, error)
        }
      }
      
      setCalendarEvents(allEvents)
    } catch (error) {
      console.error('Error loading calendar events:', error)
      setCalendarEvents([])
    }
  }
  
  // Get unscheduled nodes with filtering
  const unscheduledNodes = useMemo(() => {
    let filteredNodes = nodes.filter(node => 
      !node.completed && 
      !timeSlots.some(slot => 
        slot.tasks.some(task => task.nodeId === node.id)
      )
    )
    
    // Apply mode-based filtering (work/personal/all)
    if (nodeFilterMode === 'filtered') {
      filteredNodes = filteredNodes.filter(node => 
        shouldShowNode(node.tags, node.isPersonal, currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode)
      )
    }
    
    // Apply node type filtering
    if (selectedNodeType !== 'all') {
      filteredNodes = filteredNodes.filter(node => node.type === selectedNodeType)
    }
    
    // Apply search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredNodes = filteredNodes.filter(node => 
        (node.title?.toLowerCase().includes(query)) ||
        (node.description?.toLowerCase().includes(query)) ||
        (node.tags?.some(tag => tag.toLowerCase().includes(query))) ||
        (node.type?.toLowerCase().includes(query))
      )
    }
    
    return filteredNodes
  }, [nodes, timeSlots, nodeFilterMode, currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode, selectedNodeType, searchQuery])
  
  // Get all node types present in unscheduled nodes for filter dropdown
  const availableNodeTypes = useMemo(() => {
    const types = new Set<NodeType>()
    nodes.filter(node => 
      !node.completed && 
      !timeSlots.some(slot => 
        slot.tasks.some(task => task.nodeId === node.id)
      )
    ).forEach(node => {
      if (node.type) types.add(node.type)
    })
    return Array.from(types).sort()
  }, [nodes, timeSlots])

  // Date navigation
  const goToPreviousDay = () => {
    const newDate = format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd')
    setSelectedDate(newDate)
  }
  
  const goToNextDay = () => {
    const newDate = format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd')
    setSelectedDate(newDate)
  }
  
  const goToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
  }
  
  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: TimeboxTask) => {
    // Store task data in both dataTransfer and state for reliability
    e.dataTransfer.setData('application/json', JSON.stringify(task))
    e.dataTransfer.effectAllowed = 'move'
    setDraggedTask(task)
  }
  
  const handleDragEnd = () => {
    setDraggedTask(null)
    setHoveredSlotId(null)
  }
  
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
  
  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling
    
    // Extract the actual slot ID for hovering effect
    const actualSlotId = slotId.replace(/^(past-|current-)/, '')
    setHoveredSlotId(actualSlotId)
  }
  
  const handleDrop = async (e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling
    
    // Extract the actual slot ID (remove 'past-' or 'current-' prefix if present)
    const actualSlotId = slotId.replace(/^(past-|current-)/, '')
    
    // Try to get task from dataTransfer first, fall back to state
    let taskToAdd: TimeboxTask | null = null
    
    try {
      const dataTransferData = e.dataTransfer.getData('application/json')
      if (dataTransferData) {
        taskToAdd = JSON.parse(dataTransferData)

      }
    } catch (error) {
      // Failed to parse dataTransfer, will use state fallback
    }
    
    // Fall back to state if dataTransfer failed
    if (!taskToAdd) {
      taskToAdd = draggedTask

    }
    
    if (!taskToAdd) {

      console.groupEnd()
      return
    }
    
    // Check if slot is blocked
    const targetSlot = timeSlots.find(slot => slot.id === actualSlotId)

    if (!targetSlot) {

      timeSlots.forEach((slot, index) => {
        console.log(`  [${index}] ${slot.id} (${slot.displayTime})`)
      })
      console.groupEnd()
      handleDragEnd()
      return
    }
    
    if (targetSlot?.isBlocked) {

      console.groupEnd()
      handleDragEnd()
      return
    }
    
    try {
      // Check if task is being moved from another slot
      const sourceSlot = timeSlots.find(slot => 
        slot.tasks.some(t => t.id === taskToAdd!.id)
      )
      
      console.log('Source slot:', sourceSlot ? { id: sourceSlot.id, displayTime: sourceSlot.displayTime } : 'None (new task)')
      
      if (sourceSlot) {

        await moveTaskBetweenSlots(taskToAdd.id, sourceSlot.id, actualSlotId)
      } else {
        // Add new task to slot with unique ID
        const taskWithId = {
          ...taskToAdd,
          id: taskToAdd.id || `task-${taskToAdd.nodeId}-${Date.now()}`,
          userId: userId,
          timeboxDate: selectedDate,
          isPersonal: taskToAdd.isPersonal,
        }

        await addTaskToSlot(taskWithId, actualSlotId)
      }

    } catch (error) {
      console.error('❌ Failed to drop task:', error)
      // Could add toast notification here
    } finally {
      console.groupEnd()
      handleDragEnd()
    }
  }
  
  // Use stats from selector
  const { totalScheduledTasks, completedTasks, occupiedSlots } = stats
  const totalHours = occupiedSlots * (effectiveInterval / 60)
  
  // Separate past and current/future slots - FIXED to properly identify current slot
  const { pastSlots, currentAndFutureSlots } = useMemo(() => {

    if (displaySlots?.length) {
      console.log('DisplaySlots IDs:', displaySlots.map(s => s.id))
    }
    
    const today = format(new Date(), 'yyyy-MM-dd')
    const isToday = selectedDate === today
    
    if (!isToday) {
      // If not today, all slots are current/future
      return {
        pastSlots: [],
        currentAndFutureSlots: displaySlots
      }
    }
    
    // Calculate current time in minutes for accurate comparison
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeMinutes = currentHour * 60 + currentMinute
    
    const past: typeof displaySlots = []
    const currentFuture: typeof displaySlots = []
    
    displaySlots.forEach(slot => {
      const [endHour, endMinute] = slot.endTime.split(':').map(Number)
      const slotEndMinutes = endHour * 60 + endMinute
      
      // A slot is past ONLY if current time is >= its end time
      // This keeps the current slot (where we are now) in the current/future section
      if (currentTimeMinutes >= slotEndMinutes) {
        past.push(slot)
      } else {
        currentFuture.push(slot)
      }
    })
    
    console.log(`Current time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`)
    console.log('Past slots:', past.length, past.map(s => s.id))
    console.log('Current/future slots:', currentFuture.length, currentFuture.map(s => s.id))
    
    return {
      pastSlots: past,
      currentAndFutureSlots: currentFuture
    }
  }, [displaySlots, selectedDate])
  
  // Show loading state until client-side hydration and selectedDate is initialized
  if (!isClient || !selectedDate) {
    return (
      <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto flex-1 flex flex-col overflow-hidden">
          <header className="mb-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Timebox Schedule</h1>
                  <p className="text-white/80 text-sm">
                    {effectiveInterval === 30 ? '30-min' : effectiveInterval === 60 ? '1-hour' : '2-hour'} blocks
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TimeboxRecommendationsDialog 
                  userId={userId}
                  date={selectedDate}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 text-white hover:bg-white/20 border-white/20 gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      AI Plan
                    </Button>
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIntervalSettings(!showIntervalSettings)}
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                  title="Time interval settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <ScheduleSettingsDialog 
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 text-white hover:bg-white/20 border-white/20"
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
                    className={calendarSyncEnabled ? "" : "bg-white/10 text-white hover:bg-white/20 border-white/20"}
                    title="Toggle calendar sync"
                  >
                    <CalendarSync className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousDay}
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20 px-4"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextDay}
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="text-center">
              <div className="text-white/90 text-base">
                {format(new Date(selectedDate), 'EEE, MMM d, yyyy')}
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
                <div className="flex items-center justify-between">
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
            
            {/* Quick Block Templates (Work Mode) */}
            {currentMode === 'work' && (
              <div className="mt-2 p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs h-7 px-2"
                    onClick={() => {
                      const slot = timeSlots.find(s => s.startTime === '09:00' || s.startTime === '09:30')
                      if (slot) blockTimeSlot(slot.id, 'meeting', 'Morning Standup')
                    }}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    9am
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs h-7 px-2"
                    onClick={() => {
                      const slot = timeSlots.find(s => s.startTime === '12:00' || s.startTime === '12:30')
                      if (slot) blockTimeSlot(slot.id, 'lunch', 'Lunch Break')
                    }}
                  >
                    <Coffee className="w-3 h-3 mr-1" />
                    Lunch
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs h-7 px-2"
                    onClick={() => {
                      const slot = timeSlots.find(s => s.startTime === '14:00' || s.startTime === '14:30')
                      if (slot) blockTimeSlot(slot.id, 'patient-care', 'Patient Appointments')
                    }}
                  >
                    <Stethoscope className="w-3 h-3 mr-1" />
                    Patient
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs h-7 px-2"
                    onClick={() => {
                      const slot = timeSlots.find(s => s.startTime === '16:00' || s.startTime === '16:30')
                      if (slot) blockTimeSlot(slot.id, 'admin', 'Admin Work')
                    }}
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Admin
                  </Button>
                </div>
              </div>
            )}
          </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 overflow-hidden">
          {/* Unscheduled Tasks */}
          <Card className="lg:col-span-1 flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Node Pool
                  </CardTitle>
                  <CardDescription>
                    Drag nodes into time blocks
                  </CardDescription>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {unscheduledNodes.length}
                </span>
              </div>
              
              {/* Filter Controls */}
              <div className="space-y-1.5">
                {/* Filter Mode Toggle */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={nodeFilterMode === 'filtered' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setNodeFilterMode('filtered')}
                    className="flex-1 text-xs py-1 px-2 h-7"
                    title={`Show ${currentMode === 'all' ? 'all' : currentMode} nodes only`}
                  >
                    <Filter className="w-3 h-3" />
                  </Button>
                  <Button
                    variant={nodeFilterMode === 'all' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setNodeFilterMode('all')}
                    className="flex-1 text-xs py-1 px-2 h-7"
                    title="Show all nodes"
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
                
                {/* Type Filter and Search in one row */}
                <div className="flex gap-1">
                  <select
                    value={selectedNodeType}
                    onChange={(e) => setSelectedNodeType(e.target.value as NodeType | 'all')}
                    className="flex-1 px-1.5 py-1 text-xs border border-gray-300 rounded bg-white h-7"
                  >
                    <option value="all">All Types</option>
                    {availableNodeTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Search className="w-3 h-3 absolute left-1.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-6 pr-2 py-1 text-xs border border-gray-300 rounded bg-white h-7"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto p-2 flex-1">
              <div className="space-y-1.5">
                {unscheduledNodes.map((node) => (
                  <div
                    key={node.id}
                    className={cn(
                      "p-2 rounded border cursor-move hover:shadow-sm transition-shadow",
                      getPriorityColor(node.importance, node.urgency)
                    )}
                    draggable
                    onDragStart={(e) => handleDragStart(e, {
                      id: `task-${node.id}-${Date.now()}`,
                      label: node.title || 'Untitled',
                      nodeId: node.id,
                      importance: node.importance,
                      urgency: node.urgency,
                      category: node.type,
                      isPersonal: node.isPersonal,
                    })}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-xs font-medium text-gray-900 leading-tight flex-1 mr-1">
                        {node.title || 'Untitled'}
                      </div>
                      {node.isPersonal !== undefined && (
                        <span className={cn(
                          "text-xs px-1 py-0.5 rounded-full flex-shrink-0",
                          node.isPersonal 
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        )}>
                          {node.isPersonal ? 'P' : 'W'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {node.type && (
                        <span className="text-xs text-gray-600 flex items-center gap-0.5">
                          <span className="text-xs">{getNodeTypeIcon(node.type)}</span>
                          <span className="truncate">{node.type}</span>
                        </span>
                      )}
                      {node.urgency !== undefined && node.importance !== undefined && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          U:{node.urgency} I:{node.importance}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {unscheduledNodes.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  {nodeFilterMode === 'filtered' || selectedNodeType !== 'all' || searchQuery.trim() ? (
                    <div>
                      <p className="text-xs">No nodes match filters</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-xs py-1 px-2 h-6"
                        onClick={() => {
                          setNodeFilterMode('all')
                          setSelectedNodeType('all')
                          setSearchQuery('')
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs">No unscheduled nodes</p>
                      <p className="text-xs mt-1 text-gray-400">Create nodes from the Nodes page</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Blocks */}
          <div className="lg:col-span-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
            <div 
              className="pr-2 space-y-2"
            >
              {/* Past Time Slots Section */}
              {pastSlots.length > 0 && (
                <Card className="transition-all duration-300">
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setShowPastSlots(!showPastSlots)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg text-gray-500">Past Time Slots (Completed)</CardTitle>
                        <CardDescription>
                          {pastSlots.length} slot{pastSlots.length !== 1 ? 's' : ''} from earlier today (before current time)
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {showPastSlots ? 'Hide' : 'View'}
                        </span>
                        {showPastSlots ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {showPastSlots && (
                  <div className="transition-all duration-300 ease-in-out max-h-[calc(70vh-200px)] opacity-100">
                    <CardContent className="pt-0 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 200px)' }}>
                      <div className="space-y-2">
                        {pastSlots.map((slot) => (
                          <Card 
                            key={slot.id} 
                            id={`past-${slot.id}`}
                            className={cn(
                              "transition-all duration-300 hover:shadow-lg opacity-75",
                              hoveredSlotId === slot.id && "ring-2 ring-brain-400",
                              currentTimeSlotId === slot.id && selectedDate === format(new Date(), 'yyyy-MM-dd') && "ring-2 ring-orange-400 bg-orange-50"
                            )}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                {/* Time indicator */}
                                <div className="flex-shrink-0">
                                  <div className={cn(
                                    "w-3 h-full rounded-full min-h-[50px]",
                                    timeBlockColors[slot.period]
                                  )} />
                                </div>
                                
                                {/* Time label */}
                                <div className="flex-shrink-0 w-24">
                                  <div className="text-base font-bold text-gray-900">{slot.displayTime}</div>
                                  <div className="text-xs text-gray-500">
                                    {slot.isBlocked ? 'Blocked' : `${slot.tasks.length} task${slot.tasks.length !== 1 ? 's' : ''}`}
                                  </div>
                                </div>
                                
                                {/* Block content */}
                                <div className="flex-1">
                                  {/* Tasks in this block */}
                                  {slot.tasks.length > 0 && (
                                    <div className="space-y-1.5 mb-3">
                                      {slot.tasks.map((task) => {
                                        const taskChildren = getTaskChildren(task.nodeId)
                                        const hasChildren = taskChildren.length > 0
                                        const isExpanded = expandedTasks.has(task.id)
                                        
                                        return (
                                          <div key={task.id}>
                                            <div
                                              className={cn(
                                                "flex items-center gap-2 p-1.5 rounded border",
                                                task.isCalendarEvent ? "cursor-default" : "cursor-move",
                                                task.isCalendarEvent ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300" : getPriorityColor(task.importance, task.urgency),
                                                task.status === 'completed' && "opacity-60"
                                              )}
                                              draggable={!task.isCalendarEvent}
                                              onDragStart={(e) => !task.isCalendarEvent && handleDragStart(e, task)}
                                              onDragEnd={handleDragEnd}
                                            >
                                              {/* Expand/Collapse button for tasks with children */}
                                              {!task.isCalendarEvent && hasChildren && (
                                                <button
                                                  onClick={() => toggleTaskExpanded(task.id)}
                                                  className="flex-shrink-0"
                                                >
                                                  {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                                  ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-600" />
                                                  )}
                                                </button>
                                              )}
                                              
                                              {task.isCalendarEvent ? (
                                                <Calendar className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                              ) : (
                                                <button
                                                  onClick={() => updateTaskInSlot(task.id, {
                                                    status: task.status === 'completed' ? 'pending' : 'completed',
                                                    completedAt: task.status === 'completed' ? undefined : new Date().toISOString()
                                                  })}
                                                  className="flex-shrink-0"
                                                >
                                                  {task.status === 'completed' ? (
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                  ) : (
                                                    <div className="w-4 h-4 border-2 border-gray-400 rounded-full" />
                                                  )}
                                                </button>
                                              )}
                                          <div 
                                            className={cn(
                                              "flex-1 min-w-0",
                                              task.nodeId && "cursor-pointer hover:opacity-80"
                                            )}
                                            onClick={() => handleTaskClick(task)}
                                          >
                                            <span className={cn(
                                              "text-sm text-gray-700 block truncate",
                                              task.status === 'completed' && "line-through",
                                              task.nodeId && "hover:text-brain-600"
                                            )}>
                                              {task.label}
                                            </span>
                                            {task.calendarLocation && (
                                              <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3" />
                                                {task.calendarLocation}
                                              </span>
                                            )}
                                          </div>
                                          {/* Work/Personal/Calendar indicator */}
                                          {task.isCalendarEvent ? (
                                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                              Cal
                                            </span>
                                          ) : task.isPersonal !== undefined && (
                                            <span className={cn(
                                              "text-xs px-1.5 py-0.5 rounded-full",
                                              task.isPersonal 
                                                ? "bg-purple-100 text-purple-700"
                                                : "bg-blue-100 text-blue-700"
                                            )}>
                                              {task.isPersonal ? 'P' : 'W'}
                                            </span>
                                          )}
                                          {!task.isCalendarEvent && (
                                            <button
                                              onClick={() => removeTaskFromSlot(task.id, slot.id)}
                                              className="opacity-30 hover:opacity-100 transition-opacity"
                                              title="Remove from timebox"
                                            >
                                              <X className="w-4 h-4 text-gray-500 hover:text-red-500" />
                                            </button>
                                          )}
                                            </div>
                                            {/* Show children if expanded */}
                                            {isExpanded && hasChildren && (
                                              <div className="ml-6 mt-1 space-y-1">
                                                {taskChildren.map((child) => (
                                                  <div
                                                    key={child.id}
                                                    className="flex items-center gap-2 p-1 text-xs bg-gray-50 rounded border border-gray-200"
                                                  >
                                                    <ChevronRight className="w-3 h-3 text-gray-400" />
                                                    <span className={cn(
                                                      "flex-1",
                                                      child.completed && "line-through text-gray-500"
                                                    )}>
                                                      {child.title || 'Untitled'}
                                                    </span>
                                                    <span className="text-gray-400">
                                                      {getNodeTypeIcon(child.type)}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* Drop zone or blocked indicator */}
                                  {slot.isBlocked ? (
                                    <div className="p-4 bg-gray-100 rounded-lg flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="text-gray-500">
                                          {blockReasonIcons[slot.blockReason || 'custom']}
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-gray-700">
                                            {slot.blockLabel || slot.blockReason?.replace('-', ' ').toUpperCase() || 'Blocked'}
                                          </div>
                                          <div className="text-xs text-gray-500">Time blocked</div>
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => unblockTimeSlot(slot.id)}
                                        className="text-gray-500 hover:text-red-600"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div 
                                      className={cn(
                                        "p-3 border-2 border-dashed rounded-lg text-center transition-colors",
                                        hoveredSlotId === slot.id 
                                          ? "border-brain-400 bg-brain-50" 
                                          : "border-gray-300 text-gray-500"
                                      )}
                                      onDragOver={(e) => handleDragOver(e, `past-${slot.id}`)}
                                      onDrop={(e) => handleDrop(e, `past-${slot.id}`)}
                                      onDragLeave={(e) => {
                                        // Only clear hover if we're actually leaving this element
                                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                          setHoveredSlotId(null)
                                        }
                                      }}
                                    >
                                      <Zap className="w-5 h-5 mx-auto mb-1 opacity-50" />
                                      <div className="text-xs">Drop nodes here</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </div>
                  )}
                </Card>
              )}
              
              {/* Current and Future Time Slots */}
              {currentAndFutureSlots.map((slot, index) => {
                const isCurrentSlot = currentTimeSlotId === slot.id && selectedDate === format(new Date(), 'yyyy-MM-dd')
                return (
                <Card 
                  key={slot.id} 
                  id={`current-${slot.id}`}
                  className={cn(
                    "transition-all duration-300 hover:shadow-lg",
                    hoveredSlotId === slot.id && "ring-2 ring-brain-400",
                    isCurrentSlot && "ring-2 ring-green-500 bg-green-50 border-green-300"
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Time indicator */}
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "w-3 h-full rounded-full min-h-[50px]",
                          timeBlockColors[slot.period]
                        )} />
                      </div>
                      
                      {/* Time label */}
                      <div className="flex-shrink-0 w-24">
                        <div className="text-base font-bold text-gray-900 flex items-center gap-1">
                          {slot.displayTime}
                          {isCurrentSlot && (
                            <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                              NOW
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {slot.isBlocked ? 'Blocked' : `${slot.tasks.length} task${slot.tasks.length !== 1 ? 's' : ''}`}
                        </div>
                      </div>
                      
                      {/* Block content */}
                      <div className="flex-1">
                        {/* Tasks in this block */}
                            {slot.tasks.length > 0 && (
                          <div className="space-y-1.5 mb-3">
                            {slot.tasks.map((task) => {
                              const taskChildren = getTaskChildren(task.nodeId)
                              const hasChildren = taskChildren.length > 0
                              const isExpanded = expandedTasks.has(task.id)
                              
                              return (
                                <div key={task.id}>
                                  <div
                                    className={cn(
                                      "flex items-center gap-2 p-1.5 rounded border",
                                      task.isCalendarEvent ? "cursor-default" : "cursor-move",
                                      task.isCalendarEvent ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300" : getPriorityColor(task.importance, task.urgency),
                                      task.status === 'completed' && "opacity-60"
                                    )}
                                    draggable={!task.isCalendarEvent}
                                    onDragStart={(e) => !task.isCalendarEvent && handleDragStart(e, task)}
                                    onDragEnd={handleDragEnd}
                                  >
                                    {/* Expand/Collapse button for tasks with children */}
                                    {!task.isCalendarEvent && hasChildren && (
                                      <button
                                        onClick={() => toggleTaskExpanded(task.id)}
                                        className="flex-shrink-0"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-gray-600" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-gray-600" />
                                        )}
                                      </button>
                                    )}
                                    
                                    {task.isCalendarEvent ? (
                                      <Calendar className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                    ) : (
                                      <button
                                        onClick={() => updateTaskInSlot(task.id, {
                                          status: task.status === 'completed' ? 'pending' : 'completed',
                                          completedAt: task.status === 'completed' ? undefined : new Date().toISOString()
                                        })}
                                        className="flex-shrink-0"
                                      >
                                        {task.status === 'completed' ? (
                                          <CheckCircle className="w-4 h-4 text-green-600" />
                                        ) : (
                                          <div className="w-4 h-4 border-2 border-gray-400 rounded-full" />
                                        )}
                                      </button>
                                    )}
                                <div 
                                  className={cn(
                                    "flex-1 min-w-0",
                                    task.nodeId && "cursor-pointer hover:opacity-80"
                                  )}
                                  onClick={() => handleTaskClick(task)}
                                >
                                  <span className={cn(
                                    "text-sm text-gray-700 block truncate",
                                    task.status === 'completed' && "line-through",
                                    task.nodeId && "hover:text-brain-600"
                                  )}>
                                    {task.label}
                                  </span>
                                  {task.calendarLocation && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3" />
                                      {task.calendarLocation}
                                    </span>
                                  )}
                                </div>
                                {/* Work/Personal/Calendar indicator */}
                                {task.isCalendarEvent ? (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                    Cal
                                  </span>
                                ) : task.isPersonal !== undefined && (
                                  <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded-full",
                                    task.isPersonal 
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-blue-100 text-blue-700"
                                  )}>
                                    {task.isPersonal ? 'P' : 'W'}
                                  </span>
                                )}
                                {!task.isCalendarEvent && (
                                  <button
                                    onClick={() => removeTaskFromSlot(task.id, slot.id)}
                                    className="opacity-30 hover:opacity-100 transition-opacity"
                                    title="Remove from timebox"
                                  >
                                    <X className="w-4 h-4 text-gray-500 hover:text-red-500" />
                                  </button>
                                )}
                                  </div>
                                  {/* Show children if expanded */}
                                  {isExpanded && hasChildren && (
                                    <div className="ml-6 mt-1 space-y-1">
                                      {taskChildren.map((child) => (
                                        <div
                                          key={child.id}
                                          className="flex items-center gap-2 p-1 text-xs bg-gray-50 rounded border border-gray-200"
                                        >
                                          <ChevronRight className="w-3 h-3 text-gray-400" />
                                          <span className={cn(
                                            "flex-1",
                                            child.completed && "line-through text-gray-500"
                                          )}>
                                            {child.title || 'Untitled'}
                                          </span>
                                          <span className="text-gray-400">
                                            {getNodeTypeIcon(child.type)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                        
                        {/* Drop zone or blocked indicator */}
                        {slot.isBlocked ? (
                          <div className="p-4 bg-gray-100 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-gray-500">
                                {blockReasonIcons[slot.blockReason || 'custom']}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-700">
                                  {slot.blockLabel || slot.blockReason?.replace('-', ' ').toUpperCase() || 'Blocked'}
                                </div>
                                <div className="text-xs text-gray-500">Time blocked</div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => unblockTimeSlot(slot.id)}
                              className="text-gray-500 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className={cn(
                              "p-3 border-2 border-dashed rounded-lg text-center transition-colors",
                              hoveredSlotId === slot.id 
                                ? "border-brain-400 bg-brain-50" 
                                : "border-gray-300 text-gray-500"
                            )}
                            onDragOver={(e) => handleDragOver(e, `current-${slot.id}`)}
                            onDrop={(e) => handleDrop(e, `current-${slot.id}`)}
                            onDragLeave={(e) => {
                              // Only clear hover if we're actually leaving this element
                              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                setHoveredSlotId(null)
                              }
                            }}
                          >
                            <Zap className="w-5 h-5 mx-auto mb-1 opacity-50" />
                            <div className="text-xs">Drop nodes here</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          </div>
        </div>

        {/* Daily Summary */}
        <Card className="mt-4 flex-shrink-0">
          <CardContent className="p-4">
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
                      Standup
                    </Button>
                  }
                />
              )}
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-brain-600">{totalHours}</div>
                <div className="text-xs text-gray-600">Hours</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{totalScheduledTasks}</div>
                <div className="text-xs text-gray-600">Scheduled</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{completedTasks}</div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600">
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
  )
}