import { create } from 'zustand'
import type { RoutineEntry, RoutineProgress } from '@/types/routines'
import { format, isToday, differenceInDays } from 'date-fns'

// Helper to get Firebase dynamically
async function getFirebase() {
  const { db } = await import('@/lib/firebase')
  const firestore = await import('firebase/firestore')
  return { db, ...firestore }
}

interface RoutineStore {
  // State
  entries: RoutineEntry[]
  progress: RoutineProgress | null
  currentEntry: RoutineEntry | null
  isLoading: boolean
  error: string | null

  // Actions
  initializeProgress: (userId: string) => Promise<void>
  loadEntries: (userId: string) => Promise<void>
  getCurrentDayEntry: () => RoutineEntry | null
  createOrUpdateEntry: (data: Partial<RoutineEntry>) => Promise<void>
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

  // Helpers
  getStreak: () => number
  updateStreak: (userId: string) => Promise<void>
}

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  entries: [],
  progress: null,
  currentEntry: null,
  isLoading: false,
  error: null,

  initializeProgress: async (userId: string) => {
    set({ isLoading: true, error: null })
    try {
      const { db, doc, getDoc, setDoc } = await getFirebase()
      const progressDoc = await getDoc(doc(db, 'users', userId, 'routineProgress', 'current'))
      
      if (progressDoc.exists()) {
        const data = progressDoc.data() as RoutineProgress
        set({ progress: data })
      } else {
        // Create new progress entry
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
      console.error('Error initializing progress:', error)
      set({ error: (error as Error).message })
    } finally {
      set({ isLoading: false })
    }
  },

  loadEntries: async (userId: string) => {
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

      // Find today's entry
      const todayEntry = entries.find(entry => isToday(new Date(entry.date)))
      set({ currentEntry: todayEntry || null })
    } catch (error) {
      console.error('Error loading entries:', error)
      set({ error: (error as Error).message })
    } finally {
      set({ isLoading: false })
    }
  },

  getCurrentDayEntry: () => {
    return get().currentEntry
  },

  createOrUpdateEntry: async (data: Partial<RoutineEntry>) => {
    const { entries } = get()
    const existingEntry = entries.find(e => e.id === data.id)
    
    try {
      const { db, doc, updateDoc, setDoc, serverTimestamp } = await getFirebase()
      
      if (existingEntry) {
        // Update existing entry
        await updateDoc(doc(db, 'users', data.userId!, 'routineEntries', data.id!), {
          ...data,
          updatedAt: serverTimestamp(),
        })
        
        const updatedEntries = entries.map(e => 
          e.id === data.id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
        )
        set({ entries: updatedEntries })
      } else {
        // Create new entry
        const id = `routine-${Date.now()}`
        const newEntry: RoutineEntry = {
          id,
          userId: data.userId!,
          dayNumber: data.dayNumber || 0,
          date: data.date || format(new Date(), 'yyyy-MM-dd'),
          isComplete: false,
          morningCompleted: false,
          eveningCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...data,
        }
        
        await setDoc(doc(db, 'users', data.userId!, 'routineEntries', id), {
          ...newEntry,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        
        set({ 
          entries: [...entries, newEntry],
          currentEntry: newEntry,
        })
      }
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  completeEvening: async (userId: string, data) => {
    let { currentEntry, progress } = get()
    if (!progress) throw new Error('No progress initialized')

    try {
      // Create entry for today if it doesn't exist
      if (!currentEntry) {
        const today = format(new Date(), 'yyyy-MM-dd')
        await get().createOrUpdateEntry({
          userId,
          dayNumber: progress.currentDay || 1,
          date: today,
          eveningCompleted: true,
          sleepIntention: data.sleepIntention,
          wakeIntention: data.wakeIntention,
          magicalMoment: data.magicalMoment,
          morningRitualPlan: data.morningRitualPlan,
        })
        currentEntry = get().currentEntry
      } else {
        // Update the existing entry
        await get().createOrUpdateEntry({
          ...currentEntry,
          eveningCompleted: true,
          sleepIntention: data.sleepIntention,
          wakeIntention: data.wakeIntention,
          magicalMoment: data.magicalMoment,
          morningRitualPlan: data.morningRitualPlan,
        })
      }
      
      // Update progress
      const { db, doc, updateDoc } = await getFirebase()
      const today = format(new Date(), 'yyyy-MM-dd')
      const newProgress = {
        ...progress,
        eveningRoutinesCompleted: progress.eveningRoutinesCompleted + 1,
        lastCompletedDate: today,
      }
      
      await updateDoc(doc(db, 'users', userId, 'routineProgress', 'current'), newProgress)
      set({ progress: newProgress })
      
      // Update streak
      await get().updateStreak(userId)
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  completeMorning: async (userId: string, data) => {
    let { currentEntry, progress } = get()
    if (!progress) throw new Error('No progress initialized')

    try {
      // Create entry for today if it doesn't exist
      if (!currentEntry) {
        const today = format(new Date(), 'yyyy-MM-dd')
        await get().createOrUpdateEntry({
          userId,
          dayNumber: progress.currentDay || 1,
          date: today,
          morningCompleted: true,
          actualSleepTime: data.actualSleepTime,
          actualWakeTime: data.actualWakeTime,
          ritualCompleted: data.ritualCompleted,
          mit: data.mit,
          onePercentImprovement: data.onePercentImprovement,
          distractionsToMinimize: data.distractionsToMinimize,
          isComplete: false, // Not complete until evening is also done
        })
        currentEntry = get().currentEntry
      } else {
        // Update the existing entry
        await get().createOrUpdateEntry({
          ...currentEntry,
          morningCompleted: true,
          actualSleepTime: data.actualSleepTime,
          actualWakeTime: data.actualWakeTime,
          ritualCompleted: data.ritualCompleted,
          mit: data.mit,
          onePercentImprovement: data.onePercentImprovement,
          distractionsToMinimize: data.distractionsToMinimize,
          isComplete: currentEntry.eveningCompleted, // Mark as complete only if evening is also done
        })
      }
      
      // Update progress
      const { db, doc, updateDoc } = await getFirebase()
      const updatedEntry = get().currentEntry
      const bothCompleted = updatedEntry?.eveningCompleted && updatedEntry?.morningCompleted
      const newProgress = {
        ...progress,
        morningRoutinesCompleted: progress.morningRoutinesCompleted + 1,
        totalDaysCompleted: bothCompleted ? progress.totalDaysCompleted + 1 : progress.totalDaysCompleted,
        lastCompletedDate: format(new Date(), 'yyyy-MM-dd'),
      }
      
      await updateDoc(doc(db, 'users', userId, 'routineProgress', 'current'), newProgress)
      set({ progress: newProgress })
      
      // Update streak
      await get().updateStreak(userId)
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  advanceDay: async (userId: string) => {
    const { progress } = get()
    if (!progress) return

    try {
      const { db, doc, updateDoc } = await getFirebase()
      const newProgress = {
        ...progress,
        currentDay: progress.currentDay + 1,
        startedAt: progress.startedAt || new Date().toISOString(),
      }
      
      await updateDoc(doc(db, 'users', userId, 'routineProgress', 'current'), newProgress)
      set({ progress: newProgress })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
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
      throw error
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
      throw error
    }
  },

  getStreak: () => {
    const { entries } = get()
    if (entries.length === 0) return 0

    let streak = 0
    const sortedEntries = [...entries]
      .filter(e => e.isComplete)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (sortedEntries.length === 0) return 0

    // Check if the most recent entry is today or yesterday
    const mostRecent = new Date(sortedEntries[0].date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysDiff = differenceInDays(today, mostRecent)

    if (daysDiff > 1) return 0 // Streak broken

    streak = 1
    for (let i = 1; i < sortedEntries.length; i++) {
      const current = new Date(sortedEntries[i - 1].date)
      const previous = new Date(sortedEntries[i].date)
      const diff = differenceInDays(current, previous)

      if (diff === 1) {
        streak++
      } else {
        break
      }
    }

    return streak
  },

  updateStreak: async (userId: string) => {
    const { progress } = get()
    if (!progress) return

    const currentStreak = get().getStreak()
    const longestStreak = Math.max(currentStreak, progress.longestStreak)

    const newProgress = {
      ...progress,
      currentStreak,
      longestStreak,
    }

    const { db, doc, updateDoc } = await getFirebase()
    await updateDoc(doc(db, 'users', userId, 'routineProgress', 'current'), newProgress)
    set({ progress: newProgress })
  },
}))