import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-helpers'
import { format, eachDayOfInterval, isWeekend, isSameDay, startOfMonth, endOfMonth } from 'date-fns'
import { getHolidaysInRange, generatePTORecommendation, type Holiday, type PTORecommendation } from '@/services/holidays'

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
  attendees?: Array<{
    email: string
    responseStatus?: string
  }>
}

interface ExtendedStatusRequest {
  timeRange: {
    start: string
    end: string
    preset?: '2weeks' | '1month' | '3months' | '6months' | 'custom'
  }
  includeHolidayAnalysis: boolean
  includePTORecommendations: boolean
  events: CalendarEvent[]
  userEmail?: string
}

interface OutOfOfficeEvent {
  dates: string
  duration: number
  type: string
  event: CalendarEvent
}

interface MonthlyCommitments {
  meetings: number
  blockedDays: number
  availableDays: number
  workingDays: number
}

interface CriticalPeriod {
  dates: string
  reason: string
  meetingCount: number
}

interface ExtendedStatusResponse {
  period: {
    start: string
    end: string
    workingDays: number
    totalDays: number
  }
  existingPTO: OutOfOfficeEvent[]
  holidays: Array<{
    holiday: Holiday
    ptoOpportunity?: PTORecommendation
  }>
  commitments: {
    byMonth: Record<string, MonthlyCommitments>
    criticalPeriods: CriticalPeriod[]
  }
  recommendations: {
    optimalPTO: PTORecommendation[]
    avoidDates: Array<{
      dates: string
      reason: string
    }>
  }
  summary: {
    totalPTOPlanned: number
    totalPTORecommended: number
    keyInsights: string[]
    focusTimeAnalysis: {
      averageMeetingsPerDay: number
      busiestDayOfWeek: string
      recommendedFocusDays: string[]
    }
  }
}

// Detect if an event is PTO/OOO
function isOutOfOfficeEvent(event: CalendarEvent): boolean {
  const summary = event.summary?.toLowerCase() || ''
  const oooPatterns = [
    'out of office', 'ooo', 'pto', 'vacation', 'holiday', 
    'sick', 'leave', 'off', 'away', 'unavailable'
  ]
  
  return oooPatterns.some(pattern => summary.includes(pattern))
}

// Extract OOO events from calendar events
function extractOutOfOfficeEvents(events: CalendarEvent[]): OutOfOfficeEvent[] {
  const oooEvents: OutOfOfficeEvent[] = []
  
  events.forEach(event => {
    if (isOutOfOfficeEvent(event)) {
      const startDate = event.start.date || event.start.dateTime?.split('T')[0]
      const endDate = event.end.date || event.end.dateTime?.split('T')[0]
      
      if (startDate) {
        const start = new Date(startDate)
        const end = endDate ? new Date(endDate) : start
        
        // For all-day events, end date is exclusive, so subtract one day
        if (event.start.date && event.end.date) {
          end.setDate(end.getDate() - 1)
        }
        
        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        
        oooEvents.push({
          dates: startDate === endDate || !endDate ? startDate : `${startDate} to ${format(end, 'yyyy-MM-dd')}`,
          duration,
          type: detectOOOType(event.summary),
          event
        })
      }
    }
  })
  
  return oooEvents
}

// Detect the type of OOO
function detectOOOType(summary: string): string {
  const lower = summary.toLowerCase()
  if (lower.includes('vacation')) return 'Vacation'
  if (lower.includes('pto')) return 'PTO'
  if (lower.includes('sick')) return 'Sick Leave'
  if (lower.includes('holiday')) return 'Holiday'
  if (lower.includes('conference')) return 'Conference'
  if (lower.includes('training')) return 'Training'
  return 'Out of Office'
}

