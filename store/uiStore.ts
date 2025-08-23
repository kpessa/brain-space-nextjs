import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { XPEvent, XPEventType, XP_VALUES, UserProgress, Achievement, LEVELS } from '@/types/xp'
import { ACHIEVEMENTS_LIST } from '@/types/journal'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

// Extended toast interface for component usage
export interface ToastState {
  toasts: Toast[]
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

// XP Store integrated into UI Store
interface XPState {
  userProgress: UserProgress
  recentXPEvents: XPEvent[]
  xpAnimations: Array<{ id: string; amount: number; x: number; y: number; timestamp: number }>
  isXPLoading: boolean
  
  // Convenience getters
  currentXP: number
  totalXP: number
  level: number
}

interface UIState extends XPState {
  // Theme
  theme: 'light' | 'dark' | 'system'
  
  // Layout
  sidebarCollapsed: boolean
  
  // Modals
  isNodeModalOpen: boolean
  isSettingsModalOpen: boolean
  
  // Toasts
  toasts: Toast[]
  
  // Loading states
  globalLoading: boolean
  
  // AI settings
  aiProvider: string
  aiDebugMode: boolean

  // UI Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  openNodeModal: () => void
  closeNodeModal: () => void
  openSettingsModal: () => void
  closeSettingsModal: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  setGlobalLoading: (loading: boolean) => void
  setAIProvider: (provider: string) => void
  toggleAIDebugMode: () => void
  
