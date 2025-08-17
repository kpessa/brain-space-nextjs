'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import dayjs from 'dayjs'
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Plane,
  Star,
  TrendingUp,
  X
} from 'lucide-react'
import { googleCalendarService } from '@/services/googleCalendar'
import { auth } from '@/lib/firebase'
import type { Holiday } from '@/services/holidays'

interface CalendarStatusDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface ExtendedStatus {
  period: {
    start: string
    end: string
    workingDays: number
    totalDays: number
  }
  existingPTO: Array<{
    dates: string
    duration: number
    type: string
  }>
  holidays: Array<{
    holiday: Holiday
    ptoOpportunity?: {
      holiday: Holiday
      recommendedDates: string[]
      reason: string
      totalPTODays: number
      totalDaysOff: number
      efficiency: number
    }
  }>
  commitments: {
    byMonth: Record<string, {
      meetings: number
      blockedDays: number
      availableDays: number
      workingDays: number
    }>
    criticalPeriods: Array<{
      dates: string
      reason: string
      meetingCount: number
    }>
  }
  recommendations: {
    optimalPTO: Array<{
      holiday: Holiday
      recommendedDates: string[]
      reason: string
      totalPTODays: number
      totalDaysOff: number
      efficiency: number
    }>
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

const TIME_PRESETS = [
  { label: '2 Weeks', value: '2weeks', months: 0.5 },
  { label: '1 Month', value: '1month', months: 1 },
  { label: '3 Months', value: '3months', months: 3 },
  { label: '6 Months', value: '6months', months: 6 }
]

export function CalendarStatusDialog({ isOpen, onClose }: CalendarStatusDialogProps) {
  const [status, setStatus] = useState<ExtendedStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timePreset, setTimePreset] = useState('3months')
  const [expandedSections, setExpandedSections] = useState({
    existingPTO: true,
    holidays: false,
    commitments: false,
    recommendations: true
  })

  useEffect(() => {
    if (isOpen) {
      fetchStatus()
    }
  }, [isOpen, timePreset])

  const fetchStatus = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Get time range
      const start = new Date()
      const preset = TIME_PRESETS.find(p => p.value === timePreset)
      const end = dayjs(start).add(preset?.months || 3, 'month').toDate()
      
      // Fetch calendar events
      const events = await googleCalendarService.listEvents(
        'primary',
        start,
        end,
        999
      )
      
      // Get user's email for filtering
      const calendars = await googleCalendarService.listCalendars()
      const primaryCalendar = calendars.find(c => c.primary)
      const userEmail = primaryCalendar?.id || ''
      
      // Get Firebase ID token for API authentication
      const user = auth.currentUser
      let authHeader = {}
      if (user) {
        const idToken = await user.getIdToken()
        authHeader = { 'Authorization': `Bearer ${idToken}` }
      }
      
      // Call API to analyze
      const response = await fetch('/api/calendar/extended-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          timeRange: {
            start: dayjs(start).format('YYYY-MM-DD'),
            end: dayjs(end).format('YYYY-MM-DD'),
            preset: timePreset
          },
          includeHolidayAnalysis: true,
          includePTORecommendations: true,
          events,
          userEmail
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar status')
      }
      
      const data = await response.json()
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar status')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Calendar Status & PTO Planning"
      size="xl"
    >
      <div className="space-y-6">
        {/* Description */}
        <p className="text-sm text-muted-foreground">
          Analyze your calendar and get strategic PTO recommendations
        </p>
        
        {/* Time Range Selector */}
        <div className="flex gap-2 flex-wrap">
          {TIME_PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => setTimePreset(preset.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timePreset === preset.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-destructive">{error}</p>
            </div>
          </div>
        )}

