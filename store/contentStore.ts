import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'
import type { JournalEntry, UserProgress, Achievement } from '@/types/journal'
import { XP_REWARDS, LEVELS, ACHIEVEMENTS_LIST } from '@/types/journal'
import { useXPStore } from './xpStore'
import { XPEventType } from '@/types/xp'

// Brain Dump Types
export interface BrainDumpNode extends Node {
  data: {
    label: string
    type?: string
    category?: string
    description?: string
    tags?: string[]
    urgency?: number
    importance?: number
    dueDate?: string
    confidence?: number
    keywords?: string[]
    isCollapsed?: boolean
    nodeType?: string
    // Source text mapping
    sourceText?: string      // Original text snippet
    textPosition?: {         // Position in source
      line: number
      start: number
      end: number
    }
    // Additional properties from full type definition
    children?: string[]
    parent?: string
    parentId?: string
    isPersonal?: boolean
    originalText?: string
    aiGenerated?: boolean
    isLink?: boolean
    linkedBrainDumpId?: string
    layoutMode?: 'horizontal' | 'freeform'
    isGhost?: boolean
    referencedNodeId?: string
    synonyms?: string[]
    isInstance?: boolean
    prototypeId?: string
    instances?: string[]
    hasTopicBrainDump?: boolean
    topicBrainDumpId?: string
    priorityMode?: 'simple' | 'advanced'
    dueDateMode?: 'none' | 'specific' | 'relative'
    autoUrgencyFromDueDate?: boolean
    timeboxStartTime?: string
    timeboxDuration?: number
    timeboxDate?: string
    isTimedTask?: boolean
    taskStatus?: 'pending' | 'in-progress' | 'completed' | 'deferred'
    completedAt?: string
    attempts?: Array<{
      id: string
      timestamp: string
      duration?: number
      notes?: string
      outcome: 'success' | 'partial' | 'failed' | 'blocked'
      nextAction?: string
    }>
    totalAttempts?: number
    subtasks?: string[]
    parentTaskId?: string
    subtaskProgress?: { completed: number; total: number }
    subtaskLogic?: 'AND' | 'OR' | 'NONE'
    isOptional?: boolean
    autoCompleteParent?: boolean
    taskType?: 'one-time' | 'recurring' | 'habit'
    recurrencePattern?: any
    recurringCompletions?: any[]
    currentStreak?: number
    longestStreak?: number
    lastRecurringCompletionDate?: string
  }
}

export interface BrainDumpEdge extends Edge {
  data?: {
    type?: 'depends_on' | 'relates_to' | 'contradicts' | 'elaborates'
    confidence?: number
  }
}

export interface BrainDumpEntry {
  id: string
  title: string
  rawText: string
  nodes: BrainDumpNode[]
  edges: BrainDumpEdge[]
  createdAt: string
  updatedAt: string
  userId?: string
  type?: 'general' | 'topic-focused'
  topicFocus?: string
}

interface ContentState {
  // Brain Dump State
  brainDumpEntries: BrainDumpEntry[]
  currentBrainDumpEntry: BrainDumpEntry | null
  isBrainDumpLoading: boolean
  brainDumpError: string | null
  
  // Journal State
  journalEntries: JournalEntry[]
  journalProgress: UserProgress
  isJournalLoading: boolean
  isJournalSyncing: boolean
  
  // Brain Dump Actions
  loadBrainDumpEntries: (userId: string) => Promise<void>
  createBrainDumpEntry: (title: string, rawText: string, userId: string) => Promise<BrainDumpEntry>
  updateBrainDumpEntry: (id: string, updates: Partial<BrainDumpEntry>) => Promise<void>
  deleteBrainDumpEntry: (id: string) => Promise<void>
  setCurrentBrainDumpEntry: (entry: BrainDumpEntry | null) => void
  
  // Brain Dump Node operations
  addBrainDumpNode: (node: BrainDumpNode) => void
  updateBrainDumpNode: (nodeId: string, updates: Partial<BrainDumpNode>) => void
  deleteBrainDumpNode: (nodeId: string) => void
  toggleBrainDumpNodeCollapse: (nodeId: string) => void
  
  // Brain Dump Edge operations
  addBrainDumpEdge: (edge: BrainDumpEdge) => void
  updateBrainDumpEdge: (edgeId: string, updates: Partial<BrainDumpEdge>) => void
  deleteBrainDumpEdge: (edgeId: string) => void
  
