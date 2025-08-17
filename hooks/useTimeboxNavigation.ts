import { useCallback } from 'react'
import { useTimeboxActions } from '@/hooks/useTimeboxSelectors'
import dayjs from '@/lib/dayjs'

export function useTimeboxNavigation() {
  const { setSelectedDate, loadTimeboxData } = useTimeboxActions()

  const goToPreviousDay = useCallback((currentDate: string) => {
    const newDate = dayjs(currentDate).subtract(1, 'day').format('YYYY-MM-DD')
    setSelectedDate(newDate)
    return newDate
  }, [setSelectedDate])
  
  const goToNextDay = useCallback((currentDate: string) => {
    const newDate = dayjs(currentDate).add(1, 'day').format('YYYY-MM-DD')
    setSelectedDate(newDate)
    return newDate
  }, [setSelectedDate])
  
  const goToToday = useCallback(() => {
    const today = dayjs().format('YYYY-MM-DD')
    setSelectedDate(today)
    return today
  }, [setSelectedDate])
  
  const copyIncompleteTasks = useCallback(async (userId: string, selectedDate: string, timeSlots: any[]) => {
    const today = dayjs().format('YYYY-MM-DD')
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
    
    if (selectedDate !== tomorrow) return 0
    
    try {
      // Load today's timebox data
      await loadTimeboxData(userId, today)
      
      // Get incomplete tasks from today
      const incompleteTasks = timeSlots.flatMap(slot => 
        slot.tasks.filter((task: any) => 
          task.status !== 'completed' && 
          !task.isCalendarEvent // Don't copy calendar events
        )
      )
      
      // Switch back to tomorrow
      await loadTimeboxData(userId, tomorrow)
      
      // Add tasks to unscheduled pool for tomorrow
      // They can then be scheduled as needed
      // Tasks with nodeIds will be picked up through the node pool
      
      return incompleteTasks.length
    } catch (error) {
      throw new Error('Failed to copy tasks from today')
    }
  }, [loadTimeboxData])

  return {
    goToPreviousDay,
    goToNextDay,
    goToToday,
    copyIncompleteTasks
  }
}
