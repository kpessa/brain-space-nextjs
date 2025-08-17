import dayjs from 'dayjs'

export type HolidayType = 'federal' | 'popular' | 'cultural' | 'company'
export type PTOStrategy = 'day-after' | 'day-before' | 'long-weekend' | 'week-off' | 'bridge-days'

export interface Holiday {
  name: string
  date: string // YYYY-MM-DD format
  type: HolidayType
  ptoStrategy?: PTOStrategy
  description?: string
}

export interface PTORecommendation {
  holiday: Holiday
  recommendedDates: string[]
  reason: string
  totalPTODays: number
  totalDaysOff: number // Including weekends
  efficiency: number // Ratio of total days off to PTO days used
}

// US Federal Holidays and Popular Holidays for 2024-2025
export const holidays: Holiday[] = [
  // 2024 Remaining
  { name: "Christmas Day", date: "2024-12-25", type: "federal", ptoStrategy: "week-off" },
  
  // 2025
  { name: "New Year's Day", date: "2025-01-01", type: "federal", ptoStrategy: "bridge-days" },
  { name: "Martin Luther King Jr. Day", date: "2025-01-20", type: "federal", ptoStrategy: "long-weekend" },
  { name: "Valentine's Day", date: "2025-02-14", type: "popular" },
  { name: "Presidents' Day", date: "2025-02-17", type: "federal", ptoStrategy: "long-weekend" },
  { name: "St. Patrick's Day", date: "2025-03-17", type: "popular", ptoStrategy: "day-after", description: "Monday - consider taking Tuesday off" },
  { name: "Good Friday", date: "2025-04-18", type: "popular", ptoStrategy: "long-weekend" },
  { name: "Easter Sunday", date: "2025-04-20", type: "popular" },
  { name: "Cinco de Mayo", date: "2025-05-05", type: "cultural", ptoStrategy: "day-after", description: "Monday - consider taking Tuesday off" },
  { name: "Memorial Day", date: "2025-05-26", type: "federal", ptoStrategy: "long-weekend" },
  { name: "Juneteenth", date: "2025-06-19", type: "federal", ptoStrategy: "long-weekend" },
  { name: "Independence Day", date: "2025-07-04", type: "federal", ptoStrategy: "long-weekend" },
  { name: "Labor Day", date: "2025-09-01", type: "federal", ptoStrategy: "long-weekend" },
  { name: "Columbus Day", date: "2025-10-13", type: "federal", ptoStrategy: "long-weekend" },
  { name: "Halloween", date: "2025-10-31", type: "popular", ptoStrategy: "day-after" },
  { name: "Veterans Day", date: "2025-11-11", type: "federal", ptoStrategy: "long-weekend" },
  { name: "Thanksgiving Day", date: "2025-11-27", type: "federal", ptoStrategy: "week-off" },
  { name: "Black Friday", date: "2025-11-28", type: "popular", ptoStrategy: "bridge-days" },
  { name: "Christmas Day", date: "2025-12-25", type: "federal", ptoStrategy: "week-off" },
  { name: "New Year's Eve", date: "2025-12-31", type: "popular", ptoStrategy: "bridge-days" }
]

/**
 * Get holidays within a date range
 */
export function getHolidaysInRange(startDate: Date, endDate: Date): Holiday[] {
  return holidays.filter(holiday => {
    const holidayDate = new Date(holiday.date)
    return holidayDate >= startDate && holidayDate <= endDate
  })
}

/**
 * Generate PTO recommendations for a holiday
 */
