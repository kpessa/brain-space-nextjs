import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-helpers'
import dayjs from 'dayjs'

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    date?: string
    dateTime?: string
  }
  end: {
    date?: string
    dateTime?: string
  }
  location?: string
}

interface CategorizeRequest {
  events: CalendarEvent[]
  includeRecommendations?: boolean
}

interface EventCategorization {
  eventId: string
  eventTitle: string
  dates: string
  category: 'appointment' | 'pto' | 'work_travel'
  confidence: number
  reasoning: string
  oooType: string
  duration: {
    days: number
    hours?: number
    isPartialDay: boolean
  }
  suggestedPTO?: string[]
}

async function callOpenAI(events: CalendarEvent[], includeRecommendations: boolean) {
  const prompt = `Categorize these calendar events into one of three categories:

1. "appointment" - Medical appointments, personal errands, or any event that takes a few hours during a work day
2. "pto" - Personal time off, vacation, personal travel, holidays
3. "work_travel" - Work-related travel including conferences, go-lives, corporate visits, on-site deployments

For each event, also determine:
- The type of out-of-office (e.g., "Conference", "Medical", "Vacation", "Go-Live", etc.)
- Whether it's a partial day (appointments) or full day(s)
- Confidence level (0-1)
- Brief reasoning

${includeRecommendations ? 'Additionally, suggest strategic PTO days around work travel events for recovery or to extend weekends.' : ''}

Events to categorize:
${events.map(event => {
  const start = event.start.date || event.start.dateTime
  const end = event.end.date || event.end.dateTime
  const isAllDay = !!event.start.date
  
  return `- Title: "${event.summary}"
  Start: ${start}
  End: ${end}
  All Day: ${isAllDay}
  ${event.description ? `Description: ${event.description}` : ''}
  ${event.location ? `Location: ${event.location}` : ''}`
}).join('\n\n')}

Respond in JSON format:
{
  "categorizations": [
    {
      "eventId": "string",
      "category": "appointment|pto|work_travel",
      "confidence": 0.0-1.0,
      "reasoning": "string",
      "oooType": "string",
      "suggestedPTO": ["YYYY-MM-DD"]
    }
  ]
}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert at categorizing calendar events for professional status updates. You understand:
- Medical/dental appointments are typically 1-3 hour appointments during work days
- Conferences like "Magic Live" or events in Vegas are usually work travel
- Go-lives and deployments at corporate offices are work travel, not PTO
- Multi-day events away from home are either PTO (personal) or work travel (professional)
- Consider event titles, locations, and durations carefully`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return JSON.parse(data.choices[0].message.content)
}

