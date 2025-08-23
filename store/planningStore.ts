import { create } from 'zustand'
import dayjs from 'dayjs'
import { TimeboxService } from '@/services/timeboxService'

// Task attempt tracking
export interface TaskAttempt {
  id: string
  timestamp: string
  duration?: number // minutes spent
  notes?: string
  outcome: 'success' | 'partial' | 'failed' | 'blocked'
  nextAction?: string // What to try next
}

// Timebox task type
export interface TimeboxTask {
  id: string
  label: string
  category?: string
  importance?: number
  urgency?: number
  dueDate?: string
  timeboxStartTime?: string
  timeboxDuration?: number
  timeboxDate?: string
  isTimedTask?: boolean
  isPersonal?: boolean
  // Completion tracking
  status?: 'pending' | 'in-progress' | 'completed' | 'deferred'
  completedAt?: string // ISO timestamp
  attempts?: TaskAttempt[]
  totalAttempts?: number
  // Node reference
  nodeId?: string
  // User reference
  userId?: string
  // Calendar integration
  calendarEventId?: string
  calendarId?: string
  calendarSummary?: string
  calendarLocation?: string
  isCalendarEvent?: boolean
  // Optimized store properties
  slotId?: string // For optimized operations
}

export interface TimeSlot {
  id: string
  startTime: string // "HH:MM" format (24-hour)
  endTime: string // "HH:MM" format (24-hour)
  displayTime: string // "6-8am" format for display
  timeIndex: number // -2, -1, 0, 1, 2, etc. based on 12pm as 0
  period: 'morning' | 'afternoon' | 'evening' | 'night'
  tasks: TimeboxTask[]
  isBlocked?: boolean
  blockReason?: 'meeting' | 'patient-care' | 'admin' | 'lunch' | 'commute' | 'break' | 'personal' | 'custom'
  blockLabel?: string
}

interface PlanningState {
  selectedDate: string // YYYY-MM-DD format
  timeSlots: TimeSlot[]
  draggedTask: TimeboxTask | null
  hoveredSlotId: string | null
  isLoading: boolean
  error: string | null
  
  // Optimized state
  timeSlotsMap: Map<string, TimeSlot>
  tasksMap: Map<string, TimeboxTask>
  calendarEvents: TimeboxTask[]
  calendarSyncEnabled: boolean
  timeInterval: 30 | 60 | 120
  showPastSlots: boolean

  // Actions
  setSelectedDate: (date: string) => void
  setDraggedTask: (task: TimeboxTask | null) => void
  setHoveredSlotId: (slotId: string | null) => void
  addTaskToSlot: (task: TimeboxTask, slotId: string) => Promise<void>
  removeTaskFromSlot: (taskId: string, slotId: string) => Promise<void>
  updateTaskInSlot: (taskId: string, updates: Partial<TimeboxTask>) => Promise<void>
  moveTaskBetweenSlots: (taskId: string, fromSlotId: string, toSlotId: string) => Promise<void>
  initializeTimeSlots: (intervalMinutes?: 30 | 60 | 120) => void
  blockTimeSlot: (slotId: string, reason: TimeSlot['blockReason'], label?: string) => Promise<void>
  unblockTimeSlot: (slotId: string) => Promise<void>
  
  // Batch operations for performance
  batchUpdateTasks: (updates: Array<{ taskId: string; updates: Partial<TimeboxTask> }>) => void
  batchAddTasks: (tasks: Array<{ task: TimeboxTask; slotId: string }>) => void
  
  // Getters
  getTimeSlots: () => TimeSlot[]
  getSlotById: (slotId: string) => TimeSlot | undefined
  getTaskById: (taskId: string) => TimeboxTask | undefined
  
  // Firebase actions
  loadTimeboxData: (userId: string, date: string, intervalMinutes?: 30 | 60 | 120) => Promise<void>
  saveTimeboxData: (userId: string, intervalMinutes?: 30 | 60 | 120) => Promise<void>
  
  // Debug helpers
  _debugLogState: () => void
}

// Helper function to format time display
const formatTimeDisplay = (hour: number, minute: number): string => {
  const period = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const displayMinute = minute === 0 ? '' : `:${minute.toString().padStart(2, '0')}`
  return `${displayHour}${displayMinute}${period}`
}

