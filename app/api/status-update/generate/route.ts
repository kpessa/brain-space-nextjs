import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-helpers'
import { format, parseISO, isWithinInterval, differenceInDays } from 'date-fns'
import { googleCalendarService } from '@/services/googleCalendar'
import { adminDb } from '@/lib/firebase-admin'
import type { Node } from '@/types/node'
import type { UserMode } from '@/store/userPreferencesStore'

interface StatusUpdateRequest {
  userId: string
  mode: UserMode
  dateRange: {
    start: string
    end: string
    lookbackWeeks: number
    lookaheadWeeks: number
  }
  manualCategorizations?: Record<string, 'appointment' | 'pto' | 'work_travel' | 'skip'>
}

interface CalendarEvent {
  id: string
  summary: string
  start: {
    date?: string
    dateTime?: string
  }
  end: {
    date?: string
    dateTime?: string
  }
}

// Detect if an event is a critical event (go-live, deployment, etc)
function isCriticalEvent(event: CalendarEvent): boolean {
  const summary = event.summary?.toLowerCase() || ''
  const criticalPatterns = [
    'go-live', 'go live', 'golive', 
    'launch', 'deployment', 'deploy',
    'release', 'rollout', 'migration',
    'cutover', 'production', 'prod push'
  ]
  
  return criticalPatterns.some(pattern => summary.includes(pattern))
}

// Detect if an event is PTO/OOO
function isOutOfOfficeEvent(event: CalendarEvent): boolean {
  const summary = event.summary?.toLowerCase() || ''
  const oooPatterns = [
    'out of office', 'ooo', 'pto', 'vacation', 'holiday', 
    'sick', 'leave', 'off', 'away', 'unavailable',
    'time off', 'personal day'
  ]
  
  return oooPatterns.some(pattern => summary.includes(pattern))
}

// Extract OOO type
function getOOOType(summary: string): string {
  const lower = summary.toLowerCase()
  if (lower.includes('vacation')) return 'Vacation'
  if (lower.includes('pto')) return 'PTO'
  if (lower.includes('sick')) return 'Sick Leave'
  if (lower.includes('holiday')) return 'Holiday'
  if (lower.includes('personal')) return 'Personal Day'
  if (lower.includes('conference')) return 'Conference'
  if (lower.includes('training')) return 'Training'
  return 'Out of Office'
}

// Get critical event type
function getCriticalEventType(summary: string): 'go-live' | 'deployment' | 'release' | 'deadline' {
  const lower = summary.toLowerCase()
  if (lower.includes('go-live') || lower.includes('go live') || lower.includes('golive')) return 'go-live'
  if (lower.includes('deploy') || lower.includes('deployment')) return 'deployment'
  if (lower.includes('release') || lower.includes('rollout')) return 'release'
  return 'deadline'
}

