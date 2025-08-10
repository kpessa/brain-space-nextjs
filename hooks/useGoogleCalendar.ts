'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { googleCalendarService } from '@/services/googleCalendar'

interface GoogleCalendarState {
  isConnected: boolean
  isLoading: boolean
  isReady: boolean
  hasError: boolean
  errorMessage?: string
}

export function useGoogleCalendar() {
  const { user, connectGoogleCalendar, disconnectGoogleCalendar, isGoogleCalendarConnected, refreshGoogleCalendarAuth } = useAuth()
  
  const [state, setState] = useState<GoogleCalendarState>({
    isConnected: false,
    isLoading: typeof window === 'undefined' ? false : true, // Don't show loading on SSR
    isReady: false,
    hasError: false,
  })

  // Check connection status when user changes or component mounts
  useEffect(() => {
    const checkConnectionStatus = async () => {
      // Skip connection check during SSR
      if (typeof window === 'undefined') return
      if (!user) {
        setState({
          isConnected: false,
          isLoading: false,
          isReady: false,
          hasError: false,
        })
        return
      }

      try {
        setState(prev => ({ ...prev, isLoading: true, hasError: false }))

        // Wait for Google Calendar service to be ready
        let attempts = 0
        const maxAttempts = 20
        
        while (!googleCalendarService.isReady() && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 250))
          attempts++
        }

        const isReady = googleCalendarService.isReady()
        const isConnected = isReady && isGoogleCalendarConnected()

        // If ready but not connected, try to auto-connect with existing token
        if (isReady && !isConnected) {
          const autoConnected = await googleCalendarService.authorize(true)
          setState({
            isConnected: autoConnected,
            isLoading: false,
            isReady,
            hasError: false,
          })
        } else {
          setState({
            isConnected,
            isLoading: false,
            isReady,
            hasError: !isReady,
            errorMessage: !isReady ? 'Google Calendar service failed to initialize' : undefined,
          })
        }
      } catch (error) {
        console.error('[useGoogleCalendar] Error checking connection status:', error)
        setState({
          isConnected: false,
          isLoading: false,
          isReady: googleCalendarService.isReady(),
          hasError: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    checkConnectionStatus()
  }, [user, isGoogleCalendarConnected])

  // Connect to Google Calendar
  const connect = async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, hasError: false }))
      
      const success = await connectGoogleCalendar()
      
      setState(prev => ({
        ...prev,
        isConnected: success,
        isLoading: false,
        hasError: !success,
        errorMessage: !success ? 'Failed to connect to Google Calendar' : undefined,
      }))
      
      return success
    } catch (error) {
      console.error('[useGoogleCalendar] Connect error:', error)
      setState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Connection failed',
      }))
      return false
    }
  }

  // Disconnect from Google Calendar
  const disconnect = async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, hasError: false }))
      
      await disconnectGoogleCalendar()
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        hasError: false,
      }))
    } catch (error) {
      console.error('[useGoogleCalendar] Disconnect error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Disconnection failed',
      }))
      throw error
    }
  }

  // Refresh authentication
  const refresh = async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, hasError: false }))
      
      const success = await refreshGoogleCalendarAuth()
      
      setState(prev => ({
        ...prev,
        isConnected: success,
        isLoading: false,
        hasError: !success,
        errorMessage: !success ? 'Failed to refresh authentication' : undefined,
      }))
      
      return success
    } catch (error) {
      console.error('[useGoogleCalendar] Refresh error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Refresh failed',
      }))
      return false
    }
  }

  // Get calendars
  const getCalendars = async () => {
    if (!state.isConnected) {
      throw new Error('Google Calendar not connected')
    }
    return await googleCalendarService.listCalendars()
  }

  // Get events
  const getEvents = async (
    calendarId = 'primary',
    timeMin?: Date,
    timeMax?: Date,
    maxResults = 250
  ) => {
    if (!state.isConnected) {
      throw new Error('Google Calendar not connected')
    }
    return await googleCalendarService.listEvents(calendarId, timeMin, timeMax, maxResults)
  }

  // Create event
  const createEvent = async (calendarId = 'primary', event: any) => {
    if (!state.isConnected) {
      throw new Error('Google Calendar not connected')
    }
    return await googleCalendarService.createEvent(calendarId, event)
  }

  // Update event
  const updateEvent = async (calendarId = 'primary', eventId: string, event: any) => {
    if (!state.isConnected) {
      throw new Error('Google Calendar not connected')
    }
    return await googleCalendarService.updateEvent(calendarId, eventId, event)
  }

  // Delete event
  const deleteEvent = async (calendarId = 'primary', eventId: string) => {
    if (!state.isConnected) {
      throw new Error('Google Calendar not connected')
    }
    return await googleCalendarService.deleteEvent(calendarId, eventId)
  }

  // Get debug info
  const getDebugInfo = async () => {
    const tokenInfo = await googleCalendarService.getTokenInfo()
    const initStatus = googleCalendarService.getInitStatus()
    
    return {
      ...state,
      tokenInfo,
      initStatus,
      service: {
        isReady: googleCalendarService.isReady(),
        isAuthorized: googleCalendarService.isAuthorized(),
      }
    }
  }

  return {
    // State
    ...state,
    
    // Actions
    connect,
    disconnect,
    refresh,
    
    // Calendar operations
    getCalendars,
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    
    // Debug
    getDebugInfo,
  }
}