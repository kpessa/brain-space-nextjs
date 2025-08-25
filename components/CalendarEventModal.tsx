'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Calendar, Clock, MapPin, Users, FileText, Loader2, CalendarPlus } from '@/lib/icons'
import dayjs from 'dayjs'
import { googleCalendarService } from '@/services/googleCalendar'
import { useCalendarStore, useCalendarStoreBase } from '@/store/calendarStore'
import type { Node } from '@/types/node'
import { cn } from '@/lib/utils'

interface CalendarEventModalProps {
  isOpen: boolean
  onClose: () => void
  node: Node
  onEventCreated?: (eventId: string, calendarId: string) => void
}

interface EventFormData {
  summary: string
  description: string
  startDateTime: string
  endDateTime: string
  location: string
  attendees: string
  calendarId: string
}

export function CalendarEventModal({ 
  isOpen, 
  onClose, 
  node,
  onEventCreated 
}: CalendarEventModalProps) {
  const { calendars, selectedCalendars, isAuthenticated } = useCalendarStore()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Initialize form data from node
  const [formData, setFormData] = useState<EventFormData>(() => {
    const startDate = node.dueDate?.type === 'exact' 
      ? new Date(node.dueDate.date)
      : new Date()
    
    // Round to next hour
    const startDateTime = dayjs(startDate).add(1, 'hour').startOf('hour').toDate()
    const endDateTime = dayjs(startDateTime).add(1, 'hour').toDate()
    
    return {
      summary: node.title || 'Untitled Event',
      description: node.description || '',
      startDateTime: dayjs(startDateTime).format('YYYY-MM-DDTHH:mm'),
      endDateTime: dayjs(endDateTime).format('YYYY-MM-DDTHH:mm'),
      location: '',
      attendees: '',
      calendarId: 'primary' // Default to primary, will update when calendars load
    }
  })
  
  // Update calendar ID when calendars are loaded
  useEffect(() => {
    if (selectedCalendars && selectedCalendars.length > 0 && formData.calendarId === 'primary') {
      setFormData(prev => ({ ...prev, calendarId: selectedCalendars[0] }))
    }
  }, [selectedCalendars, formData.calendarId])
  
  // Check authentication status when modal opens
  useEffect(() => {
    const checkAuth = async () => {
      if (isOpen) {
        // Check if already authenticated
        const isAuth = googleCalendarService.isAuthorized()
        useCalendarStoreBase.getState().setIsAuthenticated(isAuth)
        
        // If authenticated, load calendars
        if (isAuth) {
          try {
            const calendarList = await googleCalendarService.listCalendars()
            useCalendarStoreBase.getState().setCalendars(calendarList)
          } catch (error) {

          }
        }
      }
    }
    
    checkAuth()
  }, [isOpen])
  
  const handleInputChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const handleCreateEvent = async () => {
    setIsCreating(true)
    setError(null)
    
    try {
      // Parse attendees
      const attendeesList = formData.attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)
        .map(email => ({ email }))
      
      // Create the event
      const event = await googleCalendarService.createEvent(
        formData.calendarId,
        {
          summary: formData.summary,
          description: formData.description,
          start: {
            dateTime: new Date(formData.startDateTime).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: new Date(formData.endDateTime).toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          location: formData.location || undefined,
          attendees: attendeesList.length > 0 ? attendeesList : undefined,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 10 },
              { method: 'email', minutes: 60 },
            ],
          },
        }
      )
      
      if (event?.id) {
        onEventCreated?.(event.id, formData.calendarId)
        onClose()
      }
    } catch (error) {

      setError(error instanceof Error ? error.message : 'Failed to create event')
    } finally {
      setIsCreating(false)
    }
  }
  
  const handleAuth = async () => {
    try {
      const success = await googleCalendarService.authorize()
      if (success) {
        // Update global auth state
        useCalendarStoreBase.getState().setIsAuthenticated(true)
        
        // Load calendars after successful auth
        const calendarList = await googleCalendarService.listCalendars()
        useCalendarStoreBase.getState().setCalendars(calendarList)
      } else {
        setError('Failed to authenticate with Google Calendar')
      }
    } catch (error) {

      setError('Failed to authenticate with Google Calendar')
    }
  }
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={
        <div className="flex items-center gap-2">
          <CalendarPlus className="w-5 h-5 text-brain-600" />
          Create Calendar Event
        </div>
      }
      size="lg"
    >
      <div className="space-y-4">
        {!isAuthenticated ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connect Google Calendar</CardTitle>
              <CardDescription>
                Sign in with Google to create calendar events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleAuth} className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                Connect Google Calendar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Event Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title
              </label>
              <input
                type="text"
                value={formData.summary}
                onChange={(e) => handleInputChange('summary', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                placeholder="Event title..."
              />
            </div>
            
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Start
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDateTime}
                  onChange={(e) => handleInputChange('startDateTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  End
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDateTime}
                  onChange={(e) => handleInputChange('endDateTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Calendar Selection */}
            {calendars.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Calendar
                </label>
                <select
                  value={formData.calendarId}
                  onChange={(e) => handleInputChange('calendarId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                >
                  {calendars.map(cal => (
                    <option key={cal.id} value={cal.id}>
                      {cal.summary}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location (optional)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                placeholder="Add location..."
              />
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none h-24 focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                placeholder="Add description..."
              />
            </div>
            
            {/* Attendees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Attendees (optional)
              </label>
              <input
                type="text"
                value={formData.attendees}
                onChange={(e) => handleInputChange('attendees', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                placeholder="email1@example.com, email2@example.com..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate multiple email addresses with commas
              </p>
            </div>
            
            {/* Node Reference */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                <strong>Linked to node:</strong> {node.title || 'Untitled'}
              </div>
              {node.tags && node.tags.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {node.tags.map((tag, index) => (
                    <span key={index} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isCreating}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateEvent}
                disabled={isCreating || !formData.summary}
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    Create Event
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}