// Get nodes from Firebase
async function getUserNodes(userId: string, startDate: Date, endDate: Date): Promise<Node[]> {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized, using empty array')
    return []
  }
  
  try {
    const nodesRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('nodes')
    
    // Get all nodes and filter by date in memory
    // (Firestore doesn't support complex date queries with OR conditions easily)
    const snapshot = await nodesRef
      .orderBy('createdAt', 'desc')
      .get()
    
    const nodes: Node[] = []
    snapshot.forEach(doc => {
      const data = doc.data()
      
      // Convert Firestore timestamps to ISO strings
      const node: Node = {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
      } as Node
      
      // Check if node is relevant to the date range
      // Include if: created, updated, or completed within the range
      const createdDate = node.createdAt ? parseISO(node.createdAt) : null
      const updatedDate = node.updatedAt ? parseISO(node.updatedAt) : null
      const completedDate = node.completedAt ? parseISO(node.completedAt) : null
      
      const isInRange = 
        (createdDate && isWithinInterval(createdDate, { start: startDate, end: endDate })) ||
        (updatedDate && isWithinInterval(updatedDate, { start: startDate, end: endDate })) ||
        (completedDate && isWithinInterval(completedDate, { start: startDate, end: endDate }))
      
      if (isInRange) {
        nodes.push(node)
      }
    })
    
    return nodes
  } catch (error) {
    console.error('Error fetching nodes from Firebase:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request.headers.get('authorization'))
    if (!authResult.user && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: StatusUpdateRequest = await request.json()
    const { userId, mode, dateRange, manualCategorizations } = data
    
    const startDate = parseISO(dateRange.start)
    const endDate = parseISO(dateRange.end)
    const now = new Date()
    
    // Get nodes for the period
    const allNodes = await getUserNodes(userId, startDate, endDate)
    
    // Filter nodes based on mode
    const nodes = allNodes.filter(node => {
      if (mode === 'all') return true
      if (mode === 'work') return !node.isPersonal
      if (mode === 'personal') return node.isPersonal
      return true
    })
    
    // Categorize nodes
    const completedNodes = nodes.filter(n => 
      n.completed && 
      n.completedAt && 
      isWithinInterval(parseISO(n.completedAt), { start: startDate, end: now })
    )
    
    const inProgressNodes = nodes.filter(n => 
      !n.completed && 
      n.updates && 
      n.updates.length > 0
    )
    
    const upcomingNodes = nodes.filter(n => 
      !n.completed && 
      (!n.updates || n.updates.length === 0)
    ).sort((a, b) => {
      const priorityA = (a.urgency || 0) + (a.importance || 0)
      const priorityB = (b.urgency || 0) + (b.importance || 0)
      return priorityB - priorityA
    }).slice(0, 10) // Top 10 upcoming
    
    const blockedNodes = nodes.filter(n => 
      n.updates?.some(u => 
        u.content.toLowerCase().includes('blocked') || 
        u.content.toLowerCase().includes('waiting') ||
        u.content.toLowerCase().includes('stuck')
      )
    )
    
    // Format deliverables
    const deliverables = {
      completed: completedNodes.map(node => ({
        id: node.id,
        title: node.title,
        type: node.type || 'task',
        completedAt: node.completedAt,
        highlights: node.updates
          ?.filter(u => u.type === 'progress')
          .slice(-2)
          .map(u => u.content)
      })),
      inProgress: inProgressNodes.map(node => {
        const recentUpdates = node.updates?.filter(u => 
          isWithinInterval(parseISO(u.timestamp), { start: startDate, end: now })
        ) || []
        
        const latestUpdate = node.updates?.[node.updates.length - 1]
        
        return {
          id: node.id,
          title: node.title,
          type: node.type || 'task',
          progress: latestUpdate?.content || 'In progress',
          updates: recentUpdates.length
        }
      }),
      upcoming: upcomingNodes.map(node => ({
        id: node.id,
        title: node.title,
        type: node.type || 'task',
        dueDate: node.dueDate?.type === 'exact' ? node.dueDate.date : undefined,
        priority: (node.urgency || 0) + (node.importance || 0)
      }))
    }
    
    // Get calendar events
    let outOfOffice: any[] = []
    let appointments: any[] = []
    let workTravel: any[] = []
    let suggestedPTO: string[] = []
    let criticalEvents: any[] = [] // Keep for backward compatibility
    let eventCategorizations: any[] = [] // Store for returning to client
    
    try {
      // Check if Google Calendar is authorized
      if (googleCalendarService.isReady() && googleCalendarService.isAuthorized()) {
        const events = await googleCalendarService.listEvents(
          'primary',
          startDate,
          endDate,
          999
        )
        
        // Use AI to categorize events
        try {
          const categorizeResponse = await fetch(new URL('/api/ai/categorize-calendar-event', request.url).toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': request.headers.get('authorization') || '',
              'x-ai-provider': process.env.NODE_ENV === 'development' ? 'mock' : 'openai'
            },
            body: JSON.stringify({
              events,
              includeRecommendations: true
            })
          })
          
          if (categorizeResponse.ok) {
            const { categorizations } = await categorizeResponse.json()
            eventCategorizations = categorizations // Store for client
            
            categorizations.forEach((cat: any) => {
              // Check if there's a manual override for this event
              const manualCategory = manualCategorizations?.[cat.eventId]
              const finalCategory = manualCategory || cat.category
              
              // Skip if manually marked as skip
              if (finalCategory === 'skip') return
              
              switch (finalCategory) {
                case 'appointment':
                  appointments.push({
                    dates: cat.dates,
                    duration: cat.duration,
                    type: cat.oooType,
                    title: cat.eventTitle,
                    isPartialDay: cat.duration.isPartialDay
                  })
                  break
                  
                case 'pto':
                  outOfOffice.push({
                    dates: cat.dates,
                    duration: cat.duration.days,
                    type: cat.oooType,
                    reason: cat.eventTitle
                  })
                  break
                  
                case 'work_travel':
                  workTravel.push({
                    dates: cat.dates,
                    duration: cat.duration.days,
                    type: cat.oooType,
                    title: cat.eventTitle,
                    suggestedPTO: cat.suggestedPTO
                  })
                  // Collect all suggested PTO dates
                  if (cat.suggestedPTO) {
                    suggestedPTO.push(...cat.suggestedPTO)
                  }
                  break
              }
            })
          }
        } catch (aiError) {
          console.error('AI categorization failed, falling back to pattern matching:', aiError)
          // Fallback to original pattern matching
          events.forEach((event: CalendarEvent) => {
            const eventStartDate = event.start.date || event.start.dateTime?.split('T')[0]
            if (!eventStartDate) return
            
            if (isOutOfOfficeEvent(event)) {
              const start = new Date(eventStartDate)
              const endDate = event.end.date || event.end.dateTime?.split('T')[0]
              const end = endDate ? new Date(endDate) : start
              
              // For all-day events, end date is exclusive
              if (event.start.date && event.end.date) {
                end.setDate(end.getDate() - 1)
              }
              
              const duration = Math.ceil(differenceInDays(end, start)) + 1
              
              outOfOffice.push({
                dates: start.toDateString() === end.toDateString() 
                  ? format(start, 'MMM d, yyyy')
                  : `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`,
                duration,
                type: getOOOType(event.summary),
                reason: event.summary
              })
            }
          })
        }
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error)
    }
    
    // Format blockers
    const blockers = blockedNodes.map(node => {
      const blockingUpdate = node.updates?.find(u => 
        u.content.toLowerCase().includes('blocked') || 
        u.content.toLowerCase().includes('waiting') ||
        u.content.toLowerCase().includes('stuck')
      )
      
      return {
        id: node.id,
        title: node.title,
        reason: blockingUpdate?.content || 'Blocked',
        since: blockingUpdate?.timestamp || node.updatedAt
      }
    })
    
    // Calculate metrics
    const totalUpdates = nodes.reduce((sum, node) => 
      sum + (node.updates?.filter(u => 
        isWithinInterval(parseISO(u.timestamp), { start: startDate, end: now })
      ).length || 0), 0
    )
    
    // Build response
    const response = {
      period: {
        start: dateRange.start,
        end: dateRange.end
      },
      deliverables,
      outOfOffice,
      appointments,
      workTravel,
      suggestedPTO: [...new Set(suggestedPTO)], // Remove duplicates
      eventCategorizations: eventCategorizations.length > 0 ? eventCategorizations : undefined,
      criticalEvents, // Keep for backward compatibility
      blockers,
      metrics: {
        completedCount: completedNodes.length,
        inProgressCount: inProgressNodes.length,
        totalUpdates,
        productivityScore: Math.round((completedNodes.length / (completedNodes.length + inProgressNodes.length) || 0) * 100)
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating status update:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate status update' },
      { status: 500 }
    )
  }
}