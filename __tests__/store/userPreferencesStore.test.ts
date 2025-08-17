import { act, renderHook } from '@testing-library/react'
import { 
  useUserPreferencesStore, 
  UserMode, 
  ThemeMode, 
  TAG_CATEGORIES,
  shouldShowNode 
} from '@/store/userPreferencesStore'

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }
})()

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('UserPreferencesStore', () => {
  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.clear()
    jest.clearAllMocks()
    
    // Reset store to initial state
    useUserPreferencesStore.setState({
      currentMode: 'work',
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
    })
  })

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      expect(result.current.currentMode).toBe('work')
      expect(result.current.manualModeOverride).toBe(false)
      expect(result.current.themeMode).toBe('colorful')
      expect(result.current.darkMode).toBe(false)
      expect(result.current.autoThemeInWorkMode).toBe(true)
      expect(result.current.frequentTags).toEqual([])
      expect(result.current.customWorkTags).toEqual([])
      expect(result.current.customPersonalTags).toEqual([])
      expect(result.current.autoCategorizationEnabled).toBe(true)
      expect(result.current.defaultToCurrentMode).toBe(true)
      expect(result.current.hidePersonalInWorkMode).toBe(true)
      expect(result.current.hideWorkInPersonalMode).toBe(true)
      expect(result.current.timeboxIntervalMinutes).toBe(120)
      expect(result.current.workModeTimeboxInterval).toBe(30)
      expect(result.current.personalModeTimeboxInterval).toBe(120)
      expect(result.current.autoSwitchTimeboxInterval).toBe(true)
      expect(result.current.calendarSyncEnabled).toBe(false)
    })
  })

  describe('Mode Management', () => {
    it('sets mode manually', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      act(() => {
        result.current.setMode('personal', true)
      })
      
      expect(result.current.currentMode).toBe('personal')
      expect(result.current.manualModeOverride).toBe(true)
    })

    it('sets mode automatically (non-manual)', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      act(() => {
        result.current.setMode('all', false)
      })
      
      expect(result.current.currentMode).toBe('all')
      expect(result.current.manualModeOverride).toBe(false)
    })

    it('defaults to non-manual when isManual parameter is omitted', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      act(() => {
        result.current.setMode('personal')
      })
      
      expect(result.current.currentMode).toBe('personal')
      expect(result.current.manualModeOverride).toBe(false)
    })

    it('toggles through all modes in order', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // Start with 'work'
      expect(result.current.currentMode).toBe('work')
      
      // Toggle to 'personal'
      act(() => {
        result.current.toggleMode()
      })
      expect(result.current.currentMode).toBe('personal')
      
      // Toggle to 'all'
      act(() => {
        result.current.toggleMode()
      })
      expect(result.current.currentMode).toBe('all')
      
      // Toggle back to 'work'
      act(() => {
        result.current.toggleMode()
      })
      expect(result.current.currentMode).toBe('work')
    })

    it('clears manual override', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // Set manual override
      act(() => {
        result.current.setMode('personal', true)
      })
      expect(result.current.manualModeOverride).toBe(true)
      
      // Clear manual override
      act(() => {
        result.current.clearManualOverride()
      })
      expect(result.current.manualModeOverride).toBe(false)
      expect(result.current.currentMode).toBe('personal') // Mode should remain
    })
  })

  describe('Theme Management', () => {
    it('sets theme mode', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      act(() => {
        result.current.setThemeMode('professional')
      })
      
      expect(result.current.themeMode).toBe('professional')
      
      act(() => {
        result.current.setThemeMode('colorful')
      })
      
      expect(result.current.themeMode).toBe('colorful')
    })

    it('toggles dark mode', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      expect(result.current.darkMode).toBe(false)
      
      act(() => {
        result.current.toggleDarkMode()
      })
      expect(result.current.darkMode).toBe(true)
      
      act(() => {
        result.current.toggleDarkMode()
      })
      expect(result.current.darkMode).toBe(false)
    })

    it('gets effective theme based on auto-switch setting', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // In work mode with auto-switch enabled
      act(() => {
        result.current.setMode('work')
        result.current.setThemeMode('colorful')
        result.current.updateSettings({ autoThemeInWorkMode: true })
      })
      
      expect(result.current.getEffectiveTheme()).toBe('professional')
      
      // In personal mode with auto-switch enabled
      act(() => {
        result.current.setMode('personal')
      })
      
      expect(result.current.getEffectiveTheme()).toBe('colorful')
      
      // In work mode with auto-switch disabled
      act(() => {
        result.current.setMode('work')
        result.current.updateSettings({ autoThemeInWorkMode: false })
      })
      
      expect(result.current.getEffectiveTheme()).toBe('colorful')
    })
  })

  describe('Tag Management', () => {
    it('adds frequent tags and maintains order', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      act(() => {
        result.current.addFrequentTag('work')
        result.current.addFrequentTag('urgent')
        result.current.addFrequentTag('personal')
      })
      
      expect(result.current.frequentTags).toEqual(['personal', 'urgent', 'work'])
      
      // Add existing tag - should move to front
      act(() => {
        result.current.addFrequentTag('work')
      })
      
      expect(result.current.frequentTags).toEqual(['work', 'personal', 'urgent'])
    })

    it('limits frequent tags to 20 items', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // Add 25 tags
      act(() => {
        for (let i = 1; i <= 25; i++) {
          result.current.addFrequentTag(`tag-${i}`)
        }
      })
      
      expect(result.current.frequentTags).toHaveLength(20)
      expect(result.current.frequentTags[0]).toBe('tag-25') // Most recent first
      expect(result.current.frequentTags[19]).toBe('tag-6') // 20th item
    })

    it('adds custom work tags', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      act(() => {
        result.current.addCustomWorkTag('sprint')
        result.current.addCustomWorkTag('backend')
        result.current.addCustomWorkTag('frontend')
      })
      
      expect(result.current.customWorkTags).toEqual(['sprint', 'backend', 'frontend'])
    })

    it('prevents duplicate custom work tags', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      act(() => {
        result.current.addCustomWorkTag('sprint')
        result.current.addCustomWorkTag('sprint') // Duplicate
        result.current.addCustomWorkTag('backend')
      })
      
      expect(result.current.customWorkTags).toEqual(['sprint', 'backend'])
    })

    it('adds custom personal tags', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      act(() => {
        result.current.addCustomPersonalTag('workout')
        result.current.addCustomPersonalTag('meditation')
        result.current.addCustomPersonalTag('reading')
      })
      
      expect(result.current.customPersonalTags).toEqual(['workout', 'meditation', 'reading'])
    })

    it('prevents duplicate custom personal tags', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      act(() => {
        result.current.addCustomPersonalTag('workout')
        result.current.addCustomPersonalTag('workout') // Duplicate
        result.current.addCustomPersonalTag('meditation')
      })
      
      expect(result.current.customPersonalTags).toEqual(['workout', 'meditation'])
    })
  })

  describe('Tag Categorization', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      act(() => {
        result.current.addCustomWorkTag('sprint')
        result.current.addCustomWorkTag('backend')
        result.current.addCustomPersonalTag('workout')
        result.current.addCustomPersonalTag('cooking')
      })
    })

    it('identifies work tags correctly', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // Built-in work tags
      expect(result.current.isWorkTag('work')).toBe(true)
      expect(result.current.isWorkTag('project')).toBe(true)
      expect(result.current.isWorkTag('meeting')).toBe(true)
      
      // Custom work tags
      expect(result.current.isWorkTag('sprint')).toBe(true)
      expect(result.current.isWorkTag('backend')).toBe(true)
      
      // Non-work tags
      expect(result.current.isWorkTag('personal')).toBe(false)
      expect(result.current.isWorkTag('workout')).toBe(false)
      expect(result.current.isWorkTag('nonexistent')).toBe(false)
    })

    it('identifies personal tags correctly', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // Built-in personal tags
      expect(result.current.isPersonalTag('personal')).toBe(true)
      expect(result.current.isPersonalTag('family')).toBe(true)
      expect(result.current.isPersonalTag('health')).toBe(true)
      
      // Custom personal tags
      expect(result.current.isPersonalTag('workout')).toBe(true)
      expect(result.current.isPersonalTag('cooking')).toBe(true)
      
      // Non-personal tags
      expect(result.current.isPersonalTag('work')).toBe(false)
      expect(result.current.isPersonalTag('project')).toBe(false)
      expect(result.current.isPersonalTag('nonexistent')).toBe(false)
    })

    it('gets tags for specific modes', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // Work mode tags
      const workTags = result.current.getTagsForMode('work')
      expect(workTags).toContain('work')
      expect(workTags).toContain('project')
      expect(workTags).toContain('sprint') // custom
      expect(workTags).toContain('backend') // custom
      expect(workTags).not.toContain('personal')
      expect(workTags).not.toContain('workout')
      
      // Personal mode tags
      const personalTags = result.current.getTagsForMode('personal')
      expect(personalTags).toContain('personal')
      expect(personalTags).toContain('family')
      expect(personalTags).toContain('workout') // custom
      expect(personalTags).toContain('cooking') // custom
      expect(personalTags).not.toContain('work')
      expect(personalTags).not.toContain('sprint')
      
      // All mode tags
      const allTags = result.current.getTagsForMode('all')
      expect(allTags).toContain('work')
      expect(allTags).toContain('personal')
      expect(allTags).toContain('sprint')
      expect(allTags).toContain('workout')
    })

    it('gets tags for current mode when no mode specified', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // Set to work mode
      act(() => {
        result.current.setMode('work')
      })
      
      const tags = result.current.getTagsForMode()
      expect(tags).toContain('work')
      expect(tags).not.toContain('personal')
      
      // Set to personal mode
      act(() => {
        result.current.setMode('personal')
      })
      
      const personalModeTags = result.current.getTagsForMode()
      expect(personalModeTags).toContain('personal')
      expect(personalModeTags).not.toContain('work')
    })
  })

  describe('Timebox Settings', () => {
    it('sets timebox interval for current mode', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // In work mode
      act(() => {
        result.current.setMode('work')
        result.current.setTimeboxInterval(60)
      })
      
      expect(result.current.workModeTimeboxInterval).toBe(60)
      expect(result.current.timeboxIntervalMinutes).toBe(60)
      
      // In personal mode
      act(() => {
        result.current.setMode('personal')
        result.current.setTimeboxInterval(30)
      })
      
      expect(result.current.personalModeTimeboxInterval).toBe(30)
      expect(result.current.timeboxIntervalMinutes).toBe(30)
      expect(result.current.workModeTimeboxInterval).toBe(60) // Should not change
    })

    it('gets effective timebox interval based on auto-switch setting', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // Setup different intervals for work and personal
      act(() => {
        result.current.updateSettings({
          workModeTimeboxInterval: 30,
          personalModeTimeboxInterval: 120,
          autoSwitchTimeboxInterval: true,
        })
      })
      
      // In work mode with auto-switch
      act(() => {
        result.current.setMode('work')
      })
      expect(result.current.getEffectiveTimeboxInterval()).toBe(30)
      
      // In personal mode with auto-switch
      act(() => {
        result.current.setMode('personal')
      })
      expect(result.current.getEffectiveTimeboxInterval()).toBe(120)
      
      // Disable auto-switch
      act(() => {
        result.current.updateSettings({ 
          autoSwitchTimeboxInterval: false,
          timeboxIntervalMinutes: 60 
        })
      })
      expect(result.current.getEffectiveTimeboxInterval()).toBe(60)
    })
  })

  describe('Settings Update', () => {
    it('updates multiple settings at once', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      const newSettings = {
        darkMode: true,
        autoCategorizationEnabled: false,
        hidePersonalInWorkMode: false,
        calendarSyncEnabled: true,
        timeboxIntervalMinutes: 60 as const,
      }
      
      act(() => {
        result.current.updateSettings(newSettings)
      })
      
      expect(result.current.darkMode).toBe(true)
      expect(result.current.autoCategorizationEnabled).toBe(false)
      expect(result.current.hidePersonalInWorkMode).toBe(false)
      expect(result.current.calendarSyncEnabled).toBe(true)
      expect(result.current.timeboxIntervalMinutes).toBe(60)
    })

    it('partially updates settings without affecting others', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      const originalDarkMode = result.current.darkMode
      const originalThemeMode = result.current.themeMode
      
      act(() => {
        result.current.updateSettings({
          autoCategorizationEnabled: false,
        })
      })
      
      expect(result.current.autoCategorizationEnabled).toBe(false)
      expect(result.current.darkMode).toBe(originalDarkMode)
      expect(result.current.themeMode).toBe(originalThemeMode)
    })
  })

  describe('shouldShowNode Helper Function', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      act(() => {
        result.current.addCustomWorkTag('sprint')
        result.current.addCustomPersonalTag('workout')
      })
    })

    describe('All Mode', () => {
      it('shows all nodes in all mode', () => {
        expect(shouldShowNode(['work'], false, 'all', true, true)).toBe(true)
        expect(shouldShowNode(['personal'], true, 'all', true, true)).toBe(true)
        expect(shouldShowNode(['misc'], undefined, 'all', true, true)).toBe(true)
        expect(shouldShowNode([], undefined, 'all', true, true)).toBe(true)
      })
    })

    describe('Work Mode', () => {
      it('shows work nodes based on isPersonal flag', () => {
        expect(shouldShowNode(['work'], false, 'work', true, true)).toBe(true)
        expect(shouldShowNode(['personal'], false, 'work', true, true)).toBe(true)
        expect(shouldShowNode(['misc'], undefined, 'work', true, true)).toBe(true)
      })

      it('hides personal nodes when hidePersonalInWork is true', () => {
        expect(shouldShowNode(['personal'], true, 'work', true, true)).toBe(false)
        expect(shouldShowNode(['work'], true, 'work', true, true)).toBe(false)
      })

      it('shows personal nodes when hidePersonalInWork is false', () => {
        expect(shouldShowNode(['personal'], true, 'work', false, true)).toBe(true)
      })

      it('shows nodes with work tags regardless of isPersonal flag', () => {
        expect(shouldShowNode(['work'], true, 'work', true, true)).toBe(false) // isPersonal overrides
        expect(shouldShowNode(['work'], false, 'work', true, true)).toBe(true)
        expect(shouldShowNode(['work'], undefined, 'work', true, true)).toBe(true)
      })

      it('handles nodes without tags in work mode', () => {
        expect(shouldShowNode([], undefined, 'work', true, true)).toBe(true)
        expect(shouldShowNode(undefined, undefined, 'work', true, true)).toBe(true)
      })
    })

    describe('Personal Mode', () => {
      it('shows personal nodes based on isPersonal flag', () => {
        expect(shouldShowNode(['personal'], true, 'personal', true, true)).toBe(true)
        expect(shouldShowNode(['work'], true, 'personal', true, true)).toBe(true)
        expect(shouldShowNode(['misc'], undefined, 'personal', true, true)).toBe(true)
      })

      it('hides work nodes when hideWorkInPersonal is true', () => {
        expect(shouldShowNode(['work'], false, 'personal', true, true)).toBe(false)
        expect(shouldShowNode(['personal'], false, 'personal', true, true)).toBe(false)
      })

      it('shows work nodes when hideWorkInPersonal is false', () => {
        expect(shouldShowNode(['work'], false, 'personal', true, false)).toBe(true)
      })

      it('shows nodes with personal tags regardless of isPersonal flag', () => {
        expect(shouldShowNode(['personal'], false, 'personal', true, true)).toBe(false) // isPersonal overrides
        expect(shouldShowNode(['personal'], true, 'personal', true, true)).toBe(true)
        expect(shouldShowNode(['personal'], undefined, 'personal', true, true)).toBe(true)
      })
    })

    describe('Tag-based Filtering', () => {
      it('shows nodes with work tags in work mode', () => {
        expect(shouldShowNode(['work', 'urgent'], undefined, 'work', true, true)).toBe(true)
        expect(shouldShowNode(['project'], undefined, 'work', true, true)).toBe(true)
        expect(shouldShowNode(['sprint'], undefined, 'work', true, true)).toBe(true) // custom work tag
      })

      it('shows nodes with personal tags in personal mode', () => {
        expect(shouldShowNode(['personal', 'health'], undefined, 'personal', true, true)).toBe(true)
        expect(shouldShowNode(['family'], undefined, 'personal', true, true)).toBe(true)
        expect(shouldShowNode(['workout'], undefined, 'personal', true, true)).toBe(true) // custom personal tag
      })

      it('handles mixed tags based on mode and settings', () => {
        // Node with both work and personal tags
        const mixedTags = ['work', 'personal']
        
        // In work mode - should show because it has work tags
        expect(shouldShowNode(mixedTags, undefined, 'work', true, true)).toBe(true)
        
        // In personal mode - should show because it has personal tags
        expect(shouldShowNode(mixedTags, undefined, 'personal', true, true)).toBe(true)
      })
    })

    describe('Edge Cases', () => {
      it('handles empty tag arrays', () => {
        expect(shouldShowNode([], undefined, 'work', true, true)).toBe(true)
        expect(shouldShowNode([], undefined, 'personal', true, true)).toBe(true)
      })

      it('handles undefined tag arrays', () => {
        expect(shouldShowNode(undefined, undefined, 'work', true, true)).toBe(true)
        expect(shouldShowNode(undefined, undefined, 'personal', true, true)).toBe(true)
      })

      it('handles unknown tags', () => {
        expect(shouldShowNode(['unknown-tag'], undefined, 'work', true, true)).toBe(true)
        expect(shouldShowNode(['unknown-tag'], undefined, 'personal', true, true)).toBe(true)
      })
    })
  })

  describe('TAG_CATEGORIES Constant', () => {
    it('has predefined work tags', () => {
      expect(TAG_CATEGORIES.work).toContain('work')
      expect(TAG_CATEGORIES.work).toContain('project')
      expect(TAG_CATEGORIES.work).toContain('client')
      expect(TAG_CATEGORIES.work).toContain('meeting')
      expect(TAG_CATEGORIES.work).toContain('deadline')
    })

    it('has predefined personal tags', () => {
      expect(TAG_CATEGORIES.personal).toContain('personal')
      expect(TAG_CATEGORIES.personal).toContain('family')
      expect(TAG_CATEGORIES.personal).toContain('health')
      expect(TAG_CATEGORIES.personal).toContain('hobby')
      expect(TAG_CATEGORIES.personal).toContain('self-care')
    })

    it('has no overlap between work and personal tags', () => {
      const workSet = new Set(TAG_CATEGORIES.work)
      const personalSet = new Set(TAG_CATEGORIES.personal)
      
      TAG_CATEGORIES.work.forEach(tag => {
        expect(personalSet.has(tag)).toBe(false)
      })
      
      TAG_CATEGORIES.personal.forEach(tag => {
        expect(workSet.has(tag)).toBe(false)
      })
    })
  })

  describe('Complex Scenarios', () => {
    it('handles full workflow: mode switching with theme and timebox preferences', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // Setup work mode preferences
      act(() => {
        result.current.setMode('work', true) // Manual override
        result.current.setThemeMode('colorful')
        result.current.setTimeboxInterval(30)
        result.current.updateSettings({
          autoThemeInWorkMode: true,
          autoSwitchTimeboxInterval: true,
        })
      })
      
      expect(result.current.currentMode).toBe('work')
      expect(result.current.manualModeOverride).toBe(true)
      expect(result.current.getEffectiveTheme()).toBe('professional') // Auto-switched
      expect(result.current.getEffectiveTimeboxInterval()).toBe(30)
      
      // Switch to personal mode
      act(() => {
        result.current.setMode('personal', true)
        result.current.setTimeboxInterval(120)
      })
      
      expect(result.current.getEffectiveTheme()).toBe('colorful') // Back to user preference
      expect(result.current.getEffectiveTimeboxInterval()).toBe(120)
      
      // Switch to all mode
      act(() => {
        result.current.setMode('all')
      })
      
      expect(result.current.manualModeOverride).toBe(false) // Default when not specified
      expect(result.current.getEffectiveTheme()).toBe('colorful')
    })

    it('handles tag management workflow with filtering', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // Add custom tags
      act(() => {
        result.current.addCustomWorkTag('sprint-planning')
        result.current.addCustomWorkTag('code-review')
        result.current.addCustomPersonalTag('meal-prep')
        result.current.addCustomPersonalTag('exercise')
      })
      
      // Track frequently used tags
      act(() => {
        result.current.addFrequentTag('urgent')
        result.current.addFrequentTag('sprint-planning')
        result.current.addFrequentTag('health')
        result.current.addFrequentTag('urgent') // Should move to front
      })
      
      expect(result.current.frequentTags[0]).toBe('urgent')
      
      // Test filtering in different modes
      const workTags = result.current.getTagsForMode('work')
      expect(workTags).toContain('sprint-planning')
      expect(workTags).toContain('code-review')
      expect(workTags).not.toContain('meal-prep')
      
      const personalTags = result.current.getTagsForMode('personal')
      expect(personalTags).toContain('meal-prep')
      expect(personalTags).toContain('exercise')
      expect(personalTags).not.toContain('sprint-planning')
      
      // Test node visibility
      expect(shouldShowNode(['sprint-planning'], undefined, 'work', true, true)).toBe(true)
      expect(shouldShowNode(['meal-prep'], undefined, 'personal', true, true)).toBe(true)
      expect(shouldShowNode(['sprint-planning'], undefined, 'personal', true, true)).toBe(false)
    })

    it('handles persistence and state restoration', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // Configure extensive settings
      act(() => {
        result.current.setMode('personal', true)
        result.current.setThemeMode('professional')
        result.current.toggleDarkMode()
        result.current.addCustomWorkTag('sprint')
        result.current.addCustomPersonalTag('workout')
        result.current.addFrequentTag('important')
        result.current.updateSettings({
          autoCategorizationEnabled: false,
          hidePersonalInWorkMode: false,
          calendarSyncEnabled: true,
          timeboxIntervalMinutes: 60,
        })
      })
      
      // Verify all settings are applied
      expect(result.current.currentMode).toBe('personal')
      expect(result.current.manualModeOverride).toBe(true)
      expect(result.current.themeMode).toBe('professional')
      expect(result.current.darkMode).toBe(true)
      expect(result.current.customWorkTags).toContain('sprint')
      expect(result.current.customPersonalTags).toContain('workout')
      expect(result.current.frequentTags).toContain('important')
      expect(result.current.autoCategorizationEnabled).toBe(false)
      expect(result.current.hidePersonalInWorkMode).toBe(false)
      expect(result.current.calendarSyncEnabled).toBe(true)
      expect(result.current.timeboxIntervalMinutes).toBe(60)
      
      // Storage should have been called
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles invalid mode values gracefully', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // TypeScript would prevent this, but test runtime behavior
      act(() => {
        result.current.setMode('invalid' as UserMode)
      })
      
      // Store should accept the value (no validation at runtime)
      expect(result.current.currentMode).toBe('invalid')
    })

    it('handles large numbers of custom tags', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      // Add many custom tags
      act(() => {
        for (let i = 1; i <= 100; i++) {
          result.current.addCustomWorkTag(`work-tag-${i}`)
          result.current.addCustomPersonalTag(`personal-tag-${i}`)
        }
      })
      
      expect(result.current.customWorkTags).toHaveLength(100)
      expect(result.current.customPersonalTags).toHaveLength(100)
      
      // All tags should be available
      const workTags = result.current.getTagsForMode('work')
      expect(workTags).toContain('work-tag-1')
      expect(workTags).toContain('work-tag-100')
    })

    it('handles empty string tags', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      act(() => {
        result.current.addCustomWorkTag('')
        result.current.addCustomPersonalTag('')
        result.current.addFrequentTag('')
      })
      
      expect(result.current.customWorkTags).toContain('')
      expect(result.current.customPersonalTags).toContain('')
      expect(result.current.frequentTags).toContain('')
    })

    it('handles special characters in tags', () => {
      const { result } = renderHook(() => useUserPreferencesStore())
      
      const specialTags = ['tag-with-dashes', 'tag_with_underscores', 'tag with spaces', 'tag!@#$%', 'unicode-🗣️']
      
      act(() => {
        specialTags.forEach(tag => {
          result.current.addCustomWorkTag(tag)
        })
      })
      
      specialTags.forEach(tag => {
        expect(result.current.customWorkTags).toContain(tag)
        expect(result.current.isWorkTag(tag)).toBe(true)
      })
    })
  })
})
