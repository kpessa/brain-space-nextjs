import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'
import type { RoutineEntry, RoutineProgress } from '@/types/routines'
import dayjs from 'dayjs'

// Todo Types
export type TodoType = 'task' | 'quest' | 'ritual' | 'habit' | 'routine_item'
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'deferred' | 'cancelled'
export type TodoSourceType = 'braindump' | 'journal' | 'routine' | 'manual' | 'recurring'

export interface Todo {
  id: string
  userId?: string
  
  // Core fields
  title: string
  description?: string
  type: TodoType
  status: TodoStatus
  
  // Priority fields (0-10 scale)
  importance?: number
  urgency?: number
  
  // Scheduling
  dueDate?: string
  scheduledDate?: string
  scheduledTime?: string
  scheduledDuration?: number // minutes
  
  // Hierarchy
  parentId?: string
  position?: number
  
  // Source tracking
  sourceType: TodoSourceType
  sourceId?: string
  
  // Completion
  completedAt?: string
  completionNotes?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  
  // Relations
  tags?: string[]
  children?: Todo[]
}

// Calendar Types
interface Calendar {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
}

interface CalendarState {
  selectedCalendarIds: Set<string>
  isAuthenticated: boolean
  calendars: Calendar[]
  selectedCalendars: string[]
}

// Routine Types
interface RoutineState {
  entries: RoutineEntry[]
  progress: RoutineProgress | null
  currentEntry: RoutineEntry | null
  isLoading: boolean
  error: string | null
}

// Helper to get Firebase dynamically
async function getFirebase() {
  const { db } = await import('@/lib/firebase')
  const firestore = await import('firebase/firestore')
  return { db, ...firestore }
}

// Combined Tasks Store Interface
interface TasksState extends CalendarState, RoutineState {
  // Todo State
  todos: Todo[]
  isTodosLoading: boolean
  todoFilter: {
    status?: TodoStatus
    type?: TodoType
    tag?: string
    searchQuery?: string
  }
  
  // Todo Actions
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => Todo
  updateTodo: (id: string, updates: Partial<Todo>) => void
  deleteTodo: (id: string) => void
  toggleTodo: (id: string) => void
  clearCompleted: () => void
  setTodoFilter: (filter: TasksState['todoFilter']) => void
  getFilteredTodos: () => Todo[]
  createFromBrainDump: (sourceId: string, todos: Array<{
    title: string
    type?: TodoType
    urgency?: number
    importance?: number
    tags?: string[]
  }>) => void
  
  // Calendar Actions
  setSelectedCalendarIds: (ids: Set<string>) => void
  addSelectedCalendarId: (id: string) => void
  removeSelectedCalendarId: (id: string) => void
  toggleCalendarSelection: (id: string) => void
  setCalendarAuthenticated: (isAuth: boolean) => void
  setIsAuthenticated: (isAuth: boolean) => void
  setCalendars: (calendars: Calendar[]) => void
  
  // Routine Actions
  initializeRoutineProgress: (userId: string) => Promise<void>
  loadRoutineEntries: (userId: string) => Promise<void>
  getCurrentDayRoutineEntry: () => RoutineEntry | null
  createOrUpdateRoutineEntry: (data: Partial<RoutineEntry>) => Promise<void>
  completeEvening: (userId: string, data: {
    sleepIntention: string
    wakeIntention: string
    magicalMoment: string
    morningRitualPlan: string[]
  }) => Promise<void>
  completeMorning: (userId: string, data: {
    actualSleepTime: string
    actualWakeTime: string
    ritualCompleted: boolean[]
    mit: string
    onePercentImprovement: string
    distractionsToMinimize: { distraction: string; limit: string }[]
  }) => Promise<void>
  advanceDay: (userId: string) => Promise<void>
  pauseJourney: (userId: string) => Promise<void>
  resumeJourney: (userId: string) => Promise<void>
  getRoutineStreak: () => number
  updateRoutineStreak: (userId: string) => Promise<void>
}