// Helper function to generate time slots
const generateTimeSlots = (intervalMinutes: 30 | 60 | 120 = 120): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const startHour = 6 // 6am
  const endHour = 22 // 10pm
  
  for (let hour = startHour; hour < endHour; hour += Math.floor(intervalMinutes / 60)) {
    for (let minute = 0; minute < 60 && (hour < endHour); minute += intervalMinutes % 60) {
      if (minute > 0 && intervalMinutes >= 120) break // For 2-hour slots, don't add minutes
      
      const slotStartHour = hour
      const slotStartMinute = minute
      const totalMinutes = slotStartHour * 60 + slotStartMinute + intervalMinutes
      const slotEndHour = Math.floor(totalMinutes / 60)
      const slotEndMinute = totalMinutes % 60
      
      if (slotEndHour > endHour) break
      
      const startTime = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMinute.toString().padStart(2, '0')}`
      const endTime = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMinute.toString().padStart(2, '0')}`
      
      const displayStart = formatTimeDisplay(slotStartHour, slotStartMinute)
      const displayEnd = formatTimeDisplay(slotEndHour, slotEndMinute)
      const displayTime = `${displayStart}-${displayEnd}`
      
      // Determine period
      let period: TimeSlot['period']
      if (slotStartHour < 12) period = 'morning'
      else if (slotStartHour < 17) period = 'afternoon'
      else if (slotStartHour < 21) period = 'evening'
      else period = 'night'
      
      // Time index based on 12pm as 0
      const timeIndex = slotStartHour - 12 + (slotStartMinute / 60)
      
      slots.push({
        id: crypto.randomUUID(),
        startTime,
        endTime,
        displayTime,
        timeIndex,
        period,
        tasks: [],
      })
    }
  }
  
  return slots
}

// Helper to convert Map to array for components
function mapToArray<T>(map: Map<string, T>): T[] {
  return Array.from(map.values())
}

