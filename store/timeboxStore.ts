import { create } from 'zustand'

// Helper to get Firebase dynamically
async function getFirebase() {
  const { db } = await import('@/lib/firebase')
  const firestore = await import('firebase/firestore')
  return { db, ...firestore }
}

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
  // Completion tracking
  status?: 'pending' | 'in-progress' | 'completed' | 'deferred'
  completedAt?: string // ISO timestamp
  attempts?: TaskAttempt[]
  totalAttempts?: number
  // Node reference
  nodeId?: string
  // User reference
  userId?: string
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

interface TimeboxData {
  userId: string
  date: string
  slots: Record<string, TimeboxTask[]>
  createdAt?: any
  updatedAt?: any
}

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
  loadTimeboxData: (userId: string, date: string) => Promise<void>
  saveTimeboxData: (userId: string) => Promise<void>
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
    
    slots.push({
      id: `slot-${startTime.replace(':', '')}`,
      startTime,
      endTime,
      displayTime,
      timeIndex: index - noonIndex,
      period,
      tasks: [],
    })
    
    index++
  }

  return slots
}

export const useTimeboxStore = create<TimeboxState>((set, get) => ({
  selectedDate: new Date().toISOString().split('T')[0],
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
    const { timeSlots } = get()
    const updatedSlots = timeSlots.map(slot => {
      if (slot.id === slotId) {
        return {
          ...slot,
          tasks: [...slot.tasks, { ...task, timeboxDate: get().selectedDate }],
        }
      }
      return slot
    })
    set({ timeSlots: updatedSlots })
    
    // Save to Firebase
    if (task.userId) {
      await get().saveTimeboxData(task.userId)
    }
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
    set({ timeSlots: generateTimeSlots(interval) })
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

  loadTimeboxData: async (userId: string, date: string) => {
    if (!userId) return

    set({ isLoading: true, error: null })
    try {
      const { db, collection, query, where, getDocs } = await getFirebase()
      const timeboxDoc = await getDocs(
        query(
          collection(db, 'users', userId, 'timeboxes'),
          where('date', '==', date)
        )
      )

      if (!timeboxDoc.empty) {
        const data = timeboxDoc.docs[0].data() as TimeboxData
        const slots = generateTimeSlots()
        
        // Populate slots with tasks from Firebase
        Object.entries(data.slots || {}).forEach(([slotId, tasks]) => {
          const slot = slots.find(s => s.id === slotId)
          if (slot) {
            slot.tasks = tasks
          }
        })
        
        set({ timeSlots: slots, isLoading: false })
      } else {
        // No data for this date, use empty slots
        set({ timeSlots: generateTimeSlots(), isLoading: false })
      }
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      })
    }
  },

  saveTimeboxData: async (userId: string) => {
    if (!userId) return

    const { selectedDate, timeSlots } = get()
    
    try {
      // Convert timeSlots to a simple object for storage
      const slotsData: Record<string, TimeboxTask[]> = {}
      timeSlots.forEach(slot => {
        if (slot.tasks.length > 0) {
          slotsData[slot.id] = slot.tasks
        }
      })

      const { db, doc, collection, query, where, getDocs, setDoc, updateDoc, serverTimestamp } = await getFirebase()
      
      const timeboxData: TimeboxData = {
        userId,
        date: selectedDate,
        slots: slotsData,
        updatedAt: serverTimestamp(),
      }

      // Use date as document ID for easy retrieval
      const docId = `${userId}-${selectedDate}`
      const docRef = doc(db, 'users', userId, 'timeboxes', docId)
      
      const existingDoc = await getDocs(
        query(
          collection(db, 'users', userId, 'timeboxes'),
          where('date', '==', selectedDate)
        )
      )

      if (existingDoc.empty) {
        await setDoc(docRef, {
          ...timeboxData,
          createdAt: serverTimestamp()
        })
      } else {
        await updateDoc(docRef, {
          userId,
          date: selectedDate,
          slots: slotsData,
          updatedAt: serverTimestamp(),
        })
      }
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },
}))