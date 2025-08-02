import { create } from 'zustand'
import type { JournalEntry, UserProgress, Achievement } from '@/types/journal'
import { XP_REWARDS, LEVELS, ACHIEVEMENTS_LIST } from '@/types/journal'
import { useXPStore } from './xpStore'
import { XPEventType } from '@/types/xp'

interface JournalState {
  entries: JournalEntry[]
  userProgress: UserProgress
  isLoading: boolean
  isSyncing: boolean

  // Actions
  addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'xpEarned'>) => Promise<void>
  updateEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  calculateStreak: () => number
  checkAchievements: () => void
  getTodayEntry: () => JournalEntry | undefined

  // Sync actions
  setEntries: (entries: JournalEntry[]) => void
  setUserProgress: (progress: UserProgress) => void
  recalculateProgress: () => Promise<void>
  
  // Firebase actions
  loadEntriesFromFirestore: (userId: string) => Promise<void>
  loadUserProgressFromFirestore: (userId: string) => Promise<void>
  syncToFirestore: (userId: string) => Promise<void>
}

const initialProgress: UserProgress = {
  userId: 'demo-user',
  level: 1,
  currentXP: 0,
  totalXP: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalEntries: 0,
  achievements: [],
  lastEntryDate: null,
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  userProgress: initialProgress,
  isLoading: false,
  isSyncing: false,

  addEntry: async entryData => {
    const { entries, userProgress } = get()
    set({ isSyncing: true })
    
    try {
      // Calculate journal-specific XP components
      let journalXP = XP_REWARDS.DAILY_ENTRY
      journalXP += entryData.gratitude.filter(g => g.trim()).length * XP_REWARDS.GRATITUDE_ITEM
      
      // Handle quests array
      if (entryData.quests) {
        journalXP += entryData.quests.filter(q => q.trim()).length * XP_REWARDS.QUEST_ITEM
      }
      
      // Handle threats as array (with backward compatibility)
      if (Array.isArray(entryData.threats)) {
        journalXP += entryData.threats.filter(t => t.trim()).length * XP_REWARDS.THREAT_IDENTIFIED
      } else if (typeof entryData.threats === 'string' && entryData.threats.trim()) {
        journalXP += XP_REWARDS.THREAT_IDENTIFIED
      }
      
      // Handle allies as array (with backward compatibility)
      if (Array.isArray(entryData.allies)) {
        journalXP += entryData.allies.filter(a => a.trim()).length * XP_REWARDS.ALLY_RECOGNIZED
      } else if (typeof entryData.allies === 'string' && entryData.allies.trim()) {
        journalXP += XP_REWARDS.ALLY_RECOGNIZED
      }
      
      if (entryData.notes.trim().length > 50) journalXP += XP_REWARDS.NOTES_BONUS

      // Check streak
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      const lastEntry = userProgress.lastEntryDate
        ? new Date(userProgress.lastEntryDate).toDateString()
        : null

      let newStreak = userProgress.currentStreak
      if (lastEntry === yesterday) {
        newStreak += 1
      } else if (lastEntry !== today) {
        newStreak = 1
      }

      // Award XP through centralized store
      const xpStore = useXPStore.getState()
      const { xpAwarded, leveledUp, newLevel } = await xpStore.awardXP(XPEventType.JOURNAL_ENTRY, {
        baseXP: journalXP,
        streak: newStreak,
        gratitudeCount: entryData.gratitude.filter(g => g.trim()).length
      })

      // Create new entry with the XP awarded from the centralized store
      const newEntry: JournalEntry = {
        ...entryData,
        id: `entry-${Date.now()}`,
        xpEarned: xpAwarded,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Update journal-specific progress
      const newProgress = {
        ...userProgress,
        level: newLevel,
        currentXP: xpStore.currentXP,
        totalXP: xpStore.totalXP,
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, userProgress.longestStreak),
        totalEntries: userProgress.totalEntries + 1,
        lastEntryDate: new Date().toISOString(),
      }

      set({
        entries: [newEntry, ...entries],
        userProgress: newProgress,
      })

      // Check for new achievements
      get().checkAchievements()
    
    // Sync to Firestore if user is authenticated
    if (entryData.userId !== 'demo-user') {
      // Dynamically import Firebase
      const { db } = await import('@/lib/firebase')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      
      // Save entry to Firestore
      await setDoc(doc(db, 'users', entryData.userId, 'journal', newEntry.id), {
        ...newEntry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      
      // Update user progress in Firestore
      await setDoc(doc(db, 'users', entryData.userId, 'progress', 'journal'), newProgress)
    }
    } catch (error) {
      // Error adding entry
      throw error
    } finally {
      set({ isSyncing: false })
    }
  },
  
  updateEntry: async (id, updates) => {
    const { entries, userProgress } = get()
    const currentEntry = entries.find(e => e.id === id)
    if (!currentEntry) return
    
    set({ isSyncing: true })
    
    try {

    // Calculate XP difference if XP has changed
    const oldXP = currentEntry.xpEarned
    const newXP = updates.xpEarned || oldXP
    const xpDiff = newXP - oldXP

    // Update the entry
    const updatedEntry = {
      ...currentEntry,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // Update entries in state
    set(state => ({
      entries: state.entries.map(entry => (entry.id === id ? updatedEntry : entry)),
    }))

    // Update user progress if XP changed
    if (xpDiff !== 0) {
      // Award or deduct XP through centralized store
      const xpStore = useXPStore.getState()
      if (xpDiff > 0) {
        await xpStore.awardXP(XPEventType.JOURNAL_ENTRY, { baseXP: xpDiff })
      } else {
        // Handle XP reduction if needed
        xpStore.setXP(xpStore.totalXP + xpDiff)
      }

      const newProgress = {
        ...userProgress,
        level: xpStore.level,
        currentXP: xpStore.currentXP,
        totalXP: xpStore.totalXP,
      }

      set({ userProgress: newProgress })
      
      // Update user progress in Firestore if XP changed
      if (xpDiff !== 0 && currentEntry.userId !== 'demo-user') {
        const { db } = await import('@/lib/firebase')
        const { doc, setDoc } = await import('firebase/firestore')
        await setDoc(doc(db, 'users', currentEntry.userId, 'progress', 'journal'), newProgress)
      }
    }
    
    // Update entry in Firestore
    if (currentEntry.userId !== 'demo-user') {
      const { db } = await import('@/lib/firebase')
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      await updateDoc(doc(db, 'users', currentEntry.userId, 'journal', id), {
        ...updates,
        updatedAt: serverTimestamp(),
      })
    }
    } catch (error) {
      // Error updating entry
      throw error
    } finally {
      set({ isSyncing: false })
    }
  },

  deleteEntry: async id => {
    const { entries } = get()
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    
    set({ isSyncing: true })
    
    try {
      set(state => ({
        entries: state.entries.filter(entry => entry.id !== id),
      }))
      
      // Delete from Firestore
      if (entry.userId !== 'demo-user') {
        const { db } = await import('@/lib/firebase')
        const { doc, deleteDoc } = await import('firebase/firestore')
        await deleteDoc(doc(db, 'users', entry.userId, 'journal', id))
      }
    } catch (error) {
      // Error deleting entry
      throw error
    } finally {
      set({ isSyncing: false })
    }
  },

  calculateStreak: () => {
    const { entries } = get()
    if (entries.length === 0) return 0

    let streak = 1
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    for (let i = 1; i < sortedEntries.length; i++) {
      const currentDate = new Date(sortedEntries[i - 1].date)
      const previousDate = new Date(sortedEntries[i].date)
      const dayDiff = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)

      if (dayDiff === 1) {
        streak++
      } else {
        break
      }
    }

    return streak
  },

  checkAchievements: () => {
    const { entries, userProgress } = get()
    const newAchievements: Achievement[] = []

    // First Entry
    if (entries.length === 1 && !userProgress.achievements.find(a => a.id === 'first-entry')) {
      newAchievements.push({
        ...ACHIEVEMENTS_LIST.find(a => a.id === 'first-entry')!,
        unlockedAt: new Date().toISOString(),
      })
    }

    // Week Warrior
    if (
      userProgress.currentStreak >= 7 &&
      !userProgress.achievements.find(a => a.id === 'week-warrior')
    ) {
      newAchievements.push({
        ...ACHIEVEMENTS_LIST.find(a => a.id === 'week-warrior')!,
        unlockedAt: new Date().toISOString(),
      })
    }

    // Gratitude Master
    const totalGratitude = entries.reduce(
      (sum, entry) => sum + entry.gratitude.filter(g => g.trim()).length,
      0
    )
    if (
      totalGratitude >= 100 &&
      !userProgress.achievements.find(a => a.id === 'gratitude-master')
    ) {
      newAchievements.push({
        ...ACHIEVEMENTS_LIST.find(a => a.id === 'gratitude-master')!,
        unlockedAt: new Date().toISOString(),
      })
    }

    if (newAchievements.length > 0) {
      set(state => ({
        userProgress: {
          ...state.userProgress,
          achievements: [...state.userProgress.achievements, ...newAchievements],
        },
      }))
    }
  },

  getTodayEntry: () => {
    const { entries } = get()
    const today = new Date().toDateString()
    return entries.find(entry => new Date(entry.date).toDateString() === today)
  },

  setEntries: entries => {
    set({ entries })
  },

  setUserProgress: progress => {
    // Clean up any duplicate fields (e.g., currentXp vs currentXP)
    const cleanProgress = { ...progress }

    // Validate and sanitize the progress data to prevent NaN values
    const sanitizedProgress = {
      ...cleanProgress,
      currentXP:
        isNaN(cleanProgress.currentXP) || cleanProgress.currentXP === null
          ? 0
          : cleanProgress.currentXP,
      totalXP:
        isNaN(cleanProgress.totalXP) || cleanProgress.totalXP === null ? 0 : cleanProgress.totalXP,
      level:
        isNaN(cleanProgress.level) || cleanProgress.level === null || cleanProgress.level < 1
          ? 1
          : cleanProgress.level,
      currentStreak:
        isNaN(cleanProgress.currentStreak) || cleanProgress.currentStreak === null
          ? 0
          : cleanProgress.currentStreak,
      longestStreak:
        isNaN(cleanProgress.longestStreak) || cleanProgress.longestStreak === null
          ? 0
          : cleanProgress.longestStreak,
      totalEntries:
        isNaN(cleanProgress.totalEntries) || cleanProgress.totalEntries === null
          ? 0
          : cleanProgress.totalEntries,
    }
    set({ userProgress: sanitizedProgress })
  },

  recalculateProgress: async () => {
    const { entries, userProgress } = get()

    if (entries.length === 0) return

    // Calculate totals from entries
    const totalXP = entries.reduce((sum, entry) => sum + (entry.xpEarned || 0), 0)
    const totalEntries = entries.length

    // Calculate current streak
    const currentStreak = get().calculateStreak()

    // Calculate longest streak by checking all historical streaks
    let longestStreak = currentStreak
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    let tempStreak = 1
    for (let i = 1; i < sortedEntries.length; i++) {
      const currentDate = new Date(sortedEntries[i].date)
      const previousDate = new Date(sortedEntries[i - 1].date)
      const dayDiff = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)

      if (Math.abs(dayDiff - 1) < 0.1) {
        // Account for small floating point differences
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 1
      }
    }

    // Sync XP with centralized store
    const xpStore = useXPStore.getState()
    xpStore.setXP(totalXP)

    // Get last entry date
    const lastEntryDate =
      entries.length > 0
        ? entries.reduce((latest, entry) =>
            new Date(entry.date) > new Date(latest.date) ? entry : latest
          ).date
        : null

    // Create recalculated progress using centralized XP data
    const recalculatedProgress = {
      ...userProgress,
      level: xpStore.level,
      currentXP: xpStore.currentXP,
      totalXP: xpStore.totalXP,
      currentStreak,
      longestStreak,
      totalEntries,
      lastEntryDate,
    }

    // Update the store
    set({ userProgress: recalculatedProgress })
  },
  
  loadEntriesFromFirestore: async (userId: string) => {
    if (!userId || userId === 'demo-user') return
    
    set({ isLoading: true })
    try {
      // Dynamically import Firebase
      const { db } = await import('@/lib/firebase')
      const { collection, query, orderBy, getDocs } = await import('firebase/firestore')
      
      const entriesQuery = query(
        collection(db, 'users', userId, 'journal'),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(entriesQuery)
      
      // Import migration helpers once
      const { migrateToArray, migrateQuestsToArray } = await import('@/types/journal')
      
      const entries: JournalEntry[] = []
      snapshot.forEach(doc => {
        const data = doc.data()
        
        // Migrate threats and allies to arrays if needed
        const threats = typeof data.threats === 'string' ? migrateToArray(data.threats) : data.threats
        const allies = typeof data.allies === 'string' ? migrateToArray(data.allies) : data.allies
        
        // Migrate quests to array if needed
        const quests = migrateQuestsToArray(data)
        
        entries.push({
          ...data,
          threats,
          allies,
          quests,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as JournalEntry)
      })
      
      set({ entries })
    } catch (error) {
      console.error('Error loading entries from Firestore:', error)
    } finally {
      set({ isLoading: false })
    }
  },
  
  loadUserProgressFromFirestore: async (userId: string) => {
    if (!userId || userId === 'demo-user') return
    
    try {
      // Dynamically import Firebase
      const { db } = await import('@/lib/firebase')
      const { doc, getDoc, setDoc } = await import('firebase/firestore')
      
      const progressDoc = await getDoc(doc(db, 'users', userId, 'progress', 'journal'))
      if (progressDoc.exists()) {
        const progress = progressDoc.data() as UserProgress
        set({ userProgress: progress })
      } else {
        // Initialize progress in Firestore
        const newProgress = { ...initialProgress, userId }
        await setDoc(doc(db, 'users', userId, 'progress', 'journal'), newProgress)
        set({ userProgress: newProgress })
      }
    } catch (error) {
      console.error('Error loading user progress from Firestore:', error)
    }
  },
  
  syncToFirestore: async (userId: string) => {
    if (!userId || userId === 'demo-user') return
    
    const { entries, userProgress } = get()
    set({ isSyncing: true })
    
    try {
      // Dynamically import Firebase
      const { db } = await import('@/lib/firebase')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      
      // Sync all entries
      const batch = entries.map(entry => 
        setDoc(doc(db, 'users', userId, 'journal', entry.id), {
          ...entry,
          updatedAt: serverTimestamp(),
        })
      )
      
      // Sync user progress
      batch.push(
        setDoc(doc(db, 'users', userId, 'progress', 'journal'), userProgress)
      )
      
      await Promise.all(batch)
    } catch (error) {
      console.error('Error syncing to Firestore:', error)
    } finally {
      set({ isSyncing: false })
    }
  },
}))