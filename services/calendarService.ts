/**
 * Calendar service for handling Google Calendar operations
 * Separated from components for better separation of concerns and React Query integration
 */

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: {
    calendarId: string
    calendarName: string
    backgroundColor: string
    foregroundColor: string
    originalEvent: any
  }
}

export interface Calendar {
  id: string
  summary: string
  backgroundColor: string
  foregroundColor: string
}

export class CalendarService {
  /**
   * Load calendars using the Google Calendar hook
   */
  static async loadCalendars(getCalendars: () => Promise<any[]>): Promise<Calendar[]> {
    try {
      const calendarList = await getCalendars()
      return calendarList as Calendar[]
    } catch (error) {
      throw new Error('Failed to load calendars')
    }
  }

  /**
   * Load events for selected calendars
   */
  static async loadEvents(
    calendars: Calendar[],
    selectedCalendarIds: Set<string>,
    getEvents: (calendarId: string, timeMin: Date, timeMax: Date) => Promise<any[]>,
    dateRange?: { start: Date; end: Date }
  ): Promise<CalendarEvent[]> {
    try {
      // Default date range: 1 month ago to 3 months ahead
      const timeMin = dateRange?.start || (() => {
        const date = new Date()
        date.setMonth(date.getMonth() - 1)
        return date
      })()
      const timeMax = dateRange?.end || (() => {
        const date = new Date()
        date.setMonth(date.getMonth() + 3)
        return date
      })()

      // Filter calendars based on selection
      const calendarsToLoad = selectedCalendarIds.size > 0 
        ? calendars.filter(cal => selectedCalendarIds.has(cal.id))
        : calendars // If none selected, show all

      // Load events from all calendars in parallel
      const eventPromises = calendarsToLoad.map(async (calendar) => {
        try {
          const calendarEvents = await getEvents(calendar.id, timeMin, timeMax)
          
          // Transform events to the expected format
          return calendarEvents.map((event: any) => ({
            id: event.id,
            title: event.summary || 'Untitled',
            start: event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date),
            end: event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date),
            allDay: !event.start.dateTime,
            resource: {
              calendarId: calendar.id,
              calendarName: calendar.summary,
              backgroundColor: calendar.backgroundColor,
              foregroundColor: calendar.foregroundColor,
              originalEvent: event,
            },
          }))
        } catch (error) {
          // Error loading events from calendar
          return [] // Return empty array on error
        }
      })

      // Wait for all promises to resolve/reject
      const eventArrays = await Promise.allSettled(eventPromises)
      
      // Flatten successful results
      const allEvents: CalendarEvent[] = []
      eventArrays.forEach((result) => {
        if (result.status === 'fulfilled') {
          allEvents.push(...result.value)
        }
      })

      return allEvents
    } catch (error) {
      throw new Error('Failed to load calendar events')
    }
  }

  /**
   * Generate query key for React Query
   */
  static getCalendarsQueryKey(): string[] {
    return ['calendars']
  }

  static getEventsQueryKey(
    selectedCalendarIds: Set<string>, 
    currentDate: Date
  ): (string | number | Date)[] {
    return ['events', Array.from(selectedCalendarIds).sort(), currentDate.toISOString()]
  }
}
