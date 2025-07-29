import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserMode = 'work' | 'personal' | 'all'
export type ThemeMode = 'colorful' | 'professional'

export const TAG_CATEGORIES = {
  work: ['work', 'project', 'client', 'team', 'meeting', 'task', 'deadline', 'milestone', 'review'],
  personal: ['personal', 'family', 'health', 'hobby', 'home', 'finance', 'learning', 'self-care', 'social']
}

interface UserPreferences {
  // Current mode
  currentMode: UserMode
  
  // Theme preferences
  themeMode: ThemeMode
  darkMode: boolean
  autoThemeInWorkMode: boolean // Automatically use professional theme in work mode
  
  // Tag preferences
  frequentTags: string[]
  customWorkTags: string[]
  customPersonalTags: string[]
  
  // Settings
  autoCategorizationEnabled: boolean
  defaultToCurrentMode: boolean
  hidePersonalInWorkMode: boolean
  hideWorkInPersonalMode: boolean
  
  // Actions
  setMode: (mode: UserMode) => void
  toggleMode: () => void
  setThemeMode: (theme: ThemeMode) => void
  toggleDarkMode: () => void
  addFrequentTag: (tag: string) => void
  addCustomWorkTag: (tag: string) => void
  addCustomPersonalTag: (tag: string) => void
  updateSettings: (settings: Partial<UserPreferences>) => void
  getTagsForMode: (mode?: UserMode) => string[]
  isWorkTag: (tag: string) => boolean
  isPersonalTag: (tag: string) => boolean
  getEffectiveTheme: () => ThemeMode
}

export const useUserPreferencesStore = create<UserPreferences>()(
  persist(
    (set, get) => ({
      // Initial state
      currentMode: 'work',
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
      
      // Set mode
      setMode: (mode: UserMode) => {
        set({ currentMode: mode })
      },
      
      // Toggle between modes
      toggleMode: () => {
        const { currentMode } = get()
        const modes: UserMode[] = ['work', 'personal', 'all']
        const currentIndex = modes.indexOf(currentMode)
        const nextIndex = (currentIndex + 1) % modes.length
        set({ currentMode: modes[nextIndex] })
      },
      
      // Set theme mode
      setThemeMode: (theme: ThemeMode) => {
        set({ themeMode: theme })
      },
      
      // Toggle dark mode
      toggleDarkMode: () => {
        const { darkMode } = get()
        set({ darkMode: !darkMode })
      },
      
      // Add a tag to frequent tags (track usage)
      addFrequentTag: (tag: string) => {
        const { frequentTags } = get()
        const updated = [tag, ...frequentTags.filter(t => t !== tag)].slice(0, 20) // Keep top 20
        set({ frequentTags: updated })
      },
      
      // Add custom work tag
      addCustomWorkTag: (tag: string) => {
        const { customWorkTags } = get()
        if (!customWorkTags.includes(tag)) {
          set({ customWorkTags: [...customWorkTags, tag] })
        }
      },
      
      // Add custom personal tag
      addCustomPersonalTag: (tag: string) => {
        const { customPersonalTags } = get()
        if (!customPersonalTags.includes(tag)) {
          set({ customPersonalTags: [...customPersonalTags, tag] })
        }
      },
      
      // Update settings
      updateSettings: (settings: Partial<UserPreferences>) => {
        set(settings)
      },
      
      // Get tags for current or specific mode
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
      
      // Check if a tag is work-related
      isWorkTag: (tag: string) => {
        const { customWorkTags } = get()
        return TAG_CATEGORIES.work.includes(tag) || customWorkTags.includes(tag)
      },
      
      // Check if a tag is personal
      isPersonalTag: (tag: string) => {
        const { customPersonalTags } = get()
        return TAG_CATEGORIES.personal.includes(tag) || customPersonalTags.includes(tag)
      },
      
      // Get effective theme based on mode and settings
      getEffectiveTheme: () => {
        const { currentMode, themeMode, autoThemeInWorkMode } = get()
        if (autoThemeInWorkMode && currentMode === 'work') {
          return 'professional'
        }
        return themeMode
      },
    }),
    {
      name: 'user-preferences',
      version: 1,
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
  
  // If node has explicit isPersonal flag, use that
  if (isPersonal !== undefined) {
    if (mode === 'work' && isPersonal && hidePersonalInWork) return false
    if (mode === 'personal' && !isPersonal && hideWorkInPersonal) return false
    return true
  }
  
  // Otherwise, check tags
  if (!nodeTags || nodeTags.length === 0) return true
  
  const store = useUserPreferencesStore.getState()
  const hasWorkTags = nodeTags.some(tag => store.isWorkTag(tag))
  const hasPersonalTags = nodeTags.some(tag => store.isPersonalTag(tag))
  
  if (mode === 'work') {
    // In work mode, show if has work tags or no personal tags
    return hasWorkTags || (!hasPersonalTags || !hidePersonalInWork)
  } else {
    // In personal mode, show if has personal tags or no work tags
    return hasPersonalTags || (!hasWorkTags || !hideWorkInPersonal)
  }
}