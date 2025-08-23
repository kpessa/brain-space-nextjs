import React, { useMemo } from 'react'
import dayjs from '@/lib/dayjs'
import { DayCell } from './DayCell'
import { SpanningEventsSection } from './SpanningEventsSection'

interface CalendarEvent {
  id?: string
  title?: string
  start?: Date | string
  end?: Date | string
  allDay?: boolean
  resource?: unknown
  [key: string]: unknown
}

interface EventSpanInfo {
  span: number
  left: number
  isFirst: boolean
  isLast: boolean
}

interface SlotInfo {
  start: Date
  end: Date
  action: string
  slots: Date[]
}

interface WeekRowProps {
  week: Date[]
  currentDate: Date
  currentWeekStart: dayjs.Dayjs
  events: CalendarEvent[]
  eventPropGetter?: (event: CalendarEvent) => Record<string, unknown>
  onSelectEvent: (event: CalendarEvent) => void
  onSelectSlot: (slotInfo: SlotInfo) => void
  getEventsForDay: (day: Date) => CalendarEvent[]
  isAllDayEvent: (event: CalendarEvent) => boolean
  getTimedEventsForDay: (day: Date) => CalendarEvent[]
  getAllDayEventsForDay: (day: Date) => CalendarEvent[]
  getEventSpanInfo: (event: CalendarEvent, day: Date, week: Date[]) => EventSpanInfo
}

export const WeekRow: React.FC<WeekRowProps> = React.memo(
  ({
    week,
    currentDate,
    currentWeekStart,
    events,
    eventPropGetter,
    onSelectEvent,
    onSelectSlot,
    getEventsForDay,
    isAllDayEvent,
    getTimedEventsForDay,
    getAllDayEventsForDay,
    getEventSpanInfo,
  }) => {
    const isCurrentWeek = week.some(day =>
      dayjs(day).startOf('week').isSame(currentWeekStart, 'week')
    )

    const handleSlotClick = (day: Date) => {
      const slotInfo = {
        start: day,
        end: dayjs(day).add(1, 'hour').toDate(),
        action: 'select',
        slots: [day],
      }
      onSelectSlot(slotInfo)
    }

    // Memoize expensive spanning event calculations
    const { allDaySpanningEvents, timedSpanningEvents } = useMemo(() => {
      const allDaySpannings: { event: any; startDay: number; spanDays: number }[] = []
      const timedSpannings: { event: any; startDay: number; spanDays: number }[] = []

      week.forEach((day, dayIndex) => {
        const dayEvents = getEventsForDay(day)

        dayEvents.forEach(event => {
          const spanInfo = getEventSpanInfo(event, day, week)
          // Only add multi-day events to spanning events, and only from their first day in the week
          if (spanInfo.isMultiDay && spanInfo.isFirstDayInWeek) {
            const spanningEvent = {
              event,
              startDay: dayIndex,
              spanDays: spanInfo.spanDays,
            }

            const isAllDay = isAllDayEvent(event)

            if (isAllDay) {
              allDaySpannings.push(spanningEvent)
            } else {
              timedSpannings.push(spanningEvent)
            }
          }
        })
      })

      return {
        allDaySpanningEvents: allDaySpannings,
        timedSpanningEvents: timedSpannings,
      }
    }, [week, events, getEventsForDay, getEventSpanInfo, isAllDayEvent])

    return (
      <div
        className={`week-row ${
          isCurrentWeek
            ? 'current-week bg-brain-50/70 backdrop-blur-sm p-2 rounded-xl border-2 border-brain-300/60 shadow-sm'
            : 'p-1'
        }`}
      >
        {/* Spanning events area - flexible height */}
        <SpanningEventsSection
          allDaySpanningEvents={allDaySpanningEvents}
          timedSpanningEvents={timedSpanningEvents}
          eventPropGetter={eventPropGetter}
          onSelectEvent={onSelectEvent}
        />

        <div className="grid grid-cols-7 gap-0.5">
          {week.map((day, dayIndex) => {
            const isToday = dayjs(day).isSame(dayjs(), 'day')

            // Get single-day all-day events for this day
            const singleDayAllDayEvents = getAllDayEventsForDay(day).filter(event => {
              const spanInfo = getEventSpanInfo(event, day, week)
              return !spanInfo.isMultiDay
            })

            // Get single-day timed events for this day
            const singleDayTimedEvents = getTimedEventsForDay(day).filter(event => {
              const spanInfo = getEventSpanInfo(event, day, week)
              return !spanInfo.isMultiDay
            })

            return (
              <DayCell
                key={dayIndex}
                day={day}
                currentDate={currentDate}
                isToday={isToday}
                singleDayAllDayEvents={singleDayAllDayEvents}
                timedEvents={singleDayTimedEvents}
                eventPropGetter={eventPropGetter}
                onSelectEvent={onSelectEvent}
                onDayClick={handleSlotClick}
              />
            )
          })}
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.week.length === nextProps.week.length &&
      prevProps.week.every((day, i) => day.getTime() === nextProps.week[i].getTime()) &&
      prevProps.currentDate.getTime() === nextProps.currentDate.getTime() &&
      prevProps.currentWeekStart.isSame(nextProps.currentWeekStart) &&
      prevProps.events.length === nextProps.events.length
    )
  }
)