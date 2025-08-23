import { useEffect } from 'react'
import { isSnoozed } from '@/lib/snooze'
import { shouldShowNode } from '@/store/userPreferencesStore'
import { calculatePriority } from '@/components/matrix/utils'

interface UseMatrixOrganizationProps {
  nodes: any[]
  currentMode: 'work' | 'personal'
  hidePersonalInWorkMode: boolean
  hideWorkInPersonalMode: boolean
  setQuadrantNodes: (nodes: Record<string, any[]>) => void
}

export function useMatrixOrganization({
  nodes,
  currentMode,
  hidePersonalInWorkMode,
  hideWorkInPersonalMode,
  setQuadrantNodes,
}: UseMatrixOrganizationProps) {
  
  useEffect(() => {
    // Debug: Check for nodes with parent/children relationships
    const nodesWithParent = nodes.filter(n => n.parent)
    const nodesWithChildren = nodes.filter(n => n.children && n.children.length > 0)
    
    // Organize nodes into quadrants based on urgency and importance
    const organized: Record<string, any[]> = {
      'urgent-important': [],
      'not-urgent-important': [],
      'urgent-not-important': [],
      'not-urgent-not-important': [],
    }

    nodes.forEach(node => {
      // Skip completed tasks - they shouldn't appear in the matrix
      if (node.completed || node.status === 'completed') {
        return
      }
      
      // Skip snoozed nodes - they shouldn't appear in the matrix
      if (isSnoozed(node)) {
        return
      }
      
      // Apply mode filtering
      if (!shouldShowNode(node.tags, node.isPersonal, currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode)) {
        return
      }
      
      const urgency = node.urgency || 5
      const importance = node.importance || 5
      
      if (urgency >= 7 && importance >= 7) {
        organized['urgent-important'].push(node)
      } else if (urgency < 7 && importance >= 7) {
        organized['not-urgent-important'].push(node)
      } else if (urgency >= 7 && importance < 7) {
        organized['urgent-not-important'].push(node)
      } else {
        organized['not-urgent-not-important'].push(node)
      }
    })
    
    // Debug urgent-important quadrant specifically
    if (organized['urgent-important'].length > 0) {
      const uiNodesWithRelationships = organized['urgent-important'].filter(n => 
        n.parent || (n.children && n.children.length > 0)
      )
    }

    // Sort nodes within each quadrant by priority (highest first)
    Object.keys(organized).forEach(quadrant => {
      organized[quadrant].sort((a, b) => {
        const priorityA = calculatePriority(a.urgency, a.importance)
        const priorityB = calculatePriority(b.urgency, b.importance)
        return priorityB - priorityA // Descending order (highest priority first)
      })
    })

    // Debug: Quick summary of relationships per quadrant
    Object.keys(organized).forEach(quadrant => {
      const quadrantNodes = organized[quadrant]
      if (quadrantNodes.length > 0) {
        const withRelationships = quadrantNodes.filter(n => n.parent || (n.children && n.children.length > 0))
      }
    })

    setQuadrantNodes(organized)
  }, [nodes, currentMode, hidePersonalInWorkMode, hideWorkInPersonalMode, setQuadrantNodes])
}