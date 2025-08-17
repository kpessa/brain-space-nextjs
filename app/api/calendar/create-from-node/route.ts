import { NextRequest, NextResponse } from 'next/server'
import { googleCalendarService } from '@/services/googleCalendar'
import type { Node } from '@/types/node'
import dayjs from 'dayjs'

interface CreateEventFromNodeRequest {
  node: Node
  calendarId?: string
  startDateTime?: string
  endDateTime?: string
  location?: string
  attendees?: string[]
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CreateEventFromNodeRequest
    const { node, calendarId = 'primary', startDateTime, endDateTime, location, attendees } = body
    
    // Determine start and end times
    let start: Date
    let end: Date
    
    if (startDateTime && endDateTime) {
      // Use provided times
      start = new Date(startDateTime)
      end = new Date(endDateTime)
    } else if (node.dueDate?.type === 'exact') {
      // Use due date from node
      const dueDate = dayjs(node.dueDate.date)
      start = dueDate.startOf('hour').toDate()
      end = dueDate.add(1, 'hour').toDate()
    } else {
      // Default to next hour
      const nextHour = dayjs().add(1, 'hour').startOf('hour')
      start = nextHour.toDate()
      end = nextHour.add(1, 'hour').toDate()
    }
    
    // Build event description
    let description = node.description || ''
    
    // Add node metadata to description
    if (node.type) {
      description += `\n\nNode Type: ${node.type}`
    }
    if (node.tags && node.tags.length > 0) {
      description += `\nTags: ${node.tags.join(', ')}`
    }
    if (node.urgency !== undefined || node.importance !== undefined) {
      description += `\nPriority: Urgency ${node.urgency || 0}/10, Importance ${node.importance || 0}/10`
    }
    
    description += `\n\nLinked to Brain Space node: ${node.id}`
    
    // Create the event
    const event = await googleCalendarService.createEvent({
      summary: node.title || 'Untitled Event',
      description: description.trim(),
      start: {
        dateTime: start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      location: location,
      attendees: attendees?.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'email', minutes: 60 },
        ],
      },
    }, calendarId)
    
    if (!event?.id) {
      throw new Error('Failed to create calendar event')
    }
    
    return NextResponse.json({
      success: true,
      eventId: event.id,
      calendarId: calendarId,
      htmlLink: event.htmlLink
    })
  } catch (error) {
    console.error('Error creating calendar event from node:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create calendar event' },
      { status: 500 }
    )
  }
}