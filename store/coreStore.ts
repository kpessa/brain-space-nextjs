import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from 'firebase/auth'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'

// Initialize dayjs plugins
dayjs.extend(isBetween)

// Types from authStore
interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

// Types from userPreferencesStore
export type UserMode = 'work' | 'personal' | 'all'
export type ThemeMode = 'colorful' | 'professional'

export const TAG_CATEGORIES = {
  work: ['work', 'project', 'client', 'team', 'meeting', 'task', 'deadline', 'milestone', 'review'],
  personal: ['personal', 'family', 'health', 'hobby', 'home', 'finance', 'learning', 'self-care', 'social']
}

interface UserPreferences {
  // Current mode
  currentMode: UserMode
  manualModeOverride: boolean
  
  // Theme preferences
  themeMode: ThemeMode
  darkMode: boolean
  autoThemeInWorkMode: boolean
  
  // Tag preferences
  frequentTags: string[]
  customWorkTags: string[]
  customPersonalTags: string[]
  
  // Settings
  autoCategorizationEnabled: boolean
  defaultToCurrentMode: boolean
  hidePersonalInWorkMode: boolean
  hideWorkInPersonalMode: boolean
  
  // Timebox preferences
  timeboxIntervalMinutes: 30 | 60 | 120
  workModeTimeboxInterval: 30 | 60 | 120
  personalModeTimeboxInterval: 30 | 60 | 120
  autoSwitchTimeboxInterval: boolean
  calendarSyncEnabled: boolean
}

// Types from scheduleStore
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
  workCalendarIds?: string[]
}

// Combined Core Store Interface
interface CoreStore extends AuthState, UserPreferences {
  // Work schedule
  workSchedule: WorkSchedule
  ptoDays: PTODay[]
  schedulePreferences: SchedulePreferences
  
  // Auth Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
  
  // User Preferences Actions
  setMode: (mode: UserMode, isManual?: boolean) => void
  toggleMode: () => void
  clearManualOverride: () => void
  setThemeMode: (theme: ThemeMode) => void
  toggleDarkMode: () => void
  addFrequentTag: (tag: string) => void
  addCustomWorkTag: (tag: string) => void
  addCustomPersonalTag: (tag: string) => void
  updateUserSettings: (settings: Partial<UserPreferences>) => void
  getTagsForMode: (mode?: UserMode) => string[]
  isWorkTag: (tag: string) => boolean
  isPersonalTag: (tag: string) => boolean
  getEffectiveTheme: () => ThemeMode
  setTimeboxInterval: (minutes: 30 | 60 | 120) => void
  getEffectiveTimeboxInterval: () => 30 | 60 | 120
  
