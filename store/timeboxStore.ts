import { create } from 'zustand'
import { format } from 'date-fns'
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

// TimeboxData interface moved to timeboxService.ts

interface TimeboxState {
  selectedDate: string // YYYY-MM-DD format
  timeSlots: TimeSlot[]
  draggedTask: TimeboxTask | null
  hoveredSlotId: string | null
  isLoading: boolean
  error: string | null

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
  
  let index = 0
  const noonIndex = Math.floor((12 - startHour) * 60 / intervalMinutes)
  
  for (let hour = startHour; hour < endHour; hour += intervalMinutes / 60) {
    const currentHour = Math.floor(hour)
    const currentMinute = Math.round((hour - currentHour) * 60)
    const nextHour = Math.floor(hour + intervalMinutes / 60)
    const nextMinute = Math.round(((hour + intervalMinutes / 60) - nextHour) * 60)
    
    // Determine period
    let period: 'morning' | 'afternoon' | 'evening' | 'night'
    if (currentHour < 12) period = 'morning'
    else if (currentHour < 17) period = 'afternoon'
    else if (currentHour < 21) period = 'evening'
    else period = 'night'
    
    // Format times
    const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
    const endTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`
    const displayTime = `${formatTimeDisplay(currentHour, currentMinute)}-${formatTimeDisplay(nextHour, nextMinute)}`
    
    const slotId = `slot-${startTime.replace(':', '')}`
    
    slots.push({
      id: slotId,
      startTime,
      endTime,
      displayTime,
      timeIndex: index - noonIndex,
      period,
      tasks: [],
    })
    
    index++
  }

  console.log('Generated slots:', slots.map(s => ({ id: s.id, display: s.displayTime })))
  
  // Check for duplicate IDs
  const ids = slots.map(s => s.id)
  const uniqueIds = new Set(ids)
  if (ids.length !== uniqueIds.size) {

    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
    console.error('Duplicates:', duplicates)
  }
  
  return slots
}

export const useTimeboxStore = create<TimeboxState>((set, get) => ({
  selectedDate: format(new Date(), 'yyyy-MM-dd'), // Initialize with today's date
  timeSlots: generateTimeSlots(),
  draggedTask: null,
  hoveredSlotId: null,
  isLoading: false,
  error: null,

  setSelectedDate: (date: string) => {
    set({ selectedDate: date })
  },

  setDraggedTask: (task: TimeboxTask | null) => {
    set({ draggedTask: task })
  },

  setHoveredSlotId: (slotId: string | null) => {
    set({ hoveredSlotId: slotId })
  },

  addTaskToSlot: async (task: TimeboxTask, slotId: string) => {
    console.group('🔍 TIMEBOX DEBUG: addTaskToSlot called')
    console.log('Task to add:', {
      id: task.id,
      label: task.label,
      nodeId: task.nodeId,
      userId: task.userId,
      isPersonal: task.isPersonal,
      timeboxDate: task.timeboxDate
    })
    console.log('Target slot ID:', slotId)

    const { timeSlots } = get()
    
    // 1. OPTIMISTIC UPDATE: Update UI immediately
    let targetSlotFound = false
    let updatedSlots = timeSlots.map(slot => {
      if (slot.id === slotId) {
        targetSlotFound = true
        const taskWithDate = { 
          ...task, 
          timeboxDate: get().selectedDate,
          isOptimistic: true // Flag for UI feedback
        }
        const updatedSlot = {
          ...slot,
          tasks: [...slot.tasks, taskWithDate],
        }
        return updatedSlot
      }
      return slot
    })
    
    if (!targetSlotFound) {
      console.error('❌ Target slot not found!')
      console.groupEnd()
      return
    }
    
    // Update Zustand store optimistically
    set({ timeSlots: updatedSlots })
    console.log('✅ Optimistic update applied to UI')
    
    try {
      // 2. PERSISTENCE: Save to Firebase
      if (task.userId) {
        console.log('🔥 Saving to Firebase with userId:', task.userId)
        await get().saveTimeboxData(task.userId)
        
        // 3. SUCCESS: Remove optimistic flag
        const successSlots = get().timeSlots.map(slot => {
          if (slot.id === slotId) {
            return {
              ...slot,
              tasks: slot.tasks.map(t => 
                t.id === task.id 
                  ? { ...t, isOptimistic: undefined }
                  : t
              )
            }
          }
          return slot
        })
        set({ timeSlots: successSlots })
        console.log('✅ Task successfully saved to Firebase')
      } else {
        console.warn('⚠️ No userId found on task - removing optimistic flag anyway')
        // Remove optimistic flag even without save
        const cleanSlots = get().timeSlots.map(slot => {
          if (slot.id === slotId) {
            return {
              ...slot,
              tasks: slot.tasks.map(t => 
                t.id === task.id 
                  ? { ...t, isOptimistic: undefined }
                  : t
              )
            }
          }
          return slot
        })
        set({ timeSlots: cleanSlots })
      }
    } catch (error) {
      // 4. ROLLBACK: Remove task on failure
      console.error('❌ Error saving task, rolling back:', error)
      const rollbackSlots = get().timeSlots.map(slot => {
        if (slot.id === slotId) {
          return {
            ...slot,
            tasks: slot.tasks.filter(t => t.id !== task.id)
          }
        }
        return slot
      })
      set({ timeSlots: rollbackSlots, error: `Failed to add task: ${(error as Error).message}` })
    }
    
    console.groupEnd()
  },

  removeTaskFromSlot: async (taskId: string, slotId: string) => {
    const { timeSlots } = get()
    const updatedSlots = timeSlots.map(slot => {
      if (slot.id === slotId) {
        return {
          ...slot,
          tasks: slot.tasks.filter(task => task.id !== taskId),
        }
      }
      return slot
    })
    set({ timeSlots: updatedSlots })
    
    // Save to Firebase
    const task = timeSlots.find(s => s.id === slotId)?.tasks.find(t => t.id === taskId)
    if (task?.userId) {
      await get().saveTimeboxData(task.userId)
    }
  },

  updateTaskInSlot: async (taskId: string, updates: Partial<TimeboxTask>) => {
    const { timeSlots } = get()
    let userId: string | undefined
    
    const updatedSlots = timeSlots.map(slot => ({
      ...slot,
      tasks: slot.tasks.map(task => {
        if (task.id === taskId) {
          userId = task.userId
          return { ...task, ...updates }
        }
        return task
      }),
    }))
    set({ timeSlots: updatedSlots })
    
    // Save to Firebase
    if (userId) {
      await get().saveTimeboxData(userId)
    }
  },

  moveTaskBetweenSlots: async (taskId: string, fromSlotId: string, toSlotId: string) => {
    const { timeSlots } = get()
    let movedTask: TimeboxTask | undefined
    let userId: string | undefined

    const updatedSlots = timeSlots.map(slot => {
      if (slot.id === fromSlotId) {
        const task = slot.tasks.find(t => t.id === taskId)
        if (task) {
          movedTask = task
          userId = task.userId
        }
        return {
          ...slot,
          tasks: slot.tasks.filter(t => t.id !== taskId),
        }
      }
      if (slot.id === toSlotId && movedTask) {
        return {
          ...slot,
          tasks: [...slot.tasks, movedTask],
        }
      }
      return slot
    })
    
    set({ timeSlots: updatedSlots })
    
    // Save to Firebase
    if (userId) {
      await get().saveTimeboxData(userId)
    }
  },

  initializeTimeSlots: (intervalMinutes?: 30 | 60 | 120) => {
    const interval = intervalMinutes || 120
    const currentSlots = get().timeSlots
    const newSlots = generateTimeSlots(interval)
    
    // Preserve tasks from existing slots
    const slotsWithTasks = newSlots.map(newSlot => {
      const existingSlot = currentSlots.find(s => s.id === newSlot.id)
      if (existingSlot && existingSlot.tasks.length > 0) {
        return {
          ...newSlot,
          tasks: existingSlot.tasks,
          isBlocked: existingSlot.isBlocked,
          blockReason: existingSlot.blockReason,
          blockLabel: existingSlot.blockLabel
        }
      }
      return newSlot
    })
    
    set({ timeSlots: slotsWithTasks })
  },
  
  blockTimeSlot: async (slotId: string, reason: TimeSlot['blockReason'], label?: string) => {
    const { timeSlots } = get()
    const updatedSlots = timeSlots.map(slot => {
      if (slot.id === slotId) {
        return {
          ...slot,
          isBlocked: true,
          blockReason: reason,
          blockLabel: label,
          tasks: [] // Clear any tasks when blocking
        }
      }
      return slot
    })
    set({ timeSlots: updatedSlots })
    
    // Save to Firebase - we need userId from somewhere
    // For now, we'll save when the user manually saves
  },
  
  unblockTimeSlot: async (slotId: string) => {
    const { timeSlots } = get()
    const updatedSlots = timeSlots.map(slot => {
      if (slot.id === slotId) {
        return {
          ...slot,
          isBlocked: false,
          blockReason: undefined,
          blockLabel: undefined
        }
      }
      return slot
    })
    set({ timeSlots: updatedSlots })
  },

  loadTimeboxData: async (userId: string, date: string, intervalMinutes?: 30 | 60 | 120) => {
    if (!userId) {
      console.warn('🔍 TIMEBOX DEBUG: loadTimeboxData called without userId')
      return
    }

    set({ isLoading: true, error: null })
    try {
      const result = await TimeboxService.loadTimeboxData(userId, date)
      
      if (result) {
        // Use the interval from the saved data if available, otherwise use the provided interval or default
        const interval = result.intervalMinutes || intervalMinutes || 120
        console.log('🕒 Using interval:', interval, 'minutes')
        
        const slots = generateTimeSlots(interval)
        console.log('🏗️ Generated', slots.length, 'empty slots')
        
        // Populate slots with tasks from Firebase
        let totalTasksLoaded = 0
        Object.entries(result.slots).forEach(([slotId, tasks]) => {
          const slot = slots.find(s => s.id === slotId)
          if (slot) {
            slot.tasks = tasks
            totalTasksLoaded += tasks.length
            console.log('📅 Loaded', tasks.length, 'tasks into slot', slotId)
          } else {
            console.warn('⚠️ Could not find slot with ID:', slotId)
          }
        })
        
        console.log('📊 Total tasks loaded from Firebase:', totalTasksLoaded)
        set({ timeSlots: slots, isLoading: false })
      } else {
        console.log('📭 No existing data found for this date - creating empty slots')
        const emptySlots = generateTimeSlots(intervalMinutes || 120)
        set({ timeSlots: emptySlots, isLoading: false })
      }
    } catch (error) {
      console.error('❌ Error loading timebox data:', error)
      set({
        error: (error as Error).message,
        isLoading: false,
      })
    }
  },

  saveTimeboxData: async (userId: string, intervalMinutes?: 30 | 60 | 120) => {
    if (!userId) {
      console.warn('🔍 TIMEBOX DEBUG: saveTimeboxData called without userId')
      return
    }

    const { selectedDate, timeSlots } = get()
    
    try {
      await TimeboxService.saveTimeboxData(userId, selectedDate, timeSlots, intervalMinutes)
    } catch (error) {
      console.error('❌ Error saving timebox data:', error)
      set({ error: (error as Error).message })
    }
  },

  // Debug helper to log store state changes
  _debugLogState: () => {
    const state = get()
    console.group('📋 TIMEBOX DEBUG: Current Store State')
    console.log('selectedDate:', state.selectedDate)
    console.log('timeSlots count:', state.timeSlots.length)
    console.log('isLoading:', state.isLoading)
    console.log('error:', state.error)
    
    const slotsWithTasks = state.timeSlots.filter(s => s.tasks.length > 0)
    console.log('slots with tasks:', slotsWithTasks.length)
    
    slotsWithTasks.forEach(slot => {
      console.log(`Slot ${slot.id} (${slot.displayTime}):`, 
        slot.tasks.map(t => ({
          id: t.id, 
          label: t.label, 
          userId: t.userId,
          nodeId: t.nodeId,
          timeboxDate: t.timeboxDate
        })))
    })
    
    console.groupEnd()
  }
}))