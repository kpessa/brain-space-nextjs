// Backward compatibility re-export
// This file provides backward compatibility for existing imports
// Use useTasksStore from './tasksStore' for new code

export {
  useTasksStore as useCalendarStore,
  useTasksStore as useCalendarStoreBase,
  useTasksStoreSSR
} from './tasksStore'