        {status && !isLoading && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-primary/5 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Summary</h3>
              </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Period</p>
                    <p className="font-medium">{status.period.workingDays} working days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">PTO Planned</p>
                    <p className="font-medium">{status.summary.totalPTOPlanned} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Meetings/Day</p>
                    <p className="font-medium">{status.summary.focusTimeAnalysis.averageMeetingsPerDay}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Busiest Day</p>
                    <p className="font-medium">{status.summary.focusTimeAnalysis.busiestDayOfWeek}</p>
                  </div>
                </div>
              <div className="space-y-2">
                {status.summary.keyInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-primary mt-0.5" />
                    <p className="text-sm text-muted-foreground">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

              {/* Existing PTO */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('existingPTO')}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <Plane className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Existing PTO ({status.existingPTO.length})</h3>
                  </div>
                  {expandedSections.existingPTO ? <ChevronUp /> : <ChevronDown />}
                </button>
                {expandedSections.existingPTO && (
                  <div className="p-4 pt-0">
                    {status.existingPTO.length === 0 ? (
                      <p className="text-gray-500">No PTO scheduled in this period</p>
                    ) : (
                      <div className="space-y-2">
                        {status.existingPTO.map((pto, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{pto.dates}</p>
                              <p className="text-sm text-gray-600">{pto.type}</p>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {pto.duration} {pto.duration === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Holiday Opportunities */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('holidays')}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-600" />
                    <h3 className="text-lg font-semibold">
                      Holidays ({status.holidays.filter(h => h.ptoOpportunity).length} opportunities)
                    </h3>
                  </div>
                  {expandedSections.holidays ? <ChevronUp /> : <ChevronDown />}
                </button>
                {expandedSections.holidays && (
                  <div className="p-4 pt-0">
                    <div className="space-y-2">
                      {status.holidays.map((item, idx) => (
                        <div key={idx} className={`p-3 rounded-lg ${
                          item.ptoOpportunity ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{item.holiday.name}</p>
                              <p className="text-sm text-gray-600">
                                {dayjs(item.holiday.date).format('dddd, MMMM D, YYYY')}
                              </p>
                              {item.ptoOpportunity && (
                                <p className="text-sm text-yellow-800 mt-1">
                                  {item.ptoOpportunity.reason} ({item.ptoOpportunity.totalDaysOff} days off for {item.ptoOpportunity.totalPTODays} PTO)
                                </p>
                              )}
                            </div>
                            {item.ptoOpportunity && (
                              <div className="text-right">
                                <p className="text-sm font-medium text-yellow-800">
                                  {Math.round(item.ptoOpportunity.efficiency * 100)}% efficient
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Commitments */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('commitments')}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold">
                      Commitments ({status.commitments.criticalPeriods.length} critical days)
                    </h3>
                  </div>
                  {expandedSections.commitments ? <ChevronUp /> : <ChevronDown />}
                </button>
                {expandedSections.commitments && (
                  <div className="p-4 pt-0">
                    {/* Monthly breakdown */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Monthly Breakdown</h4>
                      <div className="space-y-2">
                        {Object.entries(status.commitments.byMonth).map(([month, data]) => (
                          <div key={month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{dayjs(month + '-01').format('MMMM YYYY')}</p>
                              <p className="text-sm text-gray-600">
                                {data.meetings} meetings • {data.availableDays} available days
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {Math.round((data.meetings / data.workingDays) * 10) / 10} mtgs/day
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Critical periods */}
                    {status.commitments.criticalPeriods.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Critical Periods</h4>
                        <div className="space-y-2">
                          {status.commitments.criticalPeriods.map((period, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <div>
                                <p className="font-medium text-red-900">{period.dates}</p>
                                <p className="text-sm text-red-700">{period.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PTO Recommendations */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('recommendations')}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold">
                      PTO Recommendations ({status.recommendations.optimalPTO.length})
                    </h3>
                  </div>
                  {expandedSections.recommendations ? <ChevronUp /> : <ChevronDown />}
                </button>
                {expandedSections.recommendations && (
                  <div className="p-4 pt-0">
                    <div className="space-y-3">
                      {status.recommendations.optimalPTO.map((rec, idx) => (
                        <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-green-900">{rec.holiday.name}</p>
                              <p className="text-sm text-green-800 mt-1">{rec.reason}</p>
                              <div className="mt-2">
                                <p className="text-sm text-green-700">Recommended dates:</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {rec.recommendedDates.map((date, dateIdx) => (
                                    <span key={dateIdx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                      {dayjs(date).format('MMM D')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="ml-4 text-right">
                              <p className="text-lg font-bold text-green-900">
                                {rec.totalDaysOff} days off
                              </p>
                              <p className="text-sm text-green-700">
                                for {rec.totalPTODays} PTO
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                {Math.round(rec.efficiency * 100)}% ROI
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {status.recommendations.avoidDates.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Dates to Avoid</h4>
                        <div className="space-y-2">
                          {status.recommendations.avoidDates.map((avoid, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <AlertCircle className="w-4 h-4 text-gray-600" />
                              <div>
                                <p className="font-medium">{avoid.dates}</p>
                                <p className="text-sm text-gray-600">{avoid.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Focus Time Recommendations */}
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Focus Time Recommendations</h3>
                </div>
                <p className="text-sm text-blue-800 mb-2">
                  Based on your meeting patterns, the best days for deep work are:
                </p>
                <div className="flex gap-2">
                  {status.summary.focusTimeAnalysis.recommendedFocusDays.map((day, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {day}
                    </span>
                  ))}
                </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </Modal>
  )
}