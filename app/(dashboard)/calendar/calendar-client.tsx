'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { useCalendars, useCalendarEvents, useCalendarConnection, useCalendarRefresh } from '@/hooks/useCalendarData'
import { EightWeekViewComponent } from '@/components/calendar/EightWeekView'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Settings, TrendingUp, RefreshCw } from 'lucide-react'
import { useCalendarStore } from '@/store/calendarStore'
import { CalendarStatusDialog } from '@/components/calendar/CalendarStatusDialog'
import { format } from 'date-fns'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// NoSSR wrapper for client-only content
function NoSSR({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  if (!isMounted) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brain-600"></div>
      </div>
    )
  }
  
  return <>{children}</>
}

export default function CalendarClient({ userId }: { userId: string }) {
  const router = useRouter()
  const { selectedCalendarIds, setIsAuthenticated } = useCalendarStore()
  const [isClient, setIsClient] = useState(false)
  const [currentDate, setCurrentDate] = useState(() => {
    // Use a stable date during SSR to prevent hydration mismatch
    if (typeof window === 'undefined') {
      // Return a stable date for SSR
      return new Date('2024-01-01T00:00:00.000Z')
    }
    return new Date()
  })
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  
  // Only initialize Google Calendar after client hydration
  const { isConnected, isLoading: googleCalendarLoading } = useGoogleCalendar()
  
  // React Query hooks for data management
  const { connect, isConnecting, error: connectionError } = useCalendarConnection()
  const { data: calendars = [], isLoading: calendarsLoading, error: calendarsError } = useCalendars()
  
  // Memoize date range to prevent unnecessary refetches - use proper date cloning
  const dateRange = useMemo(() => {
    // Create new date instances to avoid mutation
    const start = new Date(currentDate.getTime())
    start.setMonth(start.getMonth() - 1)
    const end = new Date(currentDate.getTime())
    end.setMonth(end.getMonth() + 3)
    return { start, end }
  }, [currentDate])
  
  const { 
    data: events = [], 
    isLoading: eventsLoading, 
    error: eventsError 
  } = useCalendarEvents(calendars, selectedCalendarIds, currentDate, dateRange)
  
  const { refreshAll } = useCalendarRefresh()
  
  // Combined loading state
  const isLoading = googleCalendarLoading || calendarsLoading || eventsLoading

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
    // Set the actual current date once client is hydrated
    setCurrentDate(new Date())
  }, [])

  // Update calendar store when connection status changes
  useEffect(() => {
    setIsAuthenticated(isConnected)
  }, [isConnected, setIsAuthenticated])

  const handleAuthorize = () => {
    connect()
  }

  // Error display helper
  const renderError = (error: Error | null, context: string) => {
    if (!error) return null
    
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <h4 className="text-red-800 font-medium">{context} Error</h4>
        <p className="text-red-700 text-sm">{error.message}</p>
        <button 
          onClick={refreshAll}
          className="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    )
  }

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate)
  }

  const handleSelectEvent = (event: any) => {
    // Selected event
    // TODO: Show event details modal
  }

  const handleSelectSlot = (slotInfo: any) => {
    // Selected slot
    // TODO: Show create event modal
  }

  const eventPropGetter = (event: any) => {
    // Get calendar color if available
    const calendar = calendars.find(c => c.id === event.resource?.calendarId)
    const backgroundColor = calendar?.backgroundColor || '#3174ad'
    
    return {
      style: {
        backgroundColor,
        borderColor: backgroundColor,
      },
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const goToPrevious = () => {
    // Use proper date cloning to avoid mutation
    const newDate = new Date(currentDate.getTime())
    newDate.setDate(newDate.getDate() - 56) // 8 weeks
    setCurrentDate(newDate)
  }

  const goToNext = () => {
    // Use proper date cloning to avoid mutation
    const newDate = new Date(currentDate.getTime())
    newDate.setDate(newDate.getDate() + 56) // 8 weeks
    setCurrentDate(newDate)
  }

  // Show loading state until client-side hydration
  if (!isClient) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brain-600"></div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="h-8 w-8 text-brain-600" />
              <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            </div>
            
            <NoSSR>
              <div className="flex items-center space-x-2">
                {isConnected && (
                  <>
                    <button
                      onClick={refreshAll}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Refresh Calendar Data"
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => setShowStatusDialog(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      title="PTO Planning"
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span>PTO Planning</span>
                    </button>
                    <button
                      onClick={() => router.push('/calendar/settings')}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Calendar Settings"
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {/* TODO: Show create event modal */}}
                      className="flex items-center space-x-2 px-4 py-2 bg-brain-600 text-white rounded-lg hover:bg-brain-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>New Event</span>
                    </button>
                  </>
                )}
              </div>
            </NoSSR>
          </div>

        <NoSSR>
          {/* Error Display */}
          {renderError(connectionError as Error, 'Connection')}
          {renderError(calendarsError as Error, 'Calendar Loading')}
          {renderError(eventsError as Error, 'Events Loading')}

          {!isConnected && !isLoading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                Connect Your Google Calendar
              </h3>
              <p className="text-yellow-800 mb-4">
                Authorize Brain Space to access your Google Calendar to view and manage your events.
              </p>
              <button
                onClick={handleAuthorize}
                disabled={isConnecting}
                className="px-6 py-2 bg-brain-600 text-white rounded-lg hover:bg-brain-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-2" />
                    Connecting...
                  </>
                ) : (
                  'Connect Google Calendar'
                )}
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brain-600"></div>
            </div>
          )}

          {isConnected && !isLoading && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPrevious}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Previous 8 weeks"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={goToNext}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Next 8 weeks"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="text-lg font-semibold text-gray-900" suppressHydrationWarning>
                  {format(currentDate, 'MMMM yyyy')}
                </div>
              </div>

              {/* Calendar selection indicator */}
              {selectedCalendarIds.size > 0 && selectedCalendarIds.size < calendars.length && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-blue-800" suppressHydrationWarning>
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      Showing {selectedCalendarIds.size} of {calendars.length} calendars
                    </span>
                  </div>
                  <button
                    onClick={() => router.push('/calendar/settings')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Change selection
                  </button>
                </div>
              )}

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <EightWeekViewComponent
                  date={currentDate}
                  events={events}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  eventPropGetter={eventPropGetter}
                  onNavigate={handleNavigate}
                />
              </div>
            </>
          )}
        </NoSSR>
        
        {/* Calendar Status Dialog */}
        <CalendarStatusDialog 
          isOpen={showStatusDialog} 
          onClose={() => setShowStatusDialog(false)} 
        />
        </div>
      </div>
    </ErrorBoundary>
  )
}