import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChevronDown, ChevronUp, ChevronRight, CheckCircle, X, Calendar, Zap, MapPin } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { type TimeboxTask } from '@/store/timeboxStore'
import type { Node } from '@/types/node'
import { getPriorityColor, timeBlockColors, blockReasonIcons } from './TimeboxConstants'
import { getNodeTypeIcon } from '@/types/node'
import dayjs from '@/lib/dayjs'

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  duration: number
  tasks: TimeboxTask[]
  isBlocked?: boolean
  blockReason?: string
  isPast?: boolean
  isCurrentTimeSlot?: boolean
  calendarEvents?: unknown[]
}

interface TimeSlotsListProps {
  displaySlots: TimeSlot[]
  isClient: boolean
  selectedDate: string
  currentTimeSlotId: string | null
  hoveredSlotId: string | null
  expandedTasks: Set<string>
  onToggleTaskExpanded: (taskId: string) => void
  onUpdateTaskInSlot: (taskId: string, updates: Partial<TimeboxTask>) => void
  onRemoveTaskFromSlot: (taskId: string, slotId: string) => void
  onHandleTaskClick: (task: TimeboxTask) => void
  onUnblockTimeSlot: (slotId: string) => void
  onHandleDragOver: (e: React.DragEvent, slotId: string) => void
  onHandleDrop: (e: React.DragEvent, slotId: string) => void
  onSetHoveredSlotId: (id: string | null) => void
  onHandleDragStart: (e: React.DragEvent, task: TimeboxTask) => void
  onHandleDragEnd: () => void
  getTaskChildren: (nodeId?: string) => Node[]
}

export function TimeSlotsList({
  displaySlots,
  isClient,
  selectedDate,
  currentTimeSlotId,
  hoveredSlotId,
  expandedTasks,
  onToggleTaskExpanded,
  onUpdateTaskInSlot,
  onRemoveTaskFromSlot,
  onHandleTaskClick,
  onUnblockTimeSlot,
  onHandleDragOver,
  onHandleDrop,
  onSetHoveredSlotId,
  onHandleDragStart,
  onHandleDragEnd,
  getTaskChildren
}: TimeSlotsListProps) {
  const [showPastSlots, setShowPastSlots] = useState(true)

  // Separate past and current/future slots
  const { pastSlots, currentAndFutureSlots } = useMemo(() => {
    // Skip time-based filtering during SSR to avoid hydration issues
    if (!isClient) {
      return {
        pastSlots: [],
        currentAndFutureSlots: displaySlots
      }
    }
    
    const today = dayjs().format('YYYY-MM-DD')
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
    
    return {
      pastSlots: past,
      currentAndFutureSlots: currentFuture
    }
  }, [displaySlots, selectedDate, isClient])

  const renderTask = (task: TimeboxTask, slotId: string) => {
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
            task.status === 'completed' && "opacity-60",
            (task as any).isOptimistic && "opacity-70 animate-pulse border-blue-400"
          )}
          draggable={!task.isCalendarEvent}
          onDragStart={(e) => !task.isCalendarEvent && onHandleDragStart(e, task)}
          onDragEnd={onHandleDragEnd}
        >
          {/* Expand/Collapse button for tasks with children */}
          {!task.isCalendarEvent && hasChildren && (
            <button
              onClick={() => onToggleTaskExpanded(task.id)}
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
              onClick={() => onUpdateTaskInSlot(task.id, {
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
          onClick={() => onHandleTaskClick(task)}
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
            onClick={() => onRemoveTaskFromSlot(task.id, slotId)}
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
  }

  const renderSlot = (slot: any, isCurrentSlot: boolean, slotPrefix = '') => {
    return (
      <Card 
        key={slot.id} 
        id={`${slotPrefix}${slot.id}`}
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
            <div className="flex-shrink-0 w-16 sm:w-24">
              <div className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1">
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
                  {slot.tasks.map((task: TimeboxTask) => renderTask(task, slot.id))}
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
                    onClick={() => onUnblockTimeSlot(slot.id)}
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
                  onDragOver={(e) => onHandleDragOver(e, `${slotPrefix}${slot.id}`)}
                  onDrop={(e) => onHandleDrop(e, `${slotPrefix}${slot.id}`)}
                  onDragLeave={(e) => {
                    // Only clear hover if we're actually leaving this element
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      onSetHoveredSlotId(null)
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
  }

  return (
    <div className="lg:col-span-3 overflow-y-auto order-1 lg:order-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
      <div className="pr-2 space-y-2">
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
                  {pastSlots.map((slot) => {
                    const isCurrentSlot = currentTimeSlotId === slot.id && selectedDate === dayjs().format('YYYY-MM-DD')
                    return (
                      <div key={slot.id} className="opacity-75">
                        {renderSlot(slot, isCurrentSlot, 'past-')}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </div>
            )}
          </Card>
        )}
        
        {/* Current and Future Time Slots */}
        {currentAndFutureSlots.map((slot) => {
          const isCurrentSlot = currentTimeSlotId === slot.id && selectedDate === dayjs().format('YYYY-MM-DD')
          return renderSlot(slot, isCurrentSlot, 'current-')
        })}
      </div>
    </div>
  )
}
