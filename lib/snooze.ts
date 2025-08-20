// Snooze calculation utilities

export type SnoozeUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
export type SpecialSnoozeOption = 'until-tomorrow' | 'until-next-week' | 'until-tonight' | 'until-morning'

export function calculateSnoozeUntil(value: number, unit: SnoozeUnit | SpecialSnoozeOption): Date {
  const now = new Date()
  
  // Handle special relative cases
  switch(unit) {
    case 'until-tomorrow': {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0) // 9 AM tomorrow
      return tomorrow
    }
    
    case 'until-next-week': {
      const nextMonday = new Date(now)
      const currentDay = now.getDay()
      const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay) // If Sunday, go to tomorrow; otherwise next Monday
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday)
      nextMonday.setHours(9, 0, 0, 0) // 9 AM Monday
      return nextMonday
    }
    
    case 'until-tonight': {
      const tonight = new Date(now)
      tonight.setHours(18, 0, 0, 0) // 6 PM today
      // If it's already past 6 PM, set to 6 PM tomorrow
      if (tonight <= now) {
        tonight.setDate(tonight.getDate() + 1)
      }
      return tonight
    }
    
    case 'until-morning': {
      const morning = new Date(now)
      morning.setDate(morning.getDate() + 1) // Tomorrow
      morning.setHours(6, 0, 0, 0) // 6 AM
      return morning
    }
    
    // Handle standard duration units
    case 'minutes':
      return new Date(now.getTime() + value * 60 * 1000)
    
    case 'hours':
      return new Date(now.getTime() + value * 60 * 60 * 1000)
    
    case 'days':
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000)
    
    case 'weeks':
      return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000)
    
    case 'months': {
      const result = new Date(now)
      result.setMonth(result.getMonth() + value)
      return result
    }
    
    default:
      // Default to hours if unit is unrecognized
      return new Date(now.getTime() + value * 60 * 60 * 1000)
  }
}

export function formatSnoozeUntil(date: Date | string): string {
  const snoozeDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = snoozeDate.getTime() - now.getTime()
  
  if (diffMs <= 0) return 'Expired'
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
  }
  
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
  }
  
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`
  }
  
  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}`
}

export function isSnoozed(node: { snoozedUntil?: string }): boolean {
  if (!node.snoozedUntil) return false
  
  const now = new Date()
  const snoozeEnd = new Date(node.snoozedUntil)
  return now < snoozeEnd
}