  // Schedule Actions
  updateWorkSchedule: (day: keyof WorkSchedule, schedule: Partial<WorkSchedule[keyof WorkSchedule]>) => void
  setWorkSchedule: (schedule: WorkSchedule) => void
  addPTODay: (pto: Omit<PTODay, 'id'>) => void
  removePTODay: (id: string) => void
  updateSchedulePreferences: (prefs: Partial<SchedulePreferences>) => void
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

const getInitialMode = (): UserMode => 'work'

export const useCoreStore = create<CoreStore>()(  
  persist(
    (set, get) => ({
      // Auth State
      user: null,
      loading: true,
      error: null,
      isAuthenticated: false,
      
      // User Preferences State
      currentMode: getInitialMode(),
      manualModeOverride: false,
      themeMode: 'colorful',
      darkMode: false,
      autoThemeInWorkMode: true,
      frequentTags: [],
      customWorkTags: [],
      customPersonalTags: [],
      autoCategorizationEnabled: true,
      defaultToCurrentMode: true,
      hidePersonalInWorkMode: true,
      hideWorkInPersonalMode: true,
      timeboxIntervalMinutes: 120,
      workModeTimeboxInterval: 30,
      personalModeTimeboxInterval: 120,
      autoSwitchTimeboxInterval: true,
      calendarSyncEnabled: false,
      
      // Schedule State
      workSchedule: defaultWorkSchedule,
      ptoDays: [],
      schedulePreferences: {
        autoSwitchMode: true,
        defaultPersonalMode: 'personal',
        defaultWorkMode: 'work',
        respectCalendarEvents: true,
      },
      
      // Auth Actions
      setUser: (user) => 
        set({ 
          user, 
          isAuthenticated: !!user,
          error: null 
        }),
      
      setLoading: (loading) => 
        set({ loading }),
      
      setError: (error) => 
        set({ error }),
      
      logout: () => 
        set({ 
          user: null, 
          isAuthenticated: false, 
          error: null 
        }),
      
      // User Preferences Actions
      setMode: (mode: UserMode, isManual = false) => {
        set({ currentMode: mode, manualModeOverride: isManual })
      },
      
      clearManualOverride: () => {
        set({ manualModeOverride: false })
      },
      
      toggleMode: () => {
        const { currentMode } = get()
        const modes: UserMode[] = ['work', 'personal', 'all']
        const currentIndex = modes.indexOf(currentMode)
        const nextIndex = (currentIndex + 1) % modes.length
        set({ currentMode: modes[nextIndex] })
      },
      
      setThemeMode: (theme: ThemeMode) => {
        set({ themeMode: theme })
      },
      
      toggleDarkMode: () => {
        const { darkMode } = get()
        set({ darkMode: !darkMode })
      },
      
      addFrequentTag: (tag: string) => {
        const { frequentTags } = get()
        const updated = [tag, ...frequentTags.filter(t => t !== tag)].slice(0, 20)
        set({ frequentTags: updated })
      },
      
      addCustomWorkTag: (tag: string) => {
        const { customWorkTags } = get()
        if (!customWorkTags.includes(tag)) {
          set({ customWorkTags: [...customWorkTags, tag] })
        }
      },
      
      addCustomPersonalTag: (tag: string) => {
        const { customPersonalTags } = get()
        if (!customPersonalTags.includes(tag)) {
          set({ customPersonalTags: [...customPersonalTags, tag] })
        }
      },
      
      updateUserSettings: (settings: Partial<UserPreferences>) => {
        set(settings)
      },
      
      getTagsForMode: (mode?: UserMode) => {
        const { currentMode, customWorkTags, customPersonalTags } = get()
        const targetMode = mode || currentMode
        
        if (targetMode === 'all') {
          return [
            ...TAG_CATEGORIES.work,
            ...TAG_CATEGORIES.personal,
            ...customWorkTags,
            ...customPersonalTags
          ]
        } else if (targetMode === 'work') {
          return [...TAG_CATEGORIES.work, ...customWorkTags]
        } else {
          return [...TAG_CATEGORIES.personal, ...customPersonalTags]
        }
      },
      
      isWorkTag: (tag: string) => {
        const { customWorkTags } = get()
        return TAG_CATEGORIES.work.includes(tag) || customWorkTags.includes(tag)
      },
      
      isPersonalTag: (tag: string) => {
        const { customPersonalTags } = get()
        return TAG_CATEGORIES.personal.includes(tag) || customPersonalTags.includes(tag)
      },
      
      getEffectiveTheme: () => {
        const { currentMode, themeMode, autoThemeInWorkMode } = get()
        if (autoThemeInWorkMode && currentMode === 'work') {
          return 'professional'
        }
        return themeMode
      },
      
      setTimeboxInterval: (minutes: 30 | 60 | 120) => {
        const { currentMode } = get()
        if (currentMode === 'work') {
          set({ workModeTimeboxInterval: minutes, timeboxIntervalMinutes: minutes })
        } else {
          set({ personalModeTimeboxInterval: minutes, timeboxIntervalMinutes: minutes })
        }
      },
      
      getEffectiveTimeboxInterval: () => {
        const { currentMode, autoSwitchTimeboxInterval, workModeTimeboxInterval, personalModeTimeboxInterval, timeboxIntervalMinutes } = get()
        if (autoSwitchTimeboxInterval) {
          return currentMode === 'work' ? workModeTimeboxInterval : personalModeTimeboxInterval
        }
        return timeboxIntervalMinutes
      },
      
      // Schedule Actions
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
        const id = crypto.randomUUID()
        set((state) => ({
          ptoDays: [...state.ptoDays, { ...pto, id }]
        }))
      },
      
      removePTODay: (id) => {
        set((state) => ({
          ptoDays: state.ptoDays.filter(day => day.id !== id)
        }))
      },
      
      updateSchedulePreferences: (prefs) => {
        set((state) => ({
          schedulePreferences: { ...state.schedulePreferences, ...prefs }
        }))
      },
      
      isWorkTime: (date = new Date()) => {
        const { workSchedule, ptoDays } = get()
        
        // Check if it's a PTO day
        if (get().isPTODay(date)) return false
        
        const dayName = dayjs(date).format('dddd').toLowerCase() as keyof WorkSchedule
        const daySchedule = workSchedule[dayName]
        
        if (!daySchedule.enabled) return false
        
        const now = dayjs(date)
        const startTime = dayjs(date).hour(parseInt(daySchedule.start.split(':')[0])).minute(parseInt(daySchedule.start.split(':')[1]))
        const endTime = dayjs(date).hour(parseInt(daySchedule.end.split(':')[0])).minute(parseInt(daySchedule.end.split(':')[1]))
        
        return now.isBetween(startTime, endTime, null, '[]')
      },
      
      isPTODay: (date: Date) => {
        const { ptoDays } = get()
        const dateStr = dayjs(date).format('YYYY-MM-DD')
        return ptoDays.some(pto => pto.date === dateStr)
      },
      
      getSuggestedMode: (date = new Date()) => {
        const { schedulePreferences } = get()
        if (!schedulePreferences.autoSwitchMode) return 'all'
        
        return get().isWorkTime(date) ? 'work' : 'personal'
      },
      
      getScheduleForDay: (date: Date) => {
        const { workSchedule } = get()
        const dayName = dayjs(date).format('dddd').toLowerCase() as keyof WorkSchedule
        return workSchedule[dayName] || null
      },
    }),
    {
      name: 'core-store',
      version: 1,
      partialize: (state) => ({
        // Auth state is not persisted (handled by Firebase)
        // User preferences
        currentMode: state.currentMode,
        manualModeOverride: state.manualModeOverride,
        themeMode: state.themeMode,
        darkMode: state.darkMode,
        autoThemeInWorkMode: state.autoThemeInWorkMode,
        frequentTags: state.frequentTags,
        customWorkTags: state.customWorkTags,
        customPersonalTags: state.customPersonalTags,
        autoCategorizationEnabled: state.autoCategorizationEnabled,
        defaultToCurrentMode: state.defaultToCurrentMode,
        hidePersonalInWorkMode: state.hidePersonalInWorkMode,
        hideWorkInPersonalMode: state.hideWorkInPersonalMode,
        timeboxIntervalMinutes: state.timeboxIntervalMinutes,
        workModeTimeboxInterval: state.workModeTimeboxInterval,
        personalModeTimeboxInterval: state.personalModeTimeboxInterval,
        autoSwitchTimeboxInterval: state.autoSwitchTimeboxInterval,
        calendarSyncEnabled: state.calendarSyncEnabled,
        // Schedule preferences
        workSchedule: state.workSchedule,
        ptoDays: state.ptoDays,
        schedulePreferences: state.schedulePreferences,
      }),
    }
  )
)

// Helper function to determine if a node should be shown based on mode and tags
export function shouldShowNode(
  nodeTags: string[] | undefined,
  isPersonal: boolean | undefined,
  mode: UserMode,
  hidePersonalInWork: boolean,
  hideWorkInPersonal: boolean
): boolean {
  if (mode === 'all') return true
  
  if (isPersonal !== undefined) {
    if (mode === 'work' && isPersonal && hidePersonalInWork) return false
    if (mode === 'personal' && !isPersonal && hideWorkInPersonal) return false
    return true
  }
  
  if (!nodeTags || nodeTags.length === 0) return true
  
  const store = useCoreStore.getState()
  const hasWorkTags = nodeTags.some(tag => store.isWorkTag(tag))
  const hasPersonalTags = nodeTags.some(tag => store.isPersonalTag(tag))
  
  if (mode === 'work') {
    return hasWorkTags || (!hasPersonalTags || !hidePersonalInWork)
  } else {
    return hasPersonalTags || (!hasWorkTags || !hideWorkInPersonal)
  }
}
