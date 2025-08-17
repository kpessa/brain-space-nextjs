import { useState, useCallback } from 'react'
import { type TimeboxTask } from '@/store/timeboxStore'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { useCalendarStore } from '@/store/calendarStore'
import dayjs from '@/lib/dayjs'

export function useTimeboxCalendar(userId: string, selectedDate: string | null) {
  const [calendarEvents, setCalendarEvents] = useState<TimeboxTask[]>([])
  const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null)
  const { selectedCalendarIds } = useCalendarStore()
  const { getEvents } = useGoogleCalendar()

  const loadCalendarEvents = useCallback(async () => {
    try {
      setCalendarSyncError(null)
      
      // Validate selectedDate before using it
      if (!selectedDate) {
        return
      }

      const dateObj = new Date(selectedDate)
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        setCalendarSyncError('Invalid date selected')
        return
      }

      const startTime = dayjs(dateObj).startOf('day').toDate()
      const endTime = dayjs(dateObj).endOf('day').toDate()
      
      const allEvents: TimeboxTask[] = []
      let hasError = false
      
      // Get calendars to fetch from
      const calendarsToLoad = selectedCalendarIds.size > 0 
        ? Array.from(selectedCalendarIds)
        : ['primary']
      
      for (const calendarId of calendarsToLoad) {
        try {
          const events = await getEvents(
            calendarId,
            startTime,
            endTime
          )
          
          // Convert calendar events to TimeboxTask format
          const calendarTasks = events.map(event => {
            const startDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!)
            const endDate = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date!)
            
            return {
              id: `cal-${event.id}`,
              label: event.summary || 'Untitled Event',
              calendarEventId: event.id,
              calendarId: calendarId,
              calendarSummary: event.description,
              calendarLocation: (event as any).location,
              isCalendarEvent: true,
              timeboxStartTime: dayjs(startDate).format('HH:mm'),
              timeboxDuration: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)),
              timeboxDate: selectedDate,
              userId: userId,
              status: 'pending' as const,
            } as TimeboxTask
          })
          
          allEvents.push(...calendarTasks)
        } catch (error) {
          hasError = true
          // Show user-friendly error message
          if (error instanceof Error) {
            setCalendarSyncError(`Failed to load calendar: ${error.message}`)
          } else {
            setCalendarSyncError('Failed to load calendar events')
          }
        }
      }
      
      setCalendarEvents(allEvents)
    } catch (error) {
      setCalendarEvents([])
      setCalendarSyncError('Failed to sync with calendar')
    }
  }, [selectedDate, selectedCalendarIds, getEvents, userId])

  return {
    calendarEvents,
    calendarSyncError,
    setCalendarSyncError,
    loadCalendarEvents
  }
}
