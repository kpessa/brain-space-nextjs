import { useTimeboxStore } from '@/store/timeboxStore'
import { useUserPreferencesStore } from '@/store/userPreferencesStore'
import { useMemo } from 'react'

// Selector hooks for optimized performance
export const useTimeSlots = () => {
  const timeSlots = useTimeboxStore((state) => state.timeSlots)
  console.log('🎯 useTimeSlots: Selector called', { 
    timeSlotsCount: timeSlots?.length, 
    timestamp: new Date().toISOString() 
  })
  return timeSlots
}

export const useSelectedDate = () => {
  const selectedDate = useTimeboxStore((state) => state.selectedDate)
  console.log('📅 useSelectedDate: Selector called', { 
    selectedDate, 
    timestamp: new Date().toISOString() 
  })
  return selectedDate
}

export const useHoveredSlotId = () => {
  const hoveredSlotId = useTimeboxStore((state) => state.hoveredSlotId)
  console.log('🎯 useHoveredSlotId: Selector called', { 
    hoveredSlotId, 
    timestamp: new Date().toISOString() 
  })
  return hoveredSlotId
}

// Get these from the correct stores
export const useCalendarEvents = () => []
export const useCalendarSyncEnabled = () => {
  const calendarSyncEnabled = useUserPreferencesStore((state) => state.calendarSyncEnabled)
  console.log('📅 useCalendarSyncEnabled: Selector called', { 
    calendarSyncEnabled, 
    timestamp: new Date().toISOString() 
  })
  return calendarSyncEnabled
}

export const useTimeInterval = () => {
  const timeInterval = useUserPreferencesStore((state) => state.getEffectiveTimeboxInterval())
  console.log('⏰ useTimeInterval: Selector called', { 
    timeInterval, 
    timestamp: new Date().toISOString() 
  })
  return timeInterval
}

export const useShowPastSlots = () => false // Component manages this locally

// Actions
export const useTimeboxActions = () => {
  console.log('🔧 useTimeboxActions: Hook called', { timestamp: new Date().toISOString() })
  
  const store = useTimeboxStore()
  const userPrefsStore = useUserPreferencesStore()
  
  return useMemo(() => {
    console.log('🔧 useTimeboxActions: Creating actions object', { timestamp: new Date().toISOString() })
    
    return {
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
      setCalendarSyncEnabled: (enabled: boolean) => userPrefsStore.updateUserSettings({ calendarSyncEnabled: enabled }),
      setTimeInterval: (interval: 30 | 60 | 120) => userPrefsStore.setTimeboxInterval(interval),
      // These don't exist in either store - return no-ops
      setShowPastSlots: () => {}, // Component manages this locally
      loadCalendarEvents: async () => {}, // Not implemented yet
    }
  }, [store, userPrefsStore])
}

// Computed selectors
export const useTimeSlotsWithCalendarEvents = () => {
  console.log('📊 useTimeSlotsWithCalendarEvents: Hook called', { timestamp: new Date().toISOString() })
  
  const timeSlots = useTimeSlots()
  
  return useMemo(() => {
    console.log('📊 useTimeSlotsWithCalendarEvents: Computing result', { 
      timeSlotsCount: timeSlots?.length, 
      timestamp: new Date().toISOString() 
    })

    // For now, just return timeSlots as calendar integration is not properly set up
    return timeSlots
  }, [timeSlots])
}

// Selector for slot statistics
export const useTimeboxStats = () => {
  console.log('📈 useTimeboxStats: Hook called', { timestamp: new Date().toISOString() })
  
  const timeSlots = useTimeSlotsWithCalendarEvents()
  
  return useMemo(() => {
    console.log('📈 useTimeboxStats: Computing stats', { 
      timeSlotsCount: timeSlots?.length, 
      timestamp: new Date().toISOString() 
    })
    
    const totalScheduledTasks = timeSlots.reduce((sum, slot) => sum + slot.tasks.length, 0)
    const completedTasks = timeSlots.reduce((sum, slot) => 
      sum + slot.tasks.filter(t => t.status === 'completed').length, 0
    )
    const totalSlots = timeSlots.length
    const occupiedSlots = timeSlots.filter(slot => slot.tasks.length > 0).length
    
    const stats = {
      totalScheduledTasks,
      completedTasks,
      totalSlots,
      occupiedSlots,
      completionRate: totalScheduledTasks > 0 ? (completedTasks / totalScheduledTasks) * 100 : 0,
    }
    
    console.log('📈 useTimeboxStats: Stats computed', { stats, timestamp: new Date().toISOString() })
    return stats
  }, [timeSlots])
}