// Calendar storage helpers
const calendarStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null
    try {
      const str = localStorage.getItem(name)
      if (!str) return null
      const data = JSON.parse(str)
      return {
        ...data,
        state: {
          ...data.state,
          selectedCalendarIds: new Set(data.state.selectedCalendarIds || []),
        },
      }
    } catch {
      return null
    }
  },
  setItem: (name: string, value: any) => {
    if (typeof window === 'undefined') return
    try {
      const data = {
        ...value,
        state: {
          ...value.state,
          selectedCalendarIds: Array.from(value.state.selectedCalendarIds),
        },
      }
      localStorage.setItem(name, JSON.stringify(data))
    } catch {
      // Silently fail if localStorage is not available
    }
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(name)
    } catch {
      // Silently fail if localStorage is not available
    }
  },
}

export const useTasksStore = create<TasksState>()(  
  persist(
    (set, get) => ({
      // Todo State
      todos: [],
      isTodosLoading: false,
      todoFilter: {},
      
      // Calendar State
      selectedCalendarIds: new Set<string>(),
      isAuthenticated: false,
      calendars: [],
      get selectedCalendars() {
        return Array.from(get().selectedCalendarIds)
      },
      
      // Routine State
      entries: [],
      progress: null,
      currentEntry: null,
      isLoading: false,
      error: null,
      
      // Todo Actions
      addTodo: (todoData) => {
        const newTodo: Todo = {
          ...todoData,
          id: crypto.randomUUID(),
          status: todoData.status || 'pending',
          type: todoData.type || 'task',
          sourceType: todoData.sourceType || 'manual',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        set(state => ({
          todos: [...state.todos, newTodo]
        }))
        
        return newTodo
      },
      
      updateTodo: (id, updates) => {
        set(state => ({
          todos: state.todos.map(todo =>
            todo.id === id
              ? { ...todo, ...updates, updatedAt: new Date().toISOString() }
              : todo
          )
        }))
      },
      
      deleteTodo: (id) => {
        set(state => ({
          todos: state.todos.filter(todo => todo.id !== id)
        }))
      },
      
      toggleTodo: (id) => {
        const todo = get().todos.find(t => t.id === id)
        if (!todo) return
        
        const newStatus = todo.status === 'completed' ? 'pending' : 'completed'
        const updates: Partial<Todo> = {
          status: newStatus,
          ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : { completedAt: undefined })
        }
        
        get().updateTodo(id, updates)
      },
      
      clearCompleted: () => {
        set(state => ({
          todos: state.todos.filter(todo => todo.status !== 'completed')
        }))
      },
      
      setTodoFilter: (filter) => {
        set({ todoFilter: filter })
      },
      
      getFilteredTodos: () => {
        const { todos, todoFilter } = get()
        return todos.filter(todo => {
          if (todoFilter.status && todo.status !== todoFilter.status) return false
          if (todoFilter.type && todo.type !== todoFilter.type) return false
          if (todoFilter.tag && (!todo.tags || !todo.tags.includes(todoFilter.tag))) return false
          if (todoFilter.searchQuery) {
            const query = todoFilter.searchQuery.toLowerCase()
            const matchesTitle = todo.title.toLowerCase().includes(query)
            const matchesDescription = todo.description?.toLowerCase().includes(query)
            if (!matchesTitle && !matchesDescription) return false
          }
          return true
        })
      },
      
      createFromBrainDump: (sourceId, todos) => {
        const newTodos = todos.map(todoData => ({
          ...todoData,
          sourceType: 'braindump' as TodoSourceType,
          sourceId,
        }))
        
        newTodos.forEach(todoData => {
          get().addTodo(todoData)
        })
      },
      
      // Calendar Actions
      setSelectedCalendarIds: ids => set({ selectedCalendarIds: ids }),
      
      addSelectedCalendarId: id =>
        set(state => ({
          selectedCalendarIds: new Set([...state.selectedCalendarIds, id]),
        })),
      
      removeSelectedCalendarId: id =>
        set(state => {
          const newSet = new Set(state.selectedCalendarIds)
          newSet.delete(id)
          return { selectedCalendarIds: newSet }
        }),
      
      toggleCalendarSelection: id =>
        set(state => {
          const newSet = new Set(state.selectedCalendarIds)
          if (newSet.has(id)) {
            newSet.delete(id)
          } else {
            newSet.add(id)
          }
          return { selectedCalendarIds: newSet }
        }),
        
      setCalendarAuthenticated: isAuth => set({ isAuthenticated: isAuth }),
      
      setIsAuthenticated: isAuth => set({ isAuthenticated: isAuth }),
      
      setCalendars: calendars => set({ calendars }),
      
      // Routine Actions
      initializeRoutineProgress: async (userId: string) => {
        set({ isLoading: true, error: null })
        try {
          const { db, doc, getDoc, setDoc } = await getFirebase()
          const progressDoc = await getDoc(doc(db, 'users', userId, 'routineProgress', 'current'))
          
          if (progressDoc.exists()) {
            const data = progressDoc.data() as RoutineProgress
            set({ progress: data })
          } else {
            const newProgress: RoutineProgress = {
              userId,
              currentDay: 0,
              totalDaysCompleted: 0,
              startedAt: null,
              isActive: true,
              morningRoutinesCompleted: 0,
              eveningRoutinesCompleted: 0,
              currentStreak: 0,
              longestStreak: 0,
            }

            await setDoc(doc(db, 'users', userId, 'routineProgress', 'current'), newProgress)
            set({ progress: newProgress })
          }
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ isLoading: false })
        }
      },

      loadRoutineEntries: async (userId: string) => {
        set({ isLoading: true, error: null })
        try {
          const { db, collection, query, orderBy, getDocs } = await getFirebase()
          const entriesQuery = query(
            collection(db, 'users', userId, 'routineEntries'),
            orderBy('dayNumber', 'desc')
          )
          const snapshot = await getDocs(entriesQuery)
          
          const entries: RoutineEntry[] = []
          snapshot.forEach(doc => {
            const data = doc.data()
            entries.push({
              ...data,
              id: doc.id,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
              updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            } as RoutineEntry)
          })
          
          set({ entries })
          
          // Set current entry (latest incomplete entry)
          const currentEntry = entries.find(entry => 
            !entry.eveningCompleted || !entry.morningCompleted
          ) || entries[0] || null
          
          set({ currentEntry })
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ isLoading: false })
        }
      },

      getCurrentDayRoutineEntry: () => {
        const { entries, progress } = get()
        if (!progress) return null
        
        return entries.find(entry => entry.dayNumber === progress.currentDay) || null
      },

      createOrUpdateRoutineEntry: async (data: Partial<RoutineEntry>) => {
        const { progress } = get()
        if (!progress?.userId) return

        set({ isLoading: true, error: null })
        try {
          const { db, doc, setDoc, updateDoc, getDoc, serverTimestamp } = await getFirebase()
          
          const entryId = data.id || `day-${progress.currentDay}`
          const entryRef = doc(db, 'users', progress.userId, 'routineEntries', entryId)
          const entryDoc = await getDoc(entryRef)

          if (entryDoc.exists()) {
            // Update existing entry
            await updateDoc(entryRef, {
              ...data,
              updatedAt: serverTimestamp(),
            })
          } else {
            // Create new entry
            const newEntry: RoutineEntry = {
              id: entryId,
              userId: progress.userId,
              dayNumber: progress.currentDay,
              date: new Date().toISOString().split('T')[0],
              eveningCompleted: false,
              morningCompleted: false,
              ...data,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }

            await setDoc(entryRef, {
              ...newEntry,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          }

          // Reload entries to get updated state
          await get().loadRoutineEntries(progress.userId)
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ isLoading: false })
        }
      },

      completeEvening: async (userId: string, data) => {
        const entry = get().getCurrentDayRoutineEntry()
        if (!entry) {
          await get().createOrUpdateRoutineEntry({
            eveningCompleted: true,
            ...data,
          })
        } else {
          await get().createOrUpdateRoutineEntry({
            ...entry,
            eveningCompleted: true,
            ...data,
          })
        }
        
        await get().updateRoutineStreak(userId)
      },

      completeMorning: async (userId: string, data) => {
        const entry = get().getCurrentDayRoutineEntry()
        if (entry) {
          await get().createOrUpdateRoutineEntry({
            ...entry,
            morningCompleted: true,
            ...data,
          })
        }
        
        await get().updateRoutineStreak(userId)
      },

      advanceDay: async (userId: string) => {
        const { progress } = get()
        if (!progress) return

        set({ isLoading: true, error: null })
        try {
          const { db, doc, updateDoc } = await getFirebase()
          
          const newProgress = {
            ...progress,
            currentDay: progress.currentDay + 1,
            totalDaysCompleted: progress.totalDaysCompleted + 1,
          }

          await updateDoc(doc(db, 'users', userId, 'routineProgress', 'current'), newProgress)
          set({ progress: newProgress })
        } catch (error) {
          set({ error: (error as Error).message })
        } finally {
          set({ isLoading: false })
        }
      },

      pauseJourney: async (userId: string) => {
        const { progress } = get()
        if (!progress) return

        try {
          const { db, doc, updateDoc } = await getFirebase()
          
          const newProgress = {
            ...progress,
            isActive: false,
          }

          await updateDoc(doc(db, 'users', userId, 'routineProgress', 'current'), newProgress)
          set({ progress: newProgress })
        } catch (error) {
          set({ error: (error as Error).message })
        }
      },

      resumeJourney: async (userId: string) => {
        const { progress } = get()
        if (!progress) return

        try {
          const { db, doc, updateDoc } = await getFirebase()
          
          const newProgress = {
            ...progress,
            isActive: true,
          }

          await updateDoc(doc(db, 'users', userId, 'routineProgress', 'current'), newProgress)
          set({ progress: newProgress })
        } catch (error) {
          set({ error: (error as Error).message })
        }
      },

      getRoutineStreak: () => {
        const { progress } = get()
        return progress?.currentStreak || 0
      },

      updateRoutineStreak: async (userId: string) => {
        const { entries, progress } = get()
        if (!progress) return

        // Calculate current streak based on completed days
        const completedDays = entries.filter(entry => 
          entry.eveningCompleted && entry.morningCompleted
        ).length

        const newProgress = {
          ...progress,
          currentStreak: completedDays,
          longestStreak: Math.max(completedDays, progress.longestStreak),
        }

        try {
          const { db, doc, updateDoc } = await getFirebase()
          await updateDoc(doc(db, 'users', userId, 'routineProgress', 'current'), newProgress)
          set({ progress: newProgress })
        } catch (error) {
          set({ error: (error as Error).message })
        }
      },
    }),
    {
      name: 'tasks-store',
      version: 1,
      partialize: (state) => ({
        // Persist todos
        todos: state.todos,
        todoFilter: state.todoFilter,
        // Persist calendar preferences
        selectedCalendarIds: Array.from(state.selectedCalendarIds),
        isAuthenticated: state.isAuthenticated,
        calendars: state.calendars,
        // Don't persist routine state (loaded from Firestore)
      }),
      // Custom storage for Set serialization
      storage: {
        getItem: (name) => calendarStorage.getItem(name),
        setItem: (name, value) => {
          const serializedValue = {
            ...value,
            state: {
              ...value.state,
              selectedCalendarIds: Array.from(value.state.selectedCalendarIds || []),
            },
          }
          calendarStorage.setItem(name, serializedValue)
        },
        removeItem: (name) => calendarStorage.removeItem(name),
      },
    }
  )
)

// SSR-safe hook for calendar functionality
export function useTasksStoreSSR() {
  const [isHydrated, setIsHydrated] = useState(false)
  const storeData = useTasksStore()
  
  useEffect(() => {
    setIsHydrated(true)
  }, [])
  
  // Return safe defaults during SSR to prevent hydration mismatches
  if (!isHydrated) {
    return {
      ...storeData,
      selectedCalendarIds: new Set<string>(),
      selectedCalendars: [],
    }
  }
  
  return storeData
}
