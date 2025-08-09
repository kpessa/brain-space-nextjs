import { useTimeboxStore } from '@/store/timeboxStore'
import { useUserPreferencesStore } from '@/store/userPreferencesStore'
import { useMemo } from 'react'

// Selector hooks for optimized performance
export const useTimeSlots = () => useTimeboxStore((state) => state.timeSlots)
export const useSelectedDate = () => useTimeboxStore((state) => state.selectedDate)
export const useHoveredSlotId = () => useTimeboxStore((state) => state.hoveredSlotId)

// Get these from the correct stores
export const useCalendarEvents = () => []
export const useCalendarSyncEnabled = () => useUserPreferencesStore((state) => state.calendarSyncEnabled)
export const useTimeInterval = () => useUserPreferencesStore((state) => state.getEffectiveTimeboxInterval())
export const useShowPastSlots = () => false // Component manages this locally

// Actions
export const useTimeboxActions = () => {
  const store = useTimeboxStore()
  const userPrefsStore = useUserPreferencesStore()
  
  return useMemo(() => ({
    // Timebox store actions
    addTaskToSlot: store.addTaskToSlot,
    removeTaskFromSlot: store.removeTaskFromSlot,
    updateTaskInSlot: store.updateTaskInSlot,
    moveTaskBetweenSlots: store.moveTaskBetweenSlots,
    blockTimeSlot: store.blockTimeSlot,
    unblockTimeSlot: store.unblockTimeSlot,
    setSelectedDate: store.setSelectedDate,
    setHoveredSlotId: store.setHoveredSlotId,
    initializeTimeSlots: store.initializeTimeSlots,
    loadTimeboxData: store.loadTimeboxData,
    saveTimeboxData: store.saveTimeboxData,
    // User preferences actions (calendar sync managed by user prefs)
    setCalendarSyncEnabled: (enabled: boolean) => userPrefsStore.updateSettings({ calendarSyncEnabled: enabled }),
    setTimeInterval: (interval: 30 | 60 | 120) => userPrefsStore.setTimeboxInterval(interval),
    // These don't exist in either store - return no-ops
    setShowPastSlots: () => {}, // Component manages this locally
    loadCalendarEvents: async () => {}, // Not implemented yet
  }), [store, userPrefsStore])
}

// Computed selectors
export const useTimeSlotsWithCalendarEvents = () => {
  const timeSlots = useTimeSlots()
  
  return useMemo(() => {

    // For now, just return timeSlots as calendar integration is not properly set up
    return timeSlots
  }, [timeSlots])
}

// Selector for slot statistics
export const useTimeboxStats = () => {
  const timeSlots = useTimeSlotsWithCalendarEvents()
  
  return useMemo(() => {
    const totalScheduledTasks = timeSlots.reduce((sum, slot) => sum + slot.tasks.length, 0)
    const completedTasks = timeSlots.reduce((sum, slot) => 
      sum + slot.tasks.filter(t => t.status === 'completed').length, 0
    )
    const totalSlots = timeSlots.length
    const occupiedSlots = timeSlots.filter(slot => slot.tasks.length > 0).length
    
    return {
      totalScheduledTasks,
      completedTasks,
      totalSlots,
      occupiedSlots,
      completionRate: totalScheduledTasks > 0 ? (completedTasks / totalScheduledTasks) * 100 : 0,
    }
  }, [timeSlots])
}