export const usePlanningStore = create<PlanningState>((set, get) => ({
  selectedDate: dayjs().format('YYYY-MM-DD'),
  timeSlots: [],
  draggedTask: null,
  hoveredSlotId: null,
  isLoading: false,
  error: null,
  
  // Optimized state
  timeSlotsMap: new Map(),
  tasksMap: new Map(),
  calendarEvents: [],
  calendarSyncEnabled: false,
  timeInterval: 120,
  showPastSlots: false,

  setSelectedDate: (date) => {
    set({ selectedDate: date })
  },
  
  setDraggedTask: (task) => {
    set({ draggedTask: task })
  },
  
  setHoveredSlotId: (slotId) => {
    set({ hoveredSlotId: slotId })
  },
  
  addTaskToSlot: async (task, slotId) => {
    const state = get()
    
    // Update both optimized and array-based state
    const slot = state.timeSlotsMap.get(slotId) || state.timeSlots.find(s => s.id === slotId)
    if (!slot) {
      set({ error: 'Slot not found' })
      return
    }
    
    const taskWithSlot = { ...task, slotId }
    
    // Update maps for optimized operations
    const newTasksMap = new Map(state.tasksMap)
    newTasksMap.set(task.id, taskWithSlot)
    
    const newSlotsMap = new Map(state.timeSlotsMap)
    newSlotsMap.set(slotId, {
      ...slot,
      tasks: [...slot.tasks, taskWithSlot]
    })
    
    // Update array-based state for compatibility
    const updatedTimeSlots = state.timeSlots.map(timeSlot =>
      timeSlot.id === slotId
        ? { ...timeSlot, tasks: [...timeSlot.tasks, taskWithSlot] }
        : timeSlot
    )
    
    set({
      timeSlots: updatedTimeSlots,
      timeSlotsMap: newSlotsMap,
      tasksMap: newTasksMap,
      error: null
    })
    
    // Save to Firebase
    try {
      const timeboxService = new TimeboxService()
      await timeboxService.saveTimeboxData({
        userId: task.userId || 'demo-user',
        date: state.selectedDate,
        timeSlots: updatedTimeSlots,
      })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  
  removeTaskFromSlot: async (taskId, slotId) => {
    const state = get()
    const slot = state.timeSlotsMap.get(slotId) || state.timeSlots.find(s => s.id === slotId)
    
    if (!slot) return
    
    // Update maps
    const newTasksMap = new Map(state.tasksMap)
    newTasksMap.delete(taskId)
    
    const newSlotsMap = new Map(state.timeSlotsMap)
    newSlotsMap.set(slotId, {
      ...slot,
      tasks: slot.tasks.filter(t => t.id !== taskId)
    })
    
    // Update array-based state
    const updatedTimeSlots = state.timeSlots.map(timeSlot =>
      timeSlot.id === slotId
        ? { ...timeSlot, tasks: timeSlot.tasks.filter(t => t.id !== taskId) }
        : timeSlot
    )
    
    set({
      timeSlots: updatedTimeSlots,
      timeSlotsMap: newSlotsMap,
      tasksMap: newTasksMap
    })
    
    // Save to Firebase
    const task = state.tasksMap.get(taskId)
    if (task) {
      try {
        const timeboxService = new TimeboxService()
        await timeboxService.saveTimeboxData({
          userId: task.userId || 'demo-user',
          date: state.selectedDate,
          timeSlots: updatedTimeSlots,
        })
      } catch (error) {
        set({ error: (error as Error).message })
      }
    }
  },
  
  updateTaskInSlot: async (taskId, updates) => {
    const state = get()
    const task = state.tasksMap.get(taskId)
    
    if (!task || !task.slotId) return
    
    const slot = state.timeSlotsMap.get(task.slotId)
    if (!slot) return
    
    const updatedTask = { ...task, ...updates }
    
    // Update maps
    const newTasksMap = new Map(state.tasksMap)
    newTasksMap.set(taskId, updatedTask)
    
    const newSlotsMap = new Map(state.timeSlotsMap)
    newSlotsMap.set(task.slotId, {
      ...slot,
      tasks: slot.tasks.map(t => t.id === taskId ? updatedTask : t)
    })
    
    // Update array-based state
    const updatedTimeSlots = state.timeSlots.map(timeSlot =>
      timeSlot.id === task.slotId
        ? {
            ...timeSlot,
            tasks: timeSlot.tasks.map(t => t.id === taskId ? updatedTask : t)
          }
        : timeSlot
    )
    
    set({
      timeSlots: updatedTimeSlots,
      timeSlotsMap: newSlotsMap,
      tasksMap: newTasksMap
    })
    
    // Save to Firebase
    try {
      const timeboxService = new TimeboxService()
      await timeboxService.saveTimeboxData({
        userId: task.userId || 'demo-user',
        date: state.selectedDate,
        timeSlots: updatedTimeSlots,
      })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  
  moveTaskBetweenSlots: async (taskId, fromSlotId, toSlotId) => {
    const state = get()
    const task = state.tasksMap.get(taskId)
    const fromSlot = state.timeSlotsMap.get(fromSlotId)
    const toSlot = state.timeSlotsMap.get(toSlotId)
    
    if (!task || !fromSlot || !toSlot) return
    
    const updatedTask = { ...task, slotId: toSlotId }
    
    // Update maps
    const newTasksMap = new Map(state.tasksMap)
    newTasksMap.set(taskId, updatedTask)
    
    const newSlotsMap = new Map(state.timeSlotsMap)
    newSlotsMap.set(fromSlotId, {
      ...fromSlot,
      tasks: fromSlot.tasks.filter(t => t.id !== taskId)
    })
    newSlotsMap.set(toSlotId, {
      ...toSlot,
      tasks: [...toSlot.tasks, updatedTask]
    })
    
    // Update array-based state
    const updatedTimeSlots = state.timeSlots.map(timeSlot => {
      if (timeSlot.id === fromSlotId) {
        return {
          ...timeSlot,
          tasks: timeSlot.tasks.filter(t => t.id !== taskId)
        }
      }
      if (timeSlot.id === toSlotId) {
        return {
          ...timeSlot,
          tasks: [...timeSlot.tasks, updatedTask]
        }
      }
      return timeSlot
    })
    
    set({
      timeSlots: updatedTimeSlots,
      timeSlotsMap: newSlotsMap,
      tasksMap: newTasksMap
    })
    
    // Save to Firebase
    try {
      const timeboxService = new TimeboxService()
      await timeboxService.saveTimeboxData({
        userId: task.userId || 'demo-user',
        date: state.selectedDate,
        timeSlots: updatedTimeSlots,
      })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
  
  initializeTimeSlots: (intervalMinutes = 120) => {
    const slots = generateTimeSlots(intervalMinutes)
    const slotsMap = new Map(slots.map(slot => [slot.id, slot]))
    
    set({
      timeSlots: slots,
      timeSlotsMap: slotsMap,
      timeInterval: intervalMinutes
    })
  },
  
  blockTimeSlot: async (slotId, reason, label) => {
    const state = get()
    const slot = state.timeSlotsMap.get(slotId) || state.timeSlots.find(s => s.id === slotId)
    if (!slot) return
    
    const blockedSlot = {
      ...slot,
      isBlocked: true,
      blockReason: reason,
      blockLabel: label
    }
    
    // Update maps
    const newSlotsMap = new Map(state.timeSlotsMap)
    newSlotsMap.set(slotId, blockedSlot)
    
    // Update array-based state
    const updatedTimeSlots = state.timeSlots.map(timeSlot =>
      timeSlot.id === slotId ? blockedSlot : timeSlot
    )
    
    set({
      timeSlots: updatedTimeSlots,
      timeSlotsMap: newSlotsMap
    })
  },
  
  unblockTimeSlot: async (slotId) => {
    const state = get()
    const slot = state.timeSlotsMap.get(slotId) || state.timeSlots.find(s => s.id === slotId)
    if (!slot) return
    
    const unblockedSlot = {
      ...slot,
      isBlocked: false,
      blockReason: undefined,
      blockLabel: undefined
    }
    
    // Update maps
    const newSlotsMap = new Map(state.timeSlotsMap)
    newSlotsMap.set(slotId, unblockedSlot)
    
    // Update array-based state
    const updatedTimeSlots = state.timeSlots.map(timeSlot =>
      timeSlot.id === slotId ? unblockedSlot : timeSlot
    )
    
    set({
      timeSlots: updatedTimeSlots,
      timeSlotsMap: newSlotsMap
    })
  },
  
  // Batch operations for performance
  batchUpdateTasks: (updates) => {
    const state = get()
    const newTasksMap = new Map(state.tasksMap)
    const newSlotsMap = new Map(state.timeSlotsMap)
    
    updates.forEach(({ taskId, updates: taskUpdates }) => {
      const task = newTasksMap.get(taskId)
      if (!task || !task.slotId) return
      
      const updatedTask = { ...task, ...taskUpdates }
      newTasksMap.set(taskId, updatedTask)
      
      const slot = newSlotsMap.get(task.slotId)
      if (slot) {
        newSlotsMap.set(task.slotId, {
          ...slot,
          tasks: slot.tasks.map(t => t.id === taskId ? updatedTask : t)
        })
      }
    })
    
    set({
      tasksMap: newTasksMap,
      timeSlotsMap: newSlotsMap,
      timeSlots: mapToArray(newSlotsMap)
    })
  },
  
  batchAddTasks: (tasks) => {
    const state = get()
    const newTasksMap = new Map(state.tasksMap)
    const newSlotsMap = new Map(state.timeSlotsMap)
    
    tasks.forEach(({ task, slotId }) => {
      const taskWithSlot = { ...task, slotId }
      newTasksMap.set(task.id, taskWithSlot)
      
      const slot = newSlotsMap.get(slotId)
      if (slot) {
        newSlotsMap.set(slotId, {
          ...slot,
          tasks: [...slot.tasks, taskWithSlot]
        })
      }
    })
    
    set({
      tasksMap: newTasksMap,
      timeSlotsMap: newSlotsMap,
      timeSlots: mapToArray(newSlotsMap)
    })
  },
  
  // Getters
  getTimeSlots: () => {
    return mapToArray(get().timeSlotsMap)
  },
  
  getSlotById: (slotId) => {
    return get().timeSlotsMap.get(slotId)
  },
  
  getTaskById: (taskId) => {
    return get().tasksMap.get(taskId)
  },
  
  loadTimeboxData: async (userId, date, intervalMinutes = 120) => {
    set({ isLoading: true, error: null })
    
    try {
      const timeboxService = new TimeboxService()
      const data = await timeboxService.loadTimeboxData(userId, date, intervalMinutes)
      
      if (data) {
        const slotsMap = new Map(data.timeSlots.map(slot => [slot.id, slot]))
        const tasksMap = new Map()
        
        // Build tasks map from slots
        data.timeSlots.forEach(slot => {
          slot.tasks.forEach(task => {
            tasksMap.set(task.id, { ...task, slotId: slot.id })
          })
        })
        
        set({
          selectedDate: date,
          timeSlots: data.timeSlots,
          timeSlotsMap: slotsMap,
          tasksMap,
          timeInterval: intervalMinutes
        })
      } else {
        // Initialize empty slots
        get().initializeTimeSlots(intervalMinutes)
        set({ selectedDate: date })
      }
    } catch (error) {
      set({ error: (error as Error).message })
      // Initialize empty slots on error
      get().initializeTimeSlots(intervalMinutes)
      set({ selectedDate: date })
    } finally {
      set({ isLoading: false })
    }
  },
  
  saveTimeboxData: async (userId, intervalMinutes = 120) => {
    const { selectedDate, timeSlots } = get()
    
    try {
      const timeboxService = new TimeboxService()
      await timeboxService.saveTimeboxData({
        userId,
        date: selectedDate,
        timeSlots,
      })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  _debugLogState: () => {
    const state = get()
    console.group('Planning Store State')
    console.log('Selected Date:', state.selectedDate)
    console.log('Time Slots:', state.timeSlots.length)
    console.log('Tasks Map Size:', state.tasksMap.size)
    console.log('Slots Map Size:', state.timeSlotsMap.size)
    console.log('Dragged Task:', state.draggedTask)
    console.log('Hovered Slot:', state.hoveredSlotId)
    console.log('Loading:', state.isLoading)
    console.log('Error:', state.error)
    console.groupEnd()
  }
}))
