import { useState, useEffect } from 'react'
import { INITIAL_ITEMS_PER_QUADRANT, LOAD_MORE_INCREMENT } from '@/components/matrix/utils'

interface ContextMenuState {
  isOpen: boolean
  position: { x: number; y: number }
  node: any | null
}

export function useMatrixState() {
  // Quadrant nodes organization
  const [quadrantNodes, setQuadrantNodes] = useState<Record<string, any[]>>({
    'urgent-important': [],
    'not-urgent-important': [],
    'urgent-not-important': [],
    'not-urgent-not-important': [],
  })
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedQuadrant, setSelectedQuadrant] = useState<string>('')
  
  // Pagination state - tracks how many items are visible in each quadrant
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
    'urgent-important': INITIAL_ITEMS_PER_QUADRANT,
    'not-urgent-important': INITIAL_ITEMS_PER_QUADRANT,
    'urgent-not-important': INITIAL_ITEMS_PER_QUADRANT,
    'not-urgent-not-important': INITIAL_ITEMS_PER_QUADRANT,
  })
  
  // Accordion state for Do First quadrant grouping
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['critical']))
  
  // Family expansion state for parent-child groups
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('matrix-expanded-families')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    }
    return new Set()
  })
  
  // Individual node expansion state for deep nesting
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('matrix-expanded-nodes')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    }
    return new Set()
  })
  
  // Collapsed view state - persisted in localStorage
  const [isCollapsedView, setIsCollapsedView] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('matrix-collapsed-view') === 'true'
    }
    return false
  })
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    node: null
  })
  
  // Save collapsed view preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('matrix-collapsed-view', isCollapsedView.toString())
    }
  }, [isCollapsedView])
  
  // Save expanded families preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('matrix-expanded-families', JSON.stringify(Array.from(expandedFamilies)))
    }
  }, [expandedFamilies])
  
  // Save expanded nodes preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('matrix-expanded-nodes', JSON.stringify(Array.from(expandedNodes)))
    }
  }, [expandedNodes])
  
  // Handle loading more items for a quadrant
  const handleLoadMore = (quadrantId: string) => {
    setVisibleCounts(prev => ({
      ...prev,
      [quadrantId]: prev[quadrantId] + LOAD_MORE_INCREMENT
    }))
  }
  
  // Toggle accordion group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }
  
  // Toggle family expansion
  const toggleFamily = (familyId: string) => {
    setExpandedFamilies(prev => {
      const next = new Set(prev)
      if (next.has(familyId)) {
        next.delete(familyId)
      } else {
        next.add(familyId)
      }
      return next
    })
  }
  
  // Toggle individual node expansion (for deep nesting)
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }
  
  return {
    // State
    quadrantNodes,
    setQuadrantNodes,
    showAddDialog,
    setShowAddDialog,
    selectedQuadrant,
    setSelectedQuadrant,
    visibleCounts,
    expandedGroups,
    expandedFamilies,
    expandedNodes,
    isCollapsedView,
    setIsCollapsedView,
    contextMenu,
    setContextMenu,
    
    // Handlers
    handleLoadMore,
    toggleGroup,
    toggleFamily,
    toggleNode,
  }
}