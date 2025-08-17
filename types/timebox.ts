// Timebox and time slot types

export interface TimeboxTask {
  id: string
  title: string
  description?: string
  estimatedMinutes?: number
  priority?: number
  nodeId?: string
  slotId?: string // Adding missing slotId property
  completed?: boolean
  createdAt: string
  updatedAt: string
}

export interface TimeSlot {
  id: string
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  duration: 30 | 60 | 120 // Valid duration values
  title?: string
  description?: string
  tasks: TimeboxTask[]
  isBooked: boolean
  createdAt: string
  updatedAt: string
}

export interface TimeboxState {
  slots: TimeSlot[]
  selectedDate: string
  draggedTask: TimeboxTask | null
  isLoading: boolean
  error: string | null
  calendarEvents?: any[] // Adding calendarEvents property from tests
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  description?: string
  location?: string
  attendees?: string[]
  source: 'google' | 'manual'
  calendarId?: string
}

export type TimeSlotDuration = 30 | 60 | 120