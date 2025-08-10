import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'

interface Calendar {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
}

interface CalendarStore {
  selectedCalendarIds: Set<string>
  setSelectedCalendarIds: (ids: Set<string>) => void
  addSelectedCalendarId: (id: string) => void
  removeSelectedCalendarId: (id: string) => void
  toggleCalendarSelection: (id: string) => void
  
  // Google Calendar Auth State
  isAuthenticated: boolean
  setIsAuthenticated: (isAuth: boolean) => void
  calendars: Calendar[]
  setCalendars: (calendars: Calendar[]) => void
  get selectedCalendars(): string[]
}

const calendarStoreBase = create<CalendarStore>()(
  persist(
    (set, get) => ({
      selectedCalendarIds: new Set<string>(),
      isAuthenticated: false,
      calendars: [],

      setSelectedCalendarIds: ids => set({ selectedCalendarIds: ids }),

      addSelectedCalendarId: id =>
        set(state => ({
          selectedCalendarIds: new Set([...state.selectedCalendarIds, id]),
        })),

      removeSelectedCalendarId: id =>
        set(state => {
          const newSet = new Set(state.selectedCalendarIds)
          newSet.delete(id)
          return { selectedCalendarIds: newSet }
        }),

      toggleCalendarSelection: id =>
        set(state => {
          const newSet = new Set(state.selectedCalendarIds)
          if (newSet.has(id)) {
            newSet.delete(id)
          } else {
            newSet.add(id)
          }
          return { selectedCalendarIds: newSet }
        }),
        
      setIsAuthenticated: isAuth => set({ isAuthenticated: isAuth }),
      
      setCalendars: calendars => set({ calendars }),
      
      get selectedCalendars() {
        const state = get()
        return Array.from(state.selectedCalendarIds)
      },
    }),
    {
      name: 'calendar-preferences',
      // Custom storage to handle Set serialization
      storage: {
        getItem: name => {
          if (typeof window === 'undefined') return null // SSR guard
          try {
            const str = localStorage.getItem(name)
            if (!str) return null
            const data = JSON.parse(str)
            return {
              ...data,
              state: {
                ...data.state,
                selectedCalendarIds: new Set(data.state.selectedCalendarIds || []),
              },
            }
          } catch {
            return null
          }
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return // SSR guard
          try {
            const data = {
              ...value,
              state: {
                ...value.state,
                selectedCalendarIds: Array.from(value.state.selectedCalendarIds),
              },
            }
            localStorage.setItem(name, JSON.stringify(data))
          } catch {
            // Silently fail if localStorage is not available
          }
        },
        removeItem: name => {
          if (typeof window === 'undefined') return // SSR guard
          try {
            localStorage.removeItem(name)
          } catch {
            // Silently fail if localStorage is not available
          }
        },
      },
    }
  )
)

// SSR-safe hook to use calendar store
export function useCalendarStore() {
  const [isHydrated, setIsHydrated] = useState(false)
  const storeData = calendarStoreBase()
  
  useEffect(() => {
    setIsHydrated(true)
  }, [])
  
  // Return safe defaults during SSR to prevent hydration mismatches
  if (!isHydrated) {
    return {
      selectedCalendarIds: new Set<string>(),
      isAuthenticated: false,
      calendars: [],
      setSelectedCalendarIds: () => {},
      addSelectedCalendarId: () => {},
      removeSelectedCalendarId: () => {},
      toggleCalendarSelection: () => {},
      setIsAuthenticated: () => {},
      setCalendars: () => {},
      get selectedCalendars() { return [] },
    }
  }
  
  return storeData
}

// Direct access to the store (for cases where SSR safety is handled elsewhere)
export const useCalendarStoreBase = calendarStoreBase