  // Journal Actions
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'xpEarned'>) => Promise<void>
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>
  deleteJournalEntry: (id: string) => Promise<void>
  calculateJournalStreak: () => number
  checkJournalAchievements: () => void
  getTodayJournalEntry: () => JournalEntry | undefined
  
  // Journal sync actions
  setJournalEntries: (entries: JournalEntry[]) => void
  setJournalProgress: (progress: UserProgress) => void
  recalculateJournalProgress: () => Promise<void>
  
  // Firebase actions
  loadJournalEntriesFromFirestore: (userId: string) => Promise<void>
  loadJournalProgressFromFirestore: (userId: string) => Promise<void>
  syncJournalToFirestore: (userId: string) => Promise<void>
}

const initialJournalProgress: UserProgress = {
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

export const useContentStore = create<ContentState>((set, get) => ({
  // Brain Dump State
  brainDumpEntries: [],
  currentBrainDumpEntry: null,
  isBrainDumpLoading: false,
  brainDumpError: null,
  
  // Journal State
  journalEntries: [],
  journalProgress: initialJournalProgress,
  isJournalLoading: false,
  isJournalSyncing: false,
  
  // Brain Dump Actions
  loadBrainDumpEntries: async (userId: string) => {
    if (!userId) {
      set({ brainDumpError: 'User not authenticated', isBrainDumpLoading: false })
      return
    }

    set({ isBrainDumpLoading: true, brainDumpError: null })
    try {
      const { db } = await import('@/lib/firebase')
      const { collection, query, orderBy, getDocs } = await import('firebase/firestore')
      
      const entriesQuery = query(
        collection(db, 'users', userId, 'braindumps'),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(entriesQuery)
      
      const entries: BrainDumpEntry[] = []
      snapshot.forEach(doc => {
        const data = doc.data()
        entries.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as BrainDumpEntry)
      })

      set({
        brainDumpEntries: entries,
        isBrainDumpLoading: false,
        brainDumpError: null,
      })
    } catch (error) {
      set({
        brainDumpError: (error as Error).message,
        isBrainDumpLoading: false,
      })
    }
  },
  
  createBrainDumpEntry: async (title: string, rawText: string, userId: string) => {
    const newEntry: BrainDumpEntry = {
      id: crypto.randomUUID(),
      title,
      rawText,
      nodes: [],
      edges: [],
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    try {
      const { db } = await import('@/lib/firebase')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      
      await setDoc(doc(db, 'users', userId, 'braindumps', newEntry.id), {
        ...newEntry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      
      set(state => ({
        brainDumpEntries: [...state.brainDumpEntries, newEntry],
        currentBrainDumpEntry: newEntry,
        brainDumpError: null,
      }))
      
      return newEntry
    } catch (error) {
      set({ brainDumpError: (error as Error).message })
      throw error
    }
  },
  
  updateBrainDumpEntry: async (id: string, updates: Partial<BrainDumpEntry>) => {
    const entry = get().brainDumpEntries.find(e => e.id === id)
    if (!entry || !entry.userId) {
      set({ brainDumpError: 'Entry not found' })
      return
    }

    try {
      const { db } = await import('@/lib/firebase')
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
      
      await updateDoc(doc(db, 'users', entry.userId, 'braindumps', id), {
        ...updates,
        updatedAt: serverTimestamp(),
      })

      set(state => ({
        brainDumpEntries: state.brainDumpEntries.map(entry =>
          entry.id === id
            ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
            : entry
        ),
        currentBrainDumpEntry:
          state.currentBrainDumpEntry?.id === id
            ? { ...state.currentBrainDumpEntry, ...updates, updatedAt: new Date().toISOString() }
            : state.currentBrainDumpEntry,
        brainDumpError: null,
      }))
    } catch (error) {
      set({ brainDumpError: (error as Error).message })
    }
  },
  
  deleteBrainDumpEntry: async (id: string) => {
    const entry = get().brainDumpEntries.find(e => e.id === id)
    if (!entry || !entry.userId) {
      set({ brainDumpError: 'Entry not found' })
      return
    }

    try {
      const { db } = await import('@/lib/firebase')
      const { doc, deleteDoc } = await import('firebase/firestore')
      
      await deleteDoc(doc(db, 'users', entry.userId, 'braindumps', id))

      set(state => ({
        brainDumpEntries: state.brainDumpEntries.filter(entry => entry.id !== id),
        currentBrainDumpEntry: state.currentBrainDumpEntry?.id === id ? null : state.currentBrainDumpEntry,
        brainDumpError: null,
      }))
    } catch (error) {
      set({ brainDumpError: (error as Error).message })
    }
  },
  
  setCurrentBrainDumpEntry: (entry: BrainDumpEntry | null) => {
    set({ currentBrainDumpEntry: entry })
  },
  
  // Brain Dump Node Operations
  addBrainDumpNode: (node: BrainDumpNode) => {
    const { currentBrainDumpEntry } = get()
    if (!currentBrainDumpEntry) return
    
    const updatedNodes = [...currentBrainDumpEntry.nodes, node]
    get().updateBrainDumpEntry(currentBrainDumpEntry.id, { nodes: updatedNodes })
  },
  
  updateBrainDumpNode: (nodeId: string, updates: Partial<BrainDumpNode>) => {
    const { currentBrainDumpEntry } = get()
    if (!currentBrainDumpEntry) return
    
    const updatedNodes = currentBrainDumpEntry.nodes.map(node =>
      node.id === nodeId ? { ...node, ...updates } : node
    )
    get().updateBrainDumpEntry(currentBrainDumpEntry.id, { nodes: updatedNodes })
  },
  
  deleteBrainDumpNode: (nodeId: string) => {
    const { currentBrainDumpEntry } = get()
    if (!currentBrainDumpEntry) return
    
    const updatedNodes = currentBrainDumpEntry.nodes.filter(node => node.id !== nodeId)
    const updatedEdges = currentBrainDumpEntry.edges.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    )
    get().updateBrainDumpEntry(currentBrainDumpEntry.id, { nodes: updatedNodes, edges: updatedEdges })
  },
  
  toggleBrainDumpNodeCollapse: (nodeId: string) => {
    const { currentBrainDumpEntry } = get()
    if (!currentBrainDumpEntry) return
    
    const updatedNodes = currentBrainDumpEntry.nodes.map(node =>
      node.id === nodeId 
        ? { ...node, data: { ...node.data, isCollapsed: !node.data.isCollapsed } }
        : node
    )
    get().updateBrainDumpEntry(currentBrainDumpEntry.id, { nodes: updatedNodes })
  },
  
  // Brain Dump Edge Operations
  addBrainDumpEdge: (edge: BrainDumpEdge) => {
    const { currentBrainDumpEntry } = get()
    if (!currentBrainDumpEntry) return
    
    const updatedEdges = [...currentBrainDumpEntry.edges, edge]
    get().updateBrainDumpEntry(currentBrainDumpEntry.id, { edges: updatedEdges })
  },
  
  updateBrainDumpEdge: (edgeId: string, updates: Partial<BrainDumpEdge>) => {
    const { currentBrainDumpEntry } = get()
    if (!currentBrainDumpEntry) return
    
    const updatedEdges = currentBrainDumpEntry.edges.map(edge =>
      edge.id === edgeId ? { ...edge, ...updates } : edge
    )
    get().updateBrainDumpEntry(currentBrainDumpEntry.id, { edges: updatedEdges })
  },
  
  deleteBrainDumpEdge: (edgeId: string) => {
    const { currentBrainDumpEntry } = get()
    if (!currentBrainDumpEntry) return
    
    const updatedEdges = currentBrainDumpEntry.edges.filter(edge => edge.id !== edgeId)
    get().updateBrainDumpEntry(currentBrainDumpEntry.id, { edges: updatedEdges })
  },

  // Journal Actions
  addJournalEntry: async entryData => {
    const { journalEntries, journalProgress } = get()
    set({ isJournalSyncing: true })
    
    try {
      // Calculate journal-specific XP components
      let journalXP = XP_REWARDS.DAILY_ENTRY
      journalXP += entryData.gratitude.filter(g => g.trim()).length * XP_REWARDS.GRATITUDE_ITEM
      
      if (entryData.quests) {
        journalXP += entryData.quests.filter(q => q.trim()).length * XP_REWARDS.QUEST_ITEM
      }
      
      if (Array.isArray(entryData.threats)) {
        journalXP += entryData.threats.filter(t => t.trim()).length * XP_REWARDS.THREAT_IDENTIFIED
      } else if (typeof entryData.threats === 'string' && entryData.threats.trim()) {
        journalXP += XP_REWARDS.THREAT_IDENTIFIED
      }
      
      if (Array.isArray(entryData.allies)) {
        journalXP += entryData.allies.filter(a => a.trim()).length * XP_REWARDS.ALLY_RECOGNIZED
      } else if (typeof entryData.allies === 'string' && entryData.allies.trim()) {
        journalXP += XP_REWARDS.ALLY_RECOGNIZED
      }
      
      if (entryData.notes.trim().length > 50) journalXP += XP_REWARDS.NOTES_BONUS

      // Check streak
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      const lastEntry = journalProgress.lastEntryDate
        ? new Date(journalProgress.lastEntryDate).toDateString()
        : null

      let newStreak = journalProgress.currentStreak
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
        id: crypto.randomUUID(),
        xpEarned: xpAwarded,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Update journal-specific progress
      const newProgress = {
        ...journalProgress,
        level: newLevel,
        currentXP: xpStore.currentXP,
        totalXP: xpStore.totalXP,
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, journalProgress.longestStreak),
        totalEntries: journalProgress.totalEntries + 1,
        lastEntryDate: new Date().toISOString(),
      }

      set({
        journalEntries: [newEntry, ...journalEntries],
        journalProgress: newProgress,
      })

      // Check for new achievements
      get().checkJournalAchievements()
    
      // Sync to Firestore if user is authenticated
      if (entryData.userId !== 'demo-user') {
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
      throw error
    } finally {
      set({ isJournalSyncing: false })
    }
  },
  
  updateJournalEntry: async (id, updates) => {
    const { journalEntries, journalProgress } = get()
    const currentEntry = journalEntries.find(e => e.id === id)
    if (!currentEntry) return
    
    set({ isJournalSyncing: true })
    
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
        journalEntries: state.journalEntries.map(entry => (entry.id === id ? updatedEntry : entry)),
      }))

      // Update user progress if XP changed
      if (xpDiff !== 0) {
        const xpStore = useXPStore.getState()
        if (xpDiff > 0) {
          await xpStore.awardXP(XPEventType.JOURNAL_ENTRY, { baseXP: xpDiff })
        } else {
          xpStore.setXP(xpStore.totalXP + xpDiff)
        }

        const newProgress = {
          ...journalProgress,
          level: xpStore.level,
          currentXP: xpStore.currentXP,
          totalXP: xpStore.totalXP,
        }

        set({ journalProgress: newProgress })
        
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
      throw error
    } finally {
      set({ isJournalSyncing: false })
    }
  },

  deleteJournalEntry: async id => {
    const { journalEntries } = get()
    const entry = journalEntries.find(e => e.id === id)
    if (!entry) return
    
    set({ isJournalSyncing: true })
    
    try {
      set(state => ({
        journalEntries: state.journalEntries.filter(entry => entry.id !== id),
      }))
      
      if (entry.userId !== 'demo-user') {
        const { db } = await import('@/lib/firebase')
        const { doc, deleteDoc } = await import('firebase/firestore')
        await deleteDoc(doc(db, 'users', entry.userId, 'journal', id))
      }
    } catch (error) {
      throw error
    } finally {
      set({ isJournalSyncing: false })
    }
  },

  calculateJournalStreak: () => {
    const { journalEntries } = get()
    if (journalEntries.length === 0) return 0

    let streak = 1
    const sortedEntries = [...journalEntries].sort(
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

  checkJournalAchievements: () => {
    const { journalEntries, journalProgress } = get()
    const newAchievements: Achievement[] = []

    // First Entry
    if (journalEntries.length === 1 && !journalProgress.achievements.find(a => a.id === 'first-entry')) {
      newAchievements.push({
        ...ACHIEVEMENTS_LIST.find(a => a.id === 'first-entry')!,
        unlockedAt: new Date().toISOString(),
      })
    }

    // Week Warrior
    if (
      journalProgress.currentStreak >= 7 &&
      !journalProgress.achievements.find(a => a.id === 'week-warrior')
    ) {
      newAchievements.push({
        ...ACHIEVEMENTS_LIST.find(a => a.id === 'week-warrior')!,
        unlockedAt: new Date().toISOString(),
      })
    }

    // Gratitude Master
    const totalGratitude = journalEntries.reduce(
      (sum, entry) => sum + entry.gratitude.filter(g => g.trim()).length,
      0
    )
    if (
      totalGratitude >= 100 &&
      !journalProgress.achievements.find(a => a.id === 'gratitude-master')
    ) {
      newAchievements.push({
        ...ACHIEVEMENTS_LIST.find(a => a.id === 'gratitude-master')!,
        unlockedAt: new Date().toISOString(),
      })
    }

    if (newAchievements.length > 0) {
      set(state => ({
        journalProgress: {
          ...state.journalProgress,
          achievements: [...state.journalProgress.achievements, ...newAchievements],
        },
      }))
    }
  },

  getTodayJournalEntry: () => {
    const { journalEntries } = get()
    const today = new Date().toDateString()
    return journalEntries.find(entry => new Date(entry.date).toDateString() === today)
  },

  setJournalEntries: entries => {
    set({ journalEntries: entries })
  },

  setJournalProgress: progress => {
    const cleanProgress = { ...progress }

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
    set({ journalProgress: sanitizedProgress })
  },

  recalculateJournalProgress: async () => {
    const { journalEntries, journalProgress } = get()

    if (journalEntries.length === 0) return

    const totalXP = journalEntries.reduce((sum, entry) => sum + (entry.xpEarned || 0), 0)
    const totalEntries = journalEntries.length

    const currentStreak = get().calculateJournalStreak()

    let longestStreak = currentStreak
    const sortedEntries = [...journalEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    let tempStreak = 1
    for (let i = 1; i < sortedEntries.length; i++) {
      const currentDate = new Date(sortedEntries[i].date)
      const previousDate = new Date(sortedEntries[i - 1].date)
      const dayDiff = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)

      if (Math.abs(dayDiff - 1) < 0.1) {
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
      journalEntries.length > 0
        ? journalEntries.reduce((latest, entry) =>
            new Date(entry.date) > new Date(latest.date) ? entry : latest
          ).date
        : null

    // Create recalculated progress using centralized XP data
    const recalculatedProgress = {
      ...journalProgress,
      level: xpStore.level,
      currentXP: xpStore.currentXP,
      totalXP: xpStore.totalXP,
      currentStreak,
      longestStreak,
      totalEntries,
      lastEntryDate,
    }

    set({ journalProgress: recalculatedProgress })
  },
  
  loadJournalEntriesFromFirestore: async (userId: string) => {
    if (!userId || userId === 'demo-user') return
    
    set({ isJournalLoading: true })
    try {
      const { db } = await import('@/lib/firebase')
      const { collection, query, orderBy, getDocs } = await import('firebase/firestore')
      
      const entriesQuery = query(
        collection(db, 'users', userId, 'journal'),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(entriesQuery)
      
      const { migrateToArray, migrateQuestsToArray } = await import('@/types/journal')
      
      const entries: JournalEntry[] = []
      snapshot.forEach(doc => {
        const data = doc.data()
        
        const threats = typeof data.threats === 'string' ? migrateToArray(data.threats) : data.threats
        const allies = typeof data.allies === 'string' ? migrateToArray(data.allies) : data.allies
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
      
      set({ journalEntries: entries })
    } catch (error) {
      // Error loading entries from Firestore
    } finally {
      set({ isJournalLoading: false })
    }
  },
  
  loadJournalProgressFromFirestore: async (userId: string) => {
    if (!userId || userId === 'demo-user') return
    
    try {
      const { db } = await import('@/lib/firebase')
      const { doc, getDoc, setDoc } = await import('firebase/firestore')
      
      const progressDoc = await getDoc(doc(db, 'users', userId, 'progress', 'journal'))
      if (progressDoc.exists()) {
        const progress = progressDoc.data() as UserProgress
        set({ journalProgress: progress })
      } else {
        const newProgress = { ...initialJournalProgress, userId }
        await setDoc(doc(db, 'users', userId, 'progress', 'journal'), newProgress)
        set({ journalProgress: newProgress })
      }
    } catch (error) {
      // Error loading user progress from Firestore
    }
  },
  
  syncJournalToFirestore: async (userId: string) => {
    if (!userId || userId === 'demo-user') return
    
    const { journalEntries, journalProgress } = get()
    set({ isJournalSyncing: true })
    
    try {
      const { db } = await import('@/lib/firebase')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      
      // Sync all entries
      const batch = journalEntries.map(entry => 
        setDoc(doc(db, 'users', userId, 'journal', entry.id), {
          ...entry,
          updatedAt: serverTimestamp(),
        })
      )
      
      // Sync user progress
      batch.push(
        setDoc(doc(db, 'users', userId, 'progress', 'journal'), journalProgress)
      )
      
      await Promise.all(batch)
    } catch (error) {
      // Error syncing to Firestore
    } finally {
      set({ isJournalSyncing: false })
    }
  },
}))