export function generatePTORecommendation(holiday: Holiday): PTORecommendation | null {
  if (!holiday.ptoStrategy) return null
  
  const holidayDate = new Date(holiday.date)
  const dayOfWeek = dayjs(holidayDate).day() // 0 = Sunday, 6 = Saturday
  const recommendedDates: string[] = []
  let reason = ''
  
  switch (holiday.ptoStrategy) {
    case 'day-after':
      // If holiday is on Friday, no need for PTO
      if (dayOfWeek === 5) return null
      
      // If holiday is on Monday-Thursday, take the next day
      if (dayOfWeek >= 1 && dayOfWeek <= 4) {
        const nextDay = dayjs(holidayDate).add(1, 'day')
        recommendedDates.push(nextDay.format('YYYY-MM-DD'))
        reason = `Take ${nextDay.format('dddd')} off after ${holiday.name}`
      }
      break
      
    case 'day-before':
      // If holiday is on Monday, no need for PTO (weekend before)
      if (dayOfWeek === 1) return null
      
      // If holiday is on Tuesday-Friday, take the day before
      if (dayOfWeek >= 2 && dayOfWeek <= 5) {
        const prevDay = dayjs(holidayDate).subtract(1, 'day')
        recommendedDates.push(prevDay.format('YYYY-MM-DD'))
        reason = `Take ${prevDay.format('dddd')} off before ${holiday.name}`
      }
      break
      
    case 'long-weekend':
      // For Monday holidays, take Friday before
      if (dayOfWeek === 1) {
        recommendedDates.push(dayjs(holidayDate).subtract(3, 'day').format('YYYY-MM-DD'))
        reason = 'Take Friday for a 4-day weekend'
      }
      // For Friday holidays, take Monday after
      else if (dayOfWeek === 5) {
        recommendedDates.push(dayjs(holidayDate).add(3, 'day').format('YYYY-MM-DD'))
        reason = 'Take Monday for a 4-day weekend'
      }
      // For mid-week holidays, suggest making it a long weekend
      else if (dayOfWeek >= 2 && dayOfWeek <= 4) {
        // Take days to connect to weekend
        if (dayOfWeek === 2) { // Tuesday
          recommendedDates.push(dayjs(holidayDate).subtract(1, 'day').format('YYYY-MM-DD'))
          reason = 'Take Monday for a 4-day weekend'
        } else if (dayOfWeek === 3) { // Wednesday
          recommendedDates.push(
            dayjs(holidayDate).subtract(2, 'day').format('YYYY-MM-DD'),
            dayjs(holidayDate).subtract(1, 'day').format('YYYY-MM-DD')
          )
          reason = 'Take Monday-Tuesday for a 5-day break'
        } else if (dayOfWeek === 4) { // Thursday
          recommendedDates.push(dayjs(holidayDate).add(1, 'day').format('YYYY-MM-DD'))
          reason = 'Take Friday for a 4-day weekend'
        }
      }
      break
      
    case 'week-off':
      // For holidays like Thanksgiving or Christmas, take the whole week
      const startOfWeek = dayjs(holidayDate).subtract(dayOfWeek - 1, 'day') // Monday
      for (let i = 0; i < 5; i++) {
        const date = startOfWeek.add(i, 'day')
        if (!date.isSame(holidayDate, 'day') && date.day() !== 0 && date.day() !== 6) {
          recommendedDates.push(date.format('YYYY-MM-DD'))
        }
      }
      reason = `Take the week of ${holiday.name} off`
      break
      
    case 'bridge-days':
      // Connect holiday to nearest weekend
      if (dayOfWeek === 2) { // Tuesday
        recommendedDates.push(dayjs(holidayDate).subtract(1, 'day').format('YYYY-MM-DD'))
        reason = 'Bridge Monday to create 4-day weekend'
      } else if (dayOfWeek === 4) { // Thursday
        recommendedDates.push(dayjs(holidayDate).add(1, 'day').format('YYYY-MM-DD'))
        reason = 'Bridge Friday to create 4-day weekend'
      }
      break
  }
  
  if (recommendedDates.length === 0) return null
  
  // Calculate total days off including weekends
  const allDates = [...recommendedDates, holiday.date]
  const minDate = dayjs(Math.min(...allDates.map(d => dayjs(d).valueOf())))
  const maxDate = dayjs(Math.max(...allDates.map(d => dayjs(d).valueOf())))
  const totalDaysOff = maxDate.diff(minDate, 'day') + 1
  
  const efficiency = totalDaysOff / recommendedDates.length
  
  return {
    holiday,
    recommendedDates,
    reason,
    totalPTODays: recommendedDates.length,
    totalDaysOff,
    efficiency
  }
}

/**
 * Get all PTO recommendations for a date range
 */
export function getPTORecommendations(startDate: Date, endDate: Date): PTORecommendation[] {
  const holidaysInRange = getHolidaysInRange(startDate, endDate)
  const recommendations: PTORecommendation[] = []
  
  holidaysInRange.forEach(holiday => {
    const recommendation = generatePTORecommendation(holiday)
    if (recommendation) {
      recommendations.push(recommendation)
    }
  })
  
  // Sort by efficiency (best bang for your PTO buck)
  return recommendations.sort((a, b) => b.efficiency - a.efficiency)
}

/**
 * Check if a date is a holiday
 */
export function isHoliday(date: Date): Holiday | null {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  return holidays.find(h => h.date === dateStr) || null
}

/**
 * Get upcoming holidays (next 6 months by default)
 */
export function getUpcomingHolidays(monthsAhead: number = 6): Holiday[] {
  const today = dayjs().startOf('day').toDate()
  const endDate = dayjs().add(monthsAhead, 'month').toDate()
  
  return getHolidaysInRange(today, endDate)
}