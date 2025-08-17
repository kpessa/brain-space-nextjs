import { create } from 'zustand'
import dayjs from 'dayjs'
import type { TimeboxTask, TimeSlot } from './timeboxStore'

interface OptimizedTimeboxState {
  // Use Map for O(1) lookups
  timeSlotsMap: Map<string, TimeSlot>
  tasksMap: Map<string, TimeboxTask>
  selectedDate: string
  calendarEvents: TimeboxTask[]
  calendarSyncEnabled: boolean
  timeInterval: 30 | 60 | 120
  showPastSlots: boolean
  hoveredSlotId: string | null
  
  // Optimized actions
  addTaskToSlot: (task: TimeboxTask, slotId: string) => void
  removeTaskFromSlot: (taskId: string, slotId: string) => void
  updateTaskInSlot: (taskId: string, updates: Partial<TimeboxTask>) => void
  moveTaskBetweenSlots: (taskId: string, fromSlotId: string, toSlotId: string) => void
  
  // Batch operations
  batchUpdateTasks: (updates: Array<{ taskId: string; updates: Partial<TimeboxTask> }>) => void
  batchAddTasks: (tasks: Array<{ task: TimeboxTask; slotId: string }>) => void
  
  // Getters
  getTimeSlots: () => TimeSlot[]
  getSlotById: (slotId: string) => TimeSlot | undefined
  getTaskById: (taskId: string) => TimeboxTask | undefined
}

// Helper to convert Map to array for components
function mapToArray<T>(map: Map<string, T>): T[] {
  return Array.from(map.values())
}

export const useOptimizedTimeboxStore = create<OptimizedTimeboxState>((set, get) => ({
  timeSlotsMap: new Map(),
  tasksMap: new Map(),
  selectedDate: dayjs().format('YYYY-MM-DD'),
  calendarEvents: [],
  calendarSyncEnabled: false,
  timeInterval: 120,
  showPastSlots: false,
  hoveredSlotId: null,

  // Optimized O(1) operations
  addTaskToSlot: (task, slotId) => {
    const state = get()
    const slot = state.timeSlotsMap.get(slotId)
    
    if (!slot) return
    
    // Update tasks map
    const newTasksMap = new Map(state.tasksMap)
    newTasksMap.set(task.id, { ...task, slotId })
    
    // Update slot
    const newSlotsMap = new Map(state.timeSlotsMap)
    newSlotsMap.set(slotId, {
      ...slot,
      tasks: [...slot.tasks, task]
    })
    
    set({
      timeSlotsMap: newSlotsMap,
      tasksMap: newTasksMap
    })
  },

  removeTaskFromSlot: (taskId, slotId) => {
    const state = get()
    const slot = state.timeSlotsMap.get(slotId)
    
    if (!slot) return
    
    // Remove from tasks map
    const newTasksMap = new Map(state.tasksMap)
    newTasksMap.delete(taskId)
    
    // Update slot
    const newSlotsMap = new Map(state.timeSlotsMap)
    newSlotsMap.set(slotId, {
      ...slot,
      tasks: slot.tasks.filter(t => t.id !== taskId)
    })
    
    set({
      timeSlotsMap: newSlotsMap,
      tasksMap: newTasksMap
    })
  },

  updateTaskInSlot: (taskId, updates) => {
    const state = get()
    const task = state.tasksMap.get(taskId)
    
    if (!task || !task.slotId) return
    
    const slot = state.timeSlotsMap.get(task.slotId)
    if (!slot) return
    
    // Update task in map
    const updatedTask = { ...task, ...updates }
    const newTasksMap = new Map(state.tasksMap)
    newTasksMap.set(taskId, updatedTask)
    
    // Update slot
    const newSlotsMap = new Map(state.timeSlotsMap)
    newSlotsMap.set(task.slotId, {
      ...slot,
      tasks: slot.tasks.map(t => t.id === taskId ? updatedTask : t)
    })
    
    set({
      timeSlotsMap: newSlotsMap,
      tasksMap: newTasksMap
    })
  },

  moveTaskBetweenSlots: (taskId, fromSlotId, toSlotId) => {
    const state = get()
    const task = state.tasksMap.get(taskId)
    const fromSlot = state.timeSlotsMap.get(fromSlotId)
    const toSlot = state.timeSlotsMap.get(toSlotId)
    
    if (!task || !fromSlot || !toSlot) return
    
    // Update task's slot reference
    const updatedTask = { ...task, slotId: toSlotId }
    const newTasksMap = new Map(state.tasksMap)
    newTasksMap.set(taskId, updatedTask)
    
    // Update both slots
    const newSlotsMap = new Map(state.timeSlotsMap)
    newSlotsMap.set(fromSlotId, {
      ...fromSlot,
      tasks: fromSlot.tasks.filter(t => t.id !== taskId)
    })
    newSlotsMap.set(toSlotId, {
      ...toSlot,
      tasks: [...toSlot.tasks, updatedTask]
    })
    
    set({
      timeSlotsMap: newSlotsMap,
      tasksMap: newTasksMap
    })
  },

  // Batch operations for better performance
  batchUpdateTasks: (updates) => {
    const state = get()
    const newTasksMap = new Map(state.tasksMap)
    const newSlotsMap = new Map(state.timeSlotsMap)
    const affectedSlots = new Set<string>()
    
    // Apply all updates
    updates.forEach(({ taskId, updates }) => {
      const task = newTasksMap.get(taskId)
      if (task && task.slotId) {
        const updatedTask = { ...task, ...updates }
        newTasksMap.set(taskId, updatedTask)
        affectedSlots.add(task.slotId)
      }
    })
    
    // Update affected slots
    affectedSlots.forEach(slotId => {
      const slot = newSlotsMap.get(slotId)
      if (slot) {
        newSlotsMap.set(slotId, {
          ...slot,
          tasks: slot.tasks.map(t => newTasksMap.get(t.id) || t)
        })
      }
    })
    
    set({
      timeSlotsMap: newSlotsMap,
      tasksMap: newTasksMap
    })
  },

  batchAddTasks: (tasks) => {
    const state = get()
    const newTasksMap = new Map(state.tasksMap)
    const newSlotsMap = new Map(state.timeSlotsMap)
    const slotUpdates = new Map<string, TimeboxTask[]>()
    
    // Group tasks by slot
    tasks.forEach(({ task, slotId }) => {
      newTasksMap.set(task.id, { ...task, slotId })
      if (!slotUpdates.has(slotId)) {
        slotUpdates.set(slotId, [])
      }
      slotUpdates.get(slotId)!.push(task)
    })
    
    // Update slots
    slotUpdates.forEach((tasks, slotId) => {
      const slot = newSlotsMap.get(slotId)
      if (slot) {
        newSlotsMap.set(slotId, {
          ...slot,
          tasks: [...slot.tasks, ...tasks]
        })
      }
    })
    
    set({
      timeSlotsMap: newSlotsMap,
      tasksMap: newTasksMap
    })
  },

  // Getters
  getTimeSlots: () => mapToArray(get().timeSlotsMap),
  getSlotById: (slotId) => get().timeSlotsMap.get(slotId),
  getTaskById: (taskId) => get().tasksMap.get(taskId),
}))