// Analyze commitments by month
function analyzeCommitments(
  events: CalendarEvent[], 
  startDate: Date, 
  endDate: Date,
  userEmail?: string
): { byMonth: Record<string, MonthlyCommitments>, criticalPeriods: CriticalPeriod[] } {
  const byMonth: Record<string, MonthlyCommitments> = {}
  const dailyMeetingCounts: Record<string, number> = {}
  
  // Initialize months
  let currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const monthKey = format(currentDate, 'yyyy-MM')
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const daysInMonth = eachDayOfInterval({ 
      start: monthStart > startDate ? monthStart : startDate,
      end: monthEnd < endDate ? monthEnd : endDate
    })
    
    byMonth[monthKey] = {
      meetings: 0,
      blockedDays: 0,
      availableDays: 0,
      workingDays: daysInMonth.filter(d => !isWeekend(d)).length
    }
    
    currentDate.setMonth(currentDate.getMonth() + 1)
  }
  
  // Count meetings and blocked days
  events.forEach(event => {
    // Skip OOO events
    if (isOutOfOfficeEvent(event)) return
    
    const startDateStr = event.start.date || event.start.dateTime?.split('T')[0]
    if (!startDateStr) return
    
    const eventDate = new Date(startDateStr)
    const monthKey = format(eventDate, 'yyyy-MM')
    const dayKey = format(eventDate, 'yyyy-MM-dd')
    
    // Count meetings (non-all-day events with attendees or that user accepted)
    const isAllDay = !!event.start.date
    const userAttendee = event.attendees?.find(a => a.email === userEmail)
    const isAccepted = !userAttendee || userAttendee.responseStatus !== 'declined'
    
    if (!isAllDay && isAccepted) {
      if (byMonth[monthKey]) {
        byMonth[monthKey].meetings++
      }
      dailyMeetingCounts[dayKey] = (dailyMeetingCounts[dayKey] || 0) + 1
    }
    
    // Count blocked days (all-day events)
    if (isAllDay && byMonth[monthKey]) {
      byMonth[monthKey].blockedDays++
    }
  })
  
  // Calculate available days
  Object.keys(byMonth).forEach(monthKey => {
    byMonth[monthKey].availableDays = 
      byMonth[monthKey].workingDays - byMonth[monthKey].blockedDays
  })
  
  // Identify critical periods (3+ meetings in a day)
  const criticalPeriods: CriticalPeriod[] = []
  Object.entries(dailyMeetingCounts).forEach(([date, count]) => {
    if (count >= 3) {
      criticalPeriods.push({
        dates: date,
        reason: `High meeting load (${count} meetings)`,
        meetingCount: count
      })
    }
  })
  
  return { byMonth, criticalPeriods }
}

// Generate PTO recommendations based on calendar analysis
function generateOptimalPTORecommendations(
  holidays: Holiday[],
  existingPTO: OutOfOfficeEvent[],
  commitments: { byMonth: Record<string, MonthlyCommitments>, criticalPeriods: CriticalPeriod[] }
): { optimalPTO: PTORecommendation[], avoidDates: Array<{ dates: string, reason: string }> } {
  const optimalPTO: PTORecommendation[] = []
  const avoidDates: Array<{ dates: string, reason: string }> = []
  
  // Get holiday recommendations
  holidays.forEach(holiday => {
    const recommendation = generatePTORecommendation(holiday.holiday)
    if (recommendation) {
      // Check if dates conflict with existing PTO
      const hasConflict = existingPTO.some(pto => {
        return recommendation.recommendedDates.some(date => 
          pto.dates.includes(date)
        )
      })
      
      if (!hasConflict) {
        // Check if dates conflict with critical periods
        const criticalConflict = commitments.criticalPeriods.find(period =>
          recommendation.recommendedDates.includes(period.dates)
        )
        
        if (criticalConflict) {
          avoidDates.push({
            dates: criticalConflict.dates,
            reason: criticalConflict.reason
          })
        } else {
          optimalPTO.push(recommendation)
        }
      }
    }
  })
  
  // Sort by efficiency and limit to top 10
  return {
    optimalPTO: optimalPTO
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 10),
    avoidDates
  }
}

// Generate key insights
function generateInsights(
  existingPTO: OutOfOfficeEvent[],
  holidays: Holiday[],
  commitments: { byMonth: Record<string, MonthlyCommitments>, criticalPeriods: CriticalPeriod[] },
  recommendations: { optimalPTO: PTORecommendation[] }
): string[] {
  const insights: string[] = []
  
  // PTO insights
  const totalPTODays = existingPTO.reduce((sum, pto) => sum + pto.duration, 0)
  insights.push(`You have ${totalPTODays} days of PTO already scheduled`)
  
  // Holiday opportunities
  const holidayOpportunities = holidays.filter(h => h.holiday.ptoStrategy).length
  if (holidayOpportunities > 0) {
    insights.push(`There are ${holidayOpportunities} holidays with PTO extension opportunities`)
  }
  
  // Best PTO opportunity
  if (recommendations.optimalPTO.length > 0) {
    const best = recommendations.optimalPTO[0]
    insights.push(`Best PTO opportunity: ${best.reason} (${best.totalDaysOff} days off for ${best.totalPTODays} PTO days)`)
  }
  
  // Busiest month
  const busiestMonth = Object.entries(commitments.byMonth)
    .sort((a, b) => b[1].meetings - a[1].meetings)[0]
  if (busiestMonth) {
    insights.push(`Busiest month: ${format(new Date(busiestMonth[0] + '-01'), 'MMMM yyyy')} with ${busiestMonth[1].meetings} meetings`)
  }
  
  // Critical periods warning
  if (commitments.criticalPeriods.length > 0) {
    insights.push(`${commitments.criticalPeriods.length} days with high meeting load (3+ meetings)`)
  }
  
  return insights
}

