import { act, renderHook } from '@testing-library/react'
import { useCalendarStore, useCalendarStoreBase } from '@/store/calendarStore'

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

describe('CalendarStore', () => {
  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.clear()
    jest.clearAllMocks()
    
    // Reset store state
    useCalendarStoreBase.setState({
      selectedCalendarIds: new Set<string>(),
      isAuthenticated: false,
      calendars: [],
    })
  })

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      expect(result.current.selectedCalendarIds).toEqual(new Set())
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.calendars).toEqual([])
      expect(result.current.selectedCalendars).toEqual([])
    })
  })

  describe('Calendar Selection Management', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      act(() => {
        result.current.setCalendars([
          {
            id: 'calendar-1',
            summary: 'Work Calendar',
            primary: true,
            backgroundColor: '#1f77b4',
          },
          {
            id: 'calendar-2',
            summary: 'Personal Calendar',
            primary: false,
            backgroundColor: '#ff7f0e',
          },
          {
            id: 'calendar-3',
            summary: 'Shared Calendar',
            primary: false,
            backgroundColor: '#2ca02c',
          },
        ])
      })
    })

    it('sets selected calendar IDs from Set', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      const calendarIds = new Set(['calendar-1', 'calendar-2'])
      
      act(() => {
        result.current.setSelectedCalendarIds(calendarIds)
      })
      
      expect(result.current.selectedCalendarIds).toEqual(calendarIds)
      expect(result.current.selectedCalendars).toEqual(['calendar-1', 'calendar-2'])
    })

    it('adds single calendar ID', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      act(() => {
        result.current.addSelectedCalendarId('calendar-1')
      })
      
      expect(result.current.selectedCalendarIds.has('calendar-1')).toBe(true)
      expect(result.current.selectedCalendars).toEqual(['calendar-1'])
      
      act(() => {
        result.current.addSelectedCalendarId('calendar-2')
      })
      
      expect(result.current.selectedCalendarIds.size).toBe(2)
      expect(result.current.selectedCalendars).toContain('calendar-1')
      expect(result.current.selectedCalendars).toContain('calendar-2')
    })

    it('prevents duplicate calendar IDs when adding', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      act(() => {
        result.current.addSelectedCalendarId('calendar-1')
        result.current.addSelectedCalendarId('calendar-1') // Duplicate
        result.current.addSelectedCalendarId('calendar-1') // Another duplicate
      })
      
      expect(result.current.selectedCalendarIds.size).toBe(1)
      expect(result.current.selectedCalendars).toEqual(['calendar-1'])
    })

    it('removes single calendar ID', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      // First add some calendars
      act(() => {
        result.current.addSelectedCalendarId('calendar-1')
        result.current.addSelectedCalendarId('calendar-2')
        result.current.addSelectedCalendarId('calendar-3')
      })
      
      expect(result.current.selectedCalendarIds.size).toBe(3)
      
      // Remove one calendar
      act(() => {
        result.current.removeSelectedCalendarId('calendar-2')
      })
      
      expect(result.current.selectedCalendarIds.size).toBe(2)
      expect(result.current.selectedCalendarIds.has('calendar-1')).toBe(true)
      expect(result.current.selectedCalendarIds.has('calendar-2')).toBe(false)
      expect(result.current.selectedCalendarIds.has('calendar-3')).toBe(true)
    })

    it('handles removing non-existent calendar ID gracefully', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      act(() => {
        result.current.addSelectedCalendarId('calendar-1')
      })
      
      const originalSize = result.current.selectedCalendarIds.size
      
      act(() => {
        result.current.removeSelectedCalendarId('non-existent-calendar')
      })
      
      expect(result.current.selectedCalendarIds.size).toBe(originalSize)
      expect(result.current.selectedCalendarIds.has('calendar-1')).toBe(true)
    })

    it('toggles calendar selection', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      // Initially no calendars selected
      expect(result.current.selectedCalendarIds.has('calendar-1')).toBe(false)
      
      // Toggle to add
      act(() => {
        result.current.toggleCalendarSelection('calendar-1')
      })
      
      expect(result.current.selectedCalendarIds.has('calendar-1')).toBe(true)
      
      // Toggle to remove
      act(() => {
        result.current.toggleCalendarSelection('calendar-1')
      })
      
      expect(result.current.selectedCalendarIds.has('calendar-1')).toBe(false)
    })

    it('handles multiple toggles correctly', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      // Toggle multiple calendars
      act(() => {
        result.current.toggleCalendarSelection('calendar-1')
        result.current.toggleCalendarSelection('calendar-2')
        result.current.toggleCalendarSelection('calendar-3')
      })
      
      expect(result.current.selectedCalendarIds.size).toBe(3)
      
      // Toggle off calendar-2
      act(() => {
        result.current.toggleCalendarSelection('calendar-2')
      })
      
      expect(result.current.selectedCalendarIds.size).toBe(2)
      expect(result.current.selectedCalendarIds.has('calendar-1')).toBe(true)
      expect(result.current.selectedCalendarIds.has('calendar-2')).toBe(false)
      expect(result.current.selectedCalendarIds.has('calendar-3')).toBe(true)
      
      // Toggle calendar-2 back on
      act(() => {
        result.current.toggleCalendarSelection('calendar-2')
      })
      
      expect(result.current.selectedCalendarIds.size).toBe(3)
      expect(result.current.selectedCalendarIds.has('calendar-2')).toBe(true)
    })
  })

  describe('Authentication State', () => {
    it('sets authentication status', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      expect(result.current.isAuthenticated).toBe(false)
      
      act(() => {
        result.current.setIsAuthenticated(true)
      })
      
      expect(result.current.isAuthenticated).toBe(true)
      
      act(() => {
        result.current.setIsAuthenticated(false)
      })
      
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('Calendar Management', () => {
    it('sets calendars list', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      const calendars = [
        {
          id: 'cal-1',
          summary: 'Work',
          primary: true,
          backgroundColor: '#1f77b4',
        },
        {
          id: 'cal-2',
          summary: 'Personal',
          primary: false,
          backgroundColor: '#ff7f0e',
        },
      ]
      
      act(() => {
        result.current.setCalendars(calendars)
      })
      
      expect(result.current.calendars).toEqual(calendars)
      expect(result.current.calendars).toHaveLength(2)
    })

    it('handles empty calendars list', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      // First set some calendars
      act(() => {
        result.current.setCalendars([
          { id: 'cal-1', summary: 'Test' },
        ])
      })
      
      expect(result.current.calendars).toHaveLength(1)
      
      // Then clear them
      act(() => {
        result.current.setCalendars([])
      })
      
      expect(result.current.calendars).toEqual([])
    })

    it('handles calendars with minimal properties', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      const minimalCalendars = [
        { id: 'cal-1', summary: 'Basic Calendar' },
        { id: 'cal-2', summary: 'Another Calendar' },
      ]
      
      act(() => {
        result.current.setCalendars(minimalCalendars)
      })
      
      expect(result.current.calendars).toEqual(minimalCalendars)
      expect(result.current.calendars[0].primary).toBeUndefined()
      expect(result.current.calendars[0].backgroundColor).toBeUndefined()
    })

    it('handles calendars with all properties', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      const fullCalendars = [
        {
          id: 'primary-cal',
          summary: 'Primary Work Calendar',
          primary: true,
          backgroundColor: '#1f77b4',
        },
        {
          id: 'secondary-cal',
          summary: 'Secondary Personal Calendar',
          primary: false,
          backgroundColor: '#ff7f0e',
        },
      ]
      
      act(() => {
        result.current.setCalendars(fullCalendars)
      })
      
      expect(result.current.calendars).toEqual(fullCalendars)
      
      const primaryCal = result.current.calendars.find(c => c.primary)
      expect(primaryCal?.id).toBe('primary-cal')
      expect(primaryCal?.backgroundColor).toBe('#1f77b4')
    })
  })

  describe('Selected Calendars Getter', () => {
    it('returns array of selected calendar IDs', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      act(() => {
        result.current.addSelectedCalendarId('cal-1')
        result.current.addSelectedCalendarId('cal-3')
        result.current.addSelectedCalendarId('cal-2')
      })
      
      const selectedCalendars = result.current.selectedCalendars
      expect(selectedCalendars).toHaveLength(3)
      expect(selectedCalendars).toContain('cal-1')
      expect(selectedCalendars).toContain('cal-2')
      expect(selectedCalendars).toContain('cal-3')
    })

    it('returns empty array when no calendars selected', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      expect(result.current.selectedCalendars).toEqual([])
    })
  })

  describe('Persistence Storage', () => {
    it('calls localStorage setItem when state changes', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      act(() => {
        result.current.addSelectedCalendarId('cal-1')
      })
      
      // Should have called setItem
      expect(localStorageMock.setItem).toHaveBeenCalled()
      
      // Check the stored data structure
      const setItemCalls = localStorageMock.setItem.mock.calls
      const lastCall = setItemCalls[setItemCalls.length - 1]
      expect(lastCall[0]).toBe('calendar-preferences')
      
      const storedData = JSON.parse(lastCall[1])
      expect(storedData.state.selectedCalendarIds).toEqual(['cal-1'])
    })

    it('handles localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })
      
      const { result } = renderHook(() => useCalendarStoreBase())
      
      // Should not throw error
      expect(() => {
        act(() => {
          result.current.addSelectedCalendarId('cal-1')
        })
      }).not.toThrow()
      
      // State should still be updated
      expect(result.current.selectedCalendarIds.has('cal-1')).toBe(true)
    })

    it('handles localStorage getItem errors gracefully', () => {
      // Mock localStorage to throw error on getItem
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      // Should not throw error when creating store
      expect(() => {
        renderHook(() => useCalendarStoreBase())
      }).not.toThrow()
    })

    it('handles invalid JSON in localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json{')
      
      // Should not throw error and should use default state
      const { result } = renderHook(() => useCalendarStoreBase())
      
      expect(result.current.selectedCalendarIds).toEqual(new Set())
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.calendars).toEqual([])
    })

    it('properly serializes and deserializes Set data', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      // Add some calendars
      act(() => {
        result.current.addSelectedCalendarId('cal-1')
        result.current.addSelectedCalendarId('cal-2')
        result.current.setIsAuthenticated(true)
      })
      
      // Get the stored data
      const setItemCalls = localStorageMock.setItem.mock.calls
      const lastCall = setItemCalls[setItemCalls.length - 1]
      const storedJson = lastCall[1]
      const storedData = JSON.parse(storedJson)
      
      // Verify Set is converted to Array for storage
      expect(Array.isArray(storedData.state.selectedCalendarIds)).toBe(true)
      expect(storedData.state.selectedCalendarIds).toEqual(['cal-1', 'cal-2'])
      expect(storedData.state.isAuthenticated).toBe(true)
      
      // Simulate loading from localStorage
      localStorageMock.getItem.mockReturnValue(storedJson)
      
      // Create new store instance (simulating page reload)
      const { result: newResult } = renderHook(() => useCalendarStoreBase())
      
      // Verify Set is restored correctly
      expect(newResult.current.selectedCalendarIds).toEqual(new Set(['cal-1', 'cal-2']))
      expect(newResult.current.isAuthenticated).toBe(true)
      expect(newResult.current.selectedCalendars).toEqual(['cal-1', 'cal-2'])
    })
  })

  describe('SSR-Safe Hook', () => {
    beforeEach(() => {
      // Reset React hooks state
      jest.clearAllMocks()
    })

    it('returns safe defaults during SSR (first render)', () => {
      // Mock that we're in SSR environment by simulating first render
      const { result } = renderHook(() => useCalendarStore())
      
      // On first render (SSR), should return safe defaults
      expect(result.current.selectedCalendarIds).toEqual(new Set())
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.calendars).toEqual([])
      expect(result.current.selectedCalendars).toEqual([])
      
      // Functions should be no-ops during SSR
      expect(typeof result.current.setSelectedCalendarIds).toBe('function')
      expect(typeof result.current.addSelectedCalendarId).toBe('function')
      expect(typeof result.current.removeSelectedCalendarId).toBe('function')
      expect(typeof result.current.toggleCalendarSelection).toBe('function')
      expect(typeof result.current.setIsAuthenticated).toBe('function')
      expect(typeof result.current.setCalendars).toBe('function')
    })

    it('provides working store after hydration', async () => {
      const { result, rerender } = renderHook(() => useCalendarStore())
      
      // Simulate hydration by re-rendering (useEffect will run)
      rerender()
      
      // Wait for hydration effect
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      // After hydration, store should work normally
      act(() => {
        result.current.addSelectedCalendarId('cal-1')
      })
      
      expect(result.current.selectedCalendarIds.has('cal-1')).toBe(true)
    })
  })

  describe('Complex Scenarios', () => {
    it('handles full Google Calendar integration workflow', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      // 1. Initially not authenticated
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.calendars).toEqual([])
      
      // 2. User authenticates
      act(() => {
        result.current.setIsAuthenticated(true)
      })
      
      // 3. Load calendars from Google
      const googleCalendars = [
        {
          id: 'primary',
          summary: 'user@gmail.com',
          primary: true,
          backgroundColor: '#1f77b4',
        },
        {
          id: 'work-calendar',
          summary: 'Work Events',
          primary: false,
          backgroundColor: '#ff7f0e',
        },
        {
          id: 'family-calendar',
          summary: 'Family Calendar',
          primary: false,
          backgroundColor: '#2ca02c',
        },
        {
          id: 'holidays',
          summary: 'Holidays in United States',
          primary: false,
          backgroundColor: '#d62728',
        },
      ]
      
      act(() => {
        result.current.setCalendars(googleCalendars)
      })
      
      expect(result.current.calendars).toHaveLength(4)
      
      // 4. User selects primary and work calendars
      act(() => {
        result.current.addSelectedCalendarId('primary')
        result.current.addSelectedCalendarId('work-calendar')
      })
      
      expect(result.current.selectedCalendars).toEqual(['primary', 'work-calendar'])
      
      // 5. User deselects work calendar
      act(() => {
        result.current.removeSelectedCalendarId('work-calendar')
      })
      
      expect(result.current.selectedCalendars).toEqual(['primary'])
      
      // 6. User adds family calendar using toggle
      act(() => {
        result.current.toggleCalendarSelection('family-calendar')
      })
      
      expect(result.current.selectedCalendars).toContain('family-calendar')
      expect(result.current.selectedCalendars).toHaveLength(2)
      
      // 7. User logs out
      act(() => {
        result.current.setIsAuthenticated(false)
        result.current.setCalendars([])
      })
      
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.calendars).toEqual([])
      // Selected calendars should persist for next login
      expect(result.current.selectedCalendars).toHaveLength(2)
    })

    it('handles bulk calendar operations', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      // Setup multiple calendars
      const calendars = Array.from({ length: 10 }, (_, i) => ({
        id: `calendar-${i + 1}`,
        summary: `Calendar ${i + 1}`,
        primary: i === 0,
        backgroundColor: `#color-${i}`,
      }))
      
      act(() => {
        result.current.setCalendars(calendars)
      })
      
      // Select all calendars
      act(() => {
        const allCalendarIds = new Set(calendars.map(c => c.id))
        result.current.setSelectedCalendarIds(allCalendarIds)
      })
      
      expect(result.current.selectedCalendars).toHaveLength(10)
      
      // Deselect even-numbered calendars
      act(() => {
        for (let i = 2; i <= 10; i += 2) {
          result.current.removeSelectedCalendarId(`calendar-${i}`)
        }
      })
      
      expect(result.current.selectedCalendars).toHaveLength(5)
      
      // Verify only odd-numbered calendars remain
      const remaining = result.current.selectedCalendars
      for (let i = 1; i <= 9; i += 2) {
        expect(remaining).toContain(`calendar-${i}`)
      }
    })

    it('handles edge cases with calendar IDs', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      // Test with special characters and edge case IDs
      const edgeCaseCalendars = [
        { id: '', summary: 'Empty ID' },
        { id: 'id-with-spaces and symbols!@#$%', summary: 'Special Chars' },
        { id: '12345', summary: 'Numeric ID' },
        { id: 'very-long-calendar-id-that-might-cause-issues-in-some-systems-but-should-work-fine', summary: 'Long ID' },
        { id: 'unicode-🗓️-calendar', summary: 'Unicode Calendar' },
      ]
      
      act(() => {
        result.current.setCalendars(edgeCaseCalendars)
      })
      
      // Test operations with edge case IDs
      act(() => {
        result.current.addSelectedCalendarId('')
        result.current.addSelectedCalendarId('id-with-spaces and symbols!@#$%')
        result.current.addSelectedCalendarId('unicode-🗓️-calendar')
      })
      
      expect(result.current.selectedCalendarIds.has('')).toBe(true)
      expect(result.current.selectedCalendarIds.has('id-with-spaces and symbols!@#$%')).toBe(true)
      expect(result.current.selectedCalendarIds.has('unicode-🗓️-calendar')).toBe(true)
      expect(result.current.selectedCalendars).toHaveLength(3)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles undefined and null calendar data', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      // Should handle null calendars gracefully
      act(() => {
        result.current.setCalendars(null as any)
      })
      
      expect(result.current.calendars).toBeNull()
      
      // Reset to proper state
      act(() => {
        result.current.setCalendars([])
      })
      
      expect(result.current.calendars).toEqual([])
    })

    it('maintains Set integrity with rapid operations', () => {
      const { result } = renderHook(() => useCalendarStoreBase())
      
      // Perform rapid add/remove operations
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.addSelectedCalendarId(`cal-${i % 5}`)
          if (i % 2 === 0) {
            result.current.removeSelectedCalendarId(`cal-${(i + 1) % 5}`)
          }
          if (i % 3 === 0) {
            result.current.toggleCalendarSelection(`cal-${(i + 2) % 5}`)
          }
        }
      })
      
      // Set should maintain integrity
      const finalSet = result.current.selectedCalendarIds
      expect(finalSet.size).toBeLessThanOrEqual(5)
      
      // Convert to array and back to Set to verify no duplicates
      const asArray = Array.from(finalSet)
      const backToSet = new Set(asArray)
      expect(backToSet.size).toBe(finalSet.size)
    })
  })
})
