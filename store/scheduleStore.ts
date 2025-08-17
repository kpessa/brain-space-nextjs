import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'

// Initialize dayjs plugins
dayjs.extend(isBetween)

export interface WorkSchedule {
  monday: { start: string; end: string; enabled: boolean }
  tuesday: { start: string; end: string; enabled: boolean }
  wednesday: { start: string; end: string; enabled: boolean }
  thursday: { start: string; end: string; enabled: boolean }
  friday: { start: string; end: string; enabled: boolean }
  saturday: { start: string; end: string; enabled: boolean }
  sunday: { start: string; end: string; enabled: boolean }
}

export interface PTODay {
  id: string
  date: string // YYYY-MM-DD format
  type: 'pto' | 'holiday' | 'sick' | 'personal'
  description?: string
}

export interface SchedulePreferences {
  autoSwitchMode: boolean
  defaultPersonalMode: 'personal' | 'all'
  defaultWorkMode: 'work' | 'all'
  respectCalendarEvents: boolean
  workCalendarIds?: string[] // Google Calendar IDs to check for work events
}

interface ScheduleStore {
  // Work schedule
  workSchedule: WorkSchedule
  
  // PTO and holidays
  ptoDays: PTODay[]
  
  // Preferences
  preferences: SchedulePreferences
  
  // Actions
  updateWorkSchedule: (day: keyof WorkSchedule, schedule: Partial<WorkSchedule[keyof WorkSchedule]>) => void
  setWorkSchedule: (schedule: WorkSchedule) => void
  addPTODay: (pto: Omit<PTODay, 'id'>) => void
  removePTODay: (id: string) => void
  updatePreferences: (prefs: Partial<SchedulePreferences>) => void
  
  // Helpers
  isWorkTime: (date?: Date) => boolean
  isPTODay: (date: Date) => boolean
  getSuggestedMode: (date?: Date) => 'work' | 'personal' | 'all'
  getScheduleForDay: (date: Date) => { start: string; end: string; enabled: boolean } | null
}

const defaultWorkSchedule: WorkSchedule = {
  monday: { start: '08:00', end: '17:00', enabled: true },
  tuesday: { start: '08:00', end: '17:00', enabled: true },
  wednesday: { start: '08:00', end: '17:00', enabled: true },
  thursday: { start: '08:00', end: '17:00', enabled: true },
  friday: { start: '08:00', end: '17:00', enabled: true },
  saturday: { start: '09:00', end: '12:00', enabled: false },
  sunday: { start: '09:00', end: '12:00', enabled: false },
}

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set, get) => ({
      workSchedule: defaultWorkSchedule,
      ptoDays: [],
      preferences: {
        autoSwitchMode: true,
        defaultPersonalMode: 'personal',
        defaultWorkMode: 'work',
        respectCalendarEvents: true,
      },
      
      updateWorkSchedule: (day, schedule) => {
        set((state) => ({
          workSchedule: {
            ...state.workSchedule,
            [day]: { ...state.workSchedule[day], ...schedule }
          }
        }))
      },
      
      setWorkSchedule: (schedule) => {
        set({ workSchedule: schedule })
      },
      
      addPTODay: (pto) => {
        const id = `pto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        set((state) => ({
          ptoDays: [...state.ptoDays, { ...pto, id }]
        }))
      },
      
      removePTODay: (id) => {
        set((state) => ({
          ptoDays: state.ptoDays.filter(pto => pto.id !== id)
        }))
      },
      
      updatePreferences: (prefs) => {
        set((state) => ({
          preferences: { ...state.preferences, ...prefs }
        }))
      },
      
      isWorkTime: (date = new Date()) => {
        const { workSchedule, isPTODay } = get()
        
        // Check if it's a PTO day
        if (isPTODay(date)) {
          return false
        }
        
        // Get the day of week
        const dayName = dayjs(date).format('dddd').toLowerCase() as keyof WorkSchedule
        const daySchedule = workSchedule[dayName]
        
        // Check if work is enabled for this day
        if (!daySchedule.enabled) {
          return false
        }
        
        // Check if current time is within work hours
        const [startHour, startMinute] = daySchedule.start.split(':').map(Number)
        const [endHour, endMinute] = daySchedule.end.split(':').map(Number)
        
        const startTime = dayjs(date).hour(startHour).minute(startMinute)
        const endTime = dayjs(date).hour(endHour).minute(endMinute)
        
        return dayjs(date).isBetween(startTime, endTime, null, '[]')
      },
      
      isPTODay: (date) => {
        const { ptoDays } = get()
        const dateStr = dayjs(date).format('YYYY-MM-DD')
        return ptoDays.some(pto => pto.date === dateStr)
      },
      
      getSuggestedMode: (date = new Date()) => {
        const { preferences, isWorkTime } = get()
        
        if (!preferences.autoSwitchMode) {
          return 'all' // Don't suggest if auto-switch is disabled
        }
        
        if (isWorkTime(date)) {
          return preferences.defaultWorkMode
        } else {
          return preferences.defaultPersonalMode
        }
      },
      
      getScheduleForDay: (date) => {
        const { workSchedule } = get()
        const dayName = dayjs(date).format('dddd').toLowerCase() as keyof WorkSchedule
        return workSchedule[dayName]
      },
    }),
    {
      name: 'schedule-preferences',
      version: 1,
    }
  )
)

// Helper function to get next work day
export function getNextWorkDay(date: Date = new Date()): Date {
  const store = useScheduleStore.getState()
  let nextDay = dayjs(date).add(1, 'day')
  
  // Keep looking until we find a work day
  for (let i = 0; i < 14; i++) { // Max 2 weeks ahead
    if (!store.isPTODay(nextDay.toDate())) {
      const dayName = nextDay.format('dddd').toLowerCase() as keyof WorkSchedule
      if (store.workSchedule[dayName].enabled) {
        return nextDay.toDate()
      }
    }
    nextDay = nextDay.add(1, 'day')
  }
  
  return nextDay.toDate() // Fallback
}

// Helper to check if a specific time slot is within work hours
export function isTimeSlotInWorkHours(
  slotStart: string, 
  slotEnd: string, 
  date: Date = new Date()
): boolean {
  const store = useScheduleStore.getState()
  const schedule = store.getScheduleForDay(date)
  
  if (!schedule?.enabled || store.isPTODay(date)) {
    return false
  }
  
  const [workStartHour, workStartMin] = schedule.start.split(':').map(Number)
  const [workEndHour, workEndMin] = schedule.end.split(':').map(Number)
  const [slotStartHour, slotStartMin] = slotStart.split(':').map(Number)
  const [slotEndHour, slotEndMin] = slotEnd.split(':').map(Number)
  
  const workStartMinutes = workStartHour * 60 + workStartMin
  const workEndMinutes = workEndHour * 60 + workEndMin
  const slotStartMinutes = slotStartHour * 60 + slotStartMin
  const slotEndMinutes = slotEndHour * 60 + slotEndMin
  
  // Check if slot overlaps with work hours
  return slotStartMinutes < workEndMinutes && slotEndMinutes > workStartMinutes
}