'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { Calendar, CheckCircle, X, Lock, Coffee, Users, Stethoscope, Car, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { TimeSlot as TimeSlotType, TimeboxTask } from '@/store/timeboxStore'

interface TimeSlotProps {
  slot: TimeSlotType
  hoveredSlotId: string | null
  isCollapsed: boolean
  isPast: boolean
  isCurrent: boolean
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragLeave: () => void
  onToggleCollapse: () => void
  onUpdateTask: (taskId: string, updates: Partial<TimeboxTask>) => void
  onRemoveTask: (taskId: string) => void
  onBlockSlot: () => void
  onUnblockSlot: () => void
  onDragStart: (e: React.DragEvent, task: TimeboxTask) => void
  onDragEnd: () => void
}

const blockReasonIcons = {
  'meeting': <Users className="w-4 h-4" />,
  'patient-care': <Stethoscope className="w-4 h-4" />,
  'admin': <Lock className="w-4 h-4" />,
  'lunch': <Coffee className="w-4 h-4" />,
  'commute': <Car className="w-4 h-4" />,
  'break': <Coffee className="w-4 h-4" />,
  'personal': <User className="w-4 h-4" />,
  'custom': <Lock className="w-4 h-4" />,
}

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

export const TimeSlot = memo(function TimeSlot({
  slot,
  hoveredSlotId,
  isCollapsed,
  isPast,
  isCurrent,
  onDragOver,
  onDrop,
  onDragLeave,
  onToggleCollapse,
  onUpdateTask,
  onRemoveTask,
  onBlockSlot,
  onUnblockSlot,
  onDragStart,
  onDragEnd
}: TimeSlotProps) {
  const isHovered = hoveredSlotId === slot.id
  const hasCalendarEvents = slot.tasks.some(t => t.isCalendarEvent)
  
  return (
    <div
      className={cn(
        "border rounded-lg transition-all",
        slot.isBlocked && "bg-gray-50",
        isHovered && !slot.isBlocked && "bg-blue-50 border-blue-400",
        isPast && "opacity-60",
        isCurrent && "ring-2 ring-blue-500"
      )}
      onDragOver={(e) => !slot.isBlocked && onDragOver(e)}
      onDrop={(e) => !slot.isBlocked && onDrop(e)}
      onDragLeave={onDragLeave}
    >
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {slot.startTime} - {slot.endTime}
          </span>
          {slot.isBlocked && slot.blockReason && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              {blockReasonIcons[slot.blockReason]}
              <span>{slot.blockLabel || slot.blockReason}</span>
            </div>
          )}
          {hasCalendarEvents && (
            <Calendar className="w-4 h-4 text-indigo-600" />
          )}
          {slot.tasks.length > 0 && (
            <span className="text-xs text-gray-500">
              ({slot.tasks.length} task{slot.tasks.length !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {slot.isBlocked ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onUnblockSlot}
              className="h-7 px-2"
            >
              Unblock
            </Button>
          ) : slot.tasks.length === 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onBlockSlot}
              className="h-7 px-2"
            >
              Block
            </Button>
          )}
          {slot.tasks.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleCollapse}
              className="h-7 px-2"
            >
              {isCollapsed ? 'Show' : 'Hide'}
            </Button>
          )}
        </div>
      </div>
      
      {!isCollapsed && slot.tasks.length > 0 && (
        <div className="p-2 space-y-2">
          {slot.tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded border",
                task.isCalendarEvent ? "cursor-default" : "cursor-move",
                task.isCalendarEvent ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300" : getPriorityColor(task.importance, task.urgency),
                task.status === 'completed' && "opacity-60"
              )}
              draggable={!task.isCalendarEvent}
              onDragStart={(e) => !task.isCalendarEvent && onDragStart(e, task)}
              onDragEnd={onDragEnd}
            >
              {task.isCalendarEvent ? (
                <Calendar className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              ) : (
                <button
                  onClick={() => onUpdateTask(task.id, {
                    status: task.status === 'completed' ? 'pending' : 'completed',
                  })}
                  className="flex-shrink-0"
                >
                  <CheckCircle
                    className={cn(
                      "w-4 h-4",
                      task.status === 'completed' ? "text-green-600" : "text-gray-400"
                    )}
                  />
                </button>
              )}
              <span className={cn(
                "text-sm flex-1",
                task.status === 'completed' && "line-through"
              )}>
                {task.label}
              </span>
              {!task.isCalendarEvent && (
                <button
                  onClick={() => onRemoveTask(task.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {!slot.isBlocked && slot.tasks.length === 0 && (
        <div className="p-4 text-center text-sm text-gray-400">
          Drop tasks here
        </div>
      )}
    </div>
  )
})