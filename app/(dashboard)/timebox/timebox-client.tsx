'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Clock, Calendar, Plus, MoreHorizontal, Zap, Target, ChevronLeft, ChevronRight, CheckCircle, X, Settings, Lock, Coffee, Users, Stethoscope, Car, User, Mic } from 'lucide-react'
import { useTimeboxStore, type TimeboxTask } from '@/store/timeboxStore'
import { useNodesStore } from '@/store/nodeStore'
import { useUserPreferencesStore } from '@/store/userPreferencesStore'
import { format, addDays, subDays } from 'date-fns'
import { cn } from '@/lib/utils'
import StandupSummaryDialog from '@/components/StandupSummaryDialog'

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
  const { 
    selectedDate, 
    timeSlots, 
    draggedTask,
    hoveredSlotId,
    setSelectedDate, 
    setDraggedTask,
    setHoveredSlotId,
    addTaskToSlot,
    removeTaskFromSlot,
    updateTaskInSlot,
    moveTaskBetweenSlots,
    loadTimeboxData,
    initializeTimeSlots,
    blockTimeSlot,
    unblockTimeSlot
  } = useTimeboxStore()
  const { nodes, loadNodes } = useNodesStore()
  const { getEffectiveTimeboxInterval, setTimeboxInterval, currentMode } = useUserPreferencesStore()
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskText, setNewTaskText] = useState('')
  const [showIntervalSettings, setShowIntervalSettings] = useState(false)
  const dragNodeRef = useRef<HTMLDivElement>(null)
  
  const effectiveInterval = getEffectiveTimeboxInterval()
  
  // Initialize time slots with correct interval
  useEffect(() => {
    initializeTimeSlots(effectiveInterval)
  }, [effectiveInterval, initializeTimeSlots])
  
  // Load data on mount and date change
  useEffect(() => {
    loadNodes(userId)
    loadTimeboxData(userId, selectedDate)
  }, [userId, selectedDate, loadNodes, loadTimeboxData])
  
  // Get unscheduled nodes
  const unscheduledNodes = nodes.filter(node => 
    !node.completed && 
    !timeSlots.some(slot => 
      slot.tasks.some(task => task.nodeId === node.id)
    )
  )
  
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
  const handleDragStart = (task: TimeboxTask) => {
    setDraggedTask(task)
  }
  
  const handleDragEnd = () => {
    setDraggedTask(null)
    setHoveredSlotId(null)
  }
  
  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    setHoveredSlotId(slotId)
  }
  
  const handleDrop = async (e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    if (!draggedTask) return
    
    // Check if slot is blocked
    const targetSlot = timeSlots.find(slot => slot.id === slotId)
    if (targetSlot?.isBlocked) {
      handleDragEnd()
      return
    }
    
    // Check if task is being moved from another slot
    const sourceSlot = timeSlots.find(slot => 
      slot.tasks.some(t => t.id === draggedTask.id)
    )
    
    if (sourceSlot) {
      await moveTaskBetweenSlots(draggedTask.id, sourceSlot.id, slotId)
    } else {
      // Add new task to slot
      await addTaskToSlot({
        ...draggedTask,
        userId: userId,
        timeboxDate: selectedDate,
      }, slotId)
    }
    
    handleDragEnd()
  }
  
  // Calculate stats
  const totalScheduledTasks = timeSlots.reduce((sum, slot) => sum + slot.tasks.length, 0)
  const completedTasks = timeSlots.reduce((sum, slot) => 
    sum + slot.tasks.filter(t => t.status === 'completed').length, 0
  )
  const totalHours = timeSlots.filter(slot => slot.tasks.length > 0).length * (effectiveInterval / 60)
  return (
      <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 min-h-[calc(100vh-4rem)]">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Clock className="w-12 h-12 text-white" />
                <div>
                  <h1 className="text-4xl font-bold text-white">Timebox Schedule</h1>
                  <p className="text-white/80">
                    Organize your day into focused {effectiveInterval === 30 ? '30-minute' : effectiveInterval === 60 ? '1-hour' : '2-hour'} blocks
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIntervalSettings(!showIntervalSettings)}
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                  title="Time interval settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
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
            <div className="text-center text-white/90 text-lg">
              {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
            </div>
            
            {/* Interval Settings */}
            {showIntervalSettings && (
              <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium mb-2">Time Block Duration</h3>
                    <p className="text-white/70 text-sm">
                      {currentMode === 'work' ? 'In work mode, smaller intervals help with focus' : 'Choose your preferred time block size'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={effectiveInterval === 30 ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTimeboxInterval(30)}
                      className={effectiveInterval === 30 ? '' : 'bg-white/10 text-white hover:bg-white/20 border-white/20'}
                    >
                      30 min
                    </Button>
                    <Button
                      variant={effectiveInterval === 60 ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTimeboxInterval(60)}
                      className={effectiveInterval === 60 ? '' : 'bg-white/10 text-white hover:bg-white/20 border-white/20'}
                    >
                      1 hour
                    </Button>
                    <Button
                      variant={effectiveInterval === 120 ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTimeboxInterval(120)}
                      className={effectiveInterval === 120 ? '' : 'bg-white/10 text-white hover:bg-white/20 border-white/20'}
                    >
                      2 hours
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Quick Block Templates (Work Mode) */}
            {currentMode === 'work' && (
              <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                <h3 className="text-white font-medium mb-3">Quick Block Templates</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                    onClick={() => {
                      // Block 9am slot for typical morning meeting
                      const slot = timeSlots.find(s => s.startTime === '09:00' || s.startTime === '09:30')
                      if (slot) blockTimeSlot(slot.id, 'meeting', 'Morning Standup')
                    }}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    9am Meeting
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                    onClick={() => {
                      // Block lunch hour
                      const slot = timeSlots.find(s => s.startTime === '12:00' || s.startTime === '12:30')
                      if (slot) blockTimeSlot(slot.id, 'lunch', 'Lunch Break')
                    }}
                  >
                    <Coffee className="w-4 h-4 mr-1" />
                    Lunch
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                    onClick={() => {
                      // Block patient care times
                      const slot = timeSlots.find(s => s.startTime === '14:00' || s.startTime === '14:30')
                      if (slot) blockTimeSlot(slot.id, 'patient-care', 'Patient Appointments')
                    }}
                  >
                    <Stethoscope className="w-4 h-4 mr-1" />
                    Patient Care
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                    onClick={() => {
                      // Block admin time
                      const slot = timeSlots.find(s => s.startTime === '16:00' || s.startTime === '16:30')
                      if (slot) blockTimeSlot(slot.id, 'admin', 'Admin Work')
                    }}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Admin Time
                  </Button>
                </div>
              </div>
            )}
          </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Unscheduled Tasks */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
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
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {unscheduledNodes.map((node) => (
                  <div
                    key={node.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-move hover:shadow-md transition-shadow",
                      getPriorityColor(node.importance, node.urgency)
                    )}
                    draggable
                    onDragStart={() => handleDragStart({
                      id: node.id,
                      label: node.title || 'Untitled',
                      nodeId: node.id,
                      importance: node.importance,
                      urgency: node.urgency,
                      category: node.type,
                    })}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {node.title || 'Untitled'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-600">{node.type}</span>
                      {node.urgency !== undefined && node.importance !== undefined && (
                        <span className="text-xs text-gray-500">
                          U:{node.urgency} I:{node.importance}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {unscheduledNodes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No unscheduled nodes</p>
                  <p className="text-xs mt-1">Create nodes from the Nodes page</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Blocks */}
          <div className="lg:col-span-3">
            <div className={cn(
              "grid grid-cols-1 gap-4",
              effectiveInterval === 30 && "max-h-[800px] overflow-y-auto custom-scrollbar"
            )}>
              {timeSlots.map((slot) => (
                <Card 
                  key={slot.id} 
                  className={cn(
                    "hover:shadow-lg transition-all duration-300",
                    hoveredSlotId === slot.id && "ring-2 ring-brain-400"
                  )}
                >
                  <CardContent className={cn(
                    "p-6",
                    effectiveInterval === 30 && "p-4"
                  )}>
                    <div className="flex items-start gap-4">
                      {/* Time indicator */}
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "w-4 h-full rounded-full",
                          effectiveInterval === 30 ? "min-h-[60px]" : "min-h-[80px]",
                          timeBlockColors[slot.period]
                        )} />
                      </div>
                      
                      {/* Time label */}
                      <div className="flex-shrink-0 w-32">
                        <div className="text-lg font-bold text-gray-900">{slot.displayTime}</div>
                        <div className="text-sm text-gray-500">
                          {slot.isBlocked ? 'Blocked' : `${slot.tasks.length} task${slot.tasks.length !== 1 ? 's' : ''}`}
                        </div>
                      </div>
                      
                      {/* Block content */}
                      <div className="flex-1">
                        {/* Tasks in this block */}
                        {slot.tasks.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {slot.tasks.map((task) => (
                              <div
                                key={task.id}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded border cursor-move",
                                  getPriorityColor(task.importance, task.urgency),
                                  task.status === 'completed' && "opacity-60"
                                )}
                                draggable
                                onDragStart={() => handleDragStart(task)}
                                onDragEnd={handleDragEnd}
                              >
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
                                <span className={cn(
                                  "text-sm text-gray-700 flex-1",
                                  task.status === 'completed' && "line-through"
                                )}>
                                  {task.label}
                                </span>
                                <button
                                  onClick={() => removeTaskFromSlot(task.id, slot.id)}
                                  className="opacity-0 hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-4 h-4 text-gray-500 hover:text-red-500" />
                                </button>
                              </div>
                            ))}
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
                              "p-4 border-2 border-dashed rounded-lg text-center transition-colors",
                              hoveredSlotId === slot.id 
                                ? "border-brain-400 bg-brain-50" 
                                : "border-gray-300 text-gray-500"
                            )}
                            onDragOver={(e) => handleDragOver(e, slot.id)}
                            onDrop={(e) => handleDrop(e, slot.id)}
                            onDragLeave={() => setHoveredSlotId(null)}
                          >
                            <Zap className="w-6 h-6 mx-auto mb-2 opacity-50" />
                            <div className="text-sm">Drop nodes here</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Summary */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Daily Summary
                </CardTitle>
                <CardDescription>
                  {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                </CardDescription>
              </div>
              {currentMode === 'work' && (
                <StandupSummaryDialog 
                  trigger={
                    <Button variant="outline" size="sm" className="gap-2">
                      <Mic className="w-4 h-4" />
                      Daily Standup
                    </Button>
                  }
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-brain-600 mb-1">{totalHours}</div>
                <div className="text-sm text-gray-600">Planned Hours</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">{totalScheduledTasks}</div>
                <div className="text-sm text-gray-600">Scheduled Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">{completedTasks}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {totalScheduledTasks > 0 ? Math.round((completedTasks / totalScheduledTasks) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
  )
}