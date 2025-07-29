// Centralized XP and Gamification Types

export interface XPEvent {
  id: string
  type: XPEventType
  points: number
  timestamp: string
  userId: string
  metadata?: Record<string, any>
  description?: string
}

export enum XPEventType {
  // Journal Events
  JOURNAL_ENTRY = 'journal_entry',
  JOURNAL_STREAK_BONUS = 'journal_streak_bonus',
  JOURNAL_GRATITUDE = 'journal_gratitude',
  JOURNAL_QUEST = 'journal_quest',
  
  // Node Events
  NODE_CREATED = 'node_created',
  NODE_COMPLETED = 'node_completed',
  NODE_UPDATE_ADDED = 'node_update_added',
  NODE_UPDATE_PROGRESS = 'node_update_progress',
  NODE_UPDATE_STATUS = 'node_update_status',
  NODE_UPDATE_MILESTONE = 'node_update_milestone',
  
  // Brain Dump Events
  BRAIN_DUMP_CREATED = 'brain_dump_created',
  BRAIN_DUMP_PROCESSED = 'brain_dump_processed',
  
  // Routine Events
  ROUTINE_MORNING_COMPLETED = 'routine_morning_completed',
  ROUTINE_EVENING_COMPLETED = 'routine_evening_completed',
  ROUTINE_BOTH_COMPLETED = 'routine_both_completed',
  
  // Other Events
  TIMEBOX_COMPLETED = 'timebox_completed',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
}

export const XP_VALUES: Record<XPEventType, number> = {
  // Journal Events
  [XPEventType.JOURNAL_ENTRY]: 25,
  [XPEventType.JOURNAL_STREAK_BONUS]: 5, // per day, max 50
  [XPEventType.JOURNAL_GRATITUDE]: 5,
  [XPEventType.JOURNAL_QUEST]: 10,
  
  // Node Events
  [XPEventType.NODE_CREATED]: 20,
  [XPEventType.NODE_COMPLETED]: 50,
  [XPEventType.NODE_UPDATE_ADDED]: 10,
  [XPEventType.NODE_UPDATE_PROGRESS]: 15,
  [XPEventType.NODE_UPDATE_STATUS]: 12,
  [XPEventType.NODE_UPDATE_MILESTONE]: 25,
  
  // Brain Dump Events
  [XPEventType.BRAIN_DUMP_CREATED]: 15,
  [XPEventType.BRAIN_DUMP_PROCESSED]: 10,
  
  // Routine Events
  [XPEventType.ROUTINE_MORNING_COMPLETED]: 20,
  [XPEventType.ROUTINE_EVENING_COMPLETED]: 20,
  [XPEventType.ROUTINE_BOTH_COMPLETED]: 10, // bonus
  
  // Other Events
  [XPEventType.TIMEBOX_COMPLETED]: 30,
  [XPEventType.ACHIEVEMENT_UNLOCKED]: 50,
}

// Re-export existing types from journal.ts for backward compatibility
export type { UserProgress, Achievement, Level } from './journal'
export { LEVELS, AchievementCategory } from './journal'

// Additional XP-specific types
export interface XPAnimation {
  id: string
  amount: number
  x: number
  y: number
  timestamp: number
}

export interface LevelUpNotification {
  previousLevel: number
  newLevel: number
  newPerks: string[]
  totalXP: number
}