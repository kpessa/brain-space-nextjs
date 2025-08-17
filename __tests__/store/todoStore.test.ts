import { act, renderHook } from '@testing-library/react'
import { useTodoStore, Todo, TodoType, TodoStatus, TodoSourceType } from '@/store/todoStore'

// Helper function to create minimal todo data with required fields
const createMinimalTodo = (overrides: any = {}) => ({
  title: 'Default title',
  status: 'pending' as TodoStatus,
  type: 'task' as TodoType,
  sourceType: 'manual' as TodoSourceType,
  ...overrides,
})

describe('TodoStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTodoStore.setState({
      todos: [],
      isLoading: false,
      filter: {},
    })
  })

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useTodoStore())
      
      expect(result.current.todos).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.filter).toEqual({})
    })
  })

  describe('Add Todo', () => {
    it('adds todo with all fields', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const todoData = {
        title: 'Complete project',
        description: 'Finish the important project by Friday',
        type: 'task' as TodoType,
        status: 'pending' as TodoStatus,
        importance: 8,
        urgency: 7,
        dueDate: '2024-01-15',
        scheduledDate: '2024-01-14',
        scheduledTime: '09:00',
        scheduledDuration: 120,
        parentId: 'parent-todo-1',
        position: 1,
        sourceType: 'manual' as TodoSourceType,
        sourceId: 'manual-123',
        tags: ['work', 'urgent'],
        userId: 'user-123',
      }
      
      let createdTodo: Todo
      
      act(() => {
        createdTodo = result.current.addTodo(todoData)
      })
      
      expect(result.current.todos).toHaveLength(1)
      expect(createdTodo!.id).toBeTruthy()
      expect(createdTodo!.title).toBe('Complete project')
      expect(createdTodo!.description).toBe('Finish the important project by Friday')
      expect(createdTodo!.type).toBe('task')
      expect(createdTodo!.status).toBe('pending')
      expect(createdTodo!.importance).toBe(8)
      expect(createdTodo!.urgency).toBe(7)
      expect(createdTodo!.dueDate).toBe('2024-01-15')
      expect(createdTodo!.sourceType).toBe('manual')
      expect(createdTodo!.tags).toEqual(['work', 'urgent'])
      expect(createdTodo!.createdAt).toBeTruthy()
      expect(createdTodo!.updatedAt).toBeTruthy()
    })

    it('adds todo with minimal fields and applies defaults', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const todoData = createMinimalTodo({
        title: 'Simple task',
      })
      
      let createdTodo: Todo
      
      act(() => {
        createdTodo = result.current.addTodo(todoData)
      })
      
      expect(result.current.todos).toHaveLength(1)
      expect(createdTodo!.title).toBe('Simple task')
      expect(createdTodo!.type).toBe('task') // default
      expect(createdTodo!.status).toBe('pending') // default
      expect(createdTodo!.sourceType).toBe('manual') // default
      expect(createdTodo!.id).toMatch(/^todo-\d+$/)
    })

    it('generates unique IDs for multiple todos', async () => {
      const { result } = renderHook(() => useTodoStore())
      
      // Add delay between todo creation to ensure unique timestamps
      act(() => {
        result.current.addTodo(createMinimalTodo({ title: 'Todo 1' }))
      })
      
      // Wait 1ms to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1))
      
      act(() => {
        result.current.addTodo(createMinimalTodo({ title: 'Todo 2' }))
      })
      
      await new Promise(resolve => setTimeout(resolve, 1))
      
      act(() => {
        result.current.addTodo(createMinimalTodo({ title: 'Todo 3' }))
      })
      
      expect(result.current.todos).toHaveLength(3)
      
      const ids = result.current.todos.map(t => t.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3) // All IDs should be unique
    })

    it('handles different todo types', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const todoTypes: TodoType[] = ['task', 'quest', 'ritual', 'habit', 'routine_item']
      
      act(() => {
        todoTypes.forEach((type, index) => {
          result.current.addTodo(createMinimalTodo({
            title: `${type} example`,
            type,
          }))
        })
      })
      
      expect(result.current.todos).toHaveLength(5)
      todoTypes.forEach(type => {
        const todo = result.current.todos.find(t => t.type === type)
        expect(todo).toBeTruthy()
        expect(todo!.title).toBe(`${type} example`)
      })
    })
  })

  describe('Update Todo', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.addTodo(createMinimalTodo({
          title: 'Original Todo',
          type: 'task',
          status: 'pending',
          importance: 5,
        }))
      })
    })

    it('updates todo fields', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const todoId = result.current.todos[0].id
      const originalUpdatedAt = result.current.todos[0].updatedAt
      
      act(() => {
        result.current.updateTodo(todoId, {
          title: 'Updated Todo',
          importance: 9,
          status: 'in_progress',
          description: 'Added description',
        })
      })
      
      const updatedTodo = result.current.todos[0]
      expect(updatedTodo.title).toBe('Updated Todo')
      expect(updatedTodo.importance).toBe(9)
      expect(updatedTodo.status).toBe('in_progress')
      expect(updatedTodo.description).toBe('Added description')
      expect(updatedTodo.updatedAt).not.toBe(originalUpdatedAt)
    })

    it('preserves unmodified fields when updating', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const todoId = result.current.todos[0].id
      const originalTodo = result.current.todos[0]
      
      act(() => {
        result.current.updateTodo(todoId, {
          title: 'Updated Title Only',
        })
      })
      
      const updatedTodo = result.current.todos[0]
      expect(updatedTodo.title).toBe('Updated Title Only')
      expect(updatedTodo.type).toBe(originalTodo.type)
      expect(updatedTodo.status).toBe(originalTodo.status)
      expect(updatedTodo.importance).toBe(originalTodo.importance)
      expect(updatedTodo.createdAt).toBe(originalTodo.createdAt)
    })

    it('handles non-existent todo ID gracefully', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const originalTodos = [...result.current.todos]
      
      act(() => {
        result.current.updateTodo('non-existent-id', {
          title: 'Should not work',
        })
      })
      
      expect(result.current.todos).toEqual(originalTodos)
    })
  })

  describe('Delete Todo', () => {
    it('deletes a single todo without affecting parent-child relationships', async () => {
      const { result } = renderHook(() => useTodoStore())
      
      let parentTodoId: string
      let child1TodoId: string 
      let child2TodoId: string
      let unrelatedTodoId: string
      
      // Add todos one by one with delays to ensure unique IDs
      await act(async () => {
        const parentTodo = result.current.addTodo({
          title: 'Parent Todo',
          type: 'task',
        })
        parentTodoId = parentTodo.id
        
        // Wait 1ms to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 1))
        
        const child1Todo = result.current.addTodo({
          title: 'Child Todo 1',
          parentId: parentTodo.id,
        })
        child1TodoId = child1Todo.id
        
        await new Promise(resolve => setTimeout(resolve, 1))
        
        const child2Todo = result.current.addTodo({
          title: 'Child Todo 2', 
          parentId: parentTodo.id,
        })
        child2TodoId = child2Todo.id
        
        await new Promise(resolve => setTimeout(resolve, 1))
        
        // Add unrelated todo
        const unrelatedTodo = result.current.addTodo({
          title: 'Unrelated Todo',
        })
        unrelatedTodoId = unrelatedTodo.id
      })
      
      // Should have 4 todos: 1 parent + 2 children + 1 unrelated
      expect(result.current.todos).toHaveLength(4)
      
      act(() => {
        result.current.deleteTodo(unrelatedTodoId)
      })
      
      // After deleting unrelated todo, should have 3 remaining
      expect(result.current.todos).toHaveLength(3)
      expect(result.current.todos.find(t => t.id === unrelatedTodoId)).toBeUndefined()
      
      // Verify parent and children are still there
      expect(result.current.todos.find(t => t.id === parentTodoId)).toBeTruthy()
      expect(result.current.todos.find(t => t.id === child1TodoId)).toBeTruthy()
      expect(result.current.todos.find(t => t.id === child2TodoId)).toBeTruthy()
    })

    it('deletes parent and all children', async () => {
      const { result } = renderHook(() => useTodoStore())
      
      let parentTodoId: string
      let child1TodoId: string 
      let child2TodoId: string
      let unrelatedTodoId: string
      
      // Add todos one by one with delays to ensure unique IDs
      await act(async () => {
        const parentTodo = result.current.addTodo({
          title: 'Parent Todo',
          type: 'task',
        })
        parentTodoId = parentTodo.id
        
        await new Promise(resolve => setTimeout(resolve, 1))
        
        const child1Todo = result.current.addTodo({
          title: 'Child Todo 1',
          parentId: parentTodo.id,
        })
        child1TodoId = child1Todo.id
        
        await new Promise(resolve => setTimeout(resolve, 1))
        
        const child2Todo = result.current.addTodo({
          title: 'Child Todo 2', 
          parentId: parentTodo.id,
        })
        child2TodoId = child2Todo.id
        
        await new Promise(resolve => setTimeout(resolve, 1))
        
        // Add unrelated todo
        const unrelatedTodo = result.current.addTodo({
          title: 'Unrelated Todo',
        })
        unrelatedTodoId = unrelatedTodo.id
      })
      
      // Should start with 4 todos
      expect(result.current.todos).toHaveLength(4)
      
      act(() => {
        result.current.deleteTodo(parentTodoId)
      })
      
      // Should delete parent + 2 children, leaving only unrelated todo
      expect(result.current.todos).toHaveLength(1)
      
      // Verify parent is deleted
      expect(result.current.todos.find(t => t.id === parentTodoId)).toBeUndefined()
      
      // Verify children are deleted
      expect(result.current.todos.find(t => t.id === child1TodoId)).toBeUndefined()
      expect(result.current.todos.find(t => t.id === child2TodoId)).toBeUndefined()
      
      // Verify only unrelated todo remains
      expect(result.current.todos.find(t => t.id === unrelatedTodoId)).toBeTruthy()
    })

    it('handles non-existent todo ID gracefully', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const originalCount = result.current.todos.length
      
      act(() => {
        result.current.deleteTodo('non-existent-id')
      })
      
      expect(result.current.todos).toHaveLength(originalCount)
    })
  })

  describe('Toggle Todo', () => {
    it('toggles pending todo to completed', () => {
      const { result } = renderHook(() => useTodoStore())
      
      let pendingTodoId: string
      
      act(() => {
        const pendingTodo = result.current.addTodo({
          title: 'Pending Todo',
          status: 'pending',
        })
        pendingTodoId = pendingTodo.id
      })
      
      act(() => {
        result.current.toggleTodo(pendingTodoId)
      })
      
      const toggledTodo = result.current.todos.find(t => t.id === pendingTodoId)!
      expect(toggledTodo.status).toBe('completed')
      expect(toggledTodo.completedAt).toBeTruthy()
      expect(new Date(toggledTodo.completedAt!)).toBeInstanceOf(Date)
    })

    it('toggles completed todo to pending', () => {
      const { result } = renderHook(() => useTodoStore())
      
      let completedTodoId: string
      
      act(() => {
        const completedTodo = result.current.addTodo({
          title: 'Completed Todo',
          status: 'completed',
          completedAt: '2024-01-01T12:00:00Z',
        })
        completedTodoId = completedTodo.id
      })
      
      act(() => {
        result.current.toggleTodo(completedTodoId)
      })
      
      const toggledTodo = result.current.todos.find(t => t.id === completedTodoId)!
      expect(toggledTodo.status).toBe('pending')
      // After toggle to pending, completedAt should be undefined
      expect(toggledTodo.completedAt).toBeUndefined()
    })

    it('handles non-existent todo ID gracefully', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const originalTodos = result.current.todos.map(t => ({ ...t }))
      
      act(() => {
        result.current.toggleTodo('non-existent-id')
      })
      
      // Todos should remain unchanged
      expect(result.current.todos).toEqual(originalTodos)
    })
  })

  describe('Clear Completed', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.addTodo(createMinimalTodo({ title: 'Pending 1', status: 'pending' }))
        result.current.addTodo(createMinimalTodo({ title: 'Completed 1', status: 'completed' }))
        result.current.addTodo(createMinimalTodo({ title: 'In Progress', status: 'in_progress' }))
        result.current.addTodo(createMinimalTodo({ title: 'Completed 2', status: 'completed' }))
        result.current.addTodo(createMinimalTodo({ title: 'Deferred', status: 'deferred' }))
        result.current.addTodo(createMinimalTodo({ title: 'Cancelled', status: 'cancelled' }))
      })
    })

    it('removes only completed todos', () => {
      const { result } = renderHook(() => useTodoStore())
      
      expect(result.current.todos).toHaveLength(6)
      
      act(() => {
        result.current.clearCompleted()
      })
      
      expect(result.current.todos).toHaveLength(4)
      
      const remainingStatuses = result.current.todos.map(t => t.status)
      expect(remainingStatuses).toEqual(['pending', 'in_progress', 'deferred', 'cancelled'])
    })

    it('handles empty todo list', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        useTodoStore.setState({ todos: [] })
      })
      
      act(() => {
        result.current.clearCompleted()
      })
      
      expect(result.current.todos).toEqual([])
    })

    it('handles list with no completed todos', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        useTodoStore.setState({ todos: [] })
        result.current.addTodo(createMinimalTodo({ title: 'Pending', status: 'pending' }))
        result.current.addTodo(createMinimalTodo({ title: 'In Progress', status: 'in_progress' }))
      })
      
      act(() => {
        result.current.clearCompleted()
      })
      
      expect(result.current.todos).toHaveLength(2)
    })
  })

  describe('Filtering', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.addTodo({
          title: 'Work Task',
          type: 'task',
          status: 'pending',
          tags: ['work', 'urgent'],
          description: 'Important work task to complete',
        })
        
        result.current.addTodo({
          title: 'Personal Goal',
          type: 'quest',
          status: 'in_progress',
          tags: ['personal', 'health'],
          description: 'Exercise routine for better health',
        })
        
        result.current.addTodo({
          title: 'Daily Habit',
          type: 'habit',
          status: 'completed',
          tags: ['daily', 'personal'],
        })
        
        result.current.addTodo({
          title: 'Work Meeting',
          type: 'routine_item',
          status: 'pending',
          tags: ['work', 'meeting'],
          description: 'Weekly team meeting',
        })
      })
    })

    it('sets and gets filter state', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.setFilter({
          status: 'pending',
          type: 'task',
          tag: 'work',
          searchQuery: 'important',
        })
      })
      
      expect(result.current.filter).toEqual({
        status: 'pending',
        type: 'task',
        tag: 'work',
        searchQuery: 'important',
      })
    })

    it('filters by status', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.setFilter({ status: 'pending' })
      })
      
      const filteredTodos = result.current.getFilteredTodos()
      expect(filteredTodos).toHaveLength(2)
      expect(filteredTodos.every(t => t.status === 'pending')).toBe(true)
    })

    it('filters by type', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.setFilter({ type: 'task' })
      })
      
      const filteredTodos = result.current.getFilteredTodos()
      expect(filteredTodos).toHaveLength(1)
      expect(filteredTodos[0].title).toBe('Work Task')
    })

    it('filters by tag', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.setFilter({ tag: 'work' })
      })
      
      const filteredTodos = result.current.getFilteredTodos()
      expect(filteredTodos).toHaveLength(2)
      expect(filteredTodos.every(t => t.tags?.includes('work'))).toBe(true)
    })

    it('filters by search query in title', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.setFilter({ searchQuery: 'work' })
      })
      
      const filteredTodos = result.current.getFilteredTodos()
      expect(filteredTodos).toHaveLength(2)
      expect(filteredTodos.some(t => t.title.toLowerCase().includes('work'))).toBe(true)
    })

    it('filters by search query in description', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.setFilter({ searchQuery: 'health' })
      })
      
      const filteredTodos = result.current.getFilteredTodos()
      expect(filteredTodos).toHaveLength(1)
      expect(filteredTodos[0].title).toBe('Personal Goal')
    })

    it('filters by multiple criteria (AND logic)', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.setFilter({
          status: 'pending',
          tag: 'work',
        })
      })
      
      const filteredTodos = result.current.getFilteredTodos()
      expect(filteredTodos).toHaveLength(2)
      expect(filteredTodos.every(t => t.status === 'pending' && t.tags?.includes('work'))).toBe(true)
    })

    it('returns all todos when no filter is set', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.setFilter({})
      })
      
      const filteredTodos = result.current.getFilteredTodos()
      expect(filteredTodos).toHaveLength(4)
    })

    it('handles case-insensitive search', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.setFilter({ searchQuery: 'WORK' })
      })
      
      const filteredTodos = result.current.getFilteredTodos()
      expect(filteredTodos.length).toBeGreaterThan(0)
    })

    it('handles todos without tags when filtering by tag', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.addTodo(createMinimalTodo({ title: 'No Tags Todo' }))
      })
      
      act(() => {
        result.current.setFilter({ tag: 'work' })
      })
      
      const filteredTodos = result.current.getFilteredTodos()
      expect(filteredTodos.every(t => t.tags?.includes('work'))).toBe(true)
      expect(filteredTodos.find(t => t.title === 'No Tags Todo')).toBeUndefined()
    })
  })

  describe('Create From Brain Dump', () => {
    it('creates multiple todos from brain dump data', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const brainDumpItems = [
        {
          title: 'Review project proposal',
          type: 'task' as TodoType,
          urgency: 8,
          importance: 9,
          tags: ['work', 'urgent'],
        },
        {
          title: 'Call mom',
          type: 'task' as TodoType,
          urgency: 3,
          importance: 7,
          tags: ['personal', 'family'],
        },
        {
          title: 'Go for a run',
          urgency: 5,
          importance: 6,
          tags: ['health', 'exercise'],
        },
      ]
      
      act(() => {
        result.current.createFromBrainDump('braindump-123', brainDumpItems)
      })
      
      expect(result.current.todos).toHaveLength(3)
      
      // Check first todo
      const todo1 = result.current.todos.find(t => t.title === 'Review project proposal')!
      expect(todo1.type).toBe('task')
      expect(todo1.urgency).toBe(8)
      expect(todo1.importance).toBe(9)
      expect(todo1.tags).toEqual(['work', 'urgent'])
      expect(todo1.sourceType).toBe('braindump')
      expect(todo1.sourceId).toBe('braindump-123')
      expect(todo1.status).toBe('pending')
      
      // Check third todo (type defaults to task)
      const todo3 = result.current.todos.find(t => t.title === 'Go for a run')!
      expect(todo3.type).toBe('task')
      expect(todo3.sourceType).toBe('braindump')
      expect(todo3.sourceId).toBe('braindump-123')
    })

    it('handles empty brain dump items', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.createFromBrainDump('braindump-empty', [])
      })
      
      expect(result.current.todos).toHaveLength(0)
    })

    it('creates todos with minimal data from brain dump', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const brainDumpItems = [
        { title: 'Simple task' },
        { title: 'Another task' },
      ]
      
      act(() => {
        result.current.createFromBrainDump('braindump-simple', brainDumpItems)
      })
      
      expect(result.current.todos).toHaveLength(2)
      
      result.current.todos.forEach(todo => {
        expect(todo.type).toBe('task')
        expect(todo.status).toBe('pending')
        expect(todo.sourceType).toBe('braindump')
        expect(todo.sourceId).toBe('braindump-simple')
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles todos with all possible status values', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const statuses: TodoStatus[] = ['pending', 'in_progress', 'completed', 'deferred', 'cancelled']
      
      act(() => {
        statuses.forEach((status, index) => {
          result.current.addTodo({
            title: `Todo ${index + 1}`,
            status,
          })
        })
      })
      
      expect(result.current.todos).toHaveLength(5)
      statuses.forEach(status => {
        const todo = result.current.todos.find(t => t.status === status)
        expect(todo).toBeTruthy()
      })
    })

    it('handles todos with all possible source types', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const sourceTypes: TodoSourceType[] = ['braindump', 'journal', 'routine', 'manual', 'recurring']
      
      act(() => {
        sourceTypes.forEach((sourceType, index) => {
          result.current.addTodo({
            title: `Todo ${index + 1}`,
            sourceType,
          })
        })
      })
      
      expect(result.current.todos).toHaveLength(5)
      sourceTypes.forEach(sourceType => {
        const todo = result.current.todos.find(t => t.sourceType === sourceType)
        expect(todo).toBeTruthy()
      })
    })

    it('handles todos with boundary priority values', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.addTodo({
          title: 'Min Priority',
          importance: 0,
          urgency: 0,
        })
        
        result.current.addTodo({
          title: 'Max Priority',
          importance: 10,
          urgency: 10,
        })
      })
      
      const minTodo = result.current.todos.find(t => t.title === 'Min Priority')!
      const maxTodo = result.current.todos.find(t => t.title === 'Max Priority')!
      
      expect(minTodo.importance).toBe(0)
      expect(minTodo.urgency).toBe(0)
      expect(maxTodo.importance).toBe(10)
      expect(maxTodo.urgency).toBe(10)
    })

    it('handles todos with empty and undefined tags', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.addTodo({
          title: 'No tags',
        })
        
        result.current.addTodo({
          title: 'Empty tags',
          tags: [],
        })
        
        result.current.addTodo({
          title: 'Undefined tags',
          tags: undefined,
        })
      })
      
      // Filter by non-existent tag should return empty
      act(() => {
        result.current.setFilter({ tag: 'nonexistent' })
      })
      
      const filteredTodos = result.current.getFilteredTodos()
      expect(filteredTodos).toHaveLength(0)
    })

    it('handles very long todo titles and descriptions', () => {
      const { result } = renderHook(() => useTodoStore())
      
      const longTitle = 'A'.repeat(1000)
      const longDescription = 'B'.repeat(5000)
      
      act(() => {
        result.current.addTodo({
          title: longTitle,
          description: longDescription,
        })
      })
      
      const todo = result.current.todos[0]
      expect(todo.title).toBe(longTitle)
      expect(todo.description).toBe(longDescription)
    })
  })

  describe('Complex Scenarios', () => {
    it('handles parent-child relationship workflow', () => {
      const { result } = renderHook(() => useTodoStore())
      
      // Create parent todo
      let parentTodo: Todo
      act(() => {
        parentTodo = result.current.addTodo({
          title: 'Complete Project',
          type: 'quest',
        })
      })
      
      // Create child todos
      act(() => {
        result.current.addTodo({
          title: 'Design phase',
          parentId: parentTodo!.id,
          position: 1,
        })
        
        result.current.addTodo({
          title: 'Development phase',
          parentId: parentTodo!.id,
          position: 2,
        })
        
        result.current.addTodo({
          title: 'Testing phase',
          parentId: parentTodo!.id,
          position: 3,
        })
      })
      
      expect(result.current.todos).toHaveLength(4)
      
      const childTodos = result.current.todos.filter(t => t.parentId === parentTodo!.id)
      expect(childTodos).toHaveLength(3)
      
      // Verify positions
      childTodos.forEach(child => {
        expect(child.position).toBeGreaterThan(0)
        expect(child.position).toBeLessThanOrEqual(3)
      })
    })

    it('handles scheduled todo workflow', () => {
      const { result } = renderHook(() => useTodoStore())
      
      act(() => {
        result.current.addTodo({
          title: 'Important Meeting',
          type: 'routine_item',
          dueDate: '2024-01-15',
          scheduledDate: '2024-01-15',
          scheduledTime: '14:00',
          scheduledDuration: 60,
          importance: 9,
          urgency: 8,
        })
      })
      
      const scheduledTodo = result.current.todos[0]
      expect(scheduledTodo.dueDate).toBe('2024-01-15')
      expect(scheduledTodo.scheduledDate).toBe('2024-01-15')
      expect(scheduledTodo.scheduledTime).toBe('14:00')
      expect(scheduledTodo.scheduledDuration).toBe(60)
      
      // Complete the scheduled todo
      act(() => {
        result.current.updateTodo(scheduledTodo.id, {
          status: 'completed',
          completionNotes: 'Meeting went well, all objectives achieved',
        })
      })
      
      const completedTodo = result.current.todos[0]
      expect(completedTodo.status).toBe('completed')
      expect(completedTodo.completionNotes).toBe('Meeting went well, all objectives achieved')
    })

    it('handles bulk operations and filtering workflow', () => {
      const { result } = renderHook(() => useTodoStore())
      
      // Create a mix of todos
      act(() => {
        // Work todos
        for (let i = 1; i <= 5; i++) {
          result.current.addTodo({
            title: `Work Task ${i}`,
            type: 'task',
            tags: ['work'],
            status: i <= 2 ? 'completed' : 'pending',
          })
        }
        
        // Personal todos
        for (let i = 1; i <= 3; i++) {
          result.current.addTodo({
            title: `Personal Task ${i}`,
            type: 'habit',
            tags: ['personal'],
            status: i === 1 ? 'completed' : 'pending',
          })
        }
      })
      
      expect(result.current.todos).toHaveLength(8)
      
      // Filter work todos
      act(() => {
        result.current.setFilter({ tag: 'work' })
      })
      
      let filtered = result.current.getFilteredTodos()
      expect(filtered).toHaveLength(5)
      
      // Filter pending work todos
      act(() => {
        result.current.setFilter({ tag: 'work', status: 'pending' })
      })
      
      filtered = result.current.getFilteredTodos()
      expect(filtered).toHaveLength(3)
      
      // Clear completed todos
      act(() => {
        result.current.setFilter({}) // Clear filter first
        result.current.clearCompleted()
      })
      
      expect(result.current.todos).toHaveLength(5) // 3 work + 2 personal pending
      
      // Verify no completed todos remain
      const completedTodos = result.current.todos.filter(t => t.status === 'completed')
      expect(completedTodos).toHaveLength(0)
    })
  })
})