// Calculate focus time analysis
function analyzeFocusTime(events: CalendarEvent[], startDate: Date, endDate: Date, userEmail?: string) {
  const meetingsByDayOfWeek = [0, 0, 0, 0, 0, 0, 0] // Sun-Sat
  let totalMeetings = 0
  let totalWorkDays = 0
  
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  
  days.forEach(day => {
    if (!isWeekend(day)) {
      totalWorkDays++
      const dayMeetings = events.filter(event => {
        if (isOutOfOfficeEvent(event)) return false
        const eventDateStr = event.start.date || event.start.dateTime?.split('T')[0]
        if (!eventDateStr) return false
        
        const eventDate = new Date(eventDateStr)
        const isAllDay = !!event.start.date
        const userAttendee = event.attendees?.find(a => a.email === userEmail)
        const isAccepted = !userAttendee || userAttendee.responseStatus !== 'declined'
        
        return isSameDay(eventDate, day) && !isAllDay && isAccepted
      }).length
      
      totalMeetings += dayMeetings
      meetingsByDayOfWeek[day.getDay()] += dayMeetings
    }
  })
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const busiestDayIndex = meetingsByDayOfWeek.indexOf(Math.max(...meetingsByDayOfWeek))
  
  // Recommend least busy weekdays for focus time
  const weekdayMeetings = meetingsByDayOfWeek.slice(1, 6) // Mon-Fri
  const leastBusyIndices = weekdayMeetings
    .map((count, index) => ({ count, day: index + 1 }))
    .sort((a, b) => a.count - b.count)
    .slice(0, 2)
    .map(item => dayNames[item.day])
  
  return {
    averageMeetingsPerDay: totalWorkDays > 0 ? (totalMeetings / totalWorkDays).toFixed(1) : '0',
    busiestDayOfWeek: dayNames[busiestDayIndex],
    recommendedFocusDays: leastBusyIndices
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request.headers.get('authorization'))
    if (!authResult.user) {
      // In development, allow unauthenticated requests for easier testing
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      console.warn('⚠️  Running without authentication in development mode')
    }

    const data: ExtendedStatusRequest = await request.json()
    const { timeRange, includeHolidayAnalysis, includePTORecommendations, events, userEmail } = data
    
    const startDate = new Date(timeRange.start)
    const endDate = new Date(timeRange.end)
    
    // Calculate working days
    const allDays = eachDayOfInterval({ start: startDate, end: endDate })
    const workingDays = allDays.filter(day => !isWeekend(day)).length
    
    // Extract existing PTO
    const existingPTO = extractOutOfOfficeEvents(events)
    
    // Get holidays in range
    const holidaysInRange = includeHolidayAnalysis 
      ? getHolidaysInRange(startDate, endDate)
      : []
    
    // Analyze commitments
    const commitments = analyzeCommitments(events, startDate, endDate, userEmail)
    
    // Generate recommendations
    const recommendations = includePTORecommendations
      ? generateOptimalPTORecommendations(
          holidaysInRange.map(h => ({ holiday: h })),
          existingPTO,
          commitments
        )
      : { optimalPTO: [], avoidDates: [] }
    
    // Calculate totals
    const totalPTOPlanned = existingPTO.reduce((sum, pto) => sum + pto.duration, 0)
    const totalPTORecommended = recommendations.optimalPTO.reduce((sum, rec) => sum + rec.totalPTODays, 0)
    
    // Generate insights
    const keyInsights = generateInsights(
      existingPTO,
      holidaysInRange.map(h => ({ holiday: h })),
      commitments,
      recommendations
    )
    
    // Analyze focus time
    const focusTimeAnalysis = analyzeFocusTime(events, startDate, endDate, userEmail)
    
    // Build response
    const response: ExtendedStatusResponse = {
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
        workingDays,
        totalDays: allDays.length
      },
      existingPTO,
      holidays: holidaysInRange.map(holiday => ({
        holiday,
        ptoOpportunity: includePTORecommendations ? generatePTORecommendation(holiday) : undefined
      })),
      commitments,
      recommendations,
      summary: {
        totalPTOPlanned,
        totalPTORecommended,
        keyInsights,
        focusTimeAnalysis: {
          averageMeetingsPerDay: parseFloat(focusTimeAnalysis.averageMeetingsPerDay),
          busiestDayOfWeek: focusTimeAnalysis.busiestDayOfWeek,
          recommendedFocusDays: focusTimeAnalysis.recommendedFocusDays
        }
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating extended status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate status' },
      { status: 500 }
    )
  }
}