  // Convenience toast methods
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  
  // XP Actions
  awardXP: (eventType: XPEventType, metadata?: Record<string, any>) => Promise<{ xpAwarded: number; leveledUp: boolean; newLevel: number }>
  setXP: (totalXP: number) => void
  getUserProgress: () => UserProgress
  checkLevelUp: () => { leveledUp: boolean; newLevel?: number }
  getNextLevelProgress: () => { current: number; needed: number; percentage: number }
  checkAchievements: () => Achievement[]
  unlockAchievement: (achievementId: string) => void
  addXPAnimation: (amount: number, x: number, y: number) => void
  removeXPAnimation: (id: string) => void
  clearAnimations: () => void
  addXPEvent: (event: Omit<XPEvent, 'id' | 'timestamp'>) => void
  getRecentEvents: (limit?: number) => XPEvent[]
  loadXPProgress: (userId: string) => Promise<void>
  saveXPProgress: () => Promise<void>
  resetXPProgress: () => void
}

const initialXPProgress: UserProgress = {
  userId: '',
  level: 1,
  currentXP: 0,
  totalXP: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalEntries: 0,
  achievements: [],
  lastEntryDate: null,
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // UI Initial state
      theme: 'system',
      sidebarCollapsed: false,
      isNodeModalOpen: false,
      isSettingsModalOpen: false,
      toasts: [],
      globalLoading: false,
      aiProvider: 'openai',
      aiDebugMode: false,
      
      // XP Initial state
      userProgress: initialXPProgress,
      recentXPEvents: [],
      xpAnimations: [],
      isXPLoading: false,
      
      // Convenience getters
      get currentXP() {
        return get().userProgress.currentXP
      },
      get totalXP() {
        return get().userProgress.totalXP
      },
      get level() {
        return get().userProgress.level
      },

      // Theme actions
      setTheme: (theme) => set({ theme }),

      // Sidebar actions
      toggleSidebar: () => 
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      setSidebarCollapsed: (collapsed) => 
        set({ sidebarCollapsed: collapsed }),

      // Modal actions
      openNodeModal: () => set({ isNodeModalOpen: true }),
      closeNodeModal: () => set({ isNodeModalOpen: false }),
      openSettingsModal: () => set({ isSettingsModalOpen: true }),
      closeSettingsModal: () => set({ isSettingsModalOpen: false }),

      // Toast actions
      addToast: (toastData) => {
        const toast: Toast = {
          ...toastData,
          id: crypto.randomUUID(),
        }
        set((state) => ({
          toasts: [...state.toasts, toast],
        }))

        // Auto-remove toast after duration
        if (toast.duration !== 0) {
          setTimeout(() => {
            get().removeToast(toast.id)
          }, toast.duration || 5000)
        }
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        })),

      clearToasts: () => set({ toasts: [] }),

      // Global loading
      setGlobalLoading: (loading) => set({ globalLoading: loading }),

      // AI settings
      setAIProvider: (provider) => set({ aiProvider: provider }),
      
      toggleAIDebugMode: () =>
        set((state) => ({ aiDebugMode: !state.aiDebugMode })),

      // Convenience toast methods
      success: (message, duration) => {
        get().addToast({ type: 'success', message, duration })
      },
      
      error: (message, duration) => {
        get().addToast({ type: 'error', message, duration })
      },
      
      warning: (message, duration) => {
        get().addToast({ type: 'warning', message, duration })
      },
      
      info: (message, duration) => {
        get().addToast({ type: 'info', message, duration })
      },
      
      // XP Actions
      setXP: (totalXP: number) => {
        const { userProgress } = get()
        
        // Calculate new level
        let newLevel = LEVELS.findIndex(level => totalXP < level.maxXP) + 1
        if (newLevel === 0) newLevel = LEVELS.length
        
        const currentLevelData = LEVELS[newLevel - 1]
        const newCurrentXP = currentLevelData.maxXP === Infinity
          ? totalXP - currentLevelData.minXP
          : totalXP - currentLevelData.minXP
        
        set({
          userProgress: {
            ...userProgress,
            totalXP,
            currentXP: newCurrentXP,
            level: newLevel,
          }
        })
        
        // Save to Firebase (async, don't await)
        get().saveXPProgress()
      },
      
      awardXP: async (eventType: XPEventType, metadata?: Record<string, any>) => {
        const { userProgress } = get()
        const baseXP = XP_VALUES[eventType] || 0
        let xpToAward = baseXP
        
        // Handle journal entries with custom baseXP and streak bonus
        if (eventType === XPEventType.JOURNAL_ENTRY && metadata?.baseXP) {
          xpToAward = metadata.baseXP
          // Add streak bonus if provided
          if (metadata.streak && metadata.streak > 1) {
            const streakBonus = Math.min(metadata.streak * 5, 50) // 5 XP per day, max 50
            xpToAward += streakBonus
          }
        }
        
        // Check for milestone bonuses
        if (eventType === XPEventType.NODE_UPDATE_ADDED && metadata?.updateCount) {
          // Every 10th update gets bonus XP
          if ((metadata.updateCount + 1) % 10 === 0) {
            xpToAward += XP_VALUES[XPEventType.NODE_UPDATE_MILESTONE]
          }
        }
        
        // Update user progress
        const newTotalXP = userProgress.totalXP + xpToAward
        const oldLevel = userProgress.level
        
        // Calculate new level
        let newLevel = LEVELS.findIndex(level => newTotalXP < level.maxXP) + 1
        if (newLevel === 0) newLevel = LEVELS.length
        
        const currentLevelData = LEVELS[newLevel - 1]
        const newCurrentXP = currentLevelData.maxXP === Infinity
          ? newTotalXP - currentLevelData.minXP
          : newTotalXP - currentLevelData.minXP
        
        // Update state
        set({
          userProgress: {
            ...userProgress,
            totalXP: newTotalXP,
            currentXP: newCurrentXP,
            level: newLevel,
          }
        })
        
        // Add XP event to history
        get().addXPEvent({
          type: eventType,
          points: xpToAward,
          userId: userProgress.userId,
          metadata,
        })
        
        // Save to Firebase (async, don't await)
        get().saveXPProgress()
        
        return {
          xpAwarded: xpToAward,
          leveledUp: newLevel > oldLevel,
          newLevel
        }
      },
      
      getUserProgress: () => get().userProgress,
      
      checkLevelUp: () => {
        const { userProgress } = get()
        const currentLevelIndex = userProgress.level - 1
        const currentLevel = LEVELS[currentLevelIndex]
        const nextLevel = LEVELS[currentLevelIndex + 1]
        
        if (!nextLevel) return { leveledUp: false }
        
        if (userProgress.totalXP >= nextLevel.minXP) {
          set({
            userProgress: {
              ...userProgress,
              level: userProgress.level + 1,
              currentXP: userProgress.totalXP - nextLevel.minXP
            }
          })
          return { leveledUp: true, newLevel: userProgress.level + 1 }
        }
        
        return { leveledUp: false }
      },
      
      getNextLevelProgress: () => {
        const { userProgress } = get()
        const currentLevelIndex = userProgress.level - 1
        const currentLevel = LEVELS[currentLevelIndex]
        const nextLevel = LEVELS[currentLevelIndex + 1]
        
        if (!nextLevel || currentLevel.maxXP === Infinity) {
          return { current: userProgress.currentXP, needed: 0, percentage: 100 }
        }
        
        const xpInCurrentLevel = userProgress.totalXP - currentLevel.minXP
        const xpNeededForNextLevel = nextLevel.minXP - currentLevel.minXP
        const percentage = (xpInCurrentLevel / xpNeededForNextLevel) * 100
        
        return {
          current: xpInCurrentLevel,
          needed: xpNeededForNextLevel,
          percentage: Math.min(percentage, 100)
        }
      },
      
      checkAchievements: () => {
        const { userProgress } = get()
        const newAchievements: Achievement[] = []
        
        // Check each achievement condition
        ACHIEVEMENTS_LIST.forEach(achievement => {
          const alreadyUnlocked = userProgress.achievements.some(a => a.id === achievement.id)
          if (alreadyUnlocked) return
          
          let shouldUnlock = false
          
          // Check achievement conditions based on ID
          switch (achievement.id) {
            case 'first-entry':
              shouldUnlock = userProgress.totalEntries > 0
              break
            case 'week-warrior':
              shouldUnlock = userProgress.currentStreak >= 7
              break
            // Add more achievement checks as needed
          }
          
          if (shouldUnlock) {
            newAchievements.push({
              ...achievement,
              unlockedAt: new Date().toISOString()
            })
          }
        })
        
        if (newAchievements.length > 0) {
          set({
            userProgress: {
              ...userProgress,
              achievements: [...userProgress.achievements, ...newAchievements]
            }
          })
        }
        
        return newAchievements
      },
      
      unlockAchievement: (achievementId: string) => {
        const { userProgress } = get()
        const achievement = ACHIEVEMENTS_LIST.find(a => a.id === achievementId)
        if (!achievement) return
        
        const alreadyUnlocked = userProgress.achievements.some(a => a.id === achievementId)
        if (alreadyUnlocked) return
        
        set({
          userProgress: {
            ...userProgress,
            achievements: [...userProgress.achievements, {
              ...achievement,
              unlockedAt: new Date().toISOString()
            }]
          }
        })
        
        // Award XP for unlocking achievement
        get().awardXP(XPEventType.ACHIEVEMENT_UNLOCKED, { achievementId })
      },
      
      addXPAnimation: (amount: number, x: number, y: number) => {
        const id = crypto.randomUUID()
        set(state => ({
          xpAnimations: [...state.xpAnimations, { id, amount, x, y, timestamp: Date.now() }]
        }))
        
        // Auto-remove after 2 seconds
        setTimeout(() => {
          get().removeXPAnimation(id)
        }, 2000)
      },
      
      removeXPAnimation: (id: string) => {
        set(state => ({
          xpAnimations: state.xpAnimations.filter(anim => anim.id !== id)
        }))
      },
      
      clearAnimations: () => {
        set({ xpAnimations: [] })
      },
      
      addXPEvent: (event: Omit<XPEvent, 'id' | 'timestamp'>) => {
        const newEvent: XPEvent = {
          ...event,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString()
        }
        
        set(state => ({
          recentXPEvents: [newEvent, ...state.recentXPEvents].slice(0, 100) // Keep last 100 events
        }))
      },
      
      getRecentEvents: (limit: number = 10) => {
        return get().recentXPEvents.slice(0, limit)
      },
      
      loadXPProgress: async (userId: string) => {
        if (!userId) return
        
        set({ isXPLoading: true })
        try {
          const { db } = await import('@/lib/firebase')
          const { doc, getDoc } = await import('firebase/firestore')
          
          const progressDoc = await getDoc(doc(db, 'users', userId, 'progress', 'current'))
          
          if (progressDoc.exists()) {
            const data = progressDoc.data() as UserProgress
            set({ userProgress: data })
          } else {
            // Initialize new user progress
            set({
              userProgress: {
                ...initialXPProgress,
                userId
              }
            })
          }
        } catch (error) {
          // Error loading XP progress - use initial values
        } finally {
          set({ isXPLoading: false })
        }
      },
      
      saveXPProgress: async () => {
        const { userProgress } = get()
        if (!userProgress.userId) return
        
        try {
          const { db } = await import('@/lib/firebase')
          const { doc, setDoc } = await import('firebase/firestore')
          
          await setDoc(
            doc(db, 'users', userProgress.userId, 'progress', 'current'),
            userProgress
          )
        } catch (error) {
          // Error saving XP progress - will retry on next operation
        }
      },
      
      resetXPProgress: () => {
        set({
          userProgress: initialXPProgress,
          recentXPEvents: [],
          xpAnimations: []
        })
      }
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        // UI persistence
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        aiProvider: state.aiProvider,
        aiDebugMode: state.aiDebugMode,
        // XP persistence
        userProgress: state.userProgress,
        recentXPEvents: state.recentXPEvents.slice(0, 20) // Only persist recent 20 events
      }),
    }
  )
)