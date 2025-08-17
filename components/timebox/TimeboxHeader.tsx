'use client'

import { memo } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Mic, Sparkles, Settings2, CalendarSync } from '@/lib/icons'
import { Button } from '@/components/ui/Button'
import { CardHeader, CardTitle } from '@/components/ui/Card'

interface TimeboxHeaderProps {
  selectedDate: string
  calendarSyncEnabled: boolean
  isCalendarConnected: boolean
  onPreviousDay: () => void
  onNextDay: () => void
  onToday: () => void
  onOpenStandup: () => void
  onOpenRecommendations: () => void
  onOpenSettings: () => void
  onToggleCalendarSync: () => void
}

export const TimeboxHeader = memo(function TimeboxHeader({
  selectedDate,
  calendarSyncEnabled,
  isCalendarConnected,
  onPreviousDay,
  onNextDay,
  onToday,
  onOpenStandup,
  onOpenRecommendations,
  onOpenSettings,
  onToggleCalendarSync
}: TimeboxHeaderProps) {
  const displayDate = format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')
  const isToday = format(new Date(), 'yyyy-MM-dd') === selectedDate
  
  return (
    <CardHeader>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <CardTitle className="text-2xl font-bold">Timebox Schedule</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreviousDay}
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-3 py-1 border rounded-lg bg-white min-w-[200px] text-center">
              <div className="font-medium">{displayDate}</div>
              {!isToday && (
                <button
                  onClick={onToday}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Go to today
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextDay}
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenStandup}
            className="flex items-center gap-1"
          >
            <Mic className="w-4 h-4" />
            Standup
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenRecommendations}
            className="flex items-center gap-1"
          >
            <Sparkles className="w-4 h-4" />
            AI Recommend
          </Button>
          
          {isCalendarConnected && (
            <Button
              variant={calendarSyncEnabled ? "primary" : "outline"}
              size="sm"
              onClick={onToggleCalendarSync}
              className="flex items-center gap-1"
            >
              <CalendarSync className="w-4 h-4" />
              {calendarSyncEnabled ? 'Sync On' : 'Sync Off'}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            className="flex items-center gap-1"
          >
            <Settings2 className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>
    </CardHeader>
  )
})