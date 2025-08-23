// Export all consolidated stores from a central location
export { useCoreStore } from './coreStore'         // Auth, User Preferences, Schedule
export { useNodesStore } from './nodes'           // Node management (already modular)
export { usePlanningStore } from './planningStore' // Time management and planning
export { useContentStore } from './contentStore'   // Brain dumps and journal
export { useTasksStore } from './tasksStore'       // Tasks, todos, routines, calendar
export { useUIStore } from './uiStore'             // UI state and XP/gamification

// Backward compatibility exports (deprecated - use consolidated stores instead)
export { useCoreStore as useAuthStore } from './coreStore'
export { useCoreStore as useUserPreferencesStore } from './coreStore'
export { useCoreStore as useScheduleStore } from './coreStore'
export { usePlanningStore as useTimeboxStore } from './planningStore'
export { useContentStore as useBrainDumpStore } from './contentStore'
export { useContentStore as useJournalStore } from './contentStore'
export { useTasksStore as useTodoStore } from './tasksStore'
export { useTasksStore as useCalendarStore } from './tasksStore'
export { useTasksStore as useRoutineStore } from './tasksStore'
export { useUIStore as useXPStore } from './uiStore'

// Node types are now in types/node.ts, not in the store