import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { XPEvent, XPEventType, XP_VALUES, UserProgress, Achievement, LEVELS } from '@/types/xp'
import { ACHIEVEMENTS_LIST } from '@/types/journal'

interface XPStore {
  // State
  userProgress: UserProgress
  recentXPEvents: XPEvent[]
  xpAnimations: Array<{ id: string; amount: number; x: number; y: number; timestamp: number }>
  isLoading: boolean
  
  // Convenience getters
  currentXP: number
  totalXP: number
  level: number
  
  // Core XP Methods
  awardXP: (eventType: XPEventType, metadata?: Record<string, any>) => Promise<{ xpAwarded: number; leveledUp: boolean; newLevel: number }>
  setXP: (totalXP: number) => void
  getUserProgress: () => UserProgress
  checkLevelUp: () => { leveledUp: boolean; newLevel?: number }
  getNextLevelProgress: () => { current: number; needed: number; percentage: number }
  
  // Achievement Methods
  checkAchievements: () => Achievement[]
  unlockAchievement: (achievementId: string) => void
  
  // Animation Methods
  addXPAnimation: (amount: number, x: number, y: number) => void
  removeXPAnimation: (id: string) => void
  clearAnimations: () => void
  
  // Event History
  addXPEvent: (event: Omit<XPEvent, 'id' | 'timestamp'>) => void
  getRecentEvents: (limit?: number) => XPEvent[]
  
  // Persistence
  loadProgress: (userId: string) => Promise<void>
  saveProgress: () => Promise<void>
  resetProgress: () => void
}

const initialProgress: UserProgress = {
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

export const useXPStore = create<XPStore>()(
  persist(
    (set, get) => ({
      // Initial state
      userProgress: initialProgress,
      recentXPEvents: [],
      xpAnimations: [],
      isLoading: false,
      
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
      
      // Set XP directly (for recalculation scenarios)
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
        get().saveProgress()
      },
      
      // Award XP for an event
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
        get().saveProgress()
        
        return {
          xpAwarded: xpToAward,
          leveledUp: newLevel > oldLevel,
          newLevel
        }
      },
      
      // Get current user progress
      getUserProgress: () => get().userProgress,
      
      // Check if user leveled up
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
      
      // Get progress to next level
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
      
      // Check and unlock achievements
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
      
      // Unlock specific achievement
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
      
      // Animation methods
      addXPAnimation: (amount: number, x: number, y: number) => {
        const id = `xp-${Date.now()}-${Math.random()}`
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
      
      // Event history methods
      addXPEvent: (event: Omit<XPEvent, 'id' | 'timestamp'>) => {
        const newEvent: XPEvent = {
          ...event,
          id: `xp-event-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString()
        }
        
        set(state => ({
          recentXPEvents: [newEvent, ...state.recentXPEvents].slice(0, 100) // Keep last 100 events
        }))
      },
      
      getRecentEvents: (limit: number = 10) => {
        return get().recentXPEvents.slice(0, limit)
      },
      
      // Persistence methods
      loadProgress: async (userId: string) => {
        if (!userId) return
        
        set({ isLoading: true })
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
                ...initialProgress,
                userId
              }
            })
          }
        } catch (error) {
          console.error('Error loading XP progress:', error)
        } finally {
          set({ isLoading: false })
        }
      },
      
      saveProgress: async () => {
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
          console.error('Error saving XP progress:', error)
        }
      },
      
      resetProgress: () => {
        set({
          userProgress: initialProgress,
          recentXPEvents: [],
          xpAnimations: []
        })
      }
    }),
    {
      name: 'xp-store',
      partialize: (state) => ({
        userProgress: state.userProgress,
        recentXPEvents: state.recentXPEvents.slice(0, 20) // Only persist recent 20 events
      })
    }
  )
)