// Backward compatibility re-export
// This file provides backward compatibility for existing imports
// Use useTasksStore from './tasksStore' for new code

export {
  useTasksStore as useTodoStore,
  type Todo,
  type TodoType,
  type TodoStatus,
  type TodoSourceType
} from './tasksStore'
