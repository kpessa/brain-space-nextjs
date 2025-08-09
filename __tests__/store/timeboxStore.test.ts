import { act, renderHook } from '@testing-library/react'
import { useTimeboxStore } from '@/store/timeboxStore'
import { format } from 'date-fns'

describe('TimeboxStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTimeboxStore.setState({
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      timeSlots: [],
      draggedTask: null,
      hoveredSlotId: null,
      calendarEvents: [],
      calendarSyncEnabled: false,
      timeInterval: 120,
      showPastSlots: false,
    })
  })

  describe('Task Management', () => {
    it('adds task to slot', () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      // Initialize with a slot
      act(() => {
        result.current.initializeTimeSlots(120)
      })

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

      act(() => {
        result.current.addTaskToSlot(task, slotId)
      })

      const updatedSlot = result.current.timeSlots.find(s => s.id === slotId)
      expect(updatedSlot?.tasks).toHaveLength(1)
      expect(updatedSlot?.tasks[0]).toMatchObject(task)
    })

    it('removes task from slot', () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      // Setup initial state with task
      const task = {
        id: 'task-1',
        label: 'Test Task',
        nodeId: 'node-1',
      }
      
      act(() => {
        result.current.initializeTimeSlots(120)
        const slotId = result.current.timeSlots[0].id
        result.current.addTaskToSlot(task, slotId)
      })

      const slotId = result.current.timeSlots[0].id

      act(() => {
        result.current.removeTaskFromSlot('task-1', slotId)
      })

      const updatedSlot = result.current.timeSlots.find(s => s.id === slotId)
      expect(updatedSlot?.tasks).toHaveLength(0)
    })

    it('updates task in slot', () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      const task = {
        id: 'task-1',
        label: 'Test Task',
        status: 'pending' as const,
      }
      
      act(() => {
        result.current.initializeTimeSlots(120)
        const slotId = result.current.timeSlots[0].id
        result.current.addTaskToSlot(task, slotId)
      })

      const slotId = result.current.timeSlots[0].id

      act(() => {
        result.current.updateTaskInSlot('task-1', slotId, {
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

      // 24 hours * 60 minutes / 30 minutes = 48 slots
      expect(result.current.timeSlots).toHaveLength(48)
      
      act(() => {
        result.current.initializeTimeSlots(60)
      })

      // 24 hours * 60 minutes / 60 minutes = 24 slots
      expect(result.current.timeSlots).toHaveLength(24)
      
      act(() => {
        result.current.initializeTimeSlots(120)
      })

      // 24 hours * 60 minutes / 120 minutes = 12 slots
      expect(result.current.timeSlots).toHaveLength(12)
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

    it('toggles calendar sync', () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      expect(result.current.calendarSyncEnabled).toBe(false)

      act(() => {
        result.current.setCalendarSyncEnabled(true)
      })

      expect(result.current.calendarSyncEnabled).toBe(true)
    })

    it('sets time interval', () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      act(() => {
        result.current.setTimeInterval(30)
      })

      expect(result.current.timeInterval).toBe(30)
    })

    it('toggles show past slots', () => {
      const { result } = renderHook(() => useTimeboxStore())
      
      expect(result.current.showPastSlots).toBe(false)

      act(() => {
        result.current.setShowPastSlots(true)
      })

      expect(result.current.showPastSlots).toBe(true)
    })
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