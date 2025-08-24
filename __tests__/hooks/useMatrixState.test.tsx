import { renderHook, act } from '@testing-library/react'
import { useMatrixState } from '@/hooks/useMatrixState'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useMatrixState', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    // Default to returning null for all localStorage keys
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useMatrixState())
      
      // Check quadrant nodes
      expect(result.current.quadrantNodes).toEqual({
        'urgent-important': [],
        'not-urgent-important': [],
        'urgent-not-important': [],
        'not-urgent-not-important': [],
      })
      
      // Check dialog states
      expect(result.current.showAddDialog).toBe(false)
      expect(result.current.selectedQuadrant).toBe('')
      
      // Check pagination state
      expect(result.current.visibleCounts).toEqual({
        'urgent-important': 5,
        'not-urgent-important': 5,
        'urgent-not-important': 5,
        'not-urgent-not-important': 5,
      })
      
      // Check accordion state
      expect(result.current.expandedGroups).toEqual(new Set(['critical']))
      
      // Check expansion states
      expect(result.current.expandedFamilies).toEqual(new Set())
      expect(result.current.expandedNodes).toEqual(new Set())
      
      // Check collapsed view
      expect(result.current.isCollapsedView).toBe(false)
      
      // Check context menu
      expect(result.current.contextMenu).toEqual({
        isOpen: false,
        position: { x: 0, y: 0 },
        node: null
      })
    })

    it('should load persisted state from localStorage', () => {
      // Set up localStorage values
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'matrix-collapsed-view') return 'true'
        if (key === 'matrix-expanded-families') return JSON.stringify(['family-1', 'family-2'])
        if (key === 'matrix-expanded-nodes') return JSON.stringify(['node-1', 'node-2'])
        return null
      })
      
      const { result } = renderHook(() => useMatrixState())
      
      expect(result.current.isCollapsedView).toBe(true)
      expect(result.current.expandedFamilies).toEqual(new Set(['family-1', 'family-2']))
      expect(result.current.expandedNodes).toEqual(new Set(['node-1', 'node-2']))
    })
  })

  describe('Quadrant Management', () => {
    it('should update quadrant nodes', () => {
      const { result } = renderHook(() => useMatrixState())
      
      const testNodes = [
        { id: 'node-1', title: 'Test Node 1' },
        { id: 'node-2', title: 'Test Node 2' }
      ]
      
      act(() => {
        result.current.setQuadrantNodes({
          'urgent-important': testNodes,
          'not-urgent-important': [],
          'urgent-not-important': [],
          'not-urgent-not-important': [],
        })
      })
      
      expect(result.current.quadrantNodes['urgent-important']).toEqual(testNodes)
    })
  })

  describe('Dialog Management', () => {
    it('should toggle add dialog', () => {
      const { result } = renderHook(() => useMatrixState())
      
      act(() => {
        result.current.setShowAddDialog(true)
      })
      
      expect(result.current.showAddDialog).toBe(true)
      
      act(() => {
        result.current.setShowAddDialog(false)
      })
      
      expect(result.current.showAddDialog).toBe(false)
    })

    it('should set selected quadrant', () => {
      const { result } = renderHook(() => useMatrixState())
      
      act(() => {
        result.current.setSelectedQuadrant('urgent-important')
      })
      
      expect(result.current.selectedQuadrant).toBe('urgent-important')
    })
  })

  describe('Pagination', () => {
    it('should load more items for a quadrant', () => {
      const { result } = renderHook(() => useMatrixState())
      
      act(() => {
        result.current.handleLoadMore('urgent-important')
      })
      
      expect(result.current.visibleCounts['urgent-important']).toBe(10) // 5 + 5
      
      act(() => {
        result.current.handleLoadMore('urgent-important')
      })
      
      expect(result.current.visibleCounts['urgent-important']).toBe(15) // 10 + 5
    })

    it('should maintain separate counts for different quadrants', () => {
      const { result } = renderHook(() => useMatrixState())
      
      act(() => {
        result.current.handleLoadMore('urgent-important')
        result.current.handleLoadMore('not-urgent-important')
        result.current.handleLoadMore('not-urgent-important')
      })
      
      expect(result.current.visibleCounts['urgent-important']).toBe(10)
      expect(result.current.visibleCounts['not-urgent-important']).toBe(15)
      expect(result.current.visibleCounts['urgent-not-important']).toBe(5)
    })
  })

  describe('Accordion Groups', () => {
    it('should toggle group expansion', () => {
      const { result } = renderHook(() => useMatrixState())
      
      // Critical group is expanded by default
      expect(result.current.expandedGroups.has('critical')).toBe(true)
      
      // Toggle critical group (collapse)
      act(() => {
        result.current.toggleGroup('critical')
      })
      
      expect(result.current.expandedGroups.has('critical')).toBe(false)
      
      // Toggle again (expand)
      act(() => {
        result.current.toggleGroup('critical')
      })
      
      expect(result.current.expandedGroups.has('critical')).toBe(true)
    })

    it('should handle multiple groups', () => {
      const { result } = renderHook(() => useMatrixState())
      
      act(() => {
        result.current.toggleGroup('high')
        result.current.toggleGroup('medium')
      })
      
      expect(result.current.expandedGroups.has('critical')).toBe(true)
      expect(result.current.expandedGroups.has('high')).toBe(true)
      expect(result.current.expandedGroups.has('medium')).toBe(true)
    })
  })

  describe('Family Expansion', () => {
    it('should toggle family expansion', () => {
      const { result } = renderHook(() => useMatrixState())
      
      expect(result.current.expandedFamilies.has('family-1')).toBe(false)
      
      act(() => {
        result.current.toggleFamily('family-1')
      })
      
      expect(result.current.expandedFamilies.has('family-1')).toBe(true)
      
      act(() => {
        result.current.toggleFamily('family-1')
      })
      
      expect(result.current.expandedFamilies.has('family-1')).toBe(false)
    })

    it('should persist family expansion to localStorage', () => {
      const { result } = renderHook(() => useMatrixState())
      
      act(() => {
        result.current.toggleFamily('family-1')
        result.current.toggleFamily('family-2')
      })
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'matrix-expanded-families',
        JSON.stringify(['family-1', 'family-2'])
      )
    })
  })

  describe('Node Expansion', () => {
    it('should toggle node expansion', () => {
      const { result } = renderHook(() => useMatrixState())
      
      expect(result.current.expandedNodes.has('node-1')).toBe(false)
      
      act(() => {
        result.current.toggleNode('node-1')
      })
      
      expect(result.current.expandedNodes.has('node-1')).toBe(true)
      
      act(() => {
        result.current.toggleNode('node-1')
      })
      
      expect(result.current.expandedNodes.has('node-1')).toBe(false)
    })

    it('should persist node expansion to localStorage', () => {
      const { result } = renderHook(() => useMatrixState())
      
      act(() => {
        result.current.toggleNode('node-1')
        result.current.toggleNode('node-2')
      })
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'matrix-expanded-nodes',
        JSON.stringify(['node-1', 'node-2'])
      )
    })

    it('should handle multiple nodes independently', () => {
      const { result } = renderHook(() => useMatrixState())
      
      act(() => {
        result.current.toggleNode('node-1')
        result.current.toggleNode('node-2')
        result.current.toggleNode('node-3')
        result.current.toggleNode('node-2') // Toggle node-2 off
      })
      
      expect(result.current.expandedNodes.has('node-1')).toBe(true)
      expect(result.current.expandedNodes.has('node-2')).toBe(false)
      expect(result.current.expandedNodes.has('node-3')).toBe(true)
    })
  })

  describe('Collapsed View', () => {
    it('should toggle collapsed view', () => {
      const { result } = renderHook(() => useMatrixState())
      
      expect(result.current.isCollapsedView).toBe(false)
      
      act(() => {
        result.current.setIsCollapsedView(true)
      })
      
      expect(result.current.isCollapsedView).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('matrix-collapsed-view', 'true')
      
      act(() => {
        result.current.setIsCollapsedView(false)
      })
      
      expect(result.current.isCollapsedView).toBe(false)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('matrix-collapsed-view', 'false')
    })
  })

  describe('Context Menu', () => {
    it('should update context menu state', () => {
      const { result } = renderHook(() => useMatrixState())
      
      const testNode = { id: 'node-1', title: 'Test Node' }
      const position = { x: 100, y: 200 }
      
      act(() => {
        result.current.setContextMenu({
          isOpen: true,
          position,
          node: testNode
        })
      })
      
      expect(result.current.contextMenu).toEqual({
        isOpen: true,
        position,
        node: testNode
      })
    })

    it('should close context menu', () => {
      const { result } = renderHook(() => useMatrixState())
      
      // Open menu first
      act(() => {
        result.current.setContextMenu({
          isOpen: true,
          position: { x: 100, y: 200 },
          node: { id: 'node-1' }
        })
      })
      
      // Close menu
      act(() => {
        result.current.setContextMenu({
          isOpen: false,
          position: { x: 0, y: 0 },
          node: null
        })
      })
      
      expect(result.current.contextMenu.isOpen).toBe(false)
      expect(result.current.contextMenu.node).toBe(null)
    })
  })

  describe('LocalStorage Persistence', () => {
    it('should save all persistent states to localStorage', () => {
      const { result } = renderHook(() => useMatrixState())
      
      act(() => {
        result.current.setIsCollapsedView(true)
        result.current.toggleFamily('family-1')
        result.current.toggleNode('node-1')
      })
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('matrix-collapsed-view', 'true')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'matrix-expanded-families',
        expect.stringContaining('family-1')
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'matrix-expanded-nodes',
        expect.stringContaining('node-1')
      )
    })

  })
})