async function callGoogleAI(events: CalendarEvent[], includeRecommendations: boolean) {
  const prompt = `Categorize these calendar events. Return ONLY valid JSON.

Categories:
1. "appointment" - Medical appointments, personal errands (few hours during work day)
2. "pto" - Personal time off, vacation, personal travel
3. "work_travel" - Work conferences, go-lives, corporate visits, on-site work

${includeRecommendations ? 'Also suggest strategic PTO days around work travel.' : ''}

Events:
${events.map(event => {
  const start = event.start.date || event.start.dateTime
  const end = event.end.date || event.end.dateTime
  return `- "${event.summary}" (${start} to ${end})${event.location ? ` at ${event.location}` : ''}`
}).join('\n')}

Return JSON with this exact structure:
{
  "categorizations": [
    {
      "eventId": "event_id",
      "category": "appointment|pto|work_travel",
      "confidence": 0.9,
      "reasoning": "reason",
      "oooType": "type",
      "suggestedPTO": ["YYYY-MM-DD"]
    }
  ]
}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        }
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Google AI API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.candidates[0].content.parts[0].text
  
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response')
  }
  
  return JSON.parse(jsonMatch[0])
}

// Mock categorization for development
function mockCategorization(events: CalendarEvent[]) {
  return {
    categorizations: events.map(event => {
      const summary = event.summary.toLowerCase()
      let category: 'appointment' | 'pto' | 'work_travel' = 'pto'
      let oooType = 'Time Off'
      const confidence = 0.8
      let reasoning = ''
      
      // Simple heuristics
      if (summary.includes('dentist') || summary.includes('doctor') || summary.includes('appointment')) {
        category = 'appointment'
        oooType = 'Medical Appointment'
        reasoning = 'Medical/dental keywords detected'
      } else if (summary.includes('magic live') || summary.includes('conference') || summary.includes('summit')) {
        category = 'work_travel'
        oooType = 'Conference'
        reasoning = 'Conference or work event detected'
      } else if (summary.includes('go-live') || summary.includes('go live') || summary.includes('deployment')) {
        category = 'work_travel'
        oooType = 'Go-Live'
        reasoning = 'Deployment or go-live event detected'
      } else if (summary.includes('vacation') || summary.includes('holiday')) {
        category = 'pto'
        oooType = 'Vacation'
        reasoning = 'Personal vacation detected'
      }
      
      // Suggest PTO for work travel
      const suggestedPTO: string[] = []
      if (category === 'work_travel' && event.end.date) {
        const endDate = dayjs(event.end.date)
        const nextDay = endDate.add(1, 'day')
        
        // If work travel ends on Thursday/Friday, suggest Monday off
        if (endDate.day() >= 4) {
          const monday = endDate.add(endDate.day() === 4 ? 4 : 3, 'day')
          suggestedPTO.push(monday.format('YYYY-MM-DD'))
        }
        // If ends mid-week, suggest next day off
        else if (nextDay.day() !== 0 && nextDay.day() !== 6) {
          suggestedPTO.push(nextDay.format('YYYY-MM-DD'))
        }
      }
      
      return {
        eventId: event.id,
        category,
        confidence,
        reasoning,
        oooType,
        suggestedPTO
      }
    })
  }
}

// Calculate event duration and format dates
function processEventDetails(event: CalendarEvent, categorization: any): EventCategorization {
  const startDate = event.start.date || event.start.dateTime?.split('T')[0]
  const endDate = event.end.date || event.end.dateTime?.split('T')[0]
  const startTime = event.start.dateTime?.split('T')[1]
  const endTime = event.end.dateTime?.split('T')[1]
  
  const start = dayjs(startDate!)
  let end = endDate ? dayjs(endDate) : start
  
  // For all-day events, end date is exclusive
  if (event.start.date && event.end.date) {
    end = end.subtract(1, 'day')
  }
  
  const days = Math.ceil(end.diff(start, 'day')) + 1
  const isPartialDay = !!event.start.dateTime && days === 1
  
  let hours: number | undefined
  if (isPartialDay && startTime && endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    hours = (endHour + endMin / 60) - (startHour + startMin / 60)
  }
  
  // Format dates string
  let dates = start.format('MMM D')
  if (!end.isSame(start, 'day')) {
    dates += ` - ${end.format('MMM D')}`
  }
  if (isPartialDay && startTime) {
    const [hour, min] = startTime.split(':')
    dates += ` (${hour}:${min}`
    if (endTime) {
      const [endHour, endMin] = endTime.split(':')
      dates += `-${endHour}:${endMin}`
    }
    dates += ')'
  }
  
  return {
    eventId: event.id,
    eventTitle: event.summary,
    dates,
    category: categorization.category,
    confidence: categorization.confidence,
    reasoning: categorization.reasoning,
    oooType: categorization.oooType,
    duration: {
      days,
      hours,
      isPartialDay
    },
    suggestedPTO: categorization.suggestedPTO
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request.headers.get('authorization'))
    if (!authResult.user && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: CategorizeRequest = await request.json()
    const { events, includeRecommendations = true } = data
    
    if (!events || events.length === 0) {
      return NextResponse.json({ categorizations: [] })
    }

    // Get AI provider from request or default
    const provider = request.headers.get('x-ai-provider') || 'openai'
    
    let aiResponse
    
    try {
      switch (provider) {
        case 'google':
          if (!process.env.GOOGLE_AI_API_KEY) {
            throw new Error('Google AI API key not configured')
          }
          aiResponse = await callGoogleAI(events, includeRecommendations)
          break
          
        case 'mock':
          aiResponse = mockCategorization(events)
          break
          
        case 'openai':
        default:
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured')
          }
          aiResponse = await callOpenAI(events, includeRecommendations)
          break
      }
    } catch (aiError) {
      console.error('AI categorization failed, using mock:', aiError)
      aiResponse = mockCategorization(events)
    }
    
    // Process categorizations with event details
    const categorizations = aiResponse.categorizations.map((cat: any) => {
      const event = events.find(e => e.id === cat.eventId)
      if (!event) return null
      return processEventDetails(event, cat)
    }).filter(Boolean)
    
    return NextResponse.json({ categorizations })
  } catch (error) {
    console.error('Error in categorize-calendar-event:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to categorize events' },
      { status: 500 }
    )
  }
}