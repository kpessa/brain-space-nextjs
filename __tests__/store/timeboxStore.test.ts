import { act, renderHook } from '@testing-library/react'
import { useTimeboxStore } from '@/store/timeboxStore'
import dayjs from 'dayjs'

describe('TimeboxStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTimeboxStore.setState({
      selectedDate: dayjs().format('YYYY-MM-DD'),
      timeSlots: [],
      draggedTask: null,
      hoveredSlotId: null,
      calendarEvents: [],
    })
  })

  describe('Task Management', () => {
    it('adds task to slot', async () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      // Store should already have slots initialized
      expect(result.current.timeSlots.length).toBeGreaterThan(0)

      const task = {
        id: 'task-1',
        label: 'Test Task',
        nodeId: 'node-1',
        importance: 8,
        urgency: 7,
        category: 'task' as const,
        userId: 'user-1',
        timeboxDate: '2024-01-01',
      }

      const slotId = result.current.timeSlots[0].id

      await act(async () => {
        await result.current.addTaskToSlot(task, slotId)
      })

      const updatedSlot = result.current.timeSlots.find(s => s.id === slotId)
      expect(updatedSlot?.tasks).toHaveLength(1)
      expect(updatedSlot?.tasks[0]).toMatchObject(task)
    })

    it('removes task from slot', async () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      // Setup initial state with task
      const task = {
        id: 'task-1',
        label: 'Test Task',
        nodeId: 'node-1',
      }
      
      const slotId = result.current.timeSlots[0].id
      
      await act(async () => {
        await result.current.addTaskToSlot(task, slotId)
      })

      await act(async () => {
        await result.current.removeTaskFromSlot('task-1', slotId)
      })

      const updatedSlot = result.current.timeSlots.find(s => s.id === slotId)
      expect(updatedSlot?.tasks).toHaveLength(0)
    })

    it('updates task in slot', async () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      const task = {
        id: 'task-1',
        label: 'Test Task',
        status: 'pending' as const,
      }
      
      const slotId = result.current.timeSlots[0].id
      
      await act(async () => {
        await result.current.addTaskToSlot(task, slotId)
      })

      await act(async () => {
        await result.current.updateTaskInSlot('task-1', {
          status: 'completed',
          label: 'Updated Task',
        })
      })

      const updatedSlot = result.current.timeSlots.find(s => s.id === slotId)
      const updatedTask = updatedSlot?.tasks[0]
      
      expect(updatedTask?.status).toBe('completed')
      expect(updatedTask?.label).toBe('Updated Task')
    })

    it('moves task between slots', () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      const task = {
        id: 'task-1',
        label: 'Test Task',
      }
      
      act(() => {
        result.current.initializeTimeSlots(120)
      })

      const fromSlotId = result.current.timeSlots[0].id
      const toSlotId = result.current.timeSlots[1].id

      act(() => {
        result.current.addTaskToSlot(task, fromSlotId)
      })

      act(() => {
        result.current.moveTaskBetweenSlots('task-1', fromSlotId, toSlotId)
      })

      const fromSlot = result.current.timeSlots.find(s => s.id === fromSlotId)
      const toSlot = result.current.timeSlots.find(s => s.id === toSlotId)
      
      expect(fromSlot?.tasks).toHaveLength(0)
      expect(toSlot?.tasks).toHaveLength(1)
      expect(toSlot?.tasks[0].id).toBe('task-1')
    })
  })

  describe('Slot Management', () => {
    it('initializes time slots with correct interval', () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      act(() => {
        result.current.initializeTimeSlots(30)
      })

      // 16 hours (6am-10pm) * 60 minutes / 30 minutes = 32 slots
      expect(result.current.timeSlots).toHaveLength(32)
      
      act(() => {
        result.current.initializeTimeSlots(60)
      })

      // 16 hours (6am-10pm) * 60 minutes / 60 minutes = 16 slots
      expect(result.current.timeSlots).toHaveLength(16)
      
      act(() => {
        result.current.initializeTimeSlots(120)
      })

      // 16 hours (6am-10pm) * 60 minutes / 120 minutes = 8 slots
      expect(result.current.timeSlots).toHaveLength(8)
    })

    it('blocks and unblocks time slot', () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      act(() => {
        result.current.initializeTimeSlots(120)
      })

      const slotId = result.current.timeSlots[0].id

      act(() => {
        result.current.blockTimeSlot(slotId, 'meeting', 'Team Standup')
      })

      let slot = result.current.timeSlots.find(s => s.id === slotId)
      expect(slot?.isBlocked).toBe(true)
      expect(slot?.blockReason).toBe('meeting')
      expect(slot?.blockLabel).toBe('Team Standup')

      act(() => {
        result.current.unblockTimeSlot(slotId)
      })

      slot = result.current.timeSlots.find(s => s.id === slotId)
      expect(slot?.isBlocked).toBe(false)
      expect(slot?.blockReason).toBeUndefined()
    })
  })

  describe('Date and Settings', () => {
    it('sets selected date', () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      act(() => {
        result.current.setSelectedDate('2024-12-25')
      })

      expect(result.current.selectedDate).toBe('2024-12-25')
    })

    // Note: Calendar sync, time interval, and show past slots functionality
    // has been removed or changed in the current implementation
  })

  describe('Drag and Drop', () => {
    it('sets dragged task', () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      const task = {
        id: 'task-1',
        label: 'Dragged Task',
      }

      act(() => {
        result.current.setDraggedTask(task)
      })

      expect(result.current.draggedTask).toEqual(task)
    })

    it('sets hovered slot id', () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      act(() => {
        result.current.setHoveredSlotId('slot-1')
      })

      expect(result.current.hoveredSlotId).toBe('slot-1')
    })
  })
})