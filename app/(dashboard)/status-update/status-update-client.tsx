'use client'

import { useState, useEffect, useCallback } from 'react'
import dayjs from '@/lib/dayjs'
import { 
  FileText, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Home,
  Globe,
  Star
} from '@/lib/icons'
// Additional icons needed
import { Plane, CalendarCheck } from 'lucide-react'
import { useUserPreferencesStore, type UserMode } from '@/store/userPreferencesStore'

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

interface StatusUpdateData {
  period: {
    start: string
    end: string
  }
  deliverables: {
    completed: Array<{
      id: string
      title: string
      type: string
      completedAt?: string
      highlights?: string[]
    }>
    inProgress: Array<{
      id: string
      title: string
      type: string
      progress: string
      updates: number
    }>
    upcoming: Array<{
      id: string
      title: string
      type: string
      dueDate?: string
      priority: number
    }>
  }
  outOfOffice: Array<{
    dates: string
    duration: number
    type: string
    reason?: string
  }>
  appointments: Array<{
    dates: string
    duration: {
      days: number
      hours?: number
      isPartialDay: boolean
    }
    type: string
    title: string
    isPartialDay: boolean
  }>
  workTravel: Array<{
    dates: string
    duration: number
    type: string
    title: string
    suggestedPTO?: string[]
  }>
  suggestedPTO?: string[]
  eventCategorizations?: EventCategorization[]
  criticalEvents: Array<{
    date: string
    title: string
    type: 'go-live' | 'deployment' | 'release' | 'deadline'
    project?: string
  }>
  blockers: Array<{
    id: string
    title: string
    reason: string
    since: string
  }>
  metrics: {
    completedCount: number
    inProgressCount: number
    totalUpdates: number
    productivityScore?: number
  }
}

