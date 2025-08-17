/**
 * React Query hooks for calendar data management
 * Provides optimized data fetching, caching, and state management for calendar operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarService, Calendar, CalendarEvent } from '@/services/calendarService'
import { useGoogleCalendar } from './useGoogleCalendar'
import { useCalendarStore } from '@/store/calendarStore'

/**
 * Hook to fetch and manage calendars with React Query
 */
export function useCalendars() {
  const { getCalendars, isConnected } = useGoogleCalendar()
  const { setCalendars } = useCalendarStore()
  
  return useQuery({
    queryKey: CalendarService.getCalendarsQueryKey(),
    queryFn: async (): Promise<Calendar[]> => {
      const calendars = await CalendarService.loadCalendars(getCalendars)
      setCalendars(calendars) // Update store
      return calendars
    },
    enabled: isConnected && typeof window !== 'undefined', // Only run when connected and on client
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to fetch and manage calendar events with React Query
 */
export function useCalendarEvents(
  calendars: Calendar[],
  selectedCalendarIds: Set<string>,
  currentDate: Date,
  dateRange?: { start: Date; end: Date }
) {
  const { getEvents, isConnected } = useGoogleCalendar()
  
  return useQuery({
    queryKey: CalendarService.getEventsQueryKey(selectedCalendarIds, currentDate),
    queryFn: async (): Promise<CalendarEvent[]> => {
      return await CalendarService.loadEvents(
        calendars,
        selectedCalendarIds,
        getEvents,
        dateRange
      )
    },
    enabled: isConnected && calendars.length > 0 && typeof window !== 'undefined', // Only run when connected, calendars loaded, and on client
    staleTime: 2 * 60 * 1000, // 2 minutes for events (more dynamic)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    // Refetch when user navigates to different date ranges
    refetchOnMount: true,
  })
}

/**
 * Hook for calendar connection management
 */
export function useCalendarConnection() {
  const { connect, isConnected, isLoading } = useGoogleCalendar()
  const queryClient = useQueryClient()
  
  const connectMutation = useMutation({
    mutationFn: async (): Promise<boolean> => {
      const success = await connect()
      if (success) {
        // Invalidate all calendar queries to refetch data
        await queryClient.invalidateQueries({ queryKey: ['calendars'] })
        await queryClient.invalidateQueries({ queryKey: ['events'] })
      }
      return success
    },
    onError: (error) => {
      // Failed to connect to Google Calendar
    },
  })
  
  return {
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    isConnected,
    isLoading,
    error: connectMutation.error,
  }
}

/**
 * Hook to invalidate calendar queries (useful for manual refresh)
 */
export function useCalendarRefresh() {
  const queryClient = useQueryClient()
  
  const refreshCalendars = () => {
    queryClient.invalidateQueries({ queryKey: ['calendars'] })
  }
  
  const refreshEvents = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] })
  }
  
  const refreshAll = () => {
    refreshCalendars()
    refreshEvents()
  }
  
  return {
    refreshCalendars,
    refreshEvents,
    refreshAll,
  }
}