export default function StatusUpdateClient({ userId }: { userId: string }) {
  const { currentMode } = useUserPreferencesStore()
  const [statusData, setStatusData] = useState<StatusUpdateData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    lookback: 2, // weeks
    lookahead: 2  // weeks
  })
  const [expandedSections, setExpandedSections] = useState({
    deliverables: true,
    inProgress: true,
    upcoming: true,
    outOfOffice: true,
    appointments: true,
    workTravel: true,
    suggestedPTO: true,
    criticalEvents: false,
    blockers: false
  })
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [modeOverride, setModeOverride] = useState<UserMode | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [eventCategorizations, setEventCategorizations] = useState<Record<string, 'appointment' | 'pto' | 'work_travel' | 'skip'>>({})
  const [originalCategorizations, setOriginalCategorizations] = useState<any[]>([])

  const fetchStatusUpdate = useCallback(async (applyManualCategories = false) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const now = new Date()
      const startDate = dayjs(now).subtract(dateRange.lookback, 'week').toDate()
      const endDate = dayjs(now).add(dateRange.lookahead, 'week').toDate()
      
      const effectiveMode = modeOverride || currentMode
      
      const response = await fetch('/api/status-update/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          mode: effectiveMode,
          dateRange: {
            start: dayjs(startDate).format('YYYY-MM-DD'),
            end: dayjs(endDate).format('YYYY-MM-DD'),
            lookbackWeeks: dateRange.lookback,
            lookaheadWeeks: dateRange.lookahead
          },
          // Include manual categorizations if we're applying them
          manualCategorizations: applyManualCategories ? eventCategorizations : undefined
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate status update')
      }
      
      const data = await response.json()
      setStatusData(data)
      
      // Store original categorizations if available
      if (data.eventCategorizations) {
        setOriginalCategorizations(data.eventCategorizations)
        // Initialize event categorizations with AI suggestions
        const initialCategories: Record<string, any> = {}
        data.eventCategorizations.forEach((cat: EventCategorization) => {
          initialCategories[cat.eventId] = cat.category
        })
        setEventCategorizations(initialCategories)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status update')
    } finally {
      setIsLoading(false)
    }
  }, [dateRange, modeOverride, currentMode, userId])

  useEffect(() => {
    fetchStatusUpdate()
  }, [dateRange, modeOverride, currentMode, fetchStatusUpdate])

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const copyToClipboard = async (section: 'all' | 'deliverables' | 'ooo' | 'blockers') => {
    if (!statusData) return
    
    let content = ''
    
    if (section === 'all') {
      content = generateFullStatusText()
    } else if (section === 'deliverables') {
      content = generateDeliverablesText()
    } else if (section === 'ooo') {
      content = generateOOOText()
    } else if (section === 'blockers') {
      content = generateBlockersText()
    }
    
    await navigator.clipboard.writeText(content)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const generateFullStatusText = () => {
    if (!statusData) return ''
    
    const sections = []
    
    // Header
    sections.push(`Status Update - ${dayjs(statusData.period.start).format('MMM D')} to ${dayjs(statusData.period.end).format('MMM D, YYYY')}`)
    sections.push('')
    
    // Completed Deliverables
    if (statusData.deliverables.completed.length > 0) {
      sections.push('## Completed Deliverables')
      statusData.deliverables.completed.forEach(item => {
        sections.push(`• ${item.title}`)
        if (item.highlights && item.highlights.length > 0) {
          item.highlights.forEach(highlight => {
            sections.push(`  - ${highlight}`)
          })
        }
      })
      sections.push('')
    }
    
    // In Progress
    if (statusData.deliverables.inProgress.length > 0) {
      sections.push('## In Progress')
      statusData.deliverables.inProgress.forEach(item => {
        sections.push(`• ${item.title} - ${item.progress}`)
      })
      sections.push('')
    }
    
    // Upcoming
    if (statusData.deliverables.upcoming.length > 0) {
      sections.push('## Next Two Weeks')
      statusData.deliverables.upcoming.forEach(item => {
        const dueInfo = item.dueDate ? ` (Due: ${dayjs(item.dueDate).format('MMM D')})` : ''
        sections.push(`• ${item.title}${dueInfo}`)
      })
      sections.push('')
    }
    
    // Critical Events
    if (statusData.criticalEvents.length > 0) {
      sections.push('## Critical Events')
      statusData.criticalEvents.forEach(event => {
        sections.push(`• ${dayjs(event.date).format('MMM D')}: ${event.title}`)
      })
      sections.push('')
    }
    
    // Work Travel
    if (statusData.workTravel && statusData.workTravel.length > 0) {
      sections.push('## Work Travel/On-Site')
      statusData.workTravel.forEach(travel => {
        sections.push(`• ${travel.dates}: ${travel.title} (${travel.duration} day${travel.duration > 1 ? 's' : ''})`)
      })
      sections.push('')
    }
    
    // Out of Office (PTO)
    if (statusData.outOfOffice.length > 0) {
      sections.push('## Out of Office')
      statusData.outOfOffice.forEach(ooo => {
        sections.push(`• ${ooo.dates}: ${ooo.type} (${ooo.duration} day${ooo.duration > 1 ? 's' : ''})`)
      })
      sections.push('')
    }
    
    // Appointments
    if (statusData.appointments && statusData.appointments.length > 0) {
      sections.push('## Appointments')
      statusData.appointments.forEach(apt => {
        sections.push(`• ${apt.dates}: ${apt.title}`)
      })
      sections.push('')
    }
    
    // Blockers
    if (statusData.blockers.length > 0) {
      sections.push('## Blockers/Concerns')
      statusData.blockers.forEach(blocker => {
        sections.push(`• ${blocker.title}: ${blocker.reason}`)
      })
    }
    
    return sections.join('\n')
  }

  const generateDeliverablesText = () => {
    if (!statusData) return ''
    
    const sections = []
    sections.push('Deliverables Summary')
    sections.push('')
    
    if (statusData.deliverables.completed.length > 0) {
      sections.push('Completed:')
      statusData.deliverables.completed.forEach(item => {
        sections.push(`• ${item.title}`)
      })
    }
    
    return sections.join('\n')
  }

  const generateOOOText = () => {
    if (!statusData) return ''
    
    const sections = []
    sections.push('Out of Office Schedule')
    sections.push('')
    
    if (statusData.outOfOffice.length > 0) {
      statusData.outOfOffice.forEach(ooo => {
        sections.push(`• ${ooo.dates}: ${ooo.type} (${ooo.duration} day${ooo.duration > 1 ? 's' : ''})`)
      })
    } else {
      sections.push('No planned time off in this period')
    }
    
    return sections.join('\n')
  }

  const generateBlockersText = () => {
    if (!statusData) return ''
    
    const sections = []
    sections.push('Current Blockers')
    sections.push('')
    
    if (statusData.blockers.length > 0) {
      statusData.blockers.forEach(blocker => {
        sections.push(`• ${blocker.title}: ${blocker.reason}`)
      })
    } else {
      sections.push('No current blockers')
    }
    
    return sections.join('\n')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-brain-600" />
            <h1 className="text-3xl font-bold text-gray-900">Status Update</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {originalCategorizations.length > 0 && (
              <button
                onClick={() => setReviewMode(!reviewMode)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  reviewMode 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>{reviewMode ? 'Hide Review' : 'Review Events'}</span>
              </button>
            )}
            <button
              onClick={fetchStatusUpdate}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={() => copyToClipboard('all')}
              className="flex items-center space-x-2 px-4 py-2 bg-brain-600 text-white rounded-lg hover:bg-brain-700 transition-colors"
            >
              <Copy className="h-4 w-4" />
              <span>{copiedSection === 'all' ? 'Copied!' : 'Copy All'}</span>
            </button>
          </div>
        </div>
        
        {/* Mode Indicator and Date Range Controls */}
        <div className="space-y-4">
          {/* Mode Selector */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">Mode:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setModeOverride('work')}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      (modeOverride || currentMode) === 'work'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Work</span>
                  </button>
                  <button
                    onClick={() => setModeOverride('personal')}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      (modeOverride || currentMode) === 'personal'
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    <span>Personal</span>
                  </button>
                  <button
                    onClick={() => setModeOverride('all')}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      (modeOverride || currentMode) === 'all'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>All</span>
                  </button>
                </div>
              </div>
              {(modeOverride || currentMode) === 'personal' && (
                <div className="flex items-center space-x-2 text-sm text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>Showing personal items only</span>
                </div>
              )}
            </div>
          </div>

          {/* Date Range Controls */}
          <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="text-sm text-gray-600">Look Back</label>
                <select
                  value={dateRange.lookback}
                  onChange={(e) => setDateRange(prev => ({ ...prev, lookback: Number(e.target.value) }))}
                  className="ml-2 px-3 py-1 border border-gray-300 rounded-md"
                >
                  <option value={1}>1 week</option>
                  <option value={2}>2 weeks</option>
                  <option value={3}>3 weeks</option>
                  <option value={4}>4 weeks</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Look Ahead</label>
                <select
                  value={dateRange.lookahead}
                  onChange={(e) => setDateRange(prev => ({ ...prev, lookahead: Number(e.target.value) }))}
                  className="ml-2 px-3 py-1 border border-gray-300 rounded-md"
                >
                  <option value={1}>1 week</option>
                  <option value={2}>2 weeks</option>
                  <option value={3}>3 weeks</option>
                  <option value={4}>4 weeks</option>
                </select>
              </div>
            </div>
            
            {statusData && (
              <div className="text-sm text-gray-600">
                {dayjs(statusData.period.start).format('MMM D')} - {dayjs(statusData.period.end).format('MMM D, YYYY')}
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brain-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {statusData && !isLoading && (
        <div className="space-y-6">
          {/* Event Review Mode */}
          {reviewMode && originalCategorizations.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Review Calendar Event Categories</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                AI has categorized your events. You can adjust them as needed:
              </p>
              <div className="space-y-3">
                {originalCategorizations.map((cat) => (
                  <div key={cat.eventId} className="bg-white p-4 rounded-lg border border-purple-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{cat.eventTitle}</p>
                        <p className="text-sm text-gray-600 mt-1">{cat.dates}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">AI confidence: {Math.round(cat.confidence * 100)}%</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{cat.reasoning}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <select
                          value={eventCategorizations[cat.eventId] || cat.category}
                          onChange={(e) => setEventCategorizations(prev => ({
                            ...prev,
                            [cat.eventId]: e.target.value as any
                          }))}
                          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="work_travel">Work Travel</option>
                          <option value="pto">PTO/Personal</option>
                          <option value="appointment">Appointment</option>
                          <option value="skip">Skip/Hide</option>
                        </select>
                      </div>
                    </div>
                    {cat.suggestedPTO && cat.suggestedPTO.length > 0 && (
                      <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
                        <span className="font-medium text-purple-800">Suggested PTO: </span>
                        {cat.suggestedPTO.map((date, i) => (
                          <span key={i} className="text-purple-700">
                            {dayjs(date).format('MMM D')}
                            {i < cat.suggestedPTO!.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  // Apply manual categorizations
                  fetchStatusUpdate(true)
                  setReviewMode(false)
                }}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Apply Changes
              </button>
            </div>
          )}

          {/* Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Completed</p>
                  <p className="text-2xl font-bold text-green-900">{statusData.metrics.completedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-900">{statusData.metrics.inProgressCount}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Updates</p>
                  <p className="text-2xl font-bold text-purple-900">{statusData.metrics.totalUpdates}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">OOO Days</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {statusData.outOfOffice.reduce((sum, ooo) => sum + ooo.duration, 0)}
                  </p>
                </div>
                <Plane className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Completed Deliverables */}
          <div className="border border-gray-200 rounded-lg">
            <div
              onClick={() => toggleSection('deliverables')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold">Completed Deliverables ({statusData.deliverables.completed.length})</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard('deliverables')
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {expandedSections.deliverables ? <ChevronUp /> : <ChevronDown />}
              </div>
            </div>
            {expandedSections.deliverables && (
              <div className="p-4 pt-0">
                {statusData.deliverables.completed.length === 0 ? (
                  <p className="text-gray-500">No completed deliverables in this period</p>
                ) : (
                  <div className="space-y-3">
                    {statusData.deliverables.completed.map((item) => (
                      <div key={item.id} className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-green-900">{item.title}</p>
                            <p className="text-sm text-green-700 mt-1">Type: {item.type}</p>
                            {item.highlights && item.highlights.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {item.highlights.map((highlight, idx) => (
                                  <li key={idx} className="text-sm text-green-800 flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{highlight}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          {item.completedAt && (
                            <span className="text-xs text-green-600">
                              {dayjs(item.completedAt).format('MMM D')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* In Progress */}
          <div className="border border-gray-200 rounded-lg">
            <div
              onClick={() => toggleSection('inProgress')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">In Progress ({statusData.deliverables.inProgress.length})</h3>
              </div>
              {expandedSections.inProgress ? <ChevronUp /> : <ChevronDown />}
            </div>
            {expandedSections.inProgress && (
              <div className="p-4 pt-0">
                {statusData.deliverables.inProgress.length === 0 ? (
                  <p className="text-gray-500">No items currently in progress</p>
                ) : (
                  <div className="space-y-3">
                    {statusData.deliverables.inProgress.map((item) => (
                      <div key={item.id} className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-blue-900">{item.title}</p>
                            <p className="text-sm text-blue-700 mt-1">{item.progress}</p>
                          </div>
                          <span className="text-xs text-blue-600">
                            {item.updates} updates
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Work Travel */}
          {statusData.workTravel && statusData.workTravel.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <div
                onClick={() => toggleSection('workTravel')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">Work Travel ({statusData.workTravel.length})</h3>
                </div>
                {expandedSections.workTravel ? <ChevronUp /> : <ChevronDown />}
              </div>
              {expandedSections.workTravel && (
                <div className="p-4 pt-0">
                  <div className="space-y-3">
                    {statusData.workTravel.map((travel, idx) => (
                      <div key={idx} className="p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-purple-900">{travel.title}</p>
                            <p className="text-sm text-purple-700 mt-1">{travel.dates}</p>
                            <p className="text-sm text-purple-600">
                              {travel.type} - {travel.duration} day{travel.duration > 1 ? 's' : ''}
                            </p>
                            {travel.suggestedPTO && travel.suggestedPTO.length > 0 && (
                              <div className="mt-2 p-2 bg-purple-100 rounded">
                                <p className="text-xs font-medium text-purple-800 mb-1">Suggested PTO:</p>
                                {travel.suggestedPTO.map((date, i) => (
                                  <p key={i} className="text-xs text-purple-700">
                                    {dayjs(date).format('dddd, MMM D')} - Recovery day
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Out of Office */}
          <div className="border border-gray-200 rounded-lg">
            <div
              onClick={() => toggleSection('outOfOffice')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold">Out of Office ({statusData.outOfOffice.length})</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard('ooo')
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {expandedSections.outOfOffice ? <ChevronUp /> : <ChevronDown />}
              </div>
            </div>
            {expandedSections.outOfOffice && (
              <div className="p-4 pt-0">
                {statusData.outOfOffice.length === 0 ? (
                  <p className="text-gray-500">No planned time off in this period</p>
                ) : (
                  <div className="space-y-2">
                    {statusData.outOfOffice.map((ooo, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                        <Plane className="w-4 h-4 text-orange-600" />
                        <div>
                          <p className="font-medium text-orange-900">{ooo.dates}</p>
                          <p className="text-sm text-orange-700">
                            {ooo.type} - {ooo.duration} day{ooo.duration > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Appointments */}
          {statusData.appointments && statusData.appointments.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <div
                onClick={() => toggleSection('appointments')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Appointments ({statusData.appointments.length})</h3>
                </div>
                {expandedSections.appointments ? <ChevronUp /> : <ChevronDown />}
              </div>
              {expandedSections.appointments && (
                <div className="p-4 pt-0">
                  <div className="space-y-2">
                    {statusData.appointments.map((apt, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                        <CalendarCheck className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900">{apt.title}</p>
                          <p className="text-sm text-blue-700">
                            {apt.dates}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggested PTO */}
          {statusData.suggestedPTO && statusData.suggestedPTO.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <div
                onClick={() => toggleSection('suggestedPTO')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold">Suggested PTO Days ({statusData.suggestedPTO.length})</h3>
                </div>
                {expandedSections.suggestedPTO ? <ChevronUp /> : <ChevronDown />}
              </div>
              {expandedSections.suggestedPTO && (
                <div className="p-4 pt-0">
                  <p className="text-sm text-gray-600 mb-3">
                    Strategic PTO days to maximize time off around your work travel:
                  </p>
                  <div className="space-y-2">
                    {statusData.suggestedPTO.map((date, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                        <Star className="w-4 h-4 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-900">
                            {dayjs(date).format('dddd, MMMM D')}
                          </p>
                          <p className="text-sm text-yellow-700">Recovery/Extension day</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Blockers */}
          {statusData.blockers.length > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <div
                onClick={() => toggleSection('blockers')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold">Blockers ({statusData.blockers.length})</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard('blockers')
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {expandedSections.blockers ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>
              {expandedSections.blockers && (
                <div className="p-4 pt-0">
                  <div className="space-y-2">
                    {statusData.blockers.map((blocker) => (
                      <div key={blocker.id} className="p-3 bg-red-50 rounded-lg">
                        <p className="font-medium text-red-900">{blocker.title}</p>
                        <p className="text-sm text-red-700 mt-1">{blocker.reason}</p>
                        <p className="text-xs text-red-600 mt-1">Since {dayjs(blocker.since).format